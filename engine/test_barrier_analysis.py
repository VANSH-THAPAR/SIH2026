import os
import json
from ai.barriers.service import BarrierService
from ai.barriers.schemas import BarrierStatus

taxonomy = [
    {"barrier_code": "DEPRESSURIZATION", "barrier_name": "Depressurization / Pressure Control", "barrier_type": "HARDWARE"},
    {"barrier_code": "ENERGY_ISOLATION", "barrier_name": "Energy Isolation", "barrier_type": "HARDWARE"},
    {"barrier_code": "GAS_TESTING", "barrier_name": "Gas Testing", "barrier_type": "DETECTION"},
    {"barrier_code": "HOT_WORK", "barrier_name": "Hot Work Controls", "barrier_type": "ADMINISTRATIVE"},
    {"barrier_code": "FALL_PROTECTION", "barrier_name": "Fall Protection", "barrier_type": "HARDWARE"},
    {"barrier_code": "LOTO", "barrier_name": "Lockout/Tagout", "barrier_type": "ADMINISTRATIVE"},
    {"barrier_code": "LIFTING_PLAN", "barrier_name": "Lifting Plan", "barrier_type": "ADMINISTRATIVE"},
    {"barrier_code": "EXCLUSION_ZONE", "barrier_name": "Exclusion Zone", "barrier_type": "ADMINISTRATIVE"},
    {"barrier_code": "EMERGENCY_RESPONSE", "barrier_name": "Emergency Response", "barrier_type": "EMERGENCY"}
]

