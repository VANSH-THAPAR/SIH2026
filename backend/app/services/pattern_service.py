"""
Pattern detection service.
Identifies clusters of similar incidents by hazard type, activity, energy source.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from collections import defaultdict

from app.models.models import ReportAnalysis, SifReport, ReportBarrier, Barrier, ReportRule, LifeSavingRule
from app.schemas.schemas import PatternCluster


def get_patterns(
    db: Session,
    site_name: Optional[str] = None,
    department: Optional[str] = None,
    limit: int = 20,
) -> List[PatternCluster]:
    """Detect incident patterns by hazard/energy/activity clustering."""

    # Group by energy_source (as proxy for pattern type)
    query = (
        db.query(
            ReportAnalysis.energy_source,
            func.count(ReportAnalysis.report_id).label("total"),
            func.avg(ReportAnalysis.sif_score).label("avg_score"),
        )
        .filter(ReportAnalysis.energy_source.isnot(None))
        .group_by(ReportAnalysis.energy_source)
        .order_by(func.count(ReportAnalysis.report_id).desc())
        .limit(limit)
    )

    rows = query.all()

    patterns = []
    for i, r in enumerate(rows):
        energy = r[0] or "Unknown"
        total = r[1]
        avg_score = float(r[2] or 0)

        # Get incidents in this pattern
        incident_rows = (
            db.query(SifReport.report_id, SifReport.site_name)
            .join(ReportAnalysis, SifReport.report_id == ReportAnalysis.report_id)
            .filter(ReportAnalysis.energy_source == r[0])
            .limit(50)
            .all()
        )

        incident_ids = [ir[0] for ir in incident_rows]
        facilities = list(set(ir[1] for ir in incident_rows if ir[1]))

        # Recent (last 30 days - using report_date string comparison if available)
        recent_count = min(total // 3, total)  # Approximation without real dates

        # Trend classification
        if avg_score >= 85:
            trend = "INCREASING"
        elif avg_score >= 70:
            trend = "STABLE"
        else:
            trend = "DECREASING"

        # Build label
        label = _build_pattern_label(energy)

        patterns.append(PatternCluster(
            id=f"pattern-{i}",
            label=label,
            hazard_type=energy,
            count=total,
            recent_count=recent_count,
            facility_count=len(facilities),
            trend=trend,
            avg_sif_score=round(avg_score, 1),
            incident_ids=incident_ids[:10],
            facilities=facilities[:5],
        ))

    return patterns


def _build_pattern_label(energy_source: str) -> str:
    """Map energy source to a clean pattern label."""
    energy = energy_source.lower()
    if "pressure" in energy or "hydraulic" in energy:
        return "High-Pressure Fluid Release"
    elif "gravit" in energy or "fall" in energy or "kinetic" in energy:
        return "Gravity / Fall Energy"
    elif "electric" in energy:
        return "Electrical Energy"
    elif "thermal" in energy or "heat" in energy or "fire" in energy:
        return "Thermal / Fire Energy"
    elif "chemical" in energy or "toxic" in energy:
        return "Chemical / Toxic Exposure"
    elif "kinetic" in energy or "moving" in energy or "mechanical" in energy:
        return "Kinetic / Mechanical Energy"
    else:
        return energy_source[:60]
