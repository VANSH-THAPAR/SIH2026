from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class HSEActionData(BaseModel):
    action_title: str
    action_description: Optional[str] = None
    owner_role: str = "UNASSIGNED"
    owner_department: str = "UNASSIGNED"
    priority: str

class InterventionData(BaseModel):
    intervention_type: str
    title: str
    description: Optional[str] = None
    rationale: Optional[str] = None
    
    priority_level: str
    intervention_urgency: str
    
    site_id: Optional[str] = None
    site_name: Optional[str] = None
    activity: Optional[str] = None
    work_area: Optional[str] = None
    
    primary_lsr_code: Optional[str] = None
    primary_barrier_code: Optional[str] = None
    barrier_status: Optional[str] = None
    
    evidence: List[str] = []
    recommended_actions: List[HSEActionData] = []

class InterventionContext(BaseModel):
    report_id: Optional[str] = None
    pattern_id: Optional[str] = None
    
    # Metadata
    site_name: Optional[str] = None
    activity: Optional[str] = None
    
    # Intelligence
    sif_potential: bool = False
    sif_score: float = 0.0
    
    primary_lsr_code: Optional[str] = None
    primary_lsr_name: Optional[str] = None
    
    primary_barrier_code: Optional[str] = None
    primary_barrier_name: Optional[str] = None
    barrier_status: Optional[str] = None
    barrier_criticality: float = 0.0
    has_critical_barrier_failure: bool = False
    
    # Risk
    priority_level: str = "LOW"
    final_priority_score: float = 0.0
    
    # Evidence
    report_description: Optional[str] = None
    barrier_reasoning: Optional[str] = None
    
    # Systemic context
    pattern_type: Optional[str] = None
    pattern_score: float = 0.0
    trend: str = "STABLE"
    total_report_count: int = 0
