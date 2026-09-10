import json
import time
import os
from models import ReportPayload, Site, Reporter
from ai.analyzer import SafetyAnalyzer
from ai.sif.service import SIFService

CACHE_FILE = r"C:\Users\Gagan\.gemini\antigravity-ide\brain\59529645-03ce-449a-9364-b3aa07bbc792\sif_bulk_test_cache.json"
REPORT_FILE = r"C:\Users\Gagan\.gemini\antigravity-ide\brain\59529645-03ce-449a-9364-b3aa07bbc792\sif_accuracy_report_v3_1_40cases.md"

def create_mock_report(report_id, description):
    return ReportPayload(
        report_id=report_id,
        report_date="2026-09-09",
        time="10:00",
        site=Site(site_id="S1", site_name="Test Site", region="North"),
        location="Unit 1",
        department="Operations",
        reported_by=[Reporter(emp_id="E1", name="Test User")],
        report_type="observation",
        activity="General",
        description=description,
        source="Test"
    )

test_cases = [
    {"expected": False, "desc": "Employee was not holding the handrail while walking down the office stairs. No fall occurred.", "category": "FP1"},
    {"expected": False, "desc": "A worker used a chair to reach a high shelf in the office instead of a step stool.", "category": "FP2"},
    {"expected": False, "desc": "Contractor was seen wearing safety glasses on top of their hard hat instead of over their eyes while walking outside the active process area.", "category": "FP3"},
    {"expected": False, "desc": "Found 3 empty cardboard boxes left in the middle of an emergency exit route.", "category": "FP4"},
    {"expected": False, "desc": "Found a power cord stretching across the office hallway, posing a trip hazard.", "category": "FP5"},
    {"expected": False, "desc": "Workshop bench had grease spilled on it and was not cleaned up at the end of the shift.", "category": "FP6"},

    {"expected": True, "desc": "During maintenance, a technician started opening a pipeline valve before confirming that the line was fully depressurized.", "category": "SENS1"},
    {"expected": True, "desc": "Worker was found inside an electrically powered mixer doing cleaning without having applied lockout/tagout (LOTO).", "category": "SENS2"},
    {"expected": True, "desc": "Technician entered a trench 6 feet deep without shoring or a trench box installed.", "category": "SENS3"},
    {"expected": True, "desc": "Crane operator swung a 5-ton suspended load directly over a crew of workers due to miscommunication.", "category": "SENS4"},
    {"expected": True, "desc": "Hydrogen sulfide (H2S) personal monitor alarmed at 15ppm during a gauge check. The worker immediately evacuated without symptoms.", "category": "SENS5"},
    {"expected": True, "desc": "A forklift reversed at high speed in the warehouse without a spotter and narrowly missed a pedestrian who had to jump out of the way.", "category": "SENS6"},
    {"expected": True, "desc": "High pressure steam line blew a gasket, releasing a large plume of 200C steam across the main walkway.", "category": "SENS7"},
    
    {"expected": True, "desc": "Worker noticed scaffolding was missing a toe-board directly above a busy walkway.", "category": "OTHER_TP1"},
    {"expected": True, "desc": "Maintenance crew opened a vessel that had not been fully purged of flammable hydrocarbons, and began hot work.", "category": "OTHER_TP2"},
    {"expected": True, "desc": "Worker was observed working on an elevated platform 15m high without connecting the required fall-arrest lanyard.", "category": "OTHER_TP3"},
    {"expected": False, "desc": "Small puddle of water found near the breakroom sink.", "category": "OTHER_TN1"},
    {"expected": False, "desc": "Worker got a paper cut while filing documents.", "category": "OTHER_TN2"},
    {"expected": False, "desc": "Employee observed texting on their cell phone while walking on the designated pedestrian walkway.", "category": "OTHER_TN3"},
    {"expected": False, "desc": "During a lifting operation, the primary lifting sling snapped, dropping the equipment 2 meters to the deck.", "category": "OTHER_TP4"},
    
    # 20 NEW TEST CASES
    {"expected": True, "desc": "Worker inhaled toxic chemical fumes after a drum leaked in an unventilated storage room. They were given oxygen on site.", "category": "SENS8"},
    {"expected": True, "desc": "During scaffolding dismantling, a 10kg steel pipe fell 5 meters, striking the guardrail right next to two workers on the lower deck.", "category": "SENS9"},
    {"expected": True, "desc": "An electrician was troubleshooting a 480V panel while it was live, without arc flash PPE, and a bright spark occurred near their hand.", "category": "SENS10"},
    {"expected": True, "desc": "Excavator operator struck an underground pressurized gas line while digging, causing a large gas release. Operator fled the cabin.", "category": "SENS11"},
    {"expected": True, "desc": "Two workers entered a confined space storage tank without testing the atmosphere first. They exited after feeling dizzy.", "category": "SENS12"},
    {"expected": True, "desc": "A heavy vehicle backed up without a spotter and crushed a toolbox exactly where a mechanic was standing 5 seconds prior.", "category": "SENS13"},
    {"expected": True, "desc": "During pressure testing, a fitting blew off at 5000 psi and shot past the inspector's head, embedding in the wall.", "category": "SENS14"},
    {"expected": True, "desc": "Worker slipped on the top level of a cooling tower 20m up while not tied off. They caught themselves on the railing.", "category": "SENS15"},
    {"expected": True, "desc": "A contractor bypassed a safety interlock on a massive industrial press to clean it while it was still energized.", "category": "SENS16"},
    {"expected": True, "desc": "A crane lifting a 10-ton compressor had a catastrophic brake failure, dropping the load onto the walkway just as the shift change crew approached.", "category": "SENS17"},
    
    {"expected": False, "desc": "An employee cut their finger on a sharp edge of a filing cabinet. First aid applied.", "category": "OTHER_TN4"},
    {"expected": False, "desc": "A small localized oil spill of 200ml was found near the lube skid. No one was nearby.", "category": "OTHER_TN5"},
    {"expected": False, "desc": "Worker forgot to wear earplugs in the compressor room for 5 minutes. No immediate hearing loss reported.", "category": "OTHER_TN6"},
    {"expected": False, "desc": "An office chair has a broken wheel. Employee almost tipped over but caught themselves.", "category": "OTHER_TN7"},
    {"expected": False, "desc": "A lightbulb in the hallway burned out, leaving the area dimly lit. Employees walked carefully.", "category": "OTHER_TN8"},
    {"expected": False, "desc": "A worker tripped over an uneven floor tile in the cafeteria and scraped their knee.", "category": "OTHER_TN9"},
    {"expected": False, "desc": "Found a hammer left on the floor of the workshop. Put it back in the toolbox.", "category": "OTHER_TN10"},
    {"expected": False, "desc": "A forklift was parked blocking the designated pedestrian walkway, forcing people to walk around it.", "category": "OTHER_TN11"},
    {"expected": False, "desc": "Contractor wearing standard safety boots instead of requested metatarsal guards while doing light painting work.", "category": "OTHER_TN12"},
    {"expected": False, "desc": "Employee pinched their hand in a standard office door while closing it.", "category": "OTHER_TN13"}
]

