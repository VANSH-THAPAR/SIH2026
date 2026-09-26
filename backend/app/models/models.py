from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime as dt
from app.db.database import Base


class ReportAnalysis(Base):
    """Maps to the existing report_analysis table - READ ONLY."""
    __tablename__ = "report_analysis"

    analysis_id = Column(String, primary_key=True)
    report_id = Column(String, index=True)
    unsafe_act = Column(Text)
    unsafe_condition = Column(Text)
    hazard = Column(Text)
    energy_source = Column(Text)
    worker_exposure = Column(Text)
    existing_controls = Column(Text)
    missing_controls = Column(Text)
    potential_consequence = Column(Text)
    actual_consequence = Column(Text)
    causal_chain = Column(JSON)
    key_evidence = Column(JSON)
    model_name = Column(String)
    model_version = Column(String)
    analyzed_at = Column(DateTime)
    sif_potential = Column(Boolean)
    sif_score = Column(Float)
    sif_classification = Column(String)
    hazard_severity_score = Column(Float)
    energy_score = Column(Float)
    exposure_score = Column(Float)
    consequence_score = Column(Float)
    barrier_failure_score = Column(Float)
    causal_chain_score = Column(Float)
    sif_evidence = Column(JSONB)
    sif_reasoning = Column(Text)
    sif_model_version = Column(String)
    sif_analyzed_at = Column(DateTime)
    sif_pathway_credibility = Column(Float)
    exposure_immediacy = Column(Float)
    escalation_evidence = Column(Float)
    sif_mechanism_strength = Column(Float)
    confidence = Column(Float)
    exposure_status = Column(String)


class SifReport(Base):
    """Maps to sif_reports table - the primary incident record table. READ ONLY."""
    __tablename__ = "sif_reports"

    report_id = Column(String, primary_key=True)
    report_date = Column(String)
    time = Column(String)
    site_id = Column(String)
    site_name = Column(String)
    region = Column(String)
    location = Column(String)
    department = Column(String)
    primary_reporter_id = Column(String)
    report_type = Column(String)
    activity = Column(String)
    description = Column(Text)
    source = Column(String)
    # embedding column excluded (pgvector type, handled separately)


class Barrier(Base):
    """Barrier catalog - READ ONLY."""
    __tablename__ = "barriers"

    barrier_id = Column(String, primary_key=True)
    barrier_code = Column(String)
    barrier_name = Column(String)
    barrier_type = Column(String)
    description = Column(Text)
    active = Column(Boolean)
    created_at = Column(DateTime)


class LifeSavingRule(Base):
    """Life Saving Rules catalog - READ ONLY."""
    __tablename__ = "life_saving_rules"

    rule_id = Column(String, primary_key=True)
    rule_code = Column(String)
    rule_name = Column(String)
    description = Column(Text)
    active = Column(Boolean)
    created_at = Column(DateTime)


class ReportBarrier(Base):
    """Report-to-barrier mappings - READ ONLY."""
    __tablename__ = "report_barriers"

    id = Column(String, primary_key=True)
    report_id = Column(String, index=True)
    barrier_id = Column(String)
    status = Column(String)
    criticality = Column(Float)
    confidence = Column(Float)
    evidence = Column(JSON)
    reasoning = Column(Text)
    mapping_method = Column(String)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class ReportRule(Base):
    """Report-to-LSR mappings - READ ONLY."""
    __tablename__ = "report_rules"

    id = Column(String, primary_key=True)
    report_id = Column(String, index=True)
    rule_id = Column(String)
    confidence = Column(Float)
    priority = Column(String)
    trigger = Column(Text)
    evidence = Column(JSON)
    reasoning = Column(Text)
    mapping_method = Column(String)
    created_at = Column(DateTime)


# =====================================================
# ADDITIVE TABLES - Application-specific data
# These are separate from source data and safe to write
# =====================================================

class IncidentMeta(Base):
    """Application-level metadata overlay for incidents. Additive only."""
    __tablename__ = "incident_meta"

    report_id = Column(String, primary_key=True)
    priority = Column(String, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String, default="OPEN")  # OPEN, INVESTIGATING, ACTION_REQUIRED, CLOSED
    assigned_to = Column(String)
    assigned_at = Column(DateTime)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class IncidentAction(Base):
    """Actions/interventions linked to incidents. Additive."""
    __tablename__ = "incident_actions"

    id = Column(String, primary_key=True)
    report_id = Column(String, index=True)
    title = Column(String)
    description = Column(Text)
    owner = Column(String)
    priority = Column(String, default="HIGH")
    status = Column(String, default="TODO")  # TODO, IN_PROGRESS, VERIFICATION, CLOSED
    due_date = Column(String)
    completed_at = Column(DateTime)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class IncidentComment(Base):
    """Comments on incidents. Additive."""
    __tablename__ = "incident_comments"

    id = Column(String, primary_key=True)
    report_id = Column(String, index=True)
    author = Column(String)
    content = Column(Text)
    created_at = Column(DateTime)


class ActivityLog(Base):
    """Audit log for incident activity. Additive."""
    __tablename__ = "activity_log"

    id = Column(String, primary_key=True)
    report_id = Column(String, index=True)
    action_id = Column(String)
    actor = Column(String)
    event_type = Column(String)
    event_data = Column(JSON)
    created_at = Column(DateTime)


class InterventionOutcome(Base):
    """Intervention effectiveness outcomes. Additive."""
    __tablename__ = "intervention_outcomes"

    id = Column(String, primary_key=True)
    action_id = Column(String, index=True)
    report_id = Column(String)
    effectiveness = Column(String)  # YES, PARTIALLY, NO
    before_sif_score = Column(Float)
    after_sif_score = Column(Float)
    before_priority = Column(String)
    after_priority = Column(String)
    before_barrier_status = Column(String)
    after_barrier_status = Column(String)
    evidence = Column(Text)
    reviewer = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime)

class User(Base):
    """Application user for authentication."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # 'hse' or 'reporter'
    created_at = Column(DateTime, default=dt.utcnow)

