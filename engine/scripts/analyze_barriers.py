import sys
import os
import time
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
from sqlalchemy.orm import Session
from vector_store import PostgresManager, ReportRecord, ReportAnalysis, ReportRule, LifeSavingRule, ReportBarrier
from models import ReportPayload
from ai.barriers.service import BarrierService

def parse_args():
    parser = argparse.ArgumentParser(description="Batch map Barrier Analysis to HSE reports.")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of reports to process.")
    parser.add_argument("--offset", type=int, default=0, help="Offset for processing.")
    parser.add_argument("--force", action="store_true", help="Force re-mapping even if report already has barriers.")
    parser.add_argument("--report-id", type=str, default=None, help="Process a specific report ID.")
    return parser.parse_args()

def main():
    args = parse_args()
    
    print(f"Starting batch barrier mapping (Limit: {args.limit}, Offset: {args.offset}, Force: {args.force}, Report: {args.report_id})")
    
    vector_store = PostgresManager()
    barrier_service = BarrierService()
    
    db = vector_store.SessionLocal()
    
    try:
        # Get active taxonomy
        taxonomy = vector_store.get_active_barriers()
        if not taxonomy:
            print("Error: No active Barriers found in database.")
            return
            
        print(f"Loaded taxonomy with {len(taxonomy)} active barriers.")
        
        # Build query for reports that have NLP analysis
        query = db.query(ReportRecord.report_id)
        
        if args.report_id:
            query = query.filter(ReportRecord.report_id == args.report_id)
        else:
            if not args.force:
                # Exclude reports that already have mapped barriers
                subquery = db.query(ReportBarrier.report_id).distinct()
                query = query.filter(ReportRecord.report_id.notin_(subquery))
                
            query = query.order_by(ReportRecord.report_date.desc(), ReportRecord.report_id)
            
            if args.offset:
                query = query.offset(args.offset)
                
            if args.limit:
                query = query.limit(args.limit)
                
        # Fetch IDs first to avoid keeping the cursor open during long LLM calls
        report_ids = [r[0] for r in query.all()]
        total_reports = len(report_ids)
        
        print(f"Found {total_reports} reports to process.")
    finally:
        db.close() # Close initial connection

    success_count = 0
    failure_count = 0
    
    for idx, report_id in enumerate(report_ids, 1):
        print(f"[{idx}/{total_reports}] Processing {report_id}...", end=" ")
        
        db = vector_store.SessionLocal()
        try:
            # Re-fetch data for this specific report
            record = db.query(ReportRecord).filter(ReportRecord.report_id == report_id).first()
            analysis = db.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
            
            if not analysis:
                print("FAILED (No NLP analysis found)")
                failure_count += 1
                continue

            rules = db.query(ReportRule, LifeSavingRule).join(
                LifeSavingRule, ReportRule.rule_id == LifeSavingRule.rule_id
            ).filter(ReportRule.report_id == report_id).all()
            
            lsr_mapping = [
                {
                    "rule_code": rule.rule_code,
                    "rule_name": rule.rule_name,
                    "confidence": rr.confidence,
                    "priority": rr.priority,
                    "evidence": rr.evidence
                } for rr, rule in rules
            ]

            nlp_dict = {
                "unsafe_act": analysis.unsafe_act,
                "unsafe_condition": analysis.unsafe_condition,
                "hazard": analysis.hazard,
                "energy_source": analysis.energy_source,
                "worker_exposure": analysis.worker_exposure,
                "existing_controls": analysis.existing_controls,
                "missing_controls": analysis.missing_controls,
                "potential_consequence": analysis.potential_consequence,
                "actual_consequence": analysis.actual_consequence,
                "causal_chain": analysis.causal_chain,
                "key_evidence": analysis.key_evidence
            }
            
            sif_dict = {
                "sif_potential": analysis.sif_potential,
                "exposure_status": analysis.exposure_status,
                "sif_pathway_credibility": analysis.sif_pathway_credibility,
                "exposure_immediacy": analysis.exposure_immediacy,
                "escalation_evidence": analysis.escalation_evidence,
                "sif_mechanism_strength": analysis.sif_mechanism_strength,
                "confidence": analysis.confidence
            }
            
            result = barrier_service.evaluate(
                report_desc=record.description,
                nlp_analysis=nlp_dict,
                sif_analysis=sif_dict,
                lsr_mapping=lsr_mapping,
                taxonomy=taxonomy
            )
            
            barrier_dicts = [b.dict() for b in result.barriers]
            vector_store.save_report_barriers(report_id, barrier_dicts)
            
            if result.primary_barrier_code:
                print(f"SUCCESS (Mapped {len(barrier_dicts)} barriers, Primary: {result.primary_barrier_code})")
            else:
                print(f"SUCCESS (Mapped {len(barrier_dicts)} barriers, No Primary)")
                
            success_count += 1
            
        except Exception as e:
            print(f"FAILED: {e}")
            failure_count += 1
        finally:
            db.close() # Cleanly close the per-report connection
            
        # Hard sleep to prevent exceeding the Groq 1000 OTPM rate limit
        time.sleep(22)
            
    print(f"\nBatch processing complete.")
    print(f"Total Processed: {total_reports}")
    print(f"Success: {success_count}")
    print(f"Failures: {failure_count}")

if __name__ == "__main__":
    main()
