from fastapi import FastAPI, HTTPException
from typing import List, Union
from models import ReportPayload, AnalysisResponse, HistoricalMatch
from vector_store import PostgresManager

app = FastAPI(
    title="SIF Sentinel API",
    description="Early-warning system for Smart India Hackathon (SIH26165)",
    version="1.0.0"
)

# Initialize vector store singleton
vector_store = PostgresManager()

@app.post("/ingest", response_model=dict)
async def ingest_reports(reports: Union[ReportPayload, List[ReportPayload]]):
    """
    Accepts a single report or a list of reports, generates embeddings, 
    and upserts them to Pinecone.
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
    Accepts a new report, queries Pinecone for similar historical reports, 
    and returns pattern intelligence.
    """
    # 1. Search for similar historical reports based on description
    similar_matches_data = vector_store.search_similar(report.description, top_k=5)
    
    # 2. Map dict output to Pydantic models
    historical_matches = [
        HistoricalMatch(**match_data) for match_data in similar_matches_data
    ]
    
    # 3. Construct and return the analysis response
    response = AnalysisResponse(
        new_report=report,
        historical_context=historical_matches
    )
    
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
