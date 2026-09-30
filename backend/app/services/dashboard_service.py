"""
Dashboard service: aggregations and trends from existing read-only tables.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from app.models.models import (
    ReportAnalysis, SifReport, ReportBarrier, ReportRule,
    Barrier, LifeSavingRule, IncidentAction, IncidentMeta
)
from app.schemas.schemas import (
    DashboardKPIs, DashboardTrends, TrendDataPoint, FacilityRisk,
    BarrierHealthSummary, LSRFrequency, ActivityHotspot
)
from app.services.safety_engine import calculate_priority
from datetime import datetime, timedelta


def get_dashboard_kpis(db: Session) -> DashboardKPIs:
    """Compute KPI cards for the Command Center."""
    # Total reports
    total = db.query(func.count(SifReport.report_id)).scalar() or 0

    # SIF potential
    sif_count = db.query(func.count(ReportAnalysis.report_id)).filter(
        ReportAnalysis.sif_potential == True
    ).scalar() or 0
    non_sif_count = db.query(func.count(ReportAnalysis.report_id)).filter(
        ReportAnalysis.sif_potential == False
    ).scalar() or 0

    # Priority breakdown from scores
    critical = db.query(func.count(ReportAnalysis.report_id)).filter(
        ReportAnalysis.sif_score >= 85
    ).scalar() or 0
    high = db.query(func.count(ReportAnalysis.report_id)).filter(
        ReportAnalysis.sif_score >= 70, ReportAnalysis.sif_score < 85
    ).scalar() or 0
    medium = db.query(func.count(ReportAnalysis.report_id)).filter(
        ReportAnalysis.sif_score >= 50, ReportAnalysis.sif_score < 70
    ).scalar() or 0
    low = db.query(func.count(ReportAnalysis.report_id)).filter(
        ReportAnalysis.sif_score < 50
    ).scalar() or 0

    # Exposure statuses
    documented = db.query(func.count(ReportAnalysis.report_id)).filter(
        ReportAnalysis.exposure_status == "DOCUMENTED_EXPOSURE"
    ).scalar() or 0
    potential = db.query(func.count(ReportAnalysis.report_id)).filter(
        ReportAnalysis.exposure_status == "POTENTIAL_EXPOSURE"
    ).scalar() or 0
    near_miss = db.query(func.count(ReportAnalysis.report_id)).filter(
        ReportAnalysis.exposure_status == "NEAR_MISS_EXPOSURE"
    ).scalar() or 0

    # Avg SIF score
    avg_score = db.query(func.avg(ReportAnalysis.sif_score)).scalar() or 0.0

    # Actions
    open_actions = db.query(func.count(IncidentAction.id)).filter(
        IncidentAction.status.notin_(["CLOSED"])
    ).scalar() or 0

    # Barriers
    failed_barriers = db.query(func.count(ReportBarrier.id)).filter(
        ReportBarrier.status.in_(["FAILED", "BYPASSED"])
    ).scalar() or 0
    total_barriers = db.query(func.count(ReportBarrier.id)).scalar() or 0
    lsr_mappings = db.query(func.count(ReportRule.id)).scalar() or 0

    return DashboardKPIs(
        total_reports=total,
        sif_potential_count=sif_count,
        non_sif_count=non_sif_count,
        critical_count=critical,
        high_count=high,
        medium_count=medium,
        low_count=low,
        documented_exposure=documented,
        potential_exposure=potential,
        near_miss_exposure=near_miss,
        avg_sif_score=round(float(avg_score), 1),
        open_actions=open_actions,
        overdue_actions=0,  # Would need due_date comparison
        failed_barriers=failed_barriers,
        total_barrier_mappings=total_barriers,
        lsr_mappings=lsr_mappings,
    )


def get_dashboard_trends(db: Session) -> DashboardTrends:
    """Compute trend data for charts."""
    # Facility risk breakdown
    facility_rows = (
        db.query(
            SifReport.site_name,
            func.count(SifReport.report_id).label("total"),
            func.count(ReportAnalysis.report_id).filter(ReportAnalysis.sif_potential == True).label("sif_count"),
            func.avg(ReportAnalysis.sif_score).label("avg_score"),
            func.count(ReportAnalysis.report_id).filter(ReportAnalysis.sif_score >= 85).label("critical"),
        )
        .outerjoin(ReportAnalysis, SifReport.report_id == ReportAnalysis.report_id)
        .filter(SifReport.site_name.isnot(None))
        .group_by(SifReport.site_name)
        .order_by(func.avg(ReportAnalysis.sif_score).desc().nullslast())
        .limit(15)
        .all()
    )

    facility_risk = [
        FacilityRisk(
            site_name=r.site_name or "Unknown",
            total=r.total,
            sif_potential=r.sif_count or 0,
            avg_score=round(float(r.avg_score or 0), 1),
            critical_count=r.critical or 0,
        )
        for r in facility_rows
    ]

    # Barrier health summary
    barrier_rows = (
        db.query(
            Barrier.barrier_name,
            Barrier.barrier_code,
            Barrier.barrier_type,
            func.count(ReportBarrier.id).label("total"),
            func.count(ReportBarrier.id).filter(ReportBarrier.status == "FAILED").label("failed"),
            func.count(ReportBarrier.id).filter(ReportBarrier.status == "BYPASSED").label("bypassed"),
            func.count(ReportBarrier.id).filter(ReportBarrier.status == "EFFECTIVE").label("effective"),
        )
        .join(ReportBarrier, Barrier.barrier_id == ReportBarrier.barrier_id)
        .group_by(Barrier.barrier_name, Barrier.barrier_code, Barrier.barrier_type)
        .all()
    )

    barrier_health = [
        BarrierHealthSummary(
            barrier_name=r.barrier_name,
            barrier_code=r.barrier_code,
            barrier_type=r.barrier_type,
            total=r.total,
            failed=r.failed or 0,
            bypassed=r.bypassed or 0,
            effective=r.effective or 0,
            failure_rate=round((r.failed or 0) / r.total * 100 if r.total else 0, 1),
        )
        for r in barrier_rows
    ]

    # LSR frequency
    lsr_rows = (
        db.query(
            LifeSavingRule.rule_name,
            LifeSavingRule.rule_code,
            func.count(ReportRule.id).label("total"),
            func.count(ReportRule.id).filter(ReportRule.priority == "PRIMARY").label("primary_count"),
            func.avg(ReportRule.confidence).label("avg_confidence"),
        )
        .join(ReportRule, LifeSavingRule.rule_id == ReportRule.rule_id)
        .group_by(LifeSavingRule.rule_name, LifeSavingRule.rule_code)
        .order_by(func.count(ReportRule.id).desc())
        .all()
    )

    lsr_frequency = [
        LSRFrequency(
            rule_name=r.rule_name,
            rule_code=r.rule_code,
            total=r.total,
            primary_count=r.primary_count or 0,
            avg_confidence=round(float(r.avg_confidence or 0), 1),
        )
        for r in lsr_rows
    ]

    # Activity hotspots
    activity_rows = (
        db.query(
            SifReport.activity,
            func.count(SifReport.report_id).label("total"),
            func.count(ReportAnalysis.report_id).filter(ReportAnalysis.sif_potential == True).label("sif_count"),
            func.avg(ReportAnalysis.sif_score).label("avg_score"),
        )
        .outerjoin(ReportAnalysis, SifReport.report_id == ReportAnalysis.report_id)
        .filter(SifReport.activity.isnot(None))
        .group_by(SifReport.activity)
        .order_by(func.count(SifReport.report_id).desc())
        .limit(10)
        .all()
    )

    activity_hotspots = [
        ActivityHotspot(
            activity=r.activity,
            total=r.total,
            sif_count=r.sif_count or 0,
            avg_score=round(float(r.avg_score or 0), 1),
        )
        for r in activity_rows
    ]

    # SIF score distribution (buckets)
    score_dist = []
    buckets = [(0, 50, "Low"), (50, 70, "Medium"), (70, 85, "High"), (85, 101, "Critical")]
    for lo, hi, label in buckets:
        count = db.query(func.count(ReportAnalysis.analysis_id)).filter(
            ReportAnalysis.sif_score >= lo,
            ReportAnalysis.sif_score < hi,
        ).scalar() or 0
        score_dist.append({"range": label, "count": count, "min": lo, "max": hi})

    # Priority distribution
    priority_dist = [
        {"priority": "CRITICAL", "count": score_dist[3]["count"]},
        {"priority": "HIGH", "count": score_dist[2]["count"]},
        {"priority": "MEDIUM", "count": score_dist[1]["count"]},
        {"priority": "LOW", "count": score_dist[0]["count"]},
    ]

    # Exposure distribution
    exposure_types = ["DOCUMENTED_EXPOSURE", "POTENTIAL_EXPOSURE", "NEAR_MISS_EXPOSURE", "NO_DOCUMENTED_EXPOSURE"]
    exposure_dist = []
    for et in exposure_types:
        cnt = db.query(func.count(ReportAnalysis.analysis_id)).filter(
            ReportAnalysis.exposure_status == et
        ).scalar() or 0
        exposure_dist.append({"type": et.replace("_", " ").title(), "count": cnt})

    # Monthly trend (using report_date if available)
    monthly_trend = _build_monthly_trend(db)

    return DashboardTrends(
        monthly_trend=monthly_trend,
        facility_risk=facility_risk,
        barrier_health=barrier_health,
        lsr_frequency=lsr_frequency,
        activity_hotspots=activity_hotspots,
        sif_score_distribution=score_dist,
        priority_distribution=priority_dist,
        exposure_distribution=exposure_dist,
    )


def _build_monthly_trend(db: Session) -> List[TrendDataPoint]:
    """Build monthly trend from report dates."""
    try:
        rows = db.execute(text("""
            SELECT 
                SUBSTRING(sr.report_date, 1, 7) as month,
                COUNT(*) as total,
                COUNT(CASE WHEN ra.sif_potential = true THEN 1 END) as sif_count,
                AVG(ra.sif_score) as avg_score
            FROM sif_reports sr
            LEFT JOIN report_analysis ra ON sr.report_id = ra.report_id
            WHERE sr.report_date IS NOT NULL AND LENGTH(sr.report_date) >= 7
            GROUP BY SUBSTRING(sr.report_date, 1, 7)
            ORDER BY month DESC
            LIMIT 12
        """)).fetchall()

        trend = []
        for r in reversed(rows):
            trend.append(TrendDataPoint(
                period=r[0] or "Unknown",
                sif_count=r[2] or 0,
                non_sif_count=(r[1] or 0) - (r[2] or 0),
                avg_score=round(float(r[3] or 0), 1),
            ))
        return trend
    except Exception:
        return []
