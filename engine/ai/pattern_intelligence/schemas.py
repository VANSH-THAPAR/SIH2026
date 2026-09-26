from pydantic import BaseModel, Field
from typing import List, Optional

class PatternMetrics(BaseModel):
    total_report_count: int = 0
    sif_report_count: int = 0
    sif_density: float = 0.0
    current_period_count: int = 0
    previous_period_count: int = 0
    trend: str = "INSUFFICIENT_DATA"
    trend_change_percent: float = 0.0
    recurrence_score: float = 0.0
    trend_score: float = 0.0
    barrier_criticality_score: float = 0.0
    site_concentration_score: float = 0.0
    pattern_score: float = 0.0
    priority_level: str = "LOW"
    site_count: int = 0
    activity_count: int = 0
    rule_count: int = 0
    barrier_count: int = 0

class PatternResult(BaseModel):
    pattern_id: Optional[str] = None
    pattern_type: str
    pattern_key: str
    title: Optional[str] = None
    description: Optional[str] = None
    
    region: Optional[str] = None
    site_id: Optional[str] = None
    site_name: Optional[str] = None
    work_area: Optional[str] = None
    activity: Optional[str] = None
    sub_activity: Optional[str] = None
    
    rule_code: Optional[str] = None
    rule_name: Optional[str] = None
    barrier_code: Optional[str] = None
    barrier_name: Optional[str] = None
    
    metrics: PatternMetrics
    
    similar_report_count: int = 0
    evidence_report_ids: List[str] = []
    
    llm_summary: Optional[str] = None
    llm_recommendation: Optional[str] = None
    
    first_detected: Optional[str] = None
    last_detected: Optional[str] = None

class PatternExplanation(BaseModel):
    pattern_title: str
    summary: str
    evidence: List[str]
    risk_focus: str
    recommended_focus: str
