from pydantic import BaseModel, Field
from typing import List, Optional
from ai.schemas import SafetyAnalysis
from ai.sif.schemas import SIFResult

class Site(BaseModel):
    site_id: str
    site_name: str
    region: str

class Reporter(BaseModel):
    emp_id: str
    name: str

class ReportPayload(BaseModel):
    report_id: str
    report_date: str
    time: str
    site: Site
    location: str
    department: str
    reported_by: List[Reporter]
    report_type: str
    activity: str
    description: str
    source: str

class HistoricalMatch(BaseModel):
    report_id: str
    score: float
    description: str
    site_name: str
    activity: str
    report_date: str

class AnalysisMetadata(BaseModel):
    report_id: str
    model_name: str
    analyzed_at: str

class AnalysisResponse(BaseModel):
    new_report: ReportPayload
    safety_analysis: Optional[SafetyAnalysis] = None
    sif_analysis: Optional[SIFResult] = None
    analysis_metadata: Optional[AnalysisMetadata] = None
    historical_context: List[HistoricalMatch]

