from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.schemas.schemas import (
    IncidentListResponse, IncidentDetail, IncidentUpdate,
    IncidentCreate, IncidentSummary, ActionCreate, CommentCreate, CommentResponse,
    ActionSummary, ActivityEntry
)
from app.services import incident_service
from app.services.search_service import get_similar_incidents

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sif_only: Optional[bool] = Query(None),
    site_name: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sif_min: Optional[float] = Query(None),
    sif_max: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    """List incidents with filtering and pagination."""
    result = incident_service.get_incidents(
        db=db,
        page=page,
        page_size=page_size,
        priority=priority,
        status=status,
        sif_only=sif_only,
        site_name=site_name,
        department=department,
        report_type=report_type,
        search=search,
        sif_min=sif_min,
        sif_max=sif_max,
    )
    return IncidentListResponse(**result)


@router.post("", response_model=IncidentSummary, status_code=201)
@router.post("/ingest", response_model=IncidentSummary, status_code=201)
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db),
):
    """Create or ingest a new incident report."""
    return incident_service.create_incident(db, incident)


@router.get("/{report_id}", response_model=IncidentDetail)
def get_incident(report_id: str, db: Session = Depends(get_db)):
    """Get full incident detail."""
    incident = incident_service.get_incident_detail(db, report_id)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {report_id} not found")
    # Enrich with similar incidents
    similar = get_similar_incidents(db, report_id, limit=5)
    incident.similar_incidents = similar
    return incident


@router.put("/{report_id}")
def update_incident(
    report_id: str,
    update: IncidentUpdate,
    db: Session = Depends(get_db),
):
    """Update incident priority/status/assignment (additive metadata only)."""
    result = incident_service.update_incident(db, report_id, update)
    if not result:
        raise HTTPException(status_code=404, detail=f"Incident {report_id} not found")
    return result


@router.get("/{report_id}/actions", response_model=list[ActionSummary])
def get_incident_actions(report_id: str, db: Session = Depends(get_db)):
    """Get actions for an incident."""
    return incident_service.get_actions(db, report_id=report_id)


@router.post("/{report_id}/actions", response_model=ActionSummary, status_code=201)
def create_incident_action(
    report_id: str,
    action: ActionCreate,
    db: Session = Depends(get_db),
):
    """Create a new action for an incident."""
    action.report_id = report_id
    return incident_service.create_action(db, action)


@router.post("/{report_id}/comments", response_model=CommentResponse, status_code=201)
def add_comment(
    report_id: str,
    comment: CommentCreate,
    db: Session = Depends(get_db),
):
    """Add a comment to an incident."""
    return incident_service.add_comment(db, report_id, comment)


@router.get("/{report_id}/comments", response_model=list[CommentResponse])
def get_comments(report_id: str, db: Session = Depends(get_db)):
    """Get comments for an incident."""
    return incident_service.get_comments(db, report_id)


@router.get("/{report_id}/activity", response_model=list[ActivityEntry])
def get_activity(report_id: str, db: Session = Depends(get_db)):
    """Get activity timeline for an incident."""
    return incident_service.get_activity_log(db, report_id)


@router.get("/{report_id}/similar")
def get_similar(report_id: str, limit: int = Query(5, ge=1, le=20), db: Session = Depends(get_db)):
    """Get similar incidents using semantic search."""
    return get_similar_incidents(db, report_id, limit=limit)
