import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
from sqlalchemy.orm import Session
from vector_store import PostgresManager, ReportRecord, ReportAnalysis, ReportRule
from models import ReportPayload
from ai.schemas import SafetyAnalysis
from ai.life_saving_rules.service import LifeSavingRuleService

def parse_args():
    parser = argparse.ArgumentParser(description="Batch map Life-Saving Rules to HSE reports.")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of reports to process.")
    parser.add_argument("--offset", type=int, default=0, help="Offset for processing.")
    parser.add_argument("--force", action="store_true", help="Force re-mapping even if report already has rules.")
    return parser.parse_args()

def main():
    args = parse_args()
    
    print(f"Starting batch mapping (Limit: {args.limit}, Offset: {args.offset}, Force: {args.force})")
    
    vector_store = PostgresManager()
    lsr_service = LifeSavingRuleService()
    
    db = vector_store.SessionLocal()
    
    try:
        # Get active taxonomy
        taxonomy = vector_store.get_active_life_saving_rules()
        if not taxonomy:
            print("Error: No active Life-Saving Rules found in database.")
            return
            
        print(f"Loaded taxonomy with {len(taxonomy)} active rules.")
        
        # Build query for reports that have NLP analysis
        query = db.query(ReportRecord, ReportAnalysis).join(
            ReportAnalysis, ReportRecord.report_id == ReportAnalysis.report_id
        )
        
        if not args.force:
            # Exclude reports that already have mapped rules
            subquery = db.query(ReportRule.report_id).distinct()
            query = query.filter(ReportRecord.report_id.notin_(subquery))
            
        # Apply order, offset, limit
        query = query.order_by(ReportRecord.report_date.desc(), ReportRecord.report_id)
        
        if args.offset:
            query = query.offset(args.offset)
            
        if args.limit:
            query = query.limit(args.limit)
            
        reports_to_process = query.all()
        total_reports = len(reports_to_process)
        
        print(f"Found {total_reports} reports to process.")
        
        success_count = 0
        failure_count = 0
        
        for idx, (record, analysis) in enumerate(reports_to_process, 1):
            report_id = record.report_id
            print(f"[{idx}/{total_reports}] Processing {report_id}...", end=" ")
            
            try:
                # Reconstruct payloads
                report_payload = ReportPayload(
                    report_id=record.report_id,
                    report_date=record.report_date,
                    time=record.time,
                    site={"site_id": record.site_id, "site_name": record.site_name, "region": record.region},
                    location=record.location,
                    department=record.department,
                    reported_by=[{"emp_id": record.primary_reporter_id, "name": "Unknown"}],
                    report_type=record.report_type,
                    activity=record.activity,
                    description=record.description,
                    source=record.source
                )
                
                safety_analysis = SafetyAnalysis(
                    unsafe_act=analysis.unsafe_act,
                    unsafe_condition=analysis.unsafe_condition,
                    hazard=analysis.hazard,
                    energy_source=analysis.energy_source,
                    worker_exposure=analysis.worker_exposure,
                    existing_controls=analysis.existing_controls,
                    missing_controls=analysis.missing_controls,
                    potential_consequence=analysis.potential_consequence,
                    causal_chain=analysis.causal_chain,
                    key_evidence=analysis.key_evidence
                )
                
                result = lsr_service.evaluate(report_payload, safety_analysis, taxonomy)
                
                if result['mapped_rules']:
                    vector_store.save_mapped_rules(report_id, result['mapped_rules'])
                    primary = result['primary_rule']
                    print(f"SUCCESS (Mapped: {len(result['mapped_rules'])} rules, Primary: {primary['rule_name']})")
                else:
                    print("SUCCESS (No mapped rules)")
                
                success_count += 1
                
            except Exception as e:
                print(f"FAILED: {e}")
                failure_count += 1
                continue
                
        print(f"\nBatch processing complete.")
        print(f"Total Processed: {total_reports}")
        print(f"Success: {success_count}")
        print(f"Failures: {failure_count}")

    finally:
        db.close()

if __name__ == "__main__":
    main()
