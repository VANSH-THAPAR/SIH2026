from pydantic import ValidationError
from ai.provider import AIProvider
from ai.sif.schemas import SIFEvidence
from ai.sif.prompts import SIF_EXTRACTOR_SYSTEM_PROMPT

class SIFAnalyzer:
    def __init__(self):
        self.provider = AIProvider()
        
    def extract_evidence(self, report_text: str, nlp_analysis: dict) -> tuple[SIFEvidence, str]:
        user_prompt = f"REPORT:\n{report_text}\n\nNLP EXTRACTED:\n{nlp_analysis}"
        
        try:
            result_dict = self.provider.generate_structured_json(
                system_prompt=SIF_EXTRACTOR_SYSTEM_PROMPT,
                user_prompt=user_prompt
            )
        except Exception as e:
            print(f"SIF LLM Extraction failed: {e}")
            return None, self.provider.model_name
            
        try:
            evidence = SIFEvidence(**result_dict)
            return evidence, self.provider.model_name
        except ValidationError as e:
            print(f"SIF Pydantic validation failed. Attempting retry. Error: {e}")
            # Retry
            retry_prompt = f"{user_prompt}\n\nWARNING: Your previous response was invalid. Ensure integers 0-5. Error: {str(e)}"
            try:
                result_dict_retry = self.provider.generate_structured_json(
                    system_prompt=SIF_EXTRACTOR_SYSTEM_PROMPT,
                    user_prompt=retry_prompt
                )
                evidence = SIFEvidence(**result_dict_retry)
                return evidence, self.provider.model_name
            except Exception as retry_e:
                print(f"SIF Retry failed: {retry_e}")
                return None, self.provider.model_name
