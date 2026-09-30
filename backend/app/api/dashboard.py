from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.schemas import DashboardKPIs, DashboardTrends
from app.services.dashboard_service import get_dashboard_kpis, get_dashboard_trends
from app.core.security import get_current_hse_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_hse_user)])


@router.get("/summary", response_model=DashboardKPIs)
def dashboard_summary(db: Session = Depends(get_db)):
    """Get KPI summary for Command Center."""
    return get_dashboard_kpis(db)


@router.get("/trends", response_model=DashboardTrends)
def dashboard_trends(db: Session = Depends(get_db)):
    """Get trend data and charts data."""
    return get_dashboard_trends(db)
