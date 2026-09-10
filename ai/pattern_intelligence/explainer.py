import json
from typing import Dict, Any, List
from ai.provider import AIProvider
from ai.pattern_intelligence.schemas import PatternExplanation

class PatternExplainer:
    def __init__(self):
        self.provider = AIProvider()
        self.system_prompt = """You are Nirikshan's HSE Pattern Intelligence Analyst.
Explain an already-detected safety pattern using ONLY the supplied structured evidence.

Do not discover new patterns.
Do not invent facts.
Do not invent workers, exposure, hazards, barriers, activities, sites or Life-Saving Rules.
Do not change SIF classifications.
Do not claim causation from correlation.
Do not calculate or modify the pattern score.

Return strict JSON only:
{
  "pattern_title": "...",
  "summary": "...",
  "evidence": ["...", "..."],
  "risk_focus": "...",
  "recommended_focus": "..."
}
Keep the response concise and operational."""

    def explain(self, pattern_data: Dict[str, Any], evidence_texts: List[str]) -> Dict[str, Any]:
        """
        Calls the LLM to generate a human-readable explanation for a top pattern.
        """
        payload = {
            "pattern_type": pattern_data.get("pattern_type"),
            "site": pattern_data.get("site_name"),
            "activity": pattern_data.get("activity"),
            "work_area": pattern_data.get("work_area"),
            "Life-Saving Rule": pattern_data.get("rule_name"),
            "barrier": pattern_data.get("barrier_name"),
            "total_reports": pattern_data.get("total_report_count"),
            "sif_reports": pattern_data.get("sif_report_count"),
            "sif_density": pattern_data.get("sif_density"),
            "trend": pattern_data.get("trend"),
            "trend_change_percent": pattern_data.get("trend_change_percent"),
            "pattern_score": pattern_data.get("pattern_score"),
            "priority": pattern_data.get("priority_level"),
            "representative_evidence": evidence_texts
        }
        
        user_prompt = json.dumps(payload, indent=2)
        
        try:
            result = self.provider.generate_structured_json(self.system_prompt, user_prompt)
            # Validate schema
            explanation = PatternExplanation(**result)
            return {
                "llm_summary": explanation.summary,
                "llm_recommendation": explanation.recommended_focus,
                "title": explanation.pattern_title
            }
        except Exception as e:
            print(f"LLM Explanation failed for pattern {pattern_data.get('pattern_key')}: {e}")
            return {
                "llm_summary": None,
                "llm_recommendation": None,
                "title": f"{pattern_data.get('pattern_type')} Pattern"
            }
