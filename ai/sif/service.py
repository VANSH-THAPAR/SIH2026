from ai.sif.analyzer import SIFAnalyzer
from ai.sif.scorer import calculate_sif_score
from ai.sif.schemas import SIFResult
from models import ReportPayload
from ai.schemas import SafetyAnalysis
import json

class SIFService:
    def __init__(self):
        self.analyzer = SIFAnalyzer()
        
    def evaluate(self, report: ReportPayload, nlp_analysis: SafetyAnalysis) -> SIFResult:
        evidence, model_name = self.analyzer.extract_evidence(report.description, nlp_analysis.dict())
        
        if not evidence:
            return None
            
        nlp_context = json.dumps(nlp_analysis.dict())
        score, is_sif, classification, confidence = calculate_sif_score(evidence, nlp_context)
        
        return SIFResult(
            sif_potential=is_sif,
            sif_score=score,
            confidence=confidence,
            classification=classification,
            hazard_severity=evidence.hazard_severity,
            energy_score=evidence.energy_magnitude,
            exposure_score=evidence.worker_exposure,
            consequence_score=evidence.potential_consequence_severity,
            barrier_failure_score=evidence.critical_barrier_failure,
            causal_chain_score=evidence.causal_chain_credibility,
            sif_pathway_credibility=evidence.sif_pathway_credibility,
            sif_mechanism_strength=evidence.sif_mechanism_strength,
            exposure_immediacy=evidence.exposure_immediacy,
            escalation_evidence=evidence.escalation_evidence,
            exposure_status=evidence.exposure_status,
            key_evidence=evidence.sif_evidence,
            potential_consequence=evidence.potential_consequence,
            reasoning=evidence.reasoning,
            model_version=f"sif-v3-{model_name}"
        )
