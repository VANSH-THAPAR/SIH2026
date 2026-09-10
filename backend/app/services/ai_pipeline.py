import os
import json
import logging
import google.generativeai as genai
from pydantic import BaseModel

logger = logging.getLogger(__name__)

def run_gemini_analysis(report_data: dict) -> dict:
    """
    Calls Gemini API with the SIF Sentinel prompt to analyze the incident report.
    Returns the structured JSON response perfectly matching the tables.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment variables")
        
    genai.configure(api_key=api_key)
    
    # Read prompt.txt
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "prompt.txt")
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except Exception as e:
        logger.error(f"Failed to read prompt.txt: {e}")
        system_prompt = "You are an AI safety intelligence pipeline. Analyze the incident and output JSON."

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

    generation_config = {
        "temperature": 0.2,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 8192,
        "response_mime_type": "application/json",
    }
    
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config=generation_config,
        system_instruction=system_prompt,
    )
    
    try:
        response = model.generate_content(user_message)
        text = response.text
        # Clean up in case the model ignored response_mime_type and added markdown
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
            
        data = json.loads(text)
        return data
    except Exception as e:
        logger.error(f"Gemini API error or JSON parse error: {e}")
        return None
