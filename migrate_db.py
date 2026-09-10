import os
from dotenv import load_dotenv
import psycopg2

def migrate():
    load_dotenv()
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        return
        
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        columns_to_add = [
            ("sif_potential", "BOOLEAN"),
            ("sif_score", "REAL"),
            ("sif_classification", "VARCHAR"),
            ("hazard_severity_score", "REAL"),
            ("energy_score", "REAL"),
            ("exposure_score", "REAL"),
            ("consequence_score", "REAL"),
            ("barrier_failure_score", "REAL"),
            ("causal_chain_score", "REAL"),
            ("sif_evidence", "JSONB"),
            ("sif_reasoning", "TEXT"),
            ("sif_model_version", "VARCHAR"),
            ("sif_analyzed_at", "TIMESTAMP"),
            ("sif_pathway_credibility", "REAL"),
            ("exposure_immediacy", "REAL"),
            ("escalation_evidence", "REAL"),
            ("sif_mechanism_strength", "REAL"),
            ("confidence", "REAL"),
            ("exposure_status", "VARCHAR")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                cursor.execute(f"ALTER TABLE report_analysis ADD COLUMN {col_name} {col_type};")
                print(f"Added column {col_name}")
            except psycopg2.errors.DuplicateColumn:
                print(f"Column {col_name} already exists.")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")
                
        print("Migration complete!")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    migrate()
