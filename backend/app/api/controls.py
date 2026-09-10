from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.db.database import get_db
from app.models.models import Barrier, LifeSavingRule, ReportBarrier, ReportRule
from app.schemas.schemas import BarrierCatalog, LSRCatalog
from app.services.pattern_service import get_patterns

router = APIRouter(tags=["controls"])


@router.get("/api/barriers", response_model=list[BarrierCatalog])
def list_barriers(db: Session = Depends(get_db)):
    """Get barrier catalog with usage statistics."""
    barriers = db.query(Barrier).filter(Barrier.active == True).all()
    
    # Count incidents per barrier
    usage = {
        r[0]: (r[1], r[2])
        for r in db.query(
            ReportBarrier.barrier_id,
            func.count(ReportBarrier.id).label("total"),
            func.count(ReportBarrier.id).filter(ReportBarrier.status.in_(["FAILED", "BYPASSED"])).label("failed"),
        ).group_by(ReportBarrier.barrier_id).all()
    }

    return [
        BarrierCatalog(
            barrier_id=b.barrier_id,
            barrier_code=b.barrier_code,
            barrier_name=b.barrier_name,
            barrier_type=b.barrier_type,
            description=b.description,
            active=b.active if b.active is not None else True,
            incident_count=usage.get(b.barrier_id, (0, 0))[0],
            failed_count=usage.get(b.barrier_id, (0, 0))[1],
        )
        for b in barriers
    ]


@router.get("/api/life-saving-rules", response_model=list[LSRCatalog])
def list_lsr(db: Session = Depends(get_db)):
    """Get Life-Saving Rules catalog with usage statistics."""
    rules = db.query(LifeSavingRule).filter(LifeSavingRule.active == True).all()
    
    usage = {
        r[0]: r[1]
        for r in db.query(
            ReportRule.rule_id,
            func.count(ReportRule.id).label("total"),
        ).group_by(ReportRule.rule_id).all()
    }

    return [
        LSRCatalog(
            rule_id=r.rule_id,
            rule_code=r.rule_code,
            rule_name=r.rule_name,
            description=r.description,
            active=r.active if r.active is not None else True,
            incident_count=usage.get(r.rule_id, 0),
        )
        for r in rules
    ]


@router.get("/api/patterns")
def list_patterns(
    site_name: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get detected incident patterns."""
    patterns = get_patterns(db, site_name=site_name, department=department, limit=limit)
    return {"patterns": patterns, "total": len(patterns)}
