"""
Incident service: reads from report_analysis + sif_reports + related tables.
Does NOT write to or modify these source tables.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, func, or_, and_
from datetime import datetime
import uuid

from app.models.models import (
    ReportAnalysis, SifReport, Barrier, LifeSavingRule,
    ReportBarrier, ReportRule, IncidentMeta, IncidentAction,
    IncidentComment, ActivityLog,
)
from app.schemas.schemas import (
    IncidentSummary, IncidentDetail, SIFFactors, BarrierDetail,
    LSRDetail, EscalationGraph, SimilarIncident, IncidentUpdate,
    IncidentCreate, ActionCreate, ActionUpdate, ActionSummary,
    CommentCreate, CommentResponse, ActivityEntry,
)
from app.services.safety_engine import (
    calculate_priority, build_escalation_path,
    generate_recommended_actions, derive_incident_title,
)


def _get_or_create_meta(db: Session, report_id: str, sif_score: Optional[float] = None) -> IncidentMeta:
    """Get or create incident metadata for a report."""
    meta = db.query(IncidentMeta).filter(IncidentMeta.report_id == report_id).first()
    if not meta:
        priority = calculate_priority(sif_score)
        meta = IncidentMeta(
            report_id=report_id,
            priority=priority,
            status="OPEN",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(meta)
        db.commit()
        db.refresh(meta)
    return meta


def _build_summary(
    report: SifReport,
    analysis: Optional[ReportAnalysis],
    meta: Optional[IncidentMeta],
    barrier_status: Optional[str] = None,
    primary_lsr: Optional[str] = None,
) -> IncidentSummary:
    """Build an IncidentSummary from joined data."""
    sif_score = analysis.sif_score if analysis else None
    priority = meta.priority if meta else calculate_priority(sif_score)
    status = meta.status if meta else "OPEN"
    assigned_to = meta.assigned_to if meta else None

    title = derive_incident_title(
        report_type=report.report_type,
        hazard=analysis.hazard if analysis else None,
        activity=report.activity,
        unsafe_act=analysis.unsafe_act if analysis else None,
        description=report.description,
    )

    return IncidentSummary(
        id=report.report_id,
        title=title,
        report_type=report.report_type or "Unknown",
        site_name=report.site_name,
        region=report.region,
        location=report.location,
        department=report.department,
        activity=report.activity,
        report_date=report.report_date,
        sif_score=sif_score,
        sif_classification=analysis.sif_classification if analysis else None,
        sif_potential=analysis.sif_potential if analysis else None,
        priority=priority,
        status=status,
        assigned_to=assigned_to,
        hazard=analysis.hazard if analysis else None,
        energy_source=analysis.energy_source if analysis else None,
        exposure_status=analysis.exposure_status if analysis else None,
        confidence=analysis.confidence if analysis else None,
        barrier_status=barrier_status,
        primary_lsr=primary_lsr,
    )


def get_incidents(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    sif_only: Optional[bool] = None,
    site_name: Optional[str] = None,
    department: Optional[str] = None,
    report_type: Optional[str] = None,
    search: Optional[str] = None,
    sif_min: Optional[float] = None,
    sif_max: Optional[float] = None,
) -> Dict[str, Any]:
    """Get paginated list of incidents with filters."""
    # Base query joining sif_reports with report_analysis
    query = db.query(SifReport, ReportAnalysis).outerjoin(
        ReportAnalysis, SifReport.report_id == ReportAnalysis.report_id
    )

    # Filters
    if sif_only is not None:
        query = query.filter(ReportAnalysis.sif_potential == sif_only)
    if site_name:
        query = query.filter(SifReport.site_name.ilike(f"%{site_name}%"))
    if department:
        query = query.filter(SifReport.department.ilike(f"%{department}%"))
    if report_type:
        query = query.filter(SifReport.report_type.ilike(f"%{report_type}%"))
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                SifReport.report_id.ilike(search_term),
                SifReport.description.ilike(search_term),
                SifReport.site_name.ilike(search_term),
                SifReport.department.ilike(search_term),
                SifReport.activity.ilike(search_term),
                ReportAnalysis.hazard.ilike(search_term),
                ReportAnalysis.unsafe_act.ilike(search_term),
            )
        )
    if sif_min is not None:
        query = query.filter(ReportAnalysis.sif_score >= sif_min)
    if sif_max is not None:
        query = query.filter(ReportAnalysis.sif_score <= sif_max)

    # Order by SIF score descending
    query = query.order_by(ReportAnalysis.sif_score.desc().nullslast())

    total = query.count()

    # Paginate
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    # Get all report_ids for batch meta lookup
    report_ids = [r[0].report_id for r in rows]

    # Batch load metas
    metas = {
        m.report_id: m
        for m in db.query(IncidentMeta).filter(IncidentMeta.report_id.in_(report_ids)).all()
    }

    # Batch load worst barrier statuses
    barrier_rows = (
        db.query(ReportBarrier.report_id, ReportBarrier.status)
        .filter(ReportBarrier.report_id.in_(report_ids))
        .all()
    )
    worst_barrier: Dict[str, str] = {}
    priority_order = {"FAILED": 0, "BYPASSED": 1, "MISSING": 2, "DEGRADED": 3, "PARTIALLY_EFFECTIVE": 4, "EFFECTIVE": 5}
    for r_id, bstatus in barrier_rows:
        if r_id not in worst_barrier or priority_order.get(bstatus, 99) < priority_order.get(worst_barrier[r_id], 99):
            worst_barrier[r_id] = bstatus

    # Batch load primary LSRs
    lsr_rows = (
        db.query(ReportRule.report_id, LifeSavingRule.rule_name)
        .join(LifeSavingRule, ReportRule.rule_id == LifeSavingRule.rule_id)
        .filter(ReportRule.report_id.in_(report_ids))
        .filter(ReportRule.priority == "PRIMARY")
        .all()
    )
    primary_lsr_map: Dict[str, str] = {r_id: rname for r_id, rname in lsr_rows}

    # Build summaries
    summaries = []
    for report, analysis in rows:
        meta = metas.get(report.report_id)
        if not meta:
            # Auto-create meta
            sif_score = analysis.sif_score if analysis else None
            meta = _get_or_create_meta(db, report.report_id, sif_score)
        summary = _build_summary(
            report, analysis, meta,
            barrier_status=worst_barrier.get(report.report_id),
            primary_lsr=primary_lsr_map.get(report.report_id),
        )
        # Apply priority/status filters (on meta)
        if priority and summary.priority != priority.upper():
            continue
        if status and summary.status != status.upper():
            continue
        summaries.append(summary)

    return {
        "incidents": summaries,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


def get_incident_detail(db: Session, report_id: str) -> Optional[IncidentDetail]:
    """Get full incident detail for the intelligence workspace."""
    # Load main records
    report = db.query(SifReport).filter(SifReport.report_id == report_id).first()
    if not report:
        return None

    analysis = db.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
    meta = _get_or_create_meta(db, report_id, analysis.sif_score if analysis else None)

    # Load barriers with catalog info
    barrier_rows = (
        db.query(ReportBarrier, Barrier)
        .join(Barrier, ReportBarrier.barrier_id == Barrier.barrier_id)
        .filter(ReportBarrier.report_id == report_id)
        .all()
    )
    barriers = [
        BarrierDetail(
            id=rb.id,
            barrier_code=b.barrier_code,
            barrier_name=b.barrier_name,
            barrier_type=b.barrier_type,
            status=rb.status,
            criticality=rb.criticality,
            confidence=rb.confidence,
            evidence=rb.evidence if isinstance(rb.evidence, list) else [],
            reasoning=rb.reasoning,
        )
        for rb, b in barrier_rows
    ]

    # Load LSRs with catalog info
    lsr_rows = (
        db.query(ReportRule, LifeSavingRule)
        .join(LifeSavingRule, ReportRule.rule_id == LifeSavingRule.rule_id)
        .filter(ReportRule.report_id == report_id)
        .order_by(ReportRule.confidence.desc())
        .all()
    )
    lsrs = [
        LSRDetail(
            id=rr.id,
            rule_code=lsr.rule_code,
            rule_name=lsr.rule_name,
            description=lsr.description,
            confidence=rr.confidence,
            priority=rr.priority,
            trigger=rr.trigger,
            evidence=rr.evidence if isinstance(rr.evidence, list) else [],
            reasoning=rr.reasoning,
        )
        for rr, lsr in lsr_rows
    ]

    # Build escalation graph
    escalation_data = None
    if analysis:
        graph_data = build_escalation_path(
            report_type=report.report_type or "",
            hazard=analysis.hazard,
            energy_source=analysis.energy_source,
            worker_exposure=analysis.worker_exposure,
            missing_controls=analysis.missing_controls,
            potential_consequence=analysis.potential_consequence,
            causal_chain=analysis.causal_chain if isinstance(analysis.causal_chain, list) else [],
            activity=report.activity,
        )
        escalation_data = EscalationGraph(**graph_data)

    # Generate recommended actions
    barrier_statuses = [b.status for b in barriers]
    rec_actions = generate_recommended_actions(
        hazard=analysis.hazard if analysis else None,
        missing_controls=analysis.missing_controls if analysis else None,
        energy_source=analysis.energy_source if analysis else None,
        sif_score=analysis.sif_score if analysis else None,
        barrier_statuses=barrier_statuses,
    )

    # SIF factors
    sif_factors = None
    if analysis:
        sif_factors = SIFFactors(
            hazard_severity=analysis.hazard_severity_score,
            energy=analysis.energy_score,
            exposure=analysis.exposure_score,
            consequence=analysis.consequence_score,
            barrier_failure=analysis.barrier_failure_score,
            causal_chain=analysis.causal_chain_score,
            sif_pathway_credibility=analysis.sif_pathway_credibility,
            exposure_immediacy=analysis.exposure_immediacy,
            escalation_evidence=analysis.escalation_evidence,
            sif_mechanism_strength=analysis.sif_mechanism_strength,
        )

    title = derive_incident_title(
        report_type=report.report_type,
        hazard=analysis.hazard if analysis else None,
        activity=report.activity,
        unsafe_act=analysis.unsafe_act if analysis else None,
        description=report.description,
    )

    return IncidentDetail(
        id=report.report_id,
        title=title,
        report_type=report.report_type or "Unknown",
        site_name=report.site_name,
        region=report.region,
        location=report.location,
        department=report.department,
        activity=report.activity,
        report_date=report.report_date,
        description=report.description,
        source=report.source,
        priority=meta.priority,
        status=meta.status,
        assigned_to=meta.assigned_to,
        unsafe_act=analysis.unsafe_act if analysis else None,
        unsafe_condition=analysis.unsafe_condition if analysis else None,
        hazard=analysis.hazard if analysis else None,
        energy_source=analysis.energy_source if analysis else None,
        worker_exposure=analysis.worker_exposure if analysis else None,
        existing_controls=analysis.existing_controls if analysis else None,
        missing_controls=analysis.missing_controls if analysis else None,
        potential_consequence=analysis.potential_consequence if analysis else None,
        actual_consequence=analysis.actual_consequence if analysis else None,
        causal_chain=analysis.causal_chain if analysis and isinstance(analysis.causal_chain, list) else [],
        key_evidence=analysis.key_evidence if analysis and isinstance(analysis.key_evidence, list) else [],
        sif_potential=analysis.sif_potential if analysis else None,
        sif_score=analysis.sif_score if analysis else None,
        sif_classification=analysis.sif_classification if analysis else None,
        sif_factors=sif_factors,
        sif_evidence=list(analysis.sif_evidence) if analysis and analysis.sif_evidence else [],
        sif_reasoning=analysis.sif_reasoning if analysis else None,
        exposure_status=analysis.exposure_status if analysis else None,
        confidence=analysis.confidence if analysis else None,
        model_name=analysis.model_name if analysis else None,
        analyzed_at=str(analysis.analyzed_at) if analysis and analysis.analyzed_at else None,
        sif_analyzed_at=str(analysis.sif_analyzed_at) if analysis and analysis.sif_analyzed_at else None,
        barriers=barriers,
        life_saving_rules=lsrs,
        similar_incidents=[],  # Populated separately
        escalation_graph=escalation_data,
        recommended_actions=rec_actions,
    )


def update_incident(db: Session, report_id: str, update: IncidentUpdate) -> Optional[IncidentSummary]:
    """Update incident metadata (priority/status/assignment). Additive only."""
    # First get analysis to determine sif_score for creating meta if needed
    analysis = db.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
    report = db.query(SifReport).filter(SifReport.report_id == report_id).first()
    if not report:
        return None

    meta = _get_or_create_meta(db, report_id, analysis.sif_score if analysis else None)

    if update.priority is not None:
        meta.priority = update.priority.upper()
    if update.status is not None:
        meta.status = update.status.upper()
    if update.assigned_to is not None:
        meta.assigned_to = update.assigned_to

    meta.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(meta)

    return _build_summary(report, analysis, meta)


def get_actions(db: Session, report_id: Optional[str] = None) -> List[ActionSummary]:
    """Get actions, optionally filtered by report."""
    query = db.query(IncidentAction)
    if report_id:
        query = query.filter(IncidentAction.report_id == report_id)
    query = query.order_by(IncidentAction.created_at.desc())
    actions = query.all()
    return [
        ActionSummary(
            id=a.id,
            report_id=a.report_id,
            title=a.title,
            description=a.description,
            owner=a.owner,
            priority=a.priority,
            status=a.status,
            due_date=a.due_date,
            created_at=str(a.created_at) if a.created_at else None,
            updated_at=str(a.updated_at) if a.updated_at else None,
        )
        for a in actions
    ]


def create_action(db: Session, action_in: ActionCreate) -> ActionSummary:
    """Create a new action. Writes to additive incident_actions table only."""
    action = IncidentAction(
        id=str(uuid.uuid4()),
        report_id=action_in.report_id,
        title=action_in.title,
        description=action_in.description,
        owner=action_in.owner,
        priority=action_in.priority,
        status="TODO",
        due_date=action_in.due_date,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return ActionSummary(
        id=action.id,
        report_id=action.report_id,
        title=action.title,
        description=action.description,
        owner=action.owner,
        priority=action.priority,
        status=action.status,
        due_date=action.due_date,
        created_at=str(action.created_at),
        updated_at=str(action.updated_at),
    )


def update_action(db: Session, action_id: str, update: ActionUpdate) -> Optional[ActionSummary]:
    """Update an action's fields."""
    action = db.query(IncidentAction).filter(IncidentAction.id == action_id).first()
    if not action:
        return None
    if update.title is not None:
        action.title = update.title
    if update.description is not None:
        action.description = update.description
    if update.owner is not None:
        action.owner = update.owner
    if update.priority is not None:
        action.priority = update.priority.upper()
    if update.status is not None:
        action.status = update.status.upper()
        if update.status.upper() == "CLOSED":
            action.completed_at = datetime.utcnow()
    if update.due_date is not None:
        action.due_date = update.due_date
    action.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(action)
    return ActionSummary(
        id=action.id,
        report_id=action.report_id,
        title=action.title,
        description=action.description,
        owner=action.owner,
        priority=action.priority,
        status=action.status,
        due_date=action.due_date,
        created_at=str(action.created_at) if action.created_at else None,
        updated_at=str(action.updated_at) if action.updated_at else None,
    )


