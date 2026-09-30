from pydantic import ValidationError
import json
from typing import List, Dict, Any, Tuple
from ai.provider import AIProvider
from ai.life_saving_rules.schemas import LifeSavingRuleResult
from ai.life_saving_rules.prompts import LSR_MAPPING_SYSTEM_PROMPT

class LifeSavingRuleAnalyzer:
    def __init__(self):
        self.provider = AIProvider()
        
    def map_rules(self, report_text: str, nlp_analysis: dict, taxonomy: List[Dict[str, Any]]) -> Tuple[LifeSavingRuleResult, str]:
        taxonomy_json = json.dumps(taxonomy, indent=2)
        nlp_json = json.dumps(nlp_analysis, indent=2)
        
        user_prompt = f"REPORT:\n{report_text}\n\nNLP EXTRACTED:\n{nlp_json}\n\nACTIVE TAXONOMY:\n{taxonomy_json}"
        
        try:
            result_dict = self.provider.generate_structured_json(
                system_prompt=LSR_MAPPING_SYSTEM_PROMPT,
                user_prompt=user_prompt
            )
        except Exception as e:
            print(f"LSR LLM Extraction failed: {e}")
            return None, self.provider.model_name
            
        try:
            result = LifeSavingRuleResult(**result_dict)
            return result, self.provider.model_name
        except ValidationError as e:
            print(f"LSR Pydantic validation failed. Attempting retry. Error: {e}")
            retry_prompt = f"{user_prompt}\n\nWARNING: Your previous response was invalid. Error: {str(e)}"
            try:
                result_dict_retry = self.provider.generate_structured_json(
                    system_prompt=LSR_MAPPING_SYSTEM_PROMPT,
                    user_prompt=retry_prompt
                )
                result = LifeSavingRuleResult(**result_dict_retry)
                return result, self.provider.model_name
            except Exception as retry_e:
                print(f"LSR Retry failed: {retry_e}")
                return None, self.provider.model_name
