import json
from models import ReportPayload, Site, Reporter
from ai.analyzer import SafetyAnalyzer
from ai.sif.service import SIFService

# Mock data helper
def create_mock_report(report_id, description):
    return ReportPayload(
        report_id=report_id,
        report_date="2026-09-09",
        time="10:00",
        site=Site(site_id="S1", site_name="Test Site", region="North"),
        location="Unit 1",
        department="Maintenance",
        reported_by=[Reporter(emp_id="E1", name="Test User")],
        report_type="observation",
        activity="Maintenance",
        description=description,
        source="Test"
    )

def run_tests():
    analyzer = SafetyAnalyzer()
    sif_service = SIFService()
    
    test_cases = [
        {
            "name": "TEST 1 - Pipeline pressure (Strong SIF)",
            "description": "During maintenance, a technician started opening a pipeline valve before confirming that the line was fully depressurized. No injury occurred.",
            "expected_sif": True
        },
        {
            "name": "TEST 2 - Working at height (Strong SIF)",
            "description": "A worker was observed working on an elevated platform without connecting the required fall-arrest lanyard. No fall occurred.",
            "expected_sif": True
        },
        {
            "name": "TEST 3 - Electrical isolation (Strong SIF)",
            "description": "An electrician began work on equipment before electrical isolation was verified.",
            "expected_sif": True
        },
        {
            "name": "TEST 4 - Confined space (Strong SIF)",
            "description": "A worker entered a confined space without confirmed gas testing and without a verified rescue arrangement.",
            "expected_sif": True
        },
        {
            "name": "TEST 5 - Low-risk housekeeping (NON-SIF)",
            "description": "Several tools were left on the floor in the workshop.",
            "expected_sif": False
        },
        {
            "name": "TEST 6 - Minor PPE issue (NON-SIF)",
            "description": "A worker was observed without safety glasses while walking through an office corridor.",
            "expected_sif": False
        }
    ]
    
    for test in test_cases:
        print(f"\n{'='*60}")
        print(f"{test['name']}")
        print(f"EXPECTED: {'SIF_POTENTIAL' if test['expected_sif'] else 'NON_SIF'}")
        print(f"{'='*60}")
        
        report = create_mock_report("T1", test["description"])
        
        # 1. NLP extraction
        print("Running NLP Extraction...")
        analysis, _ = analyzer.analyze(report)
        if not analysis:
            print("NLP Extraction failed.")
            continue
            
        # 2. SIF Evaluation
        print("Running SIF Evaluation...")
        sif_result = sif_service.evaluate(report, analysis)
        if not sif_result:
            print("SIF Evaluation failed.")
            continue
            
        print("\n--- SIF RESULT ---")
        print(f"Classification: {sif_result.classification}")
        print(f"Score: {sif_result.sif_score}")
        print(f"Reasoning: {sif_result.reasoning}")
        print(f"\n--- SCORES ---")
        print(f"Hazard: {sif_result.hazard_severity}/5")
        print(f"Energy: {sif_result.energy_score}/5")
        print(f"Exposure: {sif_result.exposure_score}/5")
        print(f"Consequence: {sif_result.consequence_score}/5")
        print(f"Barrier Fail: {sif_result.barrier_failure_score}/5")
        print(f"Causal Cred: {sif_result.causal_chain_score}/5")
        
        if (sif_result.classification == "SIF_POTENTIAL") == test["expected_sif"]:
            print("\n✅ TEST PASSED")
        else:
            print("\n❌ TEST FAILED")

if __name__ == "__main__":
    run_tests()
