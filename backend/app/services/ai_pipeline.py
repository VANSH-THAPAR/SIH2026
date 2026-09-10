import os
import json
import logging
from groq import Groq

logger = logging.getLogger(__name__)

def run_gemini_analysis(report_data: dict) -> dict:
    """
    Calls Groq API with the SIF Sentinel prompt to analyze the incident report.
    Returns the structured JSON response perfectly matching the tables.
    """
    # Load .env file from the root if needed, but python-dotenv handles this in main.py usually
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        from dotenv import load_dotenv
        # Try to load from root directory
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
        load_dotenv(env_path)
        api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in environment variables")
        
    client = Groq(api_key=api_key)
    
    # Read prompt.txt
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "prompt.txt")
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except Exception as e:
        logger.error(f"Failed to read prompt.txt: {e}")
        system_prompt = "You are an AI safety intelligence pipeline. Analyze the incident and output ONLY JSON without any markdown."

    # Prepare the input
    user_message = f"""
    Please analyze the following incident report:
    
    Report ID: {report_data.get('report_id', '')}
    Report Date: {report_data.get('report_date', '')}
    Time: {report_data.get('time', '')}
    Site Name: {report_data.get('site_name', '')}
    Region: {report_data.get('region', '')}
    Location: {report_data.get('location', '')}
    Department: {report_data.get('department', '')}
    Report Type: {report_data.get('report_type', '')}
    Activity: {report_data.get('activity', '')}
    Description: {report_data.get('description', '')}
    Source: {report_data.get('source', '')}
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_message,
                }
            ],
            model="openai/gpt-oss-120b",
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        text = chat_completion.choices[0].message.content
        
        # Clean up in case the model ignored json format and added markdown
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
            
        data = json.loads(text)
        return data
    except Exception as e:
        logger.error(f"Groq API error or JSON parse error: {e}")
        return None
