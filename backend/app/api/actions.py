from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.schemas.schemas import (
    ActionSummary, ActionUpdate, OutcomeCreate, OutcomeResponse
)
from app.services import incident_service
from app.models.models import InterventionOutcome
from datetime import datetime
import uuid
from app.core.security import get_current_hse_user

router = APIRouter(prefix="/api/actions", tags=["actions"], dependencies=[Depends(get_current_hse_user)])


@router.get("", response_model=list[ActionSummary])
def list_actions(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    report_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List all actions with optional filters."""
    actions = incident_service.get_actions(db, report_id=report_id)
    if status:
        actions = [a for a in actions if a.status == status.upper()]
    if priority:
        actions = [a for a in actions if a.priority == priority.upper()]
    return actions


@router.put("/{action_id}", response_model=ActionSummary)
def update_action(
    action_id: str,
    update: ActionUpdate,
    db: Session = Depends(get_db),
):
    """Update an action."""
    from fastapi import HTTPException
    result = incident_service.update_action(db, action_id, update)
    if not result:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    return result


@router.post("/{action_id}/outcomes", response_model=OutcomeResponse, status_code=201)
def record_outcome(
    action_id: str,
    outcome: OutcomeCreate,
    db: Session = Depends(get_db),
):
    """Record an intervention outcome for an action."""
    db_outcome = InterventionOutcome(
        id=str(uuid.uuid4()),
        action_id=action_id,
        report_id=outcome.report_id,
        effectiveness=outcome.effectiveness,
        before_sif_score=outcome.before_sif_score,
        after_sif_score=outcome.after_sif_score,
        before_priority=outcome.before_priority,
        after_priority=outcome.after_priority,
        before_barrier_status=outcome.before_barrier_status,
        after_barrier_status=outcome.after_barrier_status,
        evidence=outcome.evidence,
        reviewer=outcome.reviewer,
        notes=outcome.notes,
        created_at=datetime.utcnow(),
    )
    db.add(db_outcome)
    db.commit()
    db.refresh(db_outcome)
    return OutcomeResponse(
        id=db_outcome.id,
        action_id=db_outcome.action_id,
        report_id=db_outcome.report_id,
        effectiveness=db_outcome.effectiveness,
        before_sif_score=db_outcome.before_sif_score,
        after_sif_score=db_outcome.after_sif_score,
        before_priority=db_outcome.before_priority,
        after_priority=db_outcome.after_priority,
        before_barrier_status=db_outcome.before_barrier_status,
        after_barrier_status=db_outcome.after_barrier_status,
        evidence=db_outcome.evidence,
        reviewer=db_outcome.reviewer,
        notes=db_outcome.notes,
        created_at=str(db_outcome.created_at),
    )
