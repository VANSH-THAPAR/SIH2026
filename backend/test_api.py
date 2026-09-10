import requests
import json

url = "http://127.0.0.1:8000/api/incidents"
payload = {
    "report_date": "2026-09-11",
    "time": "14:30",
    "site_name": "Duliajan",
    "region": "Assam",
    "location": "Well No 5",
    "department": "Drilling",
    "report_type": "Unsafe Act",
    "activity": "Working at height",
    "description": "Worker observed scaling the rig derrick without a safety harness attached to the lifeline."
}
headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload)
print(f"Status Code: {response.status_code}")
try:
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("Response is not JSON:", response.text)
