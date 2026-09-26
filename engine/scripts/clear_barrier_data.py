"""Clean up empty/garbage barrier mappings from failed LLM runs, then re-run the batch."""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from vector_store import PostgresManager, ReportBarrier

vector_store = PostgresManager()
db = vector_store.SessionLocal()

try:
    # Count current entries
    total = db.query(ReportBarrier).count()
    print(f"Total ReportBarrier entries in DB: {total}")
    
    # Delete ALL entries (they're all garbage from failed schema runs)
    deleted = db.query(ReportBarrier).delete()
    db.commit()
    print(f"Deleted {deleted} garbage barrier entries.")
    
    # Verify
    remaining = db.query(ReportBarrier).count()
    print(f"Remaining entries: {remaining}")
    print("Done! You can now re-run: python scripts/analyze_barriers.py")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
