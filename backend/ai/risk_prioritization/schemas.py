from pydantic import BaseModel
from typing import Optional, Dict

class RiskPriorityReason(BaseModel):
    individual_sif_score: float
    pattern_risk_score: float
    barrier_criticality_score: float
    trend_score: float
    weights: Dict[str, float]
    raw_score: float
    safety_floor_applied: bool
    primary_pattern_id: Optional[str] = None
    primary_pattern_type: Optional[str] = None
    priority_level: str

class RiskPriorityCalculation(BaseModel):
    report_id: str
    individual_risk_score: float = 0.0
    pattern_risk_score: float = 0.0
    barrier_criticality_score: float = 0.0
    trend_score: float = 0.0
    
    final_priority_score: float = 0.0
    final_priority_level: str = "LOW"
    
    primary_pattern_id: Optional[str] = None
    primary_pattern_score: Optional[float] = None
    primary_pattern_type: Optional[str] = None
    primary_pattern_description: Optional[str] = None
    
    sif_potential: bool = False
    safety_floor_applied: bool = False
    calculation_version: str = "1.0"
    
    site_name: Optional[str] = None
    activity: Optional[str] = None
    work_area: Optional[str] = None
    primary_rule: Optional[str] = None
    primary_barrier: Optional[str] = None
    
    reason_json: RiskPriorityReason