test_cases = [
    # --- FAILURES ---
    {
        "id": "1",
        "description": "During maintenance, a technician started opening a pipeline valve before confirming that the line was fully depressurized. No injury occurred.",
        "nlp": {"unsafe_act": "Opening valve without depressurization"},
        "sif": {"sif_potential": True},
        "expected_code": "DEPRESSURIZATION", # or ENERGY_ISOLATION
        "expected_status": BarrierStatus.FAILED.value # or MISSING
    },
    {
        "id": "2",
        "description": "A worker fell 15 meters because their fall arrest lanyard snapped under load.",
        "nlp": {"unsafe_condition": "Lanyard snapped"},
        "sif": {"sif_potential": True},
        "expected_code": "FALL_PROTECTION",
        "expected_status": BarrierStatus.FAILED.value
    },
    # --- MISSING ---
    {
        "id": "3",
        "description": "During hot work inside a vessel, gas testing was not performed before welding started.",
        "nlp": {"missing_controls": "Gas testing"},
        "sif": {"sif_potential": True},
        "expected_code": "GAS_TESTING",
        "expected_status": BarrierStatus.MISSING.value
    },
    {
        "id": "4",
        "description": "A worker was working at 15 meters without fall arrest.",
        "nlp": {"missing_controls": "Fall arrest"},
        "sif": {"sif_potential": True},
        "expected_code": "FALL_PROTECTION",
        "expected_status": BarrierStatus.MISSING.value
    },
    # --- BYPASSED / WEAK ---
    {
        "id": "5",
        "description": "An energized mixer was accessed without lockout/tagout because the supervisor told them to hurry.",
        "nlp": {"unsafe_act": "Bypassed LOTO"},
        "sif": {"sif_potential": True},
        "expected_code": "LOTO",
        "expected_status": BarrierStatus.BYPASSED.value # or MISSING
    },
    # --- EFFECTIVE ---
    {
        "id": "6",
        "description": "An H2S alarm activated at 15 ppm while workers were present. Workers immediately evacuated safely.",
        "nlp": {"existing_controls": "H2S monitor, Evacuation"},
        "sif": {"sif_potential": True},
        "expected_code": "EMERGENCY_RESPONSE", # or GAS_TESTING
        "expected_status": BarrierStatus.EFFECTIVE.value
    },
    # --- EDGE CASE: NON-SIF LOAD DROP (Must not hallucinate) ---
    {
        "id": "7",
        "description": "A lifting sling snapped and a load fell 2 meters to the deck. No workers were documented nearby.",
        "nlp": {"unsafe_condition": "Sling snapped", "worker_exposure": "None documented"},
        "sif": {"sif_potential": False, "exposure_status": "NO_DOCUMENTED_EXPOSURE"},
        "expected_code": None, # or LIFTING_PLAN/INSPECTION
        "expected_status": BarrierStatus.NOT_DETERMINED.value # or FAILED
    },
    # 13 more simple cases to reach 20
    {
        "id": "8", "description": "Worker hit finger with hammer.", "nlp": {}, "sif": {"sif_potential": False}, "expected_code": None, "expected_status": None
    },
    {
        "id": "9", "description": "Oil spill in containment area.", "nlp": {}, "sif": {"sif_potential": False}, "expected_code": None, "expected_status": None
    },
    {
        "id": "10", "description": "Scaffold collapsed due to missing ties.", "nlp": {"unsafe_condition": "Missing ties"}, "sif": {"sif_potential": True}, "expected_code": None, "expected_status": None # Let LLM decide, likely NOT_DETERMINED if SCAFFOLDING not explicitly in taxonomy subset here
    },
    {
        "id": "11", "description": "LOTO applied correctly, work completed safely.", "nlp": {"existing_controls": "LOTO"}, "sif": {"sif_potential": False}, "expected_code": "LOTO", "expected_status": BarrierStatus.EFFECTIVE.value
    },
    {
        "id": "12", "description": "Hot work permit expired before work finished.", "nlp": {"unsafe_act": "Working on expired permit"}, "sif": {"sif_potential": False}, "expected_code": "HOT_WORK", "expected_status": BarrierStatus.WEAK.value # or FAILED/MISSING
    },
    {
        "id": "13", "description": "Worker walked under suspended load, spotter failed to stop them.", "nlp": {"unsafe_act": "Walking under load", "missing_controls": "Spotter intervention"}, "sif": {"sif_potential": True}, "expected_code": "EXCLUSION_ZONE", "expected_status": BarrierStatus.FAILED.value
    },
    {
        "id": "14", "description": "Electrical panel left open, no LOTO.", "nlp": {"unsafe_condition": "Open panel"}, "sif": {"sif_potential": True}, "expected_code": "ENERGY_ISOLATION", "expected_status": BarrierStatus.MISSING.value
    },
    {
        "id": "15", "description": "Gas test showed 0 LEL, but spark caused minor flash later.", "nlp": {"unsafe_condition": "Gas build up"}, "sif": {"sif_potential": True}, "expected_code": "GAS_TESTING", "expected_status": BarrierStatus.WEAK.value # or FAILED
    },
    {
        "id": "16", "description": "Slipped on wet floor.", "nlp": {}, "sif": {"sif_potential": False}, "expected_code": None, "expected_status": None
    },
    {
        "id": "17", "description": "Paper cut.", "nlp": {}, "sif": {"sif_potential": False}, "expected_code": None, "expected_status": None
    },
    {
        "id": "18", "description": "Crane operator lifted over capacity, overload alarm bypassed.", "nlp": {"unsafe_act": "Bypassed alarm"}, "sif": {"sif_potential": True}, "expected_code": None, "expected_status": None # Probably BYPASSED on something
    },
    {
        "id": "19", "description": "Depressurization valve stuck open.", "nlp": {"unsafe_condition": "Valve stuck"}, "sif": {"sif_potential": True}, "expected_code": "DEPRESSURIZATION", "expected_status": BarrierStatus.FAILED.value
    },
    {
        "id": "20", "description": "Worker dizzy from fumes, no ventilation.", "nlp": {"missing_controls": "Ventilation"}, "sif": {"sif_potential": True}, "expected_code": None, "expected_status": None
    }
]

def run_evaluation():
    service = BarrierService()
    
    print("Starting 20-case Barrier Analysis evaluation...\n")
    
    for case in test_cases:
        result = service.evaluate(
            report_desc=case['description'],
            nlp_analysis=case.get('nlp', {}),
            sif_analysis=case.get('sif', {}),
            lsr_mapping=[],
            taxonomy=taxonomy
        )
        
        primary_code = result.primary_barrier_code
        primary_status = None
        if primary_code:
            for b in result.barriers:
                if b.barrier_code == primary_code:
                    primary_status = b.status.value
                    break
                    
        print(f"Case {case['id']}: {case['description']}".encode('ascii', 'backslashreplace').decode('ascii'))
        print(f"  Expected Code : {case['expected_code']}")
        print(f"  Mapped Code   : {primary_code}")
        print(f"  Expected Stat : {case['expected_status']}")
        print(f"  Mapped Stat   : {primary_status}")
        
        if primary_code:
            ev = [b.evidence for b in result.barriers if b.barrier_code == primary_code]
            print(f"  Evidence      : {ev[0] if ev else None}".encode('ascii', 'backslashreplace').decode('ascii'))
            
        print("-" * 40)
        
if __name__ == "__main__":
    run_evaluation()
