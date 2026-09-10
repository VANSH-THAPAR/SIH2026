"""
Safety Engine: Deterministic services for SIF analysis.
AI extracts information; Safety Engine applies controlled logic.
"""
from typing import List, Optional, Dict, Any


PRIORITY_THRESHOLDS = {
    "CRITICAL": 85,
    "HIGH": 70,
    "MEDIUM": 50,
    "LOW": 0,
}

SIF_SCORE_MAX = 100

# Life-Saving Rule keyword mappings
LSR_KEYWORDS = {
    "WORKING_AT_HEIGHT": [
        "height", "fall", "ladder", "scaffold", "roof", "elevated", "mast",
        "tower", "aerial", "working at height", "fall protection", "harness"
    ],
    "CONFINED_SPACE": [
        "confined space", "vessel", "tank", "pit", "sewer", "tunnel", "manhole",
        "atmospheric", "oxygen", "gas testing", "entry permit"
    ],
    "ENERGY_ISOLATION": [
        "loto", "lockout", "tagout", "isolation", "energy", "depressuriz", "depressurization",
        "valve", "pipeline", "bled", "pressure", "energized", "de-energized", "zero energy"
    ],
    "LINE_OF_FIRE": [
        "line of fire", "struck by", "caught between", "moving equipment",
        "projectile", "ejected", "under suspended load", "overhead"
    ],
    "LIFTING_OPERATIONS": [
        "lifting", "crane", "sling", "rigging", "suspended load", "hoist",
        "excavator bucket", "overhead load", "lift plan", "load"
    ],
    "DRIVING_VEHICLE_SAFETY": [
        "driving", "vehicle", "truck", "car", "speed", "seatbelt", "road",
        "driver", "pedestrian", "traffic"
    ],
    "HOT_WORK": [
        "hot work", "welding", "cutting", "grinding", "spark", "ignition",
        "flammable", "combustible", "fire", "flame"
    ],
    "ELECTRICAL_SAFETY": [
        "electrical", "electric", "shock", "electrocution", "live wire",
        "circuit", "switchboard", "lightning", "thunderstorm"
    ],
    "HAZARDOUS_SUBSTANCES": [
        "toxic", "gas", "chemical", "H2S", "CO", "oxygen deficiency",
        "hazardous", "asphyxiation", "vapour", "fumes", "methane"
    ],
}

# Barrier keyword mappings
BARRIER_KEYWORDS = {
    "ENERGY_ISOLATION": ["isolation", "energy isolation", "zero energy", "valve", "pipeline"],
    "DEPRESSURIZATION": ["depressuriz", "depressurization", "pressure", "bled", "pressure relief", "valve", "pipeline"],
    "LOTO": ["loto", "lockout", "tagout", "lock out"],
    "PTW": ["permit to work", "ptw", "work permit", "hot work permit"],
    "GAS_TESTING": ["gas testing", "atmospheric testing", "atmospheric monitoring", "gas check"],
    "FALL_PROTECTION": ["fall protection", "harness", "safety line", "lanyard", "fall arrest"],
    "SCAFFOLDING": ["scaffold", "scaffolding", "edge protection", "guardrail"],
    "LIFTING_PLAN": ["lift plan", "lifting plan", "rigging plan"],
    "GUARDING": ["guarding", "machine guard", "protection guard"],
    "INTERLOCK": ["interlock", "safety instrumented", "SIS", "SIL"],
}


def calculate_priority(sif_score: Optional[float]) -> str:
    """Determine priority from SIF score."""
    if sif_score is None:
        return "LOW"
    for priority, threshold in PRIORITY_THRESHOLDS.items():
        if sif_score >= threshold:
            return priority
    return "LOW"


