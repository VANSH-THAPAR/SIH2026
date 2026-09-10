import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.services.ai_pipeline import run_gemini_analysis

report_dict = {
    "report_id": "R00001",
    "report_date": "2026-09-11",
    "time": "10:00",
    "site_name": "Duliajan",
    "region": "Assam",
    "location": "Well No. 5",
    "department": "Drilling",
    "report_type": "Unsafe Condition",
    "activity": "Drilling operation",
    "description": "Worker found working at height without fall protection near the rig floor.",
    "source": "Platform"
}

def test():
    result = run_gemini_analysis(report_dict)
    import json
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    test()