def run_with_backoff(func, *args, max_retries=10):
    delay = 15
    for attempt in range(max_retries):
        result = func(*args)
        
        # Check if successful
        if result is not None:
            if isinstance(result, tuple) and result[0] is None:
                pass # tuple with None is a failure for analyzer
            else:
                return result
                
        print(f"Call failed or returned None. Retrying in {delay}s... (Attempt {attempt+1}/{max_retries})")
        time.sleep(delay)
        delay *= 2
    return None

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return {}

def save_cache(cache_data):
    # Defensive atomic write
    temp_file = CACHE_FILE + ".tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=2)
    os.replace(temp_file, CACHE_FILE)

def generate_report(cache, test_cases):
    output = ["# SIF Engine V3.1 Evaluation Report (40 Scenarios)\n"]
    
    tp = fp = tn = fn = 0
    scores = {"TP": [], "TN": [], "FP": [], "FN": []}
    
    failed_evaluations = []
    
    output.append("## Detailed Results\n")
    
    for idx, tc in enumerate(test_cases):
        scenario_id = f"TC{idx+1}"
        result = cache.get(scenario_id)
        
        expected_str = "SIF_POTENTIAL" if tc['expected'] else "NON_SIF"
        
        output.append(f"### Scenario {idx+1} ({tc['category']})")
        output.append(f"**Description:** {tc['desc']}")
        output.append(f"**Expected:** {expected_str}")
        
        if not result:
            output.append("**Actual:** ERROR / RATE LIMITED ❌\n\n---\n")
            continue
            
        actual_str = result['actual_label']
        is_sif_actual = (actual_str == "SIF_POTENTIAL")
        score = result['sif_score']
        
        if tc['expected'] and is_sif_actual:
            tp += 1
            scores["TP"].append(score)
            output.append(f"**Actual:** {actual_str} ✅ (TP)")
        elif not tc['expected'] and not is_sif_actual:
            tn += 1
            scores["TN"].append(score)
            output.append(f"**Actual:** {actual_str} ✅ (TN)")
        elif not tc['expected'] and is_sif_actual:
            fp += 1
            scores["FP"].append(score)
            failed_evaluations.append((scenario_id, tc, result, "False Positive"))
            output.append(f"**Actual:** {actual_str} ❌ (FP)")
        elif tc['expected'] and not is_sif_actual:
            fn += 1
            scores["FN"].append(score)
            failed_evaluations.append((scenario_id, tc, result, "False Negative"))
            output.append(f"**Actual:** {actual_str} ❌ (FN)")
            
        output.append(f"**Score:** {score}")
        output.append(f"**Confidence:** {result.get('confidence', 0)}%")
        output.append(f"**Reasoning:** {result['reasoning']}")
        output.append("\n**Breakdown:**")
        output.append(f"- Mechanism Strength: {result['dimensions'].get('sif_mechanism_strength', 0)}/5")
        output.append(f"- Pathway Credibility: {result['dimensions']['sif_pathway_credibility']}/5")
        output.append(f"- Escalation Evidence: {result['dimensions']['escalation_evidence']}/5")
        output.append(f"- Exposure Immediacy: {result['dimensions']['exposure_immediacy']}/5")
        output.append(f"- Hazard Severity: {result['dimensions']['hazard_severity']}/5")
        output.append(f"- Energy Magnitude: {result['dimensions']['energy_score']}/5")
        output.append(f"- Exposure Status: {result['dimensions'].get('exposure_status', 'N/A')}")
        output.append(f"- Documented Worker Exposure: {result['dimensions']['exposure_score']}/5")
        output.append(f"- Barrier Failure: {result['dimensions']['barrier_failure_score']}/5")
        output.append("\n---\n")
        
    total = tp + tn + fp + fn
    accuracy = (tp + tn) / total if total > 0 else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    avg_tp = sum(scores["TP"]) / len(scores["TP"]) if scores["TP"] else 0
    avg_tn = sum(scores["TN"]) / len(scores["TN"]) if scores["TN"] else 0
    avg_fp = sum(scores["FP"]) / len(scores["FP"]) if scores["FP"] else 0
    avg_fn = sum(scores["FN"]) / len(scores["FN"]) if scores["FN"] else 0
    
    summary = [
        "## Summary Metrics",
        f"- Total Scenarios: {len(test_cases)}",
        f"- Successfully Evaluated: {total}",
        f"- True Positives: {tp}",
        f"- True Negatives: {tn}",
        f"- False Positives: {fp}",
        f"- False Negatives: {fn}",
        f"- Accuracy: {accuracy*100:.1f}%",
        f"- Precision: {precision*100:.1f}%",
        f"- Recall: {recall*100:.1f}%",
        f"- F1 Score: {f1*100:.1f}%",
        "",
        "## Average Scores",
        f"- Avg TP Score: {avg_tp:.1f}",
        f"- Avg TN Score: {avg_tn:.1f}",
        f"- Avg FP Score: {avg_fp:.1f}",
        f"- Avg FN Score: {avg_fn:.1f}",
        "\n---\n"
    ]
    
    if failed_evaluations:
        summary.append("## Failure Analysis (FP/FN)")
        for sid, tc, res, ftype in failed_evaluations:
            summary.append(f"### {sid}: {ftype}")
            summary.append(f"**Desc:** {tc['desc']}")
            summary.append(f"**Score:** {res['sif_score']}")
            summary.append(f"**Mechanism/Pathway/Escalation/Immediacy:** {res['dimensions'].get('sif_mechanism_strength',0)} / {res['dimensions']['sif_pathway_credibility']} / {res['dimensions']['escalation_evidence']} / {res['dimensions']['exposure_immediacy']}")
            summary.append(f"**Reasoning:** {res['reasoning']}\n")
    
    final_output = output[:1] + summary + output[1:]
    
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(final_output))
        
    print(f"Report generated: {REPORT_FILE}")