def build_escalation_path(
    report_type: str,
    hazard: Optional[str],
    energy_source: Optional[str],
    worker_exposure: Optional[str],
    missing_controls: Optional[str],
    potential_consequence: Optional[str],
    causal_chain: Optional[List[str]],
    activity: Optional[str] = None,
) -> Dict[str, Any]:
    """Build an escalation graph from available data."""
    nodes = []
    edges = []
    node_id = 0

    def add_node(label: str, node_type: str, description: Optional[str] = None) -> str:
        nonlocal node_id
        nid = f"node-{node_id}"
        node_id += 1
        nodes.append({
            "id": nid,
            "label": label,
            "type": node_type,
            "description": description or label,
        })
        return nid

    def add_edge(source: str, target: str, label: str = "") -> None:
        edges.append({"source": source, "target": target, "label": label})

    # Start with initial event
    if activity:
        start = add_node(activity, "event", f"Activity: {activity}")
    else:
        start = add_node(report_type.replace("_", " ").title(), "event")

    # Causal chain nodes
    prev = start
    if causal_chain:
        for step in causal_chain[:3]:
            if len(step) > 100:
                step = step[:97] + "..."
            n = add_node(step, "event", step)
            add_edge(prev, n, "leads to")
            prev = n

    # Hazard node
    if hazard:
        hazard_short = hazard[:80] if len(hazard) > 80 else hazard
        h = add_node(hazard_short, "hazard", hazard)
        add_edge(prev, h, "creates hazard")
        prev = h

    # Missing controls = barrier failure
    if missing_controls:
        bc = missing_controls[:80] if len(missing_controls) > 80 else missing_controls
        b = add_node(f"Failed: {bc}", "barrier", f"Missing controls: {missing_controls}")
        add_edge(prev, b, "barrier failure")
        prev = b

    # Worker exposure
    if worker_exposure:
        exp_short = worker_exposure[:80] if len(worker_exposure) > 80 else worker_exposure
        e = add_node(exp_short, "exposure", worker_exposure)
        add_edge(prev, e, "exposes workers")
        prev = e

    # Potential consequence
    if potential_consequence:
        cons_short = potential_consequence[:80] if len(potential_consequence) > 80 else potential_consequence
        c = add_node(cons_short, "consequence", potential_consequence)
        add_edge(prev, c, "could result in")
    else:
        c = add_node("Serious Injury or Fatality", "consequence")
        add_edge(prev, c, "could result in")

    return {"nodes": nodes, "edges": edges}


def generate_recommended_actions(
    hazard: Optional[str],
    missing_controls: Optional[str],
    energy_source: Optional[str],
    sif_score: Optional[float],
    barrier_statuses: List[str] = None,
) -> List[str]:
    """Generate deterministic recommended actions."""
    actions = []

    if missing_controls:
        actions.append(f"Implement missing controls: {missing_controls[:120]}")

    if sif_score and sif_score >= 85:
        actions.append("Immediately suspend similar activities pending safety review")
        actions.append("Conduct urgent barrier assessment across all similar operations")

    if barrier_statuses and "FAILED" in barrier_statuses:
        actions.append("Restore failed safety barriers to effective status before resuming work")

    if barrier_statuses and "BYPASSED" in barrier_statuses:
        actions.append("Investigate and address bypassed safety barriers; enforce compliance")

    if energy_source and "pressure" in energy_source.lower():
        actions.append("Verify LOTO/Depressurization procedures and conduct retraining")

    if energy_source and ("height" in (hazard or "").lower() or "gravit" in energy_source.lower()):
        actions.append("Audit fall protection equipment and enforce pre-task inspection")

    if hazard and "gas" in hazard.lower():
        actions.append("Mandate atmospheric gas testing before any confined space entry")

    if not actions:
        actions.append("Conduct immediate incident investigation and root cause analysis")
        actions.append("Review and update Safe Work Procedures for related activities")

    actions.append("Share safety alert with all relevant personnel and facilities")
    actions.append("Schedule follow-up verification to confirm control effectiveness")

    return actions[:6]


def classify_sif(sif_score: Optional[float]) -> str:
    """Classify SIF score into human-readable category."""
    if sif_score is None:
        return "UNKNOWN"
    if sif_score >= 85:
        return "CRITICAL"
    elif sif_score >= 70:
        return "HIGH"
    elif sif_score >= 50:
        return "MODERATE"
    else:
        return "LOW"


def derive_incident_title(
    report_type: Optional[str],
    hazard: Optional[str],
    activity: Optional[str],
    unsafe_act: Optional[str],
    description: Optional[str],
) -> str:
    """Derive a human-readable incident title from available data."""
    if hazard and activity:
        h = hazard[:60] if len(hazard) > 60 else hazard
        a = activity[:40] if len(activity) > 40 else activity
        return f"{h} during {a}"
    if hazard:
        return hazard[:80] if len(hazard) > 80 else hazard
    if unsafe_act:
        return unsafe_act[:80] if len(unsafe_act) > 80 else unsafe_act
    if description:
        return description[:80] if len(description) > 80 else description
    return f"Incident {report_type or 'Report'}"
