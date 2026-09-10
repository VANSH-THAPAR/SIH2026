from ai.sif.schemas import SIFEvidence

def apply_overrides(evidence: SIFEvidence, nlp_context: str = "") -> bool:
    """
    Returns True if the evidence hits a critical SIF override.
    Overrides must be evidence-based combinations, not single keywords.
    """
    context_lower = nlp_context.lower()
    
    # A. DOCUMENTED_EXPOSURE
    if evidence.exposure_status == "DOCUMENTED_EXPOSURE":
        if evidence.sif_mechanism_strength >= 4 and (evidence.critical_barrier_failure >= 4 or evidence.escalation_evidence >= 3) and evidence.sif_pathway_credibility >= 3:
            return True
            
    # B. NEAR_MISS_EXPOSURE
    if evidence.exposure_status == "NEAR_MISS_EXPOSURE":
        if evidence.sif_mechanism_strength >= 4 and evidence.escalation_evidence >= 3 and evidence.sif_pathway_credibility >= 3:
            return True
            
    # C. clearly documented SIF-critical patterns
    # Require that it's NOT NO_DOCUMENTED_EXPOSURE for these to trigger
    if evidence.exposure_status in ["DOCUMENTED_EXPOSURE", "NEAR_MISS_EXPOSURE", "POTENTIAL_EXPOSURE"]:
        # C1. hazardous atmosphere/toxic gas + worker exposure + credible escalation
        is_toxic_gas = any(kw in context_lower for kw in ["h2s", "toxic", "gas", "atmosphere", "fumes"])
        if is_toxic_gas and evidence.hazard_severity >= 4 and evidence.escalation_evidence >= 3:
            return True
            
        # C2. suspended load/line-of-fire + worker exposure + serious barrier failure
        is_suspended_load = any(kw in context_lower for kw in ["suspended load", "crane", "lifting", "hoist", "dropped object"])
        if is_suspended_load and evidence.hazard_severity >= 4 and evidence.critical_barrier_failure >= 4:
            return True
            
        # C3. confined space + hazardous atmosphere/energy + worker exposure
        is_confined_space = "confined space" in context_lower or "vessel entry" in context_lower
        if is_confined_space and evidence.hazard_severity >= 4:
            return True
            
        # C4. electrical energy + worker exposure + missing/failed isolation
        is_electrical = any(kw in context_lower for kw in ["electrical", "live wire", "arc flash", "shock", "energized"])
        if is_electrical and evidence.energy_magnitude >= 4 and evidence.critical_barrier_failure >= 4:
            return True
            
        # C5. excavation/trench collapse + worker exposure + missing shoring
        is_excavation = any(kw in context_lower for kw in ["trench", "excavation", "cave-in", "collapse"])
        if is_excavation and evidence.hazard_severity >= 4 and evidence.critical_barrier_failure >= 4:
            return True
            
    return False
