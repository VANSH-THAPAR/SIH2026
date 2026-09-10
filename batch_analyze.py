import time
import json
from datetime import datetime
from models import ReportPayload, Site, Reporter
from vector_store import PostgresManager, ReportRecord, ReportAnalysis
from ai.analyzer import SafetyAnalyzer
from ai.sif.service import SIFService

def main():
    print("Initializing Postgres Manager...")
    vector_store = PostgresManager()
    
    print("Initializing AI Analyzer...")
    analyzer = SafetyAnalyzer()
    
    print("Initializing SIF Service...")
    sif_service = SIFService()
    
    db = vector_store.SessionLocal()
    
    try:
        # 1. Find all reports that don't have an analysis yet
        # We do a LEFT JOIN and filter where analysis_id is None OR sif_potential is None
        unprocessed_reports = db.query(ReportRecord).outerjoin(
            ReportAnalysis, ReportRecord.report_id == ReportAnalysis.report_id
        ).filter(
            (ReportAnalysis.analysis_id == None) | (ReportAnalysis.sif_potential == None)
        ).all()
        
        total_reports = len(unprocessed_reports)
        print(f"Found {total_reports} reports that need AI analysis.")
        
        if total_reports == 0:
            print("All reports have already been analyzed!")
            return
            
        # 2. Batch processing settings
        BATCH_SIZE = 5
        SLEEP_BETWEEN_BATCHES = 10  # Seconds to sleep to avoid Groq rate limits
        
        success_count = 0
        fail_count = 0
        
        for i in range(0, total_reports, BATCH_SIZE):
            batch = unprocessed_reports[i:i+BATCH_SIZE]
            print(f"\n--- Processing Batch {i//BATCH_SIZE + 1}/{(total_reports // BATCH_SIZE) + 1} (Reports {i+1} to {min(i+BATCH_SIZE, total_reports)}) ---")
            
            for record in batch:
                print(f"Analyzing {record.report_id}...", end=" ")
                
                # Convert SQLAlchemy record back to Pydantic payload for the analyzer
                # Note: We create mock Reporter/Site objects since the analyzer only needs the text fields
                report_payload = ReportPayload(
                    report_id=record.report_id,
                    report_date=record.report_date or "Unknown",
                    time=record.time or "Unknown",
                    site=Site(site_id=record.site_id or "UNK", site_name=record.site_name or "Unknown", region=record.region or "Unknown"),
                    location=record.location or "Unknown",
                    department=record.department or "Unknown",
                    reported_by=[Reporter(emp_id=record.primary_reporter_id or "UNK", name="Unknown")],
                    report_type=record.report_type or "observation",
                    activity=record.activity or "Unknown",
                    description=record.description or "",
                    source=record.source or "Unknown"
                )
                
                analysis, model_name = analyzer.analyze(report_payload)
                
                if analysis:
                    # Save analysis
                    vector_store.save_analysis(record.report_id, analysis.dict(), model_name)
                    
                    # Run SIF Analysis
                    sif_result = sif_service.evaluate(report_payload, analysis)
                    if sif_result:
                        vector_store.save_sif_analysis(record.report_id, sif_result.dict())
                    
                    # Create enriched text and save embedding
                    enriched_text = f"Activity: {report_payload.activity}\n" \
                                    f"Site: {report_payload.site.site_name}\n" \
                                    f"Region: {report_payload.site.region}\n" \
                                    f"Location: {report_payload.location}\n" \
                                    f"Department: {report_payload.department}\n" \
                                    f"Report Type: {report_payload.report_type}\n\n" \
                                    f"Unsafe Act: {analysis.unsafe_act}\n" \
                                    f"Hazard: {analysis.hazard}\n" \
                                    f"Energy Source: {analysis.energy_source}\n" \
                                    f"Worker Exposure: {analysis.worker_exposure}\n" \
                                    f"Existing Controls: {analysis.existing_controls}\n" \
                                    f"Missing Controls: {analysis.missing_controls}\n" \
                                    f"Potential Consequence: {analysis.potential_consequence}"
                                    
                    vector_store.save_enriched_embedding(record.report_id, enriched_text)
                    print("SUCCESS")
                    success_count += 1
                else:
                    print("FAILED")
                    fail_count += 1
            
            # Sleep to respect rate limits if there are more batches
            if i + BATCH_SIZE < total_reports:
                print(f"Batch complete. Sleeping for {SLEEP_BETWEEN_BATCHES} seconds to respect API rate limits...")
                time.sleep(SLEEP_BETWEEN_BATCHES)
                
        print("\n===========================================")
        print("BATCH PROCESSING COMPLETE")
        print(f"Total processed: {total_reports}")
        print(f"Successful analyses: {success_count}")
        print(f"Failed analyses: {fail_count}")
        print("===========================================")

    except Exception as e:
        print(f"An error occurred during batch processing: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
