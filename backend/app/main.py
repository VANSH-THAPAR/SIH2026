"""
FastAPI main application for SIF Precursor Intelligence.

Architecture:
React Frontend -> REST API -> FastAPI -> SQLAlchemy -> Neon PostgreSQL -> report_analysis

CRITICAL: report_analysis and related source tables are READ-ONLY.
Additive tables (incident_meta, incident_actions, etc.) are for application data.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import APP_NAME, APP_VERSION, ALLOWED_ORIGINS, DEBUG
from app.db.database import engine, Base
from app.api import incidents, actions, dashboard, search, controls, auth
from app.models.models import (
    IncidentMeta, IncidentAction, IncidentComment,
    ActivityLog, InterventionOutcome, User
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info(f"Starting {APP_NAME} v{APP_VERSION}")

    # Create ONLY additive tables - NEVER touch source tables
    try:
        Base.metadata.create_all(
            bind=engine,
            tables=[
                IncidentMeta.__table__,
                IncidentAction.__table__,
                IncidentComment.__table__,
                ActivityLog.__table__,
                InterventionOutcome.__table__,
                User.__table__,
            ]
        )
        logger.info("Additive application tables ready")
    except Exception as e:
        logger.error(f"Failed to create additive tables: {e}")

    # Verify connection and source data
    try:
        with engine.connect() as conn:
            count = conn.execute(text("SELECT COUNT(*) FROM report_analysis")).fetchone()[0]
            logger.info(f"✓ Connected to NeonDB. report_analysis has {count} records (READ-ONLY)")
            sif_count = conn.execute(text("SELECT COUNT(*) FROM sif_reports")).fetchone()[0]
            logger.info(f"✓ sif_reports has {sif_count} records (READ-ONLY)")
    except Exception as e:
        logger.error(f"DB connection error: {e}")

    yield
    logger.info("Shutting down...")


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="AI-Powered SIF Precursor Detection & Risk Intelligence",
    lifespan=lifespan,
    debug=DEBUG,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Routers
app.include_router(incidents.router)
app.include_router(actions.router)
app.include_router(dashboard.router)
app.include_router(search.router)
app.include_router(controls.router)
app.include_router(auth.router)


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "app": APP_NAME, "version": APP_VERSION}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.get("/")
def root():
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