def add_comment(db: Session, report_id: str, comment_in: CommentCreate) -> CommentResponse:
    """Add a comment to an incident. Writes to additive table only."""
    comment = IncidentComment(
        id=str(uuid.uuid4()),
        report_id=report_id,
        author=comment_in.author,
        content=comment_in.content,
        created_at=datetime.utcnow(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return CommentResponse(
        id=comment.id,
        report_id=comment.report_id,
        author=comment.author,
        content=comment.content,
        created_at=str(comment.created_at),
    )


def get_comments(db: Session, report_id: str) -> List[CommentResponse]:
    """Get comments for an incident."""
    comments = (
        db.query(IncidentComment)
        .filter(IncidentComment.report_id == report_id)
        .order_by(IncidentComment.created_at.desc())
        .all()
    )
    return [
        CommentResponse(
            id=c.id,
            report_id=c.report_id,
            author=c.author,
            content=c.content,
            created_at=str(c.created_at),
        )
        for c in comments
    ]


def get_activity_log(db: Session, report_id: str) -> List[ActivityEntry]:
    """Get activity timeline for an incident."""
    entries = (
        db.query(ActivityLog)
        .filter(ActivityLog.report_id == report_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )
    return [
        ActivityEntry(
            id=e.id,
            report_id=e.report_id,
            action_id=e.action_id,
            actor=e.actor,
            event_type=e.event_type,
            event_data=e.event_data,
            created_at=str(e.created_at) if e.created_at else None,
        )
        for e in entries
    ]


def log_activity(
    db: Session,
    report_id: Optional[str],
    event_type: str,
    actor: str = "system",
    event_data: Optional[dict] = None,
    action_id: Optional[str] = None,
) -> None:
    """Log an activity event. Writes to additive activity_log table."""
    entry = ActivityLog(
        id=str(uuid.uuid4()),
        report_id=report_id,
        action_id=action_id,
        actor=actor,
        event_type=event_type,
        event_data=event_data or {},
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