def run_bulk_test():
    analyzer = SafetyAnalyzer()
    sif_service = SIFService()
    cache = load_cache()
    
    delay_between_requests = int(os.environ.get("DELAY_SECONDS", "15"))
    
    print(f"Loaded {len(cache)} results from cache.")
    
    for idx, tc in enumerate(test_cases):
        scenario_id = f"TC{idx+1}"
        if scenario_id in cache:
            print(f"Skipping {scenario_id} (already cached)")
            continue
            
        print(f"Processing {scenario_id}...")
        report = create_mock_report(scenario_id, tc["desc"])
        
        # We need to wrap both AI calls in backoff, but they are separate methods
        analysis_res = run_with_backoff(analyzer.analyze, report)
        if not analysis_res:
            print(f"Failed NLP extraction for {scenario_id} after retries.")
            break # Stop processing if we are hard rate limited
            
        analysis, _ = analysis_res
        
        # Now SIF evaluate
        sif_result_res = run_with_backoff(sif_service.evaluate, report, analysis)
        if not sif_result_res:
            print(f"Failed SIF extraction for {scenario_id} after retries.")
            break
            
        sif_result = sif_result_res
        
        cache[scenario_id] = {
            "scenario_id": scenario_id,
            "expected_label": "SIF_POTENTIAL" if tc["expected"] else "NON_SIF",
            "actual_label": sif_result.classification,
            "sif_score": sif_result.sif_score,
            "confidence": sif_result.confidence,
            "dimensions": {
                "hazard_severity": sif_result.hazard_severity,
                "energy_score": sif_result.energy_score,
                "exposure_score": sif_result.exposure_score,
                "consequence_score": sif_result.consequence_score,
                "barrier_failure_score": sif_result.barrier_failure_score,
                "causal_chain_score": sif_result.causal_chain_score,
                "sif_pathway_credibility": sif_result.sif_pathway_credibility,
                "sif_mechanism_strength": sif_result.sif_mechanism_strength,
                "exposure_immediacy": sif_result.exposure_immediacy,
                "escalation_evidence": sif_result.escalation_evidence,
                "exposure_status": sif_result.exposure_status
            },
            "sif_evidence": sif_result.key_evidence,
            "potential_consequence": sif_result.potential_consequence,
            "reasoning": sif_result.reasoning,
            "timestamp": time.time()
        }
        
        save_cache(cache)
        print(f"Saved {scenario_id} to cache.")
        time.sleep(delay_between_requests)
        
    generate_report(cache, test_cases)

if __name__ == "__main__":
    run_bulk_test()
