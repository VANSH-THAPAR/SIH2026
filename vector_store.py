import os
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
from models import ReportPayload
from dotenv import load_dotenv

from sqlalchemy import create_engine, Column, String, Float, Text, text
from sqlalchemy.orm import sessionmaker, declarative_base
from pgvector.sqlalchemy import Vector

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
