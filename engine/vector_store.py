import os
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
from models import ReportPayload
from dotenv import load_dotenv

from sqlalchemy import create_engine, Column, String, Float, Text, text, ForeignKey, DateTime, Boolean, Integer
from sqlalchemy.types import JSON
from sqlalchemy.orm import sessionmaker, declarative_base
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

load_dotenv()

Base = declarative_base()

class ReportRecord(Base):
    __tablename__ = 'sif_reports'
    
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
    
    # pgvector embedding column (384 dimensions for all-MiniLM-L6-v2)
    embedding = Column(Vector(384))

class ReportAnalysis(Base):
    __tablename__ = 'report_analysis'
    
    analysis_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String, ForeignKey('sif_reports.report_id'))
    unsafe_act = Column(Text, nullable=True)
    unsafe_condition = Column(Text, nullable=True)
    hazard = Column(Text, nullable=True)
    energy_source = Column(Text, nullable=True)
    worker_exposure = Column(Text, nullable=True)
    existing_controls = Column(Text, nullable=True)
    missing_controls = Column(Text, nullable=True)
    potential_consequence = Column(Text, nullable=True)
    actual_consequence = Column(Text, nullable=True)
    causal_chain = Column(JSON, nullable=True)
    key_evidence = Column(JSON, nullable=True)
    model_name = Column(String, nullable=True)
    model_version = Column(String, nullable=True)
    analyzed_at = Column(DateTime, default=datetime.utcnow)
    
    # SIF Fields
    sif_potential = Column(Boolean, nullable=True)
    sif_score = Column(Float, nullable=True)
    sif_classification = Column(String, nullable=True)
    hazard_severity_score = Column(Float, nullable=True)
    energy_score = Column(Float, nullable=True)
    exposure_score = Column(Float, nullable=True)
    consequence_score = Column(Float, nullable=True)
    barrier_failure_score = Column(Float, nullable=True)
    causal_chain_score = Column(Float, nullable=True)
    sif_evidence = Column(JSON, nullable=True)
    sif_reasoning = Column(Text, nullable=True)
    sif_model_version = Column(String, nullable=True)
    sif_analyzed_at = Column(DateTime, nullable=True)
    
    # New SIF Dimensions
    sif_pathway_credibility = Column(Float, nullable=True)
    exposure_immediacy = Column(Float, nullable=True)
    escalation_evidence = Column(Float, nullable=True)
    sif_mechanism_strength = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    exposure_status = Column(String, nullable=True)

class ReportEmbedding(Base):
    __tablename__ = 'report_embeddings'
    
    report_id = Column(String, ForeignKey('sif_reports.report_id'), primary_key=True)
    embedding_text = Column(Text)
    embedding = Column(Vector(384))
    created_at = Column(DateTime, default=datetime.utcnow)

class LifeSavingRule(Base):
    __tablename__ = 'life_saving_rules'
    
    rule_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    rule_code = Column(String, unique=True, nullable=False)
    rule_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReportRule(Base):
    __tablename__ = 'report_rules'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String, ForeignKey('sif_reports.report_id'), nullable=False)
    rule_id = Column(String, ForeignKey('life_saving_rules.rule_id'), nullable=False)
    confidence = Column(Float, nullable=False)
    priority = Column(String, nullable=False) # PRIMARY or SECONDARY
    trigger = Column(Text, nullable=True)
    evidence = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)
    mapping_method = Column(String, nullable=False, default='LLM+VALIDATION')
    created_at = Column(DateTime, default=datetime.utcnow)

