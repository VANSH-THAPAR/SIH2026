from pydantic import BaseModel, Field
from typing import List, Optional

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

class AnalysisResponse(BaseModel):
    new_report: ReportPayload
    historical_context: List[HistoricalMatch]
