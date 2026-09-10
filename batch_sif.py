import time
from models import ReportPayload, Site, Reporter
from vector_store import PostgresManager, ReportRecord, ReportAnalysis
from ai.analyzer import SafetyAnalyzer
from ai.sif.service import SIFService
from ai.schemas import SafetyAnalysis

def run_with_backoff(func, *args, max_retries=10):
    delay = 15
    for attempt in range(max_retries):
        try:
            result = func(*args)
            if result is not None:
                if isinstance(result, tuple) and result[0] is None:
                    pass
                else:
                    return result
        except Exception as e:
            print(f"Exception calling AI: {e}")
            
        print(f"Call failed or returned None. Retrying in {delay}s... (Attempt {attempt+1}/{max_retries})")
        time.sleep(delay)
        delay *= 2
    return None

def main():
    print("Initializing Postgres Manager...")
    vector_store = PostgresManager()
    
    print("Initializing AI Analyzer...")
    analyzer = SafetyAnalyzer()
    
    print("Initializing SIF Service V3.1...")
    sif_service = SIFService()
    
    db = vector_store.SessionLocal()
    
    try:
        # Fetch all reports and their existing analysis (if any)
        results = db.query(ReportRecord, ReportAnalysis).outerjoin(
            ReportAnalysis, ReportRecord.report_id == ReportAnalysis.report_id
        ).order_by(ReportRecord.report_id).all()
        
        # The user requested to skip the first 441 reports
        results = results[441:]
        
        total_reports = len(results)
        print(f"Found {total_reports} reports in the database.")
        
        SLEEP_BETWEEN_BATCHES = 2 # Small sleep by default, we rely on backoff for 429s
        
        success_count = 0
        fail_count = 0
        
        for i, (record, db_analysis) in enumerate(results):
            print(f"\n--- Processing Report {i+1}/{total_reports}: {record.report_id} ---")
            
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
            
            analysis = None
            # Check if we already have NLP analysis
            if db_analysis and db_analysis.unsafe_act:
                print("Loaded existing NLP Analysis from DB.")
                analysis = SafetyAnalysis(
                    unsafe_act=db_analysis.unsafe_act,
                    unsafe_condition=db_analysis.unsafe_condition,
                    hazard=db_analysis.hazard,
                    energy_source=db_analysis.energy_source,
                    worker_exposure=db_analysis.worker_exposure,
                    existing_controls=db_analysis.existing_controls,
                    missing_controls=db_analysis.missing_controls,
                    potential_consequence=db_analysis.potential_consequence,
                    actual_consequence=db_analysis.actual_consequence,
                    causal_chain=db_analysis.causal_chain or [],
                    key_evidence=db_analysis.key_evidence or []
                )
            else:
                print("Running NLP Analyzer...", end=" ")
                analysis_res = run_with_backoff(analyzer.analyze, report_payload)
                if analysis_res:
                    analysis, model_name = analysis_res
                    vector_store.save_analysis(record.report_id, analysis.dict(), model_name)
                    print("SUCCESS")
                else:
                    print("FAILED")
            
            if analysis:
                # Check if we already ran SIF?
                if db_analysis and db_analysis.sif_potential is not None:
                    print("Already analyzed by SIF V3.1. Skipping.")
                    continue
                    
                print("Running SIF V3.1 Engine...", end=" ")
                sif_result = run_with_backoff(sif_service.evaluate, report_payload, analysis)
                if sif_result:
                    vector_store.save_sif_analysis(record.report_id, sif_result.dict())
                    print("SUCCESS")
                    success_count += 1
                else:
                    print("FAILED")
                    fail_count += 1
            else:
                fail_count += 1
                
            time.sleep(SLEEP_BETWEEN_BATCHES)
            
        print("\n===========================================")
        print("BATCH SIF PROCESSING COMPLETE")
        print(f"Total processed: {total_reports}")
        print(f"Successful SIF analyses: {success_count}")
        print(f"Failed SIF analyses: {fail_count}")
        print("===========================================")

    except Exception as e:
        print(f"An error occurred during batch processing: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
