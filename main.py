from fastapi import FastAPI, HTTPException
from typing import List, Union
from models import ReportPayload, AnalysisResponse, HistoricalMatch, AnalysisMetadata
from vector_store import PostgresManager
from ai.analyzer import SafetyAnalyzer
from ai.sif.service import SIFService
from ai.life_saving_rules.service import LifeSavingRuleService
from ai.barriers.service import BarrierService
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
lsr_service = LifeSavingRuleService()
barrier_service = BarrierService()

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

@app.post("/reports/{report_id}/life-saving-rules")
async def map_report_life_saving_rules(report_id: str):
    """
    Fetch report from DB and map to Life-Saving Rules.
    """
    db = vector_store.SessionLocal()
    try:
        from vector_store import ReportRecord, ReportAnalysis
        # Fetch report
        record = db.query(ReportRecord).filter(ReportRecord.report_id == report_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Report not found")
            
        # Fetch NLP analysis
        analysis = db.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
        if not analysis:
            raise HTTPException(status_code=400, detail="Report has not been analyzed by NLP yet.")
            
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
        
        nlp_dict = {
            "unsafe_act": analysis.unsafe_act,
            "unsafe_condition": analysis.unsafe_condition,
            "hazard": analysis.hazard,
            "energy_source": analysis.energy_source,
            "worker_exposure": analysis.worker_exposure,
            "existing_controls": analysis.existing_controls,
            "missing_controls": analysis.missing_controls,
            "potential_consequence": analysis.potential_consequence
        }
        
        # Need to reconstruct SafetyAnalysis object or pass dict directly. The service takes SafetyAnalysis object.
        from ai.schemas import SafetyAnalysis
        safety_analysis = SafetyAnalysis(**nlp_dict)
        
        taxonomy = vector_store.get_active_life_saving_rules()
        result = lsr_service.evaluate(report_payload, safety_analysis, taxonomy)
        
        if result['mapped_rules']:
            vector_store.save_mapped_rules(report_id, result['mapped_rules'])
            
        return result
    finally:
        db.close()

@app.post("/life-saving-rules/analyze")
async def analyze_life_saving_rules(report: ReportPayload):
    """
    Analyze Life-Saving Rules directly from payload (runs NLP first if not provided).
    """
    # 1. Run AI/NLP Safety Analysis
    analysis, _ = safety_analyzer.analyze(report)
    if not analysis:
        raise HTTPException(status_code=500, detail="Failed to perform AI safety analysis.")
        
    taxonomy = vector_store.get_active_life_saving_rules()
    result = lsr_service.evaluate(report, analysis, taxonomy)
    return result

@app.post("/barriers/analyze/{report_id}")
async def analyze_report_barriers(report_id: str):
    """
    Fetch report, NLP, SIF, and LSR data from DB and run Barrier Analysis.
    """
    db = vector_store.SessionLocal()
    try:
        from vector_store import ReportRecord, ReportAnalysis, ReportRule, LifeSavingRule
        
        # 1. Fetch report
        record = db.query(ReportRecord).filter(ReportRecord.report_id == report_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Report not found")
            
        # 2. Fetch NLP & SIF
        analysis = db.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
        if not analysis:
            raise HTTPException(status_code=400, detail="Report has not been analyzed by NLP/SIF yet.")
            
        # 3. Fetch LSR Mapping
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
        
        # 4. Construct payload and dicts
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
        
        taxonomy = vector_store.get_active_barriers()
        
        # 5. Run Barrier Analysis
        result = barrier_service.evaluate(
            report_desc=record.description,
            nlp_analysis=nlp_dict,
            sif_analysis=sif_dict,
            lsr_mapping=lsr_mapping,
            taxonomy=taxonomy
        )
        
        # 6. Save results
        barrier_dicts = [b.dict() for b in result.barriers]
        vector_store.save_report_barriers(report_id, barrier_dicts)
        
        # 7. Construct frontend-ready response
        primary_rule_name = next((r['rule_name'] for r in lsr_mapping if r['priority'] == 'PRIMARY'), None)
        
        primary_barrier = None
        if result.primary_barrier_code:
            pb = next((b for b in result.barriers if b.barrier_code == result.primary_barrier_code), None)
            if pb:
                primary_barrier = {
                    "name": pb.barrier_name,
                    "status": pb.status.value,
                    "criticality": pb.criticality,
                    "confidence": pb.confidence,
                    "evidence": pb.evidence,
                    "reasoning": pb.reasoning
                }
                
        response = {
            "report_id": report_id,
            "sif_potential": analysis.sif_potential,
            "primary_rule": primary_rule_name,
            "primary_barrier": primary_barrier,
            "has_critical_barrier_failure": result.has_critical_barrier_failure,
            "all_barriers": barrier_dicts,
            "summary": result.barrier_summary
        }
        
        return response
    finally:
        db.close()

@app.get("/barriers/report/{report_id}")
async def get_report_barriers(report_id: str):
    db = vector_store.SessionLocal()
    try:
        from vector_store import ReportBarrier, Barrier
        barriers = db.query(ReportBarrier, Barrier).join(
            Barrier, ReportBarrier.barrier_id == Barrier.barrier_id
        ).filter(ReportBarrier.report_id == report_id).all()
        
        if not barriers:
            raise HTTPException(status_code=404, detail="No barriers found for this report.")
            
        return [
            {
                "barrier_code": b.barrier_code,
                "barrier_name": b.barrier_name,
                "status": rb.status,
                "criticality": rb.criticality,
                "confidence": rb.confidence,
                "evidence": rb.evidence,
                "reasoning": rb.reasoning
            } for rb, b in barriers
        ]
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
