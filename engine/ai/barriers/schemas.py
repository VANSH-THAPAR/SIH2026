from pydantic import BaseModel, Field, validator
from typing import List, Optional
from enum import Enum

class BarrierStatus(str, Enum):
    FAILED = "FAILED"
    MISSING = "MISSING"
    BYPASSED = "BYPASSED"
    WEAK = "WEAK"
    EFFECTIVE = "EFFECTIVE"
    NOT_DETERMINED = "NOT_DETERMINED"
    NOT_APPLICABLE = "NOT_APPLICABLE"

class BarrierEvidence(BaseModel):
    barrier_code: str = Field(..., description="The unique code of the barrier from the taxonomy.")
    barrier_name: str = Field(..., description="The name of the barrier from the taxonomy.")
    status: BarrierStatus = Field(..., description="The status of the barrier during the event.")
    criticality: Optional[int] = Field(None, ge=1, le=5, description="Criticality of the barrier (1-5).")
    confidence: float = Field(..., ge=0, le=100, description="Confidence in this mapping (0-100).")
    evidence: List[str] = Field(..., description="List of direct quotes from the report supporting this mapping.")
    reasoning: str = Field(..., description="Explanation of why this barrier and status were chosen based on evidence.")
    mapping_method: str = Field("LLM", description="Method used to map the barrier.")

class BarrierAnalysisResult(BaseModel):
    barriers: List[BarrierEvidence] = Field(default_factory=list, description="List of mapped barriers.")
    primary_barrier_code: Optional[str] = Field(None, description="The barrier code of the primary failed or missing barrier, if applicable.")
    analysis_confidence: float = Field(..., ge=0, le=100, description="Overall confidence in the analysis.")
    has_critical_barrier_failure: bool = Field(..., description="True if any critical barrier failed, was missing, or was bypassed.")
    barrier_summary: str = Field(..., description="A short summary of the barrier analysis for this event.")
