import os
import json
from ai.life_saving_rules.service import LifeSavingRuleService
from models import ReportPayload
from ai.schemas import SafetyAnalysis

taxonomy = [
    {"rule_code": "ENERGY_ISOLATION", "rule_name": "Energy Isolation", "description": "Verify isolation and zero energy before work begins"},
    {"rule_code": "WORKING_AT_HEIGHT", "rule_name": "Working at Height", "description": "Protect yourself against a fall when working at height"},
    {"rule_code": "CONFINED_SPACE", "rule_name": "Confined Space", "description": "Obtain authorization before entering a confined space"},
    {"rule_code": "LINE_OF_FIRE", "rule_name": "Line of Fire", "description": "Keep yourself and others out of the line of fire"},
    {"rule_code": "HOT_WORK", "rule_name": "Hot Work", "description": "Control flammables and ignition sources"},
    {"rule_code": "LIFTING_OPERATIONS", "rule_name": "Lifting Operations", "description": "Plan lifting operations and control the area"},
    {"rule_code": "DRIVING_VEHICLE_SAFETY", "rule_name": "Driving / Vehicle Safety", "description": "Follow safe driving rules"},
    {"rule_code": "ELECTRICAL_SAFETY", "rule_name": "Electrical Safety", "description": "Protect against electrical hazards"},
    {"rule_code": "HAZARDOUS_SUBSTANCES", "rule_name": "Hazardous Substances / Toxic Gas", "description": "Control exposure to hazardous substances"}
]

test_cases = [
    {
        "id": "1",
        "description": "Pipeline valve opened without depressurization.",
        "expected_primary": "ENERGY_ISOLATION",
        "nlp": {"unsafe_act": "Opened valve without depressurizing", "hazard": "Stored pressure", "energy_source": "Pressurized fluid", "worker_exposure": "Direct"}
    },
    {
        "id": "2",
        "description": "Worker inside energized mixer without LOTO.",
        "expected_primary": "ENERGY_ISOLATION",
        "nlp": {"unsafe_act": "Did not perform LOTO", "hazard": "Moving parts, electricity", "energy_source": "Electrical, mechanical", "worker_exposure": "Direct"}
    },
    {
        "id": "3",
        "description": "Worker inside unsupported trench at 2m depth.",
        "expected_primary": "WORKING_AT_HEIGHT", # Or EXCAVATION if we had it, fallback based on taxonomy
        "nlp": {"unsafe_act": "Working in unsupported trench", "hazard": "Cave-in", "energy_source": "Gravity", "worker_exposure": "Direct"}
    },
    {
        "id": "4",
        "description": "Suspended load over workers.",
        "expected_primary": "LIFTING_OPERATIONS",
        "nlp": {"unsafe_act": "Walking under suspended load", "hazard": "Suspended load", "energy_source": "Gravity", "worker_exposure": "Direct under load"}
    },
    {
        "id": "5",
        "description": "H2S alarm with worker present.",
        "expected_primary": "HAZARDOUS_SUBSTANCES",
        "nlp": {"unsafe_condition": "H2S presence", "hazard": "Toxic gas", "energy_source": "Chemical", "worker_exposure": "Present in area during alarm"}
    },
    {
        "id": "6",
        "description": "Forklift nearly hits pedestrian.",
        "expected_primary": "DRIVING_VEHICLE_SAFETY",
        "nlp": {"unsafe_act": "Speeding or inattention", "hazard": "Moving vehicle", "energy_source": "Kinetic", "worker_exposure": "Near miss with pedestrian"}
    },
    {
        "id": "7",
        "description": "High-pressure steam release across walkway.",
        "expected_primary": "ENERGY_ISOLATION",
        "nlp": {"unsafe_condition": "Steam leak", "hazard": "High pressure steam", "energy_source": "Thermal/Pressure", "worker_exposure": "Walkway exposure"}
    },
    {
        "id": "8",
        "description": "Vessel with residual hydrocarbons + hot work.",
        "expected_primary": "HOT_WORK",
        "nlp": {"unsafe_act": "Welding on unpurged vessel", "hazard": "Flammable vapor", "energy_source": "Ignition/Thermal", "worker_exposure": "Direct"}
    },
    {
        "id": "9",
        "description": "Worker at 15m without fall arrest.",
        "expected_primary": "WORKING_AT_HEIGHT",
        "nlp": {"unsafe_act": "No fall protection used", "hazard": "Fall from height", "energy_source": "Gravity", "worker_exposure": "Direct at 15m"}
    },
    {
        "id": "10",
        "description": "Electrical panel live + arc flash.",
        "expected_primary": "ELECTRICAL_SAFETY",
        "nlp": {"unsafe_condition": "Exposed live wires", "hazard": "Arc flash", "energy_source": "Electrical", "worker_exposure": "Direct proximity"}
    },
    {
        "id": "11",
        "description": "Pressurized gas line struck during excavation.",
        "expected_primary": "LINE_OF_FIRE", # or Energy Isolation, we'll see how LLM maps
        "nlp": {"unsafe_act": "Struck gas line", "hazard": "Pressurized gas", "energy_source": "Pressure", "worker_exposure": "Direct"}
    },
    {
        "id": "12",
        "description": "Confined-space entry without atmospheric testing.",
        "expected_primary": "CONFINED_SPACE",
        "nlp": {"unsafe_act": "Entered without testing", "hazard": "Toxic/Anoxic atmosphere", "energy_source": "Chemical", "worker_exposure": "Inside space"}
    },
    {
        "id": "13",
        "description": "Falling object near workers.",
        "expected_primary": "LINE_OF_FIRE",
        "nlp": {"unsafe_condition": "Object fell from scaffold", "hazard": "Dropped object", "energy_source": "Gravity", "worker_exposure": "Workers below"}
    },
    {
        "id": "14",
        "description": "Crane load drops with no workers documented.",
        "expected_primary": "LIFTING_OPERATIONS",
        "nlp": {"unsafe_condition": "Rigging failure", "hazard": "Dropped load", "energy_source": "Gravity", "worker_exposure": "None documented"}
    },
    {
        "id": "15",
        "description": "Office paper cut.",
        "expected_primary": None,
        "nlp": {"unsafe_act": "Careless handling of paper", "hazard": "Sharp edge", "energy_source": "Mechanical", "worker_exposure": "Minor finger cut"}
    },
    {
        "id": "16",
        "description": "Office water puddle.",
        "expected_primary": None,
        "nlp": {"unsafe_condition": "Water on floor", "hazard": "Slip", "energy_source": "Gravity", "worker_exposure": "Potential slip"}
    },
    {
        "id": "17",
        "description": "Texting while walking in office.",
        "expected_primary": None,
        "nlp": {"unsafe_act": "Distracted walking", "hazard": "Collision", "energy_source": "Kinetic", "worker_exposure": "Self"}
    },
    {
        "id": "18",
        "description": "Small oil spill with no worker exposure.",
        "expected_primary": None,
        "nlp": {"unsafe_condition": "Oil leak", "hazard": "Environmental", "energy_source": "None", "worker_exposure": "None"}
    },
    {
        "id": "19",
        "description": "Earplugs missing in compressor room.",
        "expected_primary": None, # Assuming no specific noise rule in our taxonomy
        "nlp": {"unsafe_act": "No PPE (Hearing)", "hazard": "Noise", "energy_source": "Acoustic", "worker_exposure": "Compressor room"}
    },
    {
        "id": "20",
        "description": "Ambiguous report with insufficient information.",
        "expected_primary": None,
        "nlp": {"unsafe_condition": "Unknown", "hazard": "Unknown", "energy_source": "Unknown", "worker_exposure": "Unknown"}
    }
]

