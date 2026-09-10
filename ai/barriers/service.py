from typing import Dict, Any, List
from ai.barriers.analyzer import BarrierAnalyzer
from ai.barriers.validator import BarrierValidator
from ai.barriers.schemas import BarrierAnalysisResult

class BarrierService:
    def __init__(self):
        self.analyzer = BarrierAnalyzer()
        self.validator = BarrierValidator()
        
    def evaluate(self, 
                 report_desc: str, 
                 nlp_analysis: Dict[str, Any], 
                 sif_analysis: Dict[str, Any],
                 lsr_mapping: List[Dict[str, Any]],
                 taxonomy: List[Dict[str, Any]]) -> BarrierAnalysisResult:
        """
        Runs the full barrier evaluation pipeline.
        1. Analyzes text with LLM
        2. Validates output deterministically against taxonomy
        """
        # 1. LLM Evaluation
        result, model_name = self.analyzer.analyze_barriers(
            report_desc=report_desc,
            nlp_analysis=nlp_analysis,
            sif_analysis=sif_analysis,
            lsr_mapping=lsr_mapping,
            taxonomy=taxonomy
        )
        
        # 2. Deterministic Validation
        validated_result = self.validator.validate(result, taxonomy)
        
        return validated_result
