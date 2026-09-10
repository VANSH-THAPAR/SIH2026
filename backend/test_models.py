import os
import requests
import json

def list_models():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        load_dotenv(env_path)
        api_key = os.getenv("GROQ_API_KEY")
    
    url = "https://api.groq.com/openai/v1/models"
    headers = {"Authorization": f"Bearer {api_key}"}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        models = [m['id'] for m in data.get('data', [])]
        print(models)
    else:
        print(f"Error {response.status_code}: {response.text}")

if __name__ == "__main__":
    list_models()
