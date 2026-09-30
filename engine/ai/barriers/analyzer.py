import json
from typing import Dict, Any, List, Tuple
from ai.provider import AIProvider
from ai.barriers.prompts import BARRIER_SYSTEM_PROMPT
from ai.barriers.schemas import BarrierAnalysisResult

class BarrierAnalyzer:
    def __init__(self):
        self.provider = AIProvider()
        
    def analyze_barriers(self, 
                         report_desc: str, 
                         nlp_analysis: Dict[str, Any], 
                         sif_analysis: Dict[str, Any],
                         lsr_mapping: List[Dict[str, Any]],
                         taxonomy: List[Dict[str, Any]]) -> Tuple[BarrierAnalysisResult, str]:
        """
        Calls the LLM to map the report to barrier failures/successes based strictly on evidence.
        """
        
        # Build Context
        context_prompt = "=== REPORT DESCRIPTION ===\n"
        context_prompt += report_desc + "\n\n"
        
        context_prompt += "=== NLP ANALYSIS ===\n"
        minified_nlp = {k:v for k,v in nlp_analysis.items() if v and k not in ["confidence", "causal_chain"]}
        context_prompt += json.dumps(minified_nlp, separators=(',', ':')) + "\n\n"
        
        context_prompt += "=== SIF ANALYSIS ===\n"
        minified_sif = {
            "sif_potential": sif_analysis.get("sif_potential"),
            "exposure_status": sif_analysis.get("exposure_status")
        }
        context_prompt += json.dumps(minified_sif, separators=(',', ':')) + "\n\n"
        
        context_prompt += "=== LIFE-SAVING RULE MAPPING ===\n"
        minified_lsr = [rule.get("rule_name") for rule in lsr_mapping]
        context_prompt += json.dumps(minified_lsr, separators=(',', ':')) + "\n\n"
        
        context_prompt += "=== BARRIER TAXONOMY ===\n"
        minified_taxonomy = [{"code": b.get("barrier_code"), "name": b.get("barrier_name")} for b in taxonomy]
        context_prompt += json.dumps(minified_taxonomy, separators=(',', ':')) + "\n\n"
        
        context_prompt += "Analyze the report and identify the safety barriers, their status, criticality, and evidence. Ensure you output strict JSON matching the BarrierAnalysisResult schema."

        try:
            result_dict = self.provider.generate_structured_json(
                system_prompt=BARRIER_SYSTEM_PROMPT,
                user_prompt=context_prompt
            )
            model_name = self.provider.model_name
            
            # Use Pydantic to validate and parse the raw JSON dict
            result = BarrierAnalysisResult(**result_dict)
            return result, model_name
            
        except Exception as e:
            # Retry once on formatting/pydantic failure
            print(f"Barrier LLM validation failed. Retrying. Error: {e}")
            try:
                result_dict = self.provider.generate_structured_json(
                    system_prompt=BARRIER_SYSTEM_PROMPT + "\nEnsure exact JSON structure as defined.",
                    user_prompt=context_prompt
                )
                model_name = self.provider.model_name
                result = BarrierAnalysisResult(**result_dict)
                return result, model_name
            except Exception as retry_e:
                print(f"Barrier Retry failed: {retry_e}")
                # Fallback to empty result on complete failure
                fallback = BarrierAnalysisResult(
                    barriers=[],
                    primary_barrier_code=None,
                    analysis_confidence=0.0,
                    has_critical_barrier_failure=False,
                    barrier_summary="Failed to analyze barriers due to LLM error."
                )
                return fallback, "error_fallback"
