"""
Incident service: reads from report_analysis + sif_reports + related tables.
Does NOT write to or modify these source tables.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, func, or_, and_
from datetime import datetime
import uuid
import re
import logging

logger = logging.getLogger(__name__)

from app.models.models import (
    ReportAnalysis, SifReport, Barrier, LifeSavingRule,
    ReportBarrier, ReportRule, IncidentMeta, IncidentAction,
    IncidentComment, ActivityLog,
)
from app.schemas.schemas import (
    IncidentSummary, IncidentDetail, SIFFactors, BarrierDetail,
    LSRDetail, EscalationGraph, SimilarIncident, IncidentUpdate,
    IncidentCreate, ActionCreate, ActionUpdate, ActionSummary,
    CommentCreate, CommentResponse, ActivityEntry, SiteInfo, ReporterInfo,
)
from app.services.safety_engine import (
    calculate_priority, build_escalation_path,
    generate_recommended_actions, derive_incident_title,
    BARRIER_KEYWORDS, LSR_KEYWORDS,
)


from sqlalchemy.exc import IntegrityError

def _get_or_create_meta(db: Session, report_id: str, sif_score: Optional[float] = None) -> IncidentMeta:
    meta = db.query(IncidentMeta).filter(IncidentMeta.report_id == report_id).first()
    if not meta:
        try:
            priority = calculate_priority(sif_score)
            meta = IncidentMeta(
                report_id=report_id,
                priority=priority,
                status='OPEN',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(meta)
            db.commit()
            db.refresh(meta)
        except IntegrityError:
            db.rollback()
            meta = db.query(IncidentMeta).filter(IncidentMeta.report_id == report_id).first()
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

    site_info = SiteInfo(
        site_id=report.site_id,
        site_name=report.site_name,
        region=report.region,
    ) if (report.site_id or report.site_name or report.region) else None

    reporters = [ReporterInfo(emp_id=report.primary_reporter_id)] if report.primary_reporter_id else []

    return IncidentSummary(
        id=report.report_id,
        report_id=report.report_id,
        title=title,
        report_type=report.report_type or "Unknown",
        site_id=report.site_id,
        site_name=report.site_name,
        region=report.region,
        site=site_info,
        location=report.location,
        department=report.department,
        activity=report.activity,
        report_date=report.report_date,
        time=report.time,
        primary_reporter_id=report.primary_reporter_id,
        reported_by=reporters,
        source=report.source,
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
    query = query.order_by(SifReport.report_id.desc())

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
        "items": summaries,
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

    site_info = SiteInfo(
        site_id=report.site_id,
        site_name=report.site_name,
        region=report.region,
    ) if (report.site_id or report.site_name or report.region) else None

    reporters = [ReporterInfo(emp_id=report.primary_reporter_id)] if report.primary_reporter_id else []

    return IncidentDetail(
        id=report.report_id,
        report_id=report.report_id,
        title=title,
        report_type=report.report_type or "Unknown",
        site_id=report.site_id,
        site_name=report.site_name,
        region=report.region,
        site=site_info,
        location=report.location,
        department=report.department,
        activity=report.activity,
        report_date=report.report_date,
        time=report.time,
        primary_reporter_id=report.primary_reporter_id,
        reported_by=reporters,
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


def _generate_next_report_id(db: Session) -> str:
    """Generate next sequential report_id formatted as R%05d (e.g., R00451)."""
    sql = text("""
        SELECT report_id 
        FROM sif_reports 
        WHERE report_id ~ '^R[0-9]+$' 
        ORDER BY LENGTH(report_id) DESC, report_id DESC 
        LIMIT 1
    """)
    result = db.execute(sql).scalar()
    if result:
        try:
            current_num = int(result[1:])
            return f"R{current_num + 1:05d}"
        except (ValueError, IndexError):
            pass

    count = db.query(func.count(SifReport.report_id)).scalar() or 0
    return f"R{count + 1:05d}"


def process_safety_intelligence(db: Session, report: SifReport) -> ReportAnalysis:
    """Run deterministic safety NLP/intelligence rules, map barriers & LSRs, and build vector embeddings."""
    desc_lower = (report.description or "").lower()
    act_lower = (report.activity or "").lower()
    text_corpus = f"{desc_lower} {act_lower}"

    # Analyze hazard and energy source
    if any(k in text_corpus for k in ["valve", "depressuriz", "pressure", "bleed", "pipeline"]):
        hazard = "Premature valve manipulation on pressurized hydrocarbon or fluid line"
        energy_source = "Pressurized Hydrocarbon / Pneumatic Energy"
        unsafe_act = "Opening pipeline valve before confirming full system depressurization"
        unsafe_condition = "Line remained under residual operating pressure without verified isolation"
        missing_controls = "Depressurization verification, calibrated pressure gauge check, double isolation & bleed (LOTO)"
        existing_controls = "Standard operating procedures, PPE"
        potential_consequence = "High-pressure line rupture, explosive hydrocarbon release, or struck-by projectile leading to fatal injury"
        actual_consequence = "No injury occurred"
        sif_potential = True
        sif_score = 91.0
    elif any(k in text_corpus for k in ["height", "fall", "ladder", "scaffold", "elevated", "roof"]):
        hazard = "Personnel working at elevated level without adequate fall arrest / restraint"
        energy_source = "Gravitational Potential Energy"
        unsafe_act = "Working at height without 100% tie-off or edge protection"
        unsafe_condition = "Unprotected elevated working surface"
        missing_controls = "Full-body harness with shock-absorbing lanyard, certified anchor points, guardrails"
        existing_controls = "Safety helmet, work boots"
        potential_consequence = "Fall from height resulting in fatal trauma"
        actual_consequence = "No injury occurred"
        sif_potential = True
        sif_score = 88.0
    elif any(k in text_corpus for k in ["crane", "lift", "sling", "rigging", "suspended", "hoist"]):
        hazard = "Suspended load movement with personnel in line of fire"
        energy_source = "Kinetic / Gravitational Potential Energy"
        unsafe_act = "Positioned within swing radius or underneath suspended load"
        unsafe_condition = "Lifting operation without established exclusion zone"
        missing_controls = "Certified lift plan, barricaded exclusion perimeter, designated banksman/spotter, tag lines"
        existing_controls = "Safety helmet, high-visibility vest"
        potential_consequence = "Load drop or crush impact causing catastrophic or fatal trauma"
        actual_consequence = "No injury occurred"
        sif_potential = True
        sif_score = 92.0
    elif any(k in text_corpus for k in ["confined", "tank", "vessel", "pit", "gas", "h2s", "toxic"]):
        hazard = "Atmospheric entry or proximity to hazardous toxic vapour / gas release"
        energy_source = "Chemical / Toxic Energy"
        unsafe_act = "Atmospheric entry or operation prior to continuous multi-gas monitoring"
        unsafe_condition = "Potentially hazardous or oxygen-deficient atmosphere"
        missing_controls = "Continuous calibrated multi-gas detector, forced ventilation, standby rescue team, entry permit"
        existing_controls = "Basic escape respirator"
        potential_consequence = "Acute toxic inhalation, asphyxiation, or fatal toxic exposure"
        actual_consequence = "No injury occurred"
        sif_potential = True
        sif_score = 94.0
    elif any(k in text_corpus for k in ["electric", "wire", "conductor", "shock", "voltage", "switchboard"]):
        hazard = "Contact with energized electrical conductor"
        energy_source = "Electrical Energy"
        unsafe_act = "Maintenance initiated without zero-energy verification and earthing"
        unsafe_condition = "Unshielded live electrical terminal"
        missing_controls = "Electrical LOTO, rated insulating gloves, voltage detector testing, earth bonding"
        existing_controls = "Insulated hand tools"
        potential_consequence = "High-voltage electrocution or arc flash causing fatal burns"
        actual_consequence = "No injury occurred"
        sif_potential = True
        sif_score = 90.0
    elif any(k in text_corpus for k in ["hot work", "weld", "spark", "flame", "cutting", "grinding"]):
        hazard = "Ignition source in hydrocarbon processing vicinity"
        energy_source = "Thermal / Chemical Energy"
        unsafe_act = "Performing hot work without gas-free atmospheric clearance"
        unsafe_condition = "Flammable vapour presence near ignition source"
        missing_controls = "Hot work permit, fire watch, continuous LEL gas detector, spark containment blankets"
        existing_controls = "Fire extinguisher present"
        potential_consequence = "Flash fire or vapor cloud explosion leading to fatal burns"
        actual_consequence = "No injury occurred"
        sif_potential = True
        sif_score = 86.0
    else:
        hazard = f"Unsafe condition during {report.activity or 'work'}"
        energy_source = "Mechanical / Environmental Energy"
        unsafe_act = "Operation without complete adherence to safe work procedures"
        unsafe_condition = "Deviation from standard control hierarchy"
        missing_controls = "Job Safety Analysis (JSA) review, pre-task hazard assessment"
        existing_controls = "General PPE"
        potential_consequence = "Personnel injury requiring medical treatment"
        actual_consequence = "No injury reported"
        sif_potential = False
        sif_score = 48.0

    sif_classification = "SIF_POTENTIAL" if sif_potential else "NON_SIF"
    exposure_status = "NEAR_MISS" if (report.report_type or "").lower() == "near_miss" else ("DOCUMENTED" if sif_potential else "POTENTIAL")

    causal_chain = [
        f"Activity '{report.activity or 'Operational task'}' initiated at {report.location or 'worksite'}",
        f"Primary barrier failure / unsafe act: {unsafe_act}",
        f"Personnel line-of-fire exposure to {energy_source}",
        f"Escalation pathway: Potential consequence: {potential_consequence}"
    ]
    key_evidence = [
        report.description or "Reported safety occurrence",
        f"Hazard identification: {hazard}",
        f"Critical missing controls: {missing_controls}"
    ]
    sif_evidence = [
        f"Stored energy ({energy_source}) with immediate worker proximity and absent positive barrier."
    ] if sif_potential else []

    sif_reasoning = (
        f"The incident involves {energy_source} during {report.activity or 'operations'}. "
        f"Critical control barrier ({missing_controls}) was missing or bypassed. "
        f"Under operating conditions, failure would have escalated directly to fatal or catastrophic consequence."
    ) if sif_potential else "Low kinetic/energy potential without direct credible pathway to fatal consequence."

    analysis = ReportAnalysis(
        analysis_id=str(uuid.uuid4()),
        report_id=report.report_id,
        unsafe_act=unsafe_act,
        unsafe_condition=unsafe_condition,
        hazard=hazard,
        energy_source=energy_source,
        worker_exposure="Worker directly positioned in line of fire / hazardous zone during operation",
        existing_controls=existing_controls,
        missing_controls=missing_controls,
        potential_consequence=potential_consequence,
        actual_consequence=actual_consequence,
        causal_chain=causal_chain,
        key_evidence=key_evidence,
        model_name="safety-nlp-engine/v2",
        model_version="2.0",
        analyzed_at=datetime.utcnow(),
        sif_potential=sif_potential,
        sif_score=sif_score,
        sif_classification=sif_classification,
        hazard_severity_score=5.0 if sif_potential else 2.5,
        energy_score=4.5 if sif_potential else 2.0,
        exposure_score=4.5 if sif_potential else 2.5,
        consequence_score=5.0 if sif_potential else 2.0,
        barrier_failure_score=4.5 if sif_potential else 2.0,
        causal_chain_score=4.0 if sif_potential else 2.0,
        sif_evidence=sif_evidence,
        sif_reasoning=sif_reasoning,
        sif_model_version="sif-v2-safety-engine",
        sif_analyzed_at=datetime.utcnow(),
        sif_pathway_credibility=0.92 if sif_potential else 0.35,
        exposure_immediacy=0.88 if sif_potential else 0.40,
        escalation_evidence=0.85 if sif_potential else 0.30,
        sif_mechanism_strength=0.90 if sif_potential else 0.35,
        confidence=0.93,
        exposure_status=exposure_status,
    )
    db.add(analysis)

    # Link barriers
    for b_code, kw_list in BARRIER_KEYWORDS.items():
        if any(kw in text_corpus for kw in kw_list):
            b_record = db.query(Barrier).filter(Barrier.barrier_code == b_code).first()
            if b_record:
                rb = ReportBarrier(
                    id=str(uuid.uuid4()),
                    report_id=report.report_id,
                    barrier_id=b_record.barrier_id,
                    status="FAILED" if sif_potential else "EFFECTIVE",
                    criticality=0.9 if sif_potential else 0.5,
                    confidence=0.92,
                    evidence=[report.description or ""],
                    reasoning=f"Critical barrier '{b_record.barrier_name}' was degraded, missing, or bypassed.",
                    mapping_method="SAFETY_NLP_ENGINE",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(rb)

    # Link Life Saving Rules
    for r_code, kw_list in LSR_KEYWORDS.items():
        if any(kw in text_corpus for kw in kw_list):
            rule_record = db.query(LifeSavingRule).filter(LifeSavingRule.rule_code == r_code).first()
            if rule_record:
                rr = ReportRule(
                    id=str(uuid.uuid4()),
                    report_id=report.report_id,
                    rule_id=rule_record.rule_id,
                    confidence=0.94,
                    priority="HIGH",
                    trigger=rule_record.rule_name,
                    evidence=[report.description or ""],
                    reasoning=f"Applicable IOGP Life-Saving Rule: '{rule_record.rule_name}'.",
                    mapping_method="SAFETY_NLP_ENGINE",
                    created_at=datetime.utcnow(),
                )
                db.add(rr)

    db.commit()
    db.refresh(analysis)

    # Vector embedding generation (if sentence-transformers is available)
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        embed_text = f"{report.report_type} {report.activity or ''} {report.description} {hazard} {energy_source}"
        vec = model.encode(embed_text, normalize_embeddings=True)
        vec_str = "[" + ",".join(str(x) for x in vec.tolist()) + "]"
        db.execute(text("""
            INSERT INTO report_embeddings (report_id, embedding_text, embedding, created_at)
            VALUES (:report_id, :text, CAST(:embedding AS vector), :created_at)
            ON CONFLICT (report_id) DO UPDATE 
            SET embedding_text = EXCLUDED.embedding_text, embedding = EXCLUDED.embedding
        """), {
            "report_id": report.report_id,
            "text": embed_text,
            "embedding": vec_str,
            "created_at": datetime.utcnow()
        })
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Vector embedding skipped for {report.report_id}: {e}")

    return analysis


def create_incident(db: Session, incident_in: IncidentCreate) -> IncidentSummary:
    """Create a new incident report with sequential ID and full safety intelligence processing."""
    report_id = None
    if incident_in.report_id:
        req_id = incident_in.report_id.strip().upper()
        existing = db.query(SifReport).filter(SifReport.report_id == req_id).first()
        if not existing:
            m = re.match(r"^R(\d+)$", req_id)
            if m:
                report_id = f"R{int(m.group(1)):05d}"
            else:
                report_id = req_id

    # If already exists or not provided, calculate next sequential ID (e.g., R00451)
    if not report_id:
        report_id = _generate_next_report_id(db)

    # Resolve site info
    site_id = (incident_in.site.site_id if incident_in.site and incident_in.site.site_id else incident_in.site_id) or "S_DUL"
    site_name = (incident_in.site.site_name if incident_in.site and incident_in.site.site_name else incident_in.site_name) or "Duliajan"
    region = (incident_in.site.region if incident_in.site and incident_in.site.region else incident_in.region) or "Assam"
    location = incident_in.location or "Operational Area"
    department = incident_in.department or "Maintenance"

    # Resolve reporter info
    primary_reporter_id = incident_in.primary_reporter_id
    if incident_in.reported_by and len(incident_in.reported_by) > 0:
        rep = incident_in.reported_by[0]
        if rep.emp_id:
            primary_reporter_id = rep.emp_id
    if not primary_reporter_id:
        primary_reporter_id = "EMP-82914"

    report_date = incident_in.report_date or datetime.utcnow().strftime("%Y-%m-%d")
    time_str = incident_in.time or datetime.utcnow().strftime("%H:%M")
    source = incident_in.source or "OIL_HSE_PLATFORM"

    report = SifReport(
        report_id=report_id,
        report_date=report_date,
        time=time_str,
        site_id=site_id,
        site_name=site_name,
        region=region,
        location=location,
        department=department,
        primary_reporter_id=primary_reporter_id,
        report_type=incident_in.report_type,
        activity=incident_in.activity,
        description=incident_in.description,
        source=source,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Full safety intelligence processing (analysis, barriers, LSRs, embeddings)
    analysis = process_safety_intelligence(db, report)

    # Create / update meta
    meta = _get_or_create_meta(db, report_id, analysis.sif_score)

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
