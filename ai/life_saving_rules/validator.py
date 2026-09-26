from typing import List, Dict, Any
from ai.life_saving_rules.schemas import LifeSavingRuleResult

class LifeSavingRuleValidator:
    def validate(self, llm_result: LifeSavingRuleResult, taxonomy: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Deterministically validate the LLM's rule mappings against the configured taxonomy
        and ensure minimum confidence thresholds and evidence.
        """
        valid_mappings = []
        valid_rule_codes = {rule['rule_code'] for rule in taxonomy}
        
        if not llm_result or not llm_result.mapped_rules:
            return valid_mappings
            
        for mapping in llm_result.mapped_rules:
            # 1. Rule must exist in taxonomy
            if mapping.rule_code not in valid_rule_codes:
                print(f"Validation Reject: Rule {mapping.rule_code} not in taxonomy.")
                continue
                
            # 2. Rule must be applicable and have sufficient confidence
            if not mapping.applicable or mapping.confidence < 60.0:
                print(f"Validation Reject: Rule {mapping.rule_code} has low confidence ({mapping.confidence}) or marked not applicable.")
                continue
                
            # 3. Must have evidence
            if not mapping.evidence or len(mapping.evidence) == 0:
                print(f"Validation Reject: Rule {mapping.rule_code} has no supporting evidence.")
                continue
                
            # If all checks pass, it's valid
            valid_mappings.append({
                "rule_code": mapping.rule_code,
                "rule_name": mapping.rule_name,
                "confidence": mapping.confidence,
                "priority": mapping.priority,
                "evidence": mapping.evidence,
                "trigger": mapping.trigger,
                "reasoning": mapping.reasoning
            })
            
        return valid_mappings
