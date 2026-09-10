from fastapi import FastAPI, HTTPException
from typing import List, Union
from models import ReportPayload, AnalysisResponse, HistoricalMatch, AnalysisMetadata
from vector_store import PostgresManager
from ai.analyzer import SafetyAnalyzer
from ai.sif.service import SIFService
from datetime import datetime

app = FastAPI(
    title="SIF Sentinel API",
    description="Early-warning system for Smart India Hackathon (SIH26165)",
    version="1.0.0"
)

# Initialize services
vector_store = PostgresManager()
safety_analyzer = SafetyAnalyzer()
sif_service = SIFService()

@app.post("/ingest", response_model=dict)
async def ingest_reports(reports: Union[ReportPayload, List[ReportPayload]]):
    """
    Accepts a single report or a list of reports, generates embeddings, 
    and upserts them to the database.
    """
    if isinstance(reports, ReportPayload):
        reports = [reports]
        
    success_count = 0
    failed_reports = []
    
    for report in reports:
        success = vector_store.upsert_report(report)
        if success:
            success_count += 1
        else:
            failed_reports.append(report.report_id)
            
    if failed_reports:
        return {
            "message": f"Successfully ingested {success_count} reports. Failed to ingest {len(failed_reports)} reports.",
            "failed_reports": failed_reports
        }
        
    return {"message": f"Successfully ingested {success_count} reports."}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_report(report: ReportPayload):
    """
    Accepts a new report, queries for similar historical reports, 
    runs AI/NLP safety analysis, and returns pattern intelligence.
    """
    # 1. Run AI/NLP Safety Analysis
    analysis, model_name = safety_analyzer.analyze(report)
    
    if not analysis:
        raise HTTPException(
            status_code=500, 
            detail="Failed to perform AI safety analysis. The AI model returned an invalid or missing response."
        )
        
    # Save structured analysis to DB
    vector_store.save_analysis(report.report_id, analysis.dict(), model_name)
    
    # 1.5 Run SIF Potential Analysis
    sif_result = sif_service.evaluate(report, analysis)
    if sif_result:
        vector_store.save_sif_analysis(report.report_id, sif_result.dict())
        
    # Create Enriched Document for semantic embedding
    enriched_text = f"Activity: {report.activity}\n" \
                    f"Site: {report.site.site_name}\n" \
                    f"Region: {report.site.region}\n" \
                    f"Location: {report.location}\n" \
                    f"Department: {report.department}\n" \
                    f"Report Type: {report.report_type}\n\n" \
                    f"Unsafe Act: {analysis.unsafe_act}\n" \
                    f"Hazard: {analysis.hazard}\n" \
                    f"Energy Source: {analysis.energy_source}\n" \
                    f"Worker Exposure: {analysis.worker_exposure}\n" \
                    f"Existing Controls: {analysis.existing_controls}\n" \
                    f"Missing Controls: {analysis.missing_controls}\n" \
                    f"Potential Consequence: {analysis.potential_consequence}"
                    
    vector_store.save_enriched_embedding(report.report_id, enriched_text)
    
    # 2. Search for similar historical reports
    # (Optional: can update search_similar to use report_embeddings table if needed, using description for now)
    similar_matches_data = vector_store.search_similar(report.description, top_k=5)
    
    historical_matches = [
        HistoricalMatch(**match_data) for match_data in similar_matches_data
    ]
    
    # 3. Construct Analysis Metadata
    metadata = AnalysisMetadata(
        report_id=report.report_id,
        model_name=model_name,
        analyzed_at=datetime.utcnow().isoformat()
    )
    
    # 4. Construct and return the analysis response
    response = AnalysisResponse(
        new_report=report,
        safety_analysis=analysis,
        sif_analysis=sif_result,
        analysis_metadata=metadata,
        historical_context=historical_matches
    )
    
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