class Barrier(Base):
    __tablename__ = 'barriers'
    
    barrier_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    barrier_code = Column(String, unique=True, nullable=False)
    barrier_name = Column(String, nullable=False)
    barrier_type = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReportBarrier(Base):
    __tablename__ = 'report_barriers'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String, ForeignKey('sif_reports.report_id'), nullable=False)
    barrier_id = Column(String, ForeignKey('barriers.barrier_id'), nullable=False)
    status = Column(String, nullable=False) # FAILED, MISSING, BYPASSED, WEAK, EFFECTIVE, NOT_DETERMINED, NOT_APPLICABLE
    criticality = Column(Float, nullable=True)
    confidence = Column(Float, nullable=False)
    evidence = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)
    mapping_method = Column(String, nullable=False, default='LLM+VALIDATION')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Pattern(Base):
    __tablename__ = 'patterns'
    
    pattern_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pattern_type = Column(String, nullable=False)
    pattern_key = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    region = Column(String, nullable=True)
    site_id = Column(String, nullable=True)
    site_name = Column(String, nullable=True)
    work_area = Column(String, nullable=True)
    activity = Column(String, nullable=True)
    sub_activity = Column(String, nullable=True)
    
    rule_code = Column(String, nullable=True)
    rule_name = Column(String, nullable=True)
    barrier_code = Column(String, nullable=True)
    barrier_name = Column(String, nullable=True)
    
    total_report_count = Column(Integer, default=0)
    sif_report_count = Column(Integer, default=0)
    sif_density = Column(Float, default=0.0)
    
    current_period_count = Column(Integer, default=0)
    previous_period_count = Column(Integer, default=0)
    trend = Column(String, nullable=True)
    trend_change_percent = Column(Float, default=0.0)
    
    recurrence_score = Column(Float, default=0.0)
    trend_score = Column(Float, default=0.0)
    barrier_criticality_score = Column(Float, default=0.0)
    site_concentration_score = Column(Float, default=0.0)
    
    pattern_score = Column(Float, default=0.0)
    priority_level = Column(String, nullable=True)
    
    first_detected = Column(DateTime, nullable=True)
    last_detected = Column(DateTime, nullable=True)
    
    site_count = Column(Integer, default=0)
    activity_count = Column(Integer, default=0)
    rule_count = Column(Integer, default=0)
    barrier_count = Column(Integer, default=0)
    
    similar_report_count = Column(Integer, default=0)
    
    evidence_report_ids = Column(JSON, nullable=True)
    
    llm_summary = Column(Text, nullable=True)
    llm_recommendation = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RiskPriority(Base):
    __tablename__ = 'risk_priorities'
    
    risk_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String, ForeignKey('sif_reports.report_id'), unique=True, nullable=False)
    
    individual_risk_score = Column(Float, default=0.0)
    pattern_risk_score = Column(Float, default=0.0)
    barrier_criticality_score = Column(Float, default=0.0)
    trend_score = Column(Float, default=0.0)
    
    final_priority_score = Column(Float, default=0.0)
    final_priority_level = Column(String, nullable=False)
    
    primary_pattern_id = Column(String, nullable=True)
    primary_pattern_score = Column(Float, nullable=True)
    primary_pattern_type = Column(String, nullable=True)
    primary_pattern_description = Column(Text, nullable=True)
    
    sif_potential = Column(Boolean, nullable=True)
    safety_floor_applied = Column(Boolean, default=False)
    calculation_version = Column(String, default="1.0")
    
    site_name = Column(String, nullable=True)
    activity = Column(String, nullable=True)
    work_area = Column(String, nullable=True)
    
    primary_rule = Column(String, nullable=True)
    primary_barrier = Column(String, nullable=True)
    
    reason_json = Column(JSON, nullable=True)
    
    calculated_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Intervention(Base):
    __tablename__ = 'interventions'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    intervention_id = Column(String, unique=True, default=lambda: f"INT-{uuid.uuid4().hex[:8].upper()}")
    report_id = Column(String, ForeignKey('sif_reports.report_id'), nullable=True)
    pattern_id = Column(String, ForeignKey('patterns.pattern_id'), nullable=True)
    
    intervention_type = Column(String, nullable=False) # IMMEDIATE_CORRECTIVE, CORRECTIVE, PREVENTIVE, SYSTEMIC, MONITORING
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)
    
    priority_level = Column(String, nullable=False) # Copied from Stage 6 (CRITICAL, HIGH, etc)
    intervention_urgency = Column(String, nullable=False) # IMMEDIATE, PRIORITY, CORRECTIVE, MONITOR
    
    site_id = Column(String, nullable=True)
    site_name = Column(String, nullable=True)
    activity = Column(String, nullable=True)
    work_area = Column(String, nullable=True)
    
    primary_lsr_code = Column(String, nullable=True)
    primary_barrier_code = Column(String, nullable=True)
    barrier_status = Column(String, nullable=True)
    
    evidence = Column(JSON, nullable=True)
    
    recommendation_source = Column(String, default="DETERMINISTIC_PLAYBOOK")
    model_name = Column(String, nullable=True)
    model_version = Column(String, nullable=True)
    
    status = Column(String, default="OPEN") # OPEN, CLOSED
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