def run_evaluation():
    service = LifeSavingRuleService()
    
    correct_exact = 0
    false_positives = 0
    false_negatives = 0
    
    results = []
    
    print("Starting 20-case Life-Saving Rule mapping evaluation...\n")
    
    for case in test_cases:
        report_payload = ReportPayload(
            report_id=f"TEST_{case['id']}",
            report_date="2026-01-01",
            time="12:00",
            site={"site_id": "TEST", "site_name": "Test Site", "region": "Test"},
            location="Test",
            department="Test",
            reported_by=[],
            report_type="test",
            activity="Test Activity",
            description=case['description'],
            source="TEST"
        )
        
        safety_analysis = SafetyAnalysis(
            unsafe_act=case['nlp'].get('unsafe_act'),
            unsafe_condition=case['nlp'].get('unsafe_condition'),
            hazard=case['nlp'].get('hazard'),
            energy_source=case['nlp'].get('energy_source'),
            worker_exposure=case['nlp'].get('worker_exposure')
        )
        
        result = service.evaluate(report_payload, safety_analysis, taxonomy)
        
        primary_mapped = result.get('primary_rule', {})
        mapped_code = primary_mapped.get('rule_code') if primary_mapped else None
        
        expected = case['expected_primary']
        
        is_correct = False
        
        if expected == mapped_code:
            correct_exact += 1
            is_correct = True
        elif expected is None and mapped_code is not None:
            false_positives += 1
        elif expected is not None and mapped_code is None:
            false_negatives += 1
            
        print(f"Case {case['id']}: {case['description']}".encode('ascii', 'backslashreplace').decode('ascii'))
        print(f"  Expected : {expected}")
        print(f"  Mapped   : {mapped_code}")
        print(f"  Correct  : {is_correct}")
        if mapped_code:
            ev_str = str(primary_mapped.get('evidence'))
            print(f"  Evidence : {ev_str}".encode('ascii', 'backslashreplace').decode('ascii'))
        print("-" * 40)
        
        results.append({
            "case_id": case['id'],
            "expected": expected,
            "mapped": mapped_code,
            "correct": is_correct,
            "evidence": primary_mapped.get('evidence') if primary_mapped else None
        })
        
    accuracy = correct_exact / len(test_cases)
    
    print("\n--- EVALUATION METRICS ---")
    print(f"Total Cases     : {len(test_cases)}")
    print(f"Exact Accuracy  : {accuracy * 100:.1f}% ({correct_exact}/{len(test_cases)})")
    print(f"False Positives : {false_positives} (Mapped a rule when none was expected)")
    print(f"False Negatives : {false_negatives} (Missed a rule when one was expected)")
    
    # Simple Precision / Recall ignoring multi-label for now, just treating "has rule" vs "no rule"
    true_positives = sum(1 for c in results if c['expected'] is not None and c['mapped'] is not None)
    actual_positives = sum(1 for c in results if c['expected'] is not None)
    predicted_positives = sum(1 for c in results if c['mapped'] is not None)
    
    precision = true_positives / predicted_positives if predicted_positives > 0 else 0
    recall = true_positives / actual_positives if actual_positives > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    print(f"Binary Precision: {precision:.2f}")
    print(f"Binary Recall   : {recall:.2f}")
    print(f"Binary F1 Score : {f1:.2f}")

if __name__ == "__main__":
    run_evaluation()
