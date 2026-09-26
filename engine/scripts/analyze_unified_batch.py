"""
Batch script to run Unified Single-Pass Analysis on unprocessed reports using engine/ai/unified_service.py.
"""
import sys
import os
import time

# Add paths
current_dir = os.path.dirname(os.path.abspath(__file__))
engine_dir = os.path.dirname(current_dir)
root_dir = os.path.dirname(engine_dir)
sys.path.insert(0, root_dir)
sys.path.insert(0, os.path.join(root_dir, 'backend'))
sys.path.insert(0, engine_dir)

from engine.ai.unified_service import UnifiedSafetyAnalyzer
from backend.app.db.database import SessionLocal
from backend.app.models.models import SifReport, ReportAnalysis

def main(limit: int = 10):
    print("=" * 60)
    print("SIF Sentinel Engine: Batch Unified Single-Pass Processor")
    print("=" * 60)
    
    db = SessionLocal()
    analyzer = UnifiedSafetyAnalyzer()
    
    try:
        # Find reports in sif_reports that do not have an analysis in report_analysis
        unprocessed = db.query(SifReport).outerjoin(
            ReportAnalysis, SifReport.report_id == ReportAnalysis.report_id
        ).filter(ReportAnalysis.analysis_id == None).limit(limit).all()
        
        print(f"Found {len(unprocessed)} unprocessed reports (limit={limit}).")
        if not unprocessed:
            print("All reports are already analyzed!")
            return
            
        for i, rep in enumerate(unprocessed, 1):
            print(f"\n[{i}/{len(unprocessed)}] Processing {rep.report_id}...")
            payload = {
                "report_id": rep.report_id,
                "report_date": rep.report_date,
                "time": rep.time,
                "site_name": rep.site_name,
                "region": rep.region,
                "location": rep.location,
                "department": rep.department,
                "report_type": rep.report_type,
                "activity": rep.activity,
                "description": rep.description
            }
            start = time.time()
            result = analyzer.analyze(payload)
            analyzer.persist_to_db(db, payload, result)
            elapsed = time.time() - start
            print(f"  [OK] SIF={result['sif_potential']} | Score={result['sif_score']} | Rule={result['life_saving_rule'].get('rule_code')} | Took {elapsed:.2f}s")
            time.sleep(1) # respectful pause between requests
            
    finally:
        db.close()
        print("\nBatch processing completed successfully!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=5, help="Number of reports to process")
    args = parser.parse_args()
    main(limit=args.limit)
