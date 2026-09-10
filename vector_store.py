import os
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
from models import ReportPayload
from dotenv import load_dotenv

from sqlalchemy import create_engine, Column, String, Float, Text, text, ForeignKey, DateTime, Boolean
from sqlalchemy.types import JSON
from sqlalchemy.orm import sessionmaker, declarative_base
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

load_dotenv()

Base = declarative_base()
    
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
        
        print("Loading local SentenceTransformer model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

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
