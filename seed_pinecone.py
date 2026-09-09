import json
import urllib.request
import time
import os

url = "http://localhost:8000/ingest"
file_path = os.path.join(os.path.dirname(__file__), "dataset", "REPORTS_DATA.JSON")

print(f"Loading data from {file_path}...")
with open(file_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Loaded {len(data)} reports.")

# We will chunk the requests to not overload the API all at once.
# Generating vector embeddings locally can take a bit of CPU time.
chunk_size = 50
total_success = 0

start_time = time.time()

for i in range(0, len(data), chunk_size):
    chunk = data[i:i + chunk_size]
    print(f"Processing chunk {i//chunk_size + 1} ({len(chunk)} reports)...")
    
    req = urllib.request.Request(url, method="POST")
    req.add_header('Content-Type', 'application/json')
    jsondata = json.dumps(chunk).encode('utf-8')
    
    try:
        response = urllib.request.urlopen(req, data=jsondata)
        result = json.loads(response.read().decode('utf-8'))
        print(f"  Result: {result}")
        total_success += len(chunk)
    except Exception as e:
        print(f"  Error on chunk {i//chunk_size + 1}: {e}")

print(f"\nTotal time: {time.time() - start_time:.2f} seconds")
print(f"Successfully processed {total_success} reports. They are now in Pinecone!")
