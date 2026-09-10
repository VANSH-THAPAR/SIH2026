import os
import json
from dotenv import load_dotenv
from typing import Dict, Any

load_dotenv()

class AIProvider:
    def __init__(self):
        self.provider = os.environ.get("AI_PROVIDER", "groq").lower()
        if self.provider == "gemini":
            import google.generativeai as genai
            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                print("Warning: GEMINI_API_KEY not found in environment variables.")
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(
                'gemini-1.5-flash',
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            self.model_name = "gemini-1.5-flash"
        elif self.provider == "groq":
            from groq import Groq
            api_key = os.environ.get("GROQ_API_KEY")
            if not api_key:
                print("Warning: GROQ_API_KEY not found in environment variables.")
            self.client = Groq(api_key=api_key)
            self.model_name = "openai/gpt-oss-120b"
        else:
            raise ValueError(f"Unsupported AI_PROVIDER: {self.provider}")

    def generate_structured_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """
        Generates a JSON response from the LLM.
        Returns a dictionary.
        """
        if self.provider == "gemini":
            try:
                import google.generativeai as genai
                model = genai.GenerativeModel(
                    'gemini-1.5-flash',
                    system_instruction=system_prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        temperature=0.1
                    )
                )
                response = model.generate_content(user_prompt)
                return json.loads(response.text)
            except Exception as e:
                print(f"Error calling Gemini API: {e}")
                raise RuntimeError(f"Failed to generate JSON from Gemini: {e}")
                
        elif self.provider == "groq":
            try:
                completion = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                response_content = completion.choices[0].message.content
                return json.loads(response_content)
            except Exception as e:
                print(f"Error calling Groq API: {e}")
                raise RuntimeError(f"Failed to generate JSON from Groq: {e}")
        else:
            raise NotImplementedError()

