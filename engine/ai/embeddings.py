import os
import requests
import time

class RemoteSentenceTransformer:
    """
    A lightweight, API-based replacement for the heavy sentence-transformers package.
    Uses Hugging Face's free Inference API to generate embeddings without needing PyTorch.
    """
    def __init__(self, model_id='sentence-transformers/all-MiniLM-L6-v2'):
        self.api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{model_id}"
        hf_token = os.getenv('HF_TOKEN')
        self.headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
        
    def encode(self, texts, normalize_embeddings=False, retries=3):
        payload = {"inputs": texts}
        
        for attempt in range(retries):
            try:
                response = requests.post(self.api_url, headers=self.headers, json=payload, timeout=15)
                if response.status_code == 200:
                    result = response.json()
                    return self._wrap_result(result)
                elif response.status_code == 503:
                    # Model is loading on HF spaces, wait and retry
                    time.sleep(2 * (attempt + 1))
                    continue
                else:
                    print(f"[Embeddings] HF API Error: {response.text}")
                    return self._fallback_result(texts)
            except Exception as e:
                print(f"[Embeddings] HF API Exception on attempt {attempt}: {e}")
                time.sleep(1)
                
        return self._fallback_result(texts)
        
    def _fallback_result(self, texts):
        # Return zeros matching the 384 dimensions of all-MiniLM-L6-v2 so the DB doesn't break
        dim = 384
        if isinstance(texts, str):
            result = [0.0] * dim
        else:
            result = [[0.0] * dim for _ in texts]
        return self._wrap_result(result)
        
    def _wrap_result(self, data):
        # Mock the .tolist() method expected by numpy arrays in the original codebase
        class MockNumpyArray:
            def __init__(self, data):
                self.data = data
            def tolist(self):
                return self.data
        return MockNumpyArray(data)
