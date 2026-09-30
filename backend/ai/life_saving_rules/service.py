from typing import Dict, Any, List
from ai.life_saving_rules.analyzer import LifeSavingRuleAnalyzer
from ai.life_saving_rules.validator import LifeSavingRuleValidator
from models import ReportPayload
from ai.schemas import SafetyAnalysis

class LifeSavingRuleService:
    def __init__(self):
        self.analyzer = LifeSavingRuleAnalyzer()
        self.validator = LifeSavingRuleValidator()
        
    def evaluate(self, report: ReportPayload, nlp_analysis: SafetyAnalysis, taxonomy: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not taxonomy:
            return {
                "report_id": report.report_id,
                "mapped_rules": [],
                "primary_rule": None,
                "mapping_confidence": 0.0,
                "mapping_explanation": "Taxonomy is empty.",
                "unmapped_reason": "No taxonomy configured."
            }
            
        llm_result, model_name = self.analyzer.map_rules(report.description, nlp_analysis.dict(), taxonomy)
        
        if not llm_result:
            return {
                "report_id": report.report_id,
                "mapped_rules": [],
                "primary_rule": None,
                "mapping_confidence": 0.0,
                "mapping_explanation": "Failed to map rules due to LLM error.",
                "unmapped_reason": "LLM mapping failed."
            }
            
        valid_mappings = self.validator.validate(llm_result, taxonomy)
        
        primary_rule = None
        max_confidence = 0.0
        
        for mapping in valid_mappings:
            if mapping['priority'] == 'PRIMARY':
                if not primary_rule or mapping['confidence'] > max_confidence:
                    primary_rule = mapping
                    max_confidence = mapping['confidence']
                    
        # If no primary but there are valid mappings, just pick the highest confidence
        if not primary_rule and valid_mappings:
            primary_rule = max(valid_mappings, key=lambda x: x['confidence'])
            max_confidence = primary_rule['confidence']
            
        return {
            "report_id": report.report_id,
            "mapped_rules": valid_mappings,
            "primary_rule": primary_rule,
            "mapping_confidence": max_confidence,
            "mapping_explanation": primary_rule['reasoning'] if primary_rule else "No configured Life-Saving Rule is directly supported by the available evidence.",
            "unmapped_reason": llm_result.unmapped_reason if not valid_mappings else None
        }
