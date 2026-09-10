import json
from typing import Optional, Tuple
from pydantic import ValidationError

from models import ReportPayload
from ai.provider import AIProvider
from ai.prompts import SAFETY_ANALYZER_SYSTEM_PROMPT
from ai.schemas import SafetyAnalysis

class SafetyAnalyzer:
    def __init__(self):
        self.provider = AIProvider()
        
    def analyze(self, report: ReportPayload) -> Tuple[Optional[SafetyAnalysis], str]:
        """
        Analyzes a report and returns a tuple of (SafetyAnalysis, model_name).
        Returns (None, model_name) if analysis fails completely.
        """
        # 1. Build context from metadata
        context_lines = [
            f"Site: {report.site.site_name}",
            f"Region: {report.site.region}",
            f"Location: {report.location}",
            f"Department: {report.department}",
            f"Activity: {report.activity}",
            f"Report Type: {report.report_type.replace('_', ' ').title()}",
            f"\nDescription:\n\"{report.description}\""
        ]
        
        user_prompt = "\n".join(context_lines)
        
        # 2. Call AI Provider
        try:
            result_dict = self.provider.generate_structured_json(
                system_prompt=SAFETY_ANALYZER_SYSTEM_PROMPT,
                user_prompt=user_prompt
            )
        except Exception as e:
            print(f"Failed to generate analysis from AI: {e}")
            return None, self.provider.model_name
            
        # 3. Validate with Pydantic
        try:
            analysis = SafetyAnalysis(**result_dict)
            return analysis, self.provider.model_name
        except ValidationError as e:
            print(f"Pydantic validation failed. Attempting retry. Error: {e}")
            # Retry once with a correction prompt
            retry_prompt = f"{user_prompt}\n\nWARNING: Your previous response was invalid. Please strictly follow the JSON schema. Error details: {str(e)}"
            try:
                result_dict_retry = self.provider.generate_structured_json(
                    system_prompt=SAFETY_ANALYZER_SYSTEM_PROMPT,
                    user_prompt=retry_prompt
                )
                analysis = SafetyAnalysis(**result_dict_retry)
                return analysis, self.provider.model_name
            except Exception as retry_e:
                print(f"Retry failed: {retry_e}")
                return None, self.provider.model_name
