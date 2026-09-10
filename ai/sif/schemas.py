from pydantic import BaseModel, Field
from typing import List, Literal

class SIFEvidence(BaseModel):
    hazard_severity: int = Field(..., ge=0, le=5)
    energy_magnitude: int = Field(..., ge=0, le=5)
    worker_exposure: int = Field(..., ge=0, le=5)
    potential_consequence_severity: int = Field(..., ge=0, le=5)
    critical_barrier_failure: int = Field(..., ge=0, le=5)
    causal_chain_credibility: int = Field(..., ge=0, le=5)
    sif_pathway_credibility: int = Field(..., ge=0, le=5)
    sif_mechanism_strength: int = Field(..., ge=0, le=5)
    exposure_immediacy: int = Field(..., ge=0, le=5)
    escalation_evidence: int = Field(..., ge=0, le=5)
    exposure_status: Literal[
        "DOCUMENTED_EXPOSURE",
        "NEAR_MISS_EXPOSURE",
        "POTENTIAL_EXPOSURE",
        "NO_DOCUMENTED_EXPOSURE"
    ]
    sif_evidence: List[str]
    potential_consequence: str
    reasoning: str

class SIFResult(BaseModel):
    sif_potential: bool
    sif_score: float
    confidence: float
    classification: str
    hazard_severity: float
    energy_score: float
    exposure_score: float
    consequence_score: float
    barrier_failure_score: float
    causal_chain_score: float
    sif_pathway_credibility: float
    sif_mechanism_strength: float
    exposure_immediacy: float
    escalation_evidence: float
    exposure_status: str
    key_evidence: List[str]
    potential_consequence: str
    reasoning: str
    model_version: str = "sif-v2"
