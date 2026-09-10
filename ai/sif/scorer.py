from ai.sif.schemas import SIFEvidence
from ai.sif.rules import apply_overrides

def calculate_confidence(evidence: SIFEvidence) -> float:
    """Calculates confidence in the LLM's classification/evidence extraction (0-100%)."""
    conf = 50.0
    
    # Completeness of extracted evidence
    if len(evidence.sif_evidence) >= 2:
        conf += 20.0
    elif len(evidence.sif_evidence) == 1:
        conf += 10.0
        
    # Clarity of the causal pathway
    conf += (evidence.causal_chain_credibility / 5.0) * 30.0
    
    # Cap at 100
    return min(100.0, round(conf, 2))

def calculate_sif_score(evidence: SIFEvidence, nlp_context: str = "") -> tuple[float, bool, str, float]:
    # 1. Base weights for deterministic scoring
    w_hazard = 0.10
    w_energy = 0.10
    w_consequence = 0.15
    w_exposure = 0.15
    w_barrier = 0.10
    w_immediacy = 0.10
    w_escalation = 0.10
    w_pathway = 0.10
    w_mechanism = 0.10
    
    # Normalize 0-5 scores to 0-100 scale
    base_score = (
        (evidence.hazard_severity / 5) * w_hazard +
        (evidence.energy_magnitude / 5) * w_energy +
        (evidence.potential_consequence_severity / 5) * w_consequence +
        (evidence.worker_exposure / 5) * w_exposure +
        (evidence.critical_barrier_failure / 5) * w_barrier +
        (evidence.exposure_immediacy / 5) * w_immediacy +
        (evidence.escalation_evidence / 5) * w_escalation +
        (evidence.sif_pathway_credibility / 5) * w_pathway +
        (evidence.sif_mechanism_strength / 5) * w_mechanism
    ) * 100
    
    score = base_score
    
    # 2. Evidence Gating (Prevent theoretical false positives)
    if evidence.sif_pathway_credibility < 3 and evidence.escalation_evidence < 3 and evidence.worker_exposure < 3:
        score = min(score, 50.0)
    elif evidence.sif_pathway_credibility < 3 and evidence.escalation_evidence < 3:
        score = min(score, 65.0)

    # 3. Mechanism Strength Gate
    # Suppress low-energy mechanisms (e.g., ordinary slips/trips) from triggering SIF
    if evidence.sif_mechanism_strength < 3:
        score = min(score, 65.0)
        
    # 3b. No Documented Exposure Gate
    if evidence.exposure_status == "NO_DOCUMENTED_EXPOSURE":
        score = min(score, 65.0)

    # 4. Apply Deterministic Overrides (Strong SIF signals)
    # Overrides bypass the mechanism cap if the report contains strong deterministic evidence
    # of a true SIF-critical mechanism (e.g. high energy + direct exposure + failed critical barrier).
    if apply_overrides(evidence, nlp_context):
        score = max(score, 85.0)  # Ensure score is clearly SIF
        
    score = round(score, 2)
    confidence = calculate_confidence(evidence)
    
    # 5. Binary Threshold
    if score >= 70:
        sif_potential = True
        classification = "SIF_POTENTIAL"
    else:
        sif_potential = False
        classification = "NON_SIF"
        
    return score, sif_potential, classification, confidence