class HSEAction(Base):
    __tablename__ = 'hse_actions'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    action_id = Column(String, unique=True, default=lambda: f"ACT-{uuid.uuid4().hex[:8].upper()}")
    intervention_id = Column(String, ForeignKey('interventions.id'), nullable=False)
    
    action_title = Column(String, nullable=False)
    action_description = Column(Text, nullable=True)
    
    owner_role = Column(String, default="UNASSIGNED")
    owner_department = Column(String, default="UNASSIGNED")
    
    due_date = Column(DateTime, nullable=True)
    
    status = Column(String, default="OPEN") # OPEN, IN_PROGRESS, PENDING_VERIFICATION, CLOSED, REOPENED
    priority = Column(String, nullable=False)
    
    completion_notes = Column(Text, nullable=True)
    completion_evidence = Column(JSON, nullable=True)
    
    escalation_level = Column(String, nullable=True) # LEVEL_1, LEVEL_2, LEVEL_3
    escalation_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class ActionVerification(Base):
    __tablename__ = 'action_verifications'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    action_id = Column(String, ForeignKey('hse_actions.id'), nullable=False)
    
    verification_status = Column(String, nullable=False) # PASSED, FAILED, NOT_VERIFIED
    verified_by = Column(String, default="UNASSIGNED")
    verification_date = Column(DateTime, default=datetime.utcnow)
    
    verification_notes = Column(Text, nullable=True)
    verification_evidence = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class PostgresManager:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/sif_db")
        # Ensure psycopg2 is used (SQLAlchemy dialect)
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
            
        self.engine = create_engine(db_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Ensure pgvector extension exists
        try:
            with self.engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
        except Exception as e:
            print(f"Warning: Could not create vector extension (might already exist or lack permissions): {e}")

        # Create table if it doesn't exist
        Base.metadata.create_all(bind=self.engine)
        
        # Seed LSR taxonomy
        self.seed_life_saving_rules()
        
        # Seed Barrier taxonomy
        self.seed_barriers()
        
        print("Loading local SentenceTransformer model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

    def seed_life_saving_rules(self):
        db = self.SessionLocal()
        try:
            # Check if rules already exist
            if db.query(LifeSavingRule).first():
                return
                
            # Initial taxonomy
            initial_rules = [
                {"rule_code": "ENERGY_ISOLATION", "rule_name": "Energy Isolation", "description": "Verify isolation and zero energy before work begins"},
                {"rule_code": "WORKING_AT_HEIGHT", "rule_name": "Working at Height", "description": "Protect yourself against a fall when working at height"},
                {"rule_code": "CONFINED_SPACE", "rule_name": "Confined Space", "description": "Obtain authorization before entering a confined space"},
                {"rule_code": "LINE_OF_FIRE", "rule_name": "Line of Fire", "description": "Keep yourself and others out of the line of fire"},
                {"rule_code": "HOT_WORK", "rule_name": "Hot Work", "description": "Control flammables and ignition sources"},
                {"rule_code": "LIFTING_OPERATIONS", "rule_name": "Lifting Operations", "description": "Plan lifting operations and control the area"},
                {"rule_code": "DRIVING_VEHICLE_SAFETY", "rule_name": "Driving / Vehicle Safety", "description": "Follow safe driving rules"},
                {"rule_code": "ELECTRICAL_SAFETY", "rule_name": "Electrical Safety", "description": "Protect against electrical hazards"},
                {"rule_code": "HAZARDOUS_SUBSTANCES", "rule_name": "Hazardous Substances / Toxic Gas", "description": "Control exposure to hazardous substances"}
            ]
            
            for rule in initial_rules:
                db.add(LifeSavingRule(**rule))
            db.commit()
            print("Successfully seeded initial Life-Saving Rule taxonomy.")
        except Exception as e:
            db.rollback()
            print(f"Error seeding life saving rules: {e}")
        finally:
            db.close()

    def upsert_report(self, report: ReportPayload) -> bool:
        db = self.SessionLocal()
        try:
            # Generate embedding
            embedding = self.model.encode(report.description).tolist()
            primary_reporter_id = report.reported_by[0].emp_id if report.reported_by else ""
            
            # Check if exists
            record = db.query(ReportRecord).filter(ReportRecord.report_id == report.report_id).first()
            
            if not record:
                record = ReportRecord(report_id=report.report_id)
                db.add(record)
                
            record.report_date = report.report_date
            record.time = report.time
            record.site_id = report.site.site_id
            record.site_name = report.site.site_name
            record.region = report.site.region
            record.location = report.location
            record.department = report.department
            record.primary_reporter_id = primary_reporter_id
            record.report_type = report.report_type
            record.activity = report.activity
            record.description = report.description
            record.source = report.source
            record.embedding = embedding
            
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error upserting report {report.report_id}: {e}")
            return False
        finally:
            db.close()

    def save_analysis(self, report_id: str, analysis_dict: dict, model_name: str) -> bool:
        db = self.SessionLocal()
        try:
            # Check if exists and update, or create new
            record = db.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
            if not record:
                record = ReportAnalysis(report_id=report_id)
                db.add(record)
                
            record.unsafe_act = analysis_dict.get('unsafe_act')
            record.unsafe_condition = analysis_dict.get('unsafe_condition')
            record.hazard = analysis_dict.get('hazard')
            record.energy_source = analysis_dict.get('energy_source')
            record.worker_exposure = analysis_dict.get('worker_exposure')
            record.existing_controls = analysis_dict.get('existing_controls')
            record.missing_controls = analysis_dict.get('missing_controls')
            record.potential_consequence = analysis_dict.get('potential_consequence')
            record.actual_consequence = analysis_dict.get('actual_consequence')
            record.causal_chain = analysis_dict.get('causal_chain', [])
            record.key_evidence = analysis_dict.get('key_evidence', [])
            record.model_name = model_name
            record.model_version = "1.0"
            record.analyzed_at = datetime.utcnow()
            
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error saving analysis for report {report_id}: {e}")
            return False
        finally:
            db.close()

    def save_sif_analysis(self, report_id: str, sif_dict: dict) -> bool:
        db = self.SessionLocal()
        try:
            record = db.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
            if not record:
                record = ReportAnalysis(report_id=report_id)
                db.add(record)
                
            record.sif_potential = sif_dict.get('sif_potential')
            record.sif_score = sif_dict.get('sif_score')
            record.sif_classification = sif_dict.get('classification')
            record.hazard_severity_score = sif_dict.get('hazard_severity')
            record.energy_score = sif_dict.get('energy_score')
            record.exposure_score = sif_dict.get('exposure_score')
            record.consequence_score = sif_dict.get('consequence_score')
            record.barrier_failure_score = sif_dict.get('barrier_failure_score')
            record.causal_chain_score = sif_dict.get('causal_chain_score')
            record.sif_evidence = sif_dict.get('key_evidence', [])
            record.sif_reasoning = sif_dict.get('reasoning')
            record.sif_model_version = sif_dict.get('model_version', 'sif-v1')
            record.sif_analyzed_at = datetime.utcnow()
            
            record.sif_pathway_credibility = sif_dict.get('sif_pathway_credibility')
            record.exposure_immediacy = sif_dict.get('exposure_immediacy')
            record.escalation_evidence = sif_dict.get('escalation_evidence')
            record.sif_mechanism_strength = sif_dict.get('sif_mechanism_strength')
            record.confidence = sif_dict.get('confidence')
            record.exposure_status = sif_dict.get('exposure_status')
            
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error saving SIF analysis for report {report_id}: {e}")
            return False
        finally:
            db.close()

    def save_enriched_embedding(self, report_id: str, enriched_text: str) -> bool:
        db = self.SessionLocal()
        try:
            embedding = self.model.encode(enriched_text).tolist()
            
            record = db.query(ReportEmbedding).filter(ReportEmbedding.report_id == report_id).first()
            if not record:
                record = ReportEmbedding(report_id=report_id)
                db.add(record)
                
            record.embedding_text = enriched_text
            record.embedding = embedding
            record.created_at = datetime.utcnow()
            
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error saving enriched embedding for report {report_id}: {e}")
            return False
        finally:
            db.close()

    def search_similar(self, description: str, top_k: int = 5) -> List[Dict[str, Any]]:
        db = self.SessionLocal()
        try:
            query_embedding = self.model.encode(description).tolist()
            
            # Query using pgvector cosine distance operator
            # Calculate distance and return it along with the record
            results = db.query(
                ReportRecord,
                ReportRecord.embedding.cosine_distance(query_embedding).label('distance')
            ).order_by(
                ReportRecord.embedding.cosine_distance(query_embedding)
            ).limit(top_k).all()
            
            matches = []
            for record, distance in results:
                # Score is roughly 1 - cosine_distance
                score = 1.0 - float(distance) if distance is not None else 0.0
                
                matches.append({
                    "report_id": record.report_id,
                    "score": score,
                    "description": record.description,
                    "site_name": record.site_name,
                    "activity": record.activity,
                    "report_date": record.report_date
                })
                
            return matches
        except Exception as e:
            print(f"Error searching similar reports: {e}")
            return []
        finally:
            db.close()

    def get_active_life_saving_rules(self) -> List[Dict[str, Any]]:
        db = self.SessionLocal()
        try:
            rules = db.query(LifeSavingRule).filter(LifeSavingRule.active == True).all()
            return [{"rule_id": r.rule_id, "rule_code": r.rule_code, "rule_name": r.rule_name, "description": r.description} for r in rules]
        except Exception as e:
            print(f"Error fetching LSR taxonomy: {e}")
            return []
        finally:
            db.close()

    def save_mapped_rules(self, report_id: str, mapped_rules: List[Dict[str, Any]]) -> bool:
        db = self.SessionLocal()
        try:
            # Clear existing mapped rules for this report
            db.query(ReportRule).filter(ReportRule.report_id == report_id).delete()
            
            for rule_data in mapped_rules:
                rule = db.query(LifeSavingRule).filter(LifeSavingRule.rule_code == rule_data['rule_code']).first()
                if not rule:
                    continue # Should be validated before, but safety net
                    
                report_rule = ReportRule(
                    report_id=report_id,
                    rule_id=rule.rule_id,
                    confidence=rule_data['confidence'],
                    priority=rule_data['priority'],
                    trigger=rule_data.get('trigger'),
                    evidence=rule_data.get('evidence', []),
                    reasoning=rule_data.get('reasoning')
                )
                db.add(report_rule)
            
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error saving mapped rules for report {report_id}: {e}")
            return False
        finally:
            db.close()

    def seed_barriers(self):
        db = self.SessionLocal()
        try:
            if db.query(Barrier).first():
                return
                
            initial_barriers = [
                {"barrier_code": "ENERGY_ISOLATION", "barrier_name": "Energy Isolation", "barrier_type": "HARDWARE"},
                {"barrier_code": "DEPRESSURIZATION", "barrier_name": "Depressurization / Pressure Control", "barrier_type": "HARDWARE"},
                {"barrier_code": "LOTO", "barrier_name": "Lockout / Tagout Verification", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "PTW", "barrier_name": "Permit to Work", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "GAS_TESTING", "barrier_name": "Gas Testing / Atmospheric Monitoring", "barrier_type": "DETECTION"},
                {"barrier_code": "GUARDING", "barrier_name": "Guarding / Machine Protection", "barrier_type": "HARDWARE"},
                {"barrier_code": "INTERLOCK", "barrier_name": "Interlock / Safety Instrumented Protection", "barrier_type": "HARDWARE"},
                {"barrier_code": "FALL_PROTECTION", "barrier_name": "Fall Protection", "barrier_type": "HARDWARE"},
                {"barrier_code": "SCAFFOLDING", "barrier_name": "Scaffolding / Edge Protection", "barrier_type": "HARDWARE"},
                {"barrier_code": "LIFTING_PLAN", "barrier_name": "Lifting Plan / Load Control", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "LIFTING_INSPECTION", "barrier_name": "Lifting Equipment Inspection", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "EXCLUSION_ZONE", "barrier_name": "Exclusion Zone", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "LINE_OF_FIRE", "barrier_name": "Line of Fire Control", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "TRAFFIC_SEGREGATION", "barrier_name": "Traffic / Vehicle Segregation", "barrier_type": "HARDWARE"},
                {"barrier_code": "ELECTRICAL_ISOLATION", "barrier_name": "Electrical Isolation", "barrier_type": "HARDWARE"},
                {"barrier_code": "ELECTRICAL_PROTECTION", "barrier_name": "Electrical Protection", "barrier_type": "HARDWARE"},
                {"barrier_code": "HOT_WORK", "barrier_name": "Hot Work Controls", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "CONFINED_SPACE", "barrier_name": "Confined Space Controls", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "CHEMICAL_CONTAINMENT", "barrier_name": "Chemical Containment", "barrier_type": "HARDWARE"},
                {"barrier_code": "PPE", "barrier_name": "PPE", "barrier_type": "PPE"},
                {"barrier_code": "ENGINEERING", "barrier_name": "Engineering Control", "barrier_type": "HARDWARE"},
                {"barrier_code": "ADMINISTRATIVE", "barrier_name": "Administrative Control", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "SUPERVISION", "barrier_name": "Supervision / Verification", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "PROCEDURE", "barrier_name": "Procedure / Work Instruction", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "COMPETENCY", "barrier_name": "Competency / Training", "barrier_type": "ADMINISTRATIVE"},
                {"barrier_code": "EMERGENCY_RESPONSE", "barrier_name": "Emergency Response", "barrier_type": "EMERGENCY"}
            ]
            
            for barrier in initial_barriers:
                db.add(Barrier(**barrier))
            db.commit()
            print("Successfully seeded initial Barrier taxonomy.")
        except Exception as e:
            db.rollback()
            print(f"Error seeding barriers: {e}")
        finally:
            db.close()

    def get_active_barriers(self) -> List[Dict[str, Any]]:
        db = self.SessionLocal()
        try:
            barriers = db.query(Barrier).filter(Barrier.active == True).all()
            return [{"barrier_id": b.barrier_id, "barrier_code": b.barrier_code, "barrier_name": b.barrier_name, "barrier_type": b.barrier_type} for b in barriers]
        except Exception as e:
            print(f"Error fetching Barrier taxonomy: {e}")
            return []
        finally:
            db.close()

    def save_report_barriers(self, report_id: str, mapped_barriers: List[Dict[str, Any]]) -> bool:
        db = self.SessionLocal()
        try:
            db.query(ReportBarrier).filter(ReportBarrier.report_id == report_id).delete()
            
            for barrier_data in mapped_barriers:
                barrier = db.query(Barrier).filter(Barrier.barrier_code == barrier_data['barrier_code']).first()
                if not barrier:
                    continue
                    
                report_barrier = ReportBarrier(
                    report_id=report_id,
                    barrier_id=barrier.barrier_id,
                    status=barrier_data['status'],
                    criticality=barrier_data.get('criticality'),
                    confidence=barrier_data['confidence'],
                    evidence=barrier_data.get('evidence', []),
                    reasoning=barrier_data.get('reasoning')
                )
                db.add(report_barrier)
            
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error saving report barriers for report {report_id}: {e}")
            return False
        finally:
            db.close()

    def save_pattern(self, pattern_data: dict) -> bool:
        db = self.SessionLocal()
        try:
            pattern_key = pattern_data['pattern_key']
            record = db.query(Pattern).filter(Pattern.pattern_key == pattern_key).first()
            if not record:
                record = Pattern(pattern_key=pattern_key)
                db.add(record)
            
            for key, value in pattern_data.items():
                if hasattr(record, key):
                    setattr(record, key, value)
                    
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error saving pattern {pattern_data.get('pattern_key')}: {e}")
            return False
        finally:
            db.close()

    def get_top_patterns(self, limit: int = 10):
        db = self.SessionLocal()
        try:
            patterns = db.query(Pattern).order_by(Pattern.pattern_score.desc()).limit(limit).all()
            return patterns
        except Exception as e:
            print(f"Error fetching top patterns: {e}")
            return []
        finally:
            db.close()
            
    def get_pattern(self, pattern_id: str):
        db = self.SessionLocal()
        try:
            pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
            return pattern
        except Exception as e:
            print(f"Error fetching pattern {pattern_id}: {e}")
            return None
        finally:
            db.close()
            
    def get_reports_by_ids(self, report_ids):
        db = self.SessionLocal()
        try:
            reports = db.query(ReportRecord).filter(ReportRecord.report_id.in_(report_ids)).all()
            return reports
        except Exception as e:
            print(f"Error fetching reports by ids: {e}")
            return []
        finally:
            db.close()

    def save_risk_priorities(self, priorities_data: List[dict]) -> bool:
        db = self.SessionLocal()
        try:
            for data in priorities_data:
                report_id = data['report_id']
                record = db.query(RiskPriority).filter(RiskPriority.report_id == report_id).first()
                if not record:
                    record = RiskPriority(report_id=report_id)
                    db.add(record)
                
                for key, value in data.items():
                    if hasattr(record, key):
                        setattr(record, key, value)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error saving risk priorities: {e}")
            return False
        finally:
            db.close()
            
    def save_risk_priorities_bulk(self, priorities_data: List[dict]) -> bool:
        """
        Fast batched upsert of risk priorities to avoid O(n^2) DB operations.
        Deletes existing rows for these reports first to ensure idempotency.
        """
        db = self.SessionLocal()
        try:
            report_ids = [d['report_id'] for d in priorities_data]
            # Delete existing priorities for these reports
            db.query(RiskPriority).filter(RiskPriority.report_id.in_(report_ids)).delete(synchronize_session=False)
            
            # Bulk insert
            db.bulk_insert_mappings(RiskPriority, priorities_data)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error bulk saving risk priorities: {e}")
            return False
        finally:
            db.close()

    def save_interventions_bulk(self, interventions_data: List[dict]) -> bool:
        db = self.SessionLocal()
        try:
            # We want idempotency based on report_id and pattern_id
            # For simplicity, if we pass intervention_id we could update, but bulk insert is faster
            # Interventions are additive or we wipe and rebuild in REBUILD mode
            report_ids = [d.get('report_id') for d in interventions_data if d.get('report_id')]
            if report_ids:
                db.query(Intervention).filter(Intervention.report_id.in_(report_ids)).delete(synchronize_session=False)
                
            db.bulk_insert_mappings(Intervention, interventions_data)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error bulk saving interventions: {e}")
            return False
        finally:
            db.close()

    def save_hse_actions_bulk(self, actions_data: List[dict]) -> bool:
        db = self.SessionLocal()
        try:
            db.bulk_insert_mappings(HSEAction, actions_data)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error bulk saving HSE actions: {e}")
            return False
        finally:
            db.close()

    def update_action_status(self, action_id: str, new_status: str, notes: str = None) -> bool:
        db = self.SessionLocal()
        try:
            action = db.query(HSEAction).filter(HSEAction.action_id == action_id).first()
            if action:
                action.status = new_status
                if notes:
                    action.completion_notes = notes
                if new_status == "CLOSED":
                    action.completed_at = datetime.utcnow()
                db.commit()
                return True
            return False
        except Exception as e:
            db.rollback()
            print(f"Error updating action {action_id}: {e}")
            return False
        finally:
            db.close()

    def save_action_verification(self, verification_data: dict) -> bool:
        db = self.SessionLocal()
        try:
            record = ActionVerification(**verification_data)
            db.add(record)
            
            # Also update action status
            action = db.query(HSEAction).filter(HSEAction.id == verification_data['action_id']).first()
            if action:
                if verification_data['verification_status'] == 'PASSED':
                    action.status = "CLOSED"
                    action.completed_at = datetime.utcnow()
                elif verification_data['verification_status'] == 'FAILED':
                    action.status = "REOPENED"
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error saving verification: {e}")
            return False
        finally:
            db.close()
            
    def get_interventions(self, limit: int = 50):
        db = self.SessionLocal()
        try:
            # Sort by created desc
            results = db.query(Intervention).order_by(Intervention.created_at.desc()).limit(limit).all()
            return results
        finally:
            db.close()
            
    def get_actions(self, limit: int = 50):
        db = self.SessionLocal()
        try:
            results = db.query(HSEAction).order_by(HSEAction.created_at.desc()).limit(limit).all()
            return results
        finally:
            db.close()
