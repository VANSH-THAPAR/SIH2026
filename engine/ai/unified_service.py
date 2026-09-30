"""
Master Unified AI Safety Intelligence Engine (SIF Sentinel).
Located in engine/ai/unified_service.py.
Combines NLP extraction, SIF evaluation, Life-Saving Rules mapping, 
Barrier diagnosis, and HSE Intervention recommendation into ONE single LLM pass.
Directly integrates RiskScorer and InterventionPlaybook from the engine.
"""
import os
import json
import time
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from groq import Groq
from sqlalchemy.orm import Session
from sqlalchemy import text

# Import deterministic engine components from engine
from ai.risk_prioritization.scorer import RiskScorer
from ai.intervention.playbook import InterventionPlaybook

logger = logging.getLogger(__name__)

LSR_TAXONOMY = {
    "ENERGY_ISOLATION": "Energy Isolation",
    "WORKING_AT_HEIGHT": "Working at Height",
    "CONFINED_SPACE": "Confined Space",
    "LINE_OF_FIRE": "Line of Fire",
    "HOT_WORK": "Hot Work",
    "LIFTING_OPERATIONS": "Lifting Operations",
    "DRIVING_VEHICLE_SAFETY": "Driving / Vehicle Safety",
    "ELECTRICAL_SAFETY": "Electrical Safety",
    "HAZARDOUS_SUBSTANCES": "Hazardous Substances / Toxic Gas"
}

BARRIER_TAXONOMY = {
    "ENERGY_ISOLATION": "Energy Isolation",
    "DEPRESSURIZATION": "Depressurization / Pressure Control",
    "LOTO": "Lockout / Tagout Verification",
    "PTW": "Permit to Work",
    "GAS_TESTING": "Gas Testing / Atmospheric Monitoring",
    "GUARDING": "Guarding / Machine Protection",
    "INTERLOCK": "Interlock / Safety Instrumented Protection",
    "FALL_PROTECTION": "Fall Protection",
    "SCAFFOLDING": "Scaffolding / Edge Protection",
    "LIFTING_PLAN": "Lifting Plan / Load Control",
    "LIFTING_INSPECTION": "Lifting Equipment Inspection",
    "EXCLUSION_ZONE": "Exclusion Zone",
    "LINE_OF_FIRE": "Line of Fire Control",
    "TRAFFIC_SEGREGATION": "Traffic / Vehicle Segregation",
    "ELECTRICAL_ISOLATION": "Electrical Isolation",
    "ELECTRICAL_PROTECTION": "Electrical Protection",
    "HOT_WORK": "Hot Work Controls",
    "CONFINED_SPACE": "Confined Space Controls",
    "CHEMICAL_CONTAINMENT": "Chemical Containment",
    "PPE": "PPE",
    "ENGINEERING": "Engineering Control",
    "ADMINISTRATIVE": "Administrative Control",
    "SUPERVISION": "Supervision / Verification",
    "PROCEDURE": "Procedure / Work Instruction",
    "COMPETENCY": "Competency / Training",
    "EMERGENCY_RESPONSE": "Emergency Response"
}

MASTER_SYSTEM_PROMPT = f"""You are the Master AI Safety Intelligence Engine for Oil India Limited (OIL) - SIF Sentinel.
Analyze the HSE incident and generate a complete multi-dimensional safety diagnosis in ONE SINGLE PASS.

Allowed Life-Saving Rules (IOGP):
{json.dumps(LSR_TAXONOMY, indent=2)}

Allowed Safety Barrier Codes:
{json.dumps(BARRIER_TAXONOMY, indent=2)}

Analysis Guidelines:
1. NLP Extraction: Identify hazard, energy source, unsafe act/condition, worker exposure, missing controls, potential consequence, actual consequence, and a 2-4 step causal chain.
2. SIF Potential: Determine if this was a Serious Injury or Fatality (SIF) Precursor. SIF potential is TRUE if high energy or life-threatening hazard was present with worker exposure and missing/compromised critical barriers, EVEN IF NO INJURY OCCURRED.
   - hazard_severity: 0.0 to 1.0
   - energy_magnitude: 0.0 to 1.0
   - critical_barrier_failure: 0.0 to 1.0
   - exposure_immediacy: 0.0 to 1.0
   - consequence_severity: 0.0 to 1.0
3. Life-Saving Rule: Map to the MOST relevant IOGP rule from allowed list, or null if none apply. Priority should be PRIMARY. Provide confidence (0.0 - 1.0) and evidence.
4. Barrier Analysis: Evaluate which barriers from allowed list were FAILED, MISSING, DEGRADED, or EFFECTIVE. Assign criticality (0.0 - 1.0) and concrete evidence.
5. Action Recommendations: Generate 2-3 specific, actionable HSE corrective actions mapped to Hierarchy of Controls (ELIMINATION, ENGINEERING, ADMINISTRATIVE, PPE).

Return ONLY valid JSON matching this schema:
{{
  "nlp": {{
    "hazard": "string",
    "energy_source": "string",
    "unsafe_act": "string or null",
    "unsafe_condition": "string or null",
    "worker_exposure": "string",
    "existing_controls": "string or null",
    "missing_controls": "string or null",
    "potential_consequence": "string",
    "actual_consequence": "string",
    "causal_chain": ["step 1", "step 2", "step 3"],
    "key_evidence": ["fact 1", "fact 2"]
  }},
  "sif": {{
    "sif_potential": true,
    "hazard_severity": 0.85,
    "energy_magnitude": 0.80,
    "critical_barrier_failure": 0.90,
    "exposure_immediacy": 0.75,
    "consequence_severity": 0.85,
    "sif_pathway_credibility": 0.85,
    "sif_mechanism_strength": 0.80,
    "confidence": 0.90,
    "sif_reasoning": "string explanation"
  }},
  "life_saving_rule": {{
    "rule_code": "ENERGY_ISOLATION",
    "rule_name": "Energy Isolation",
    "confidence": 0.95,
    "priority": "PRIMARY",
    "reasoning": "string explanation",
    "evidence": "string evidence"
  }},
  "barriers": [
    {{
      "barrier_code": "DEPRESSURIZATION",
      "barrier_name": "Depressurization / Pressure Control",
      "status": "FAILED",
      "criticality": 0.90,
      "confidence": 0.95,
      "evidence": "string",
      "reasoning": "string"
    }}
  ],
  "recommended_actions": [
    {{
      "title": "string",
      "description": "string",
      "hierarchy_level": "ENGINEERING",
      "priority": "HIGH",
      "suggested_owner": "Maintenance Supervisor"
    }}
  ]
}}
"""

class UnifiedSafetyAnalyzer:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            from dotenv import load_dotenv
            load_dotenv()
            api_key = os.getenv("GROQ_API_KEY")
            
        if not api_key:
            raise ValueError("GROQ_API_KEY is not configured in environment variables.")
            
        self.client = Groq(api_key=api_key)
        self.model_name = "openai/gpt-oss-120b"

    def analyze(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a single master LLM call and deterministically computes SIF and Risk scores
        using engine/ai/risk_prioritization/scorer.py and engine/ai/intervention/playbook.py.
        """
        start_time = time.time()
        
        user_prompt = f"""
Analyze the following safety incident report:

Report ID: {report_data.get('report_id', 'REP-' + uuid.uuid4().hex[:6].upper())}
Date: {report_data.get('report_date', datetime.utcnow().strftime('%Y-%m-%d'))}
Time: {report_data.get('time', '10:00')}
Site: {report_data.get('site_name') or (report_data.get('site', {}).get('site_name') if isinstance(report_data.get('site'), dict) else 'Unknown Site')}
Region: {report_data.get('region') or (report_data.get('site', {}).get('region') if isinstance(report_data.get('site'), dict) else 'Assam')}
Location: {report_data.get('location', 'Facility')}
Department: {report_data.get('department', 'Operations')}
Activity: {report_data.get('activity', 'General Maintenance')}
Report Type: {report_data.get('report_type', 'unsafe_act')}
Incident Description: {report_data.get('description', '')}
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": MASTER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            raw_text = response.choices[0].message.content.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
                
            parsed = json.loads(raw_text)
        except Exception as e:
            logger.error(f"Unified LLM analysis failed: {e}")
            raise RuntimeError(f"Unified LLM analysis failed: {e}")

        # Extract SIF parameters
        sif_data = parsed.get("sif", {})
        h_sev = float(sif_data.get("hazard_severity", 0.5))
        e_mag = float(sif_data.get("energy_magnitude", 0.5))
        c_sev = float(sif_data.get("consequence_severity", 0.5))
        b_fail = float(sif_data.get("critical_barrier_failure", 0.5))
        is_sif = bool(sif_data.get("sif_potential", False))
        
        # Mathematical SIF Score (0.0 to 100.0)
        raw_score = (0.30 * h_sev + 0.30 * e_mag + 0.25 * c_sev + 0.15 * b_fail) * 100.0
        sif_score = round(min(100.0, max(0.0, raw_score)), 1)
        
        if sif_score >= 70.0 or is_sif:
            sif_classification = "HIGH_POTENTIAL"
        elif sif_score >= 50.0:
            sif_classification = "MEDIUM_POTENTIAL"
        else:
            sif_classification = "LOW_POTENTIAL"

        # Barrier Criticality calculation
        worst_barrier_criticality = 0.0
        barriers_list = parsed.get("barriers", [])
        primary_barrier_code = ""
        barrier_status = ""
        for b in barriers_list:
            crit = float(b.get("criticality", 0.5))
            if b.get("status") in ["FAILED", "MISSING", "BYPASSED"]:
                if crit >= worst_barrier_criticality:
                    worst_barrier_criticality = crit
                    primary_barrier_code = b.get("barrier_code", "")
                    barrier_status = b.get("status", "")

        # Use engine/ai/risk_prioritization/scorer.py for Risk Score & Safety Floor calculation
        final_priority_score, priority_level, safety_floor_applied, _ = RiskScorer.calculate_priority_score(
            individual_sif_score=sif_score,
            pattern_risk_score=50.0, # baseline pattern
            barrier_criticality_score=worst_barrier_criticality * 100.0,
            trend_score=50.0,
            sif_potential=is_sif
        )

        # Supplement recommended actions from engine/ai/intervention/playbook.py
        lsr_data = parsed.get("life_saving_rule", {})
        playbook_actions = InterventionPlaybook.get_actions(
            lsr_code=lsr_data.get("rule_code", ""),
            barrier_code=primary_barrier_code,
            barrier_status=barrier_status
        )
        recommended_actions = parsed.get("recommended_actions", [])
        for pa in playbook_actions:
            recommended_actions.append({
                "title": pa.get("action_title"),
                "description": f"Standard intervention procedure for {lsr_data.get('rule_name') or 'safety control'}.",
                "hierarchy_level": "ADMINISTRATIVE",
                "priority": pa.get("priority", "HIGH"),
                "suggested_owner": pa.get("role", "Site Supervisor")
            })

        duration_ms = round((time.time() - start_time) * 1000, 2)
        
        return {
            "report_id": report_data.get("report_id", "REP-" + uuid.uuid4().hex[:6].upper()),
            "sif_score": sif_score,
            "sif_potential": is_sif,
            "sif_classification": sif_classification,
            "priority_level": priority_level,
            "priority_score": round(final_priority_score, 1),
            "safety_floor_applied": safety_floor_applied,
            "execution_time_ms": duration_ms,
            "model_name": self.model_name,
            "nlp": parsed.get("nlp", {}),
            "sif": sif_data,
            "life_saving_rule": lsr_data,
            "barriers": barriers_list,
            "recommended_actions": recommended_actions
        }

    def persist_to_db(self, db: Session, report_data: Dict[str, Any], analysis: Dict[str, Any]) -> str:
        """
        Saves the unified analysis atomically across all NeonDB tables.
        """
        report_id = analysis["report_id"]
        now = datetime.utcnow()
        site_name = report_data.get("site_name") or (report_data.get("site", {}).get("site_name") if isinstance(report_data.get("site"), dict) else "Unknown Site")
        region = report_data.get("region") or (report_data.get("site", {}).get("region") if isinstance(report_data.get("site"), dict) else "Assam")
        site_id = report_data.get("site_id") or "S_DUL"
        activity = report_data.get("activity", "Maintenance")
        location = report_data.get("location", "Operational Area")
        department = report_data.get("department", "Operations")
        report_type = report_data.get("report_type", "unsafe_act")
        desc = report_data.get("description", "")
        
        # 1. Upsert sif_reports
        db.execute(text("""
            INSERT INTO sif_reports (report_id, report_date, time, site_id, site_name, region, location, department, primary_reporter_id, report_type, activity, description, source)
            VALUES (:r_id, :r_date, :r_time, :s_id, :s_name, :reg, :loc, :dept, :rep_id, :r_type, :act, :desc, 'SIF_SENTINEL_ENGINE')
            ON CONFLICT (report_id) DO UPDATE SET 
                description = EXCLUDED.description,
                activity = EXCLUDED.activity
        """), {
            "r_id": report_id,
            "r_date": report_data.get("report_date", now.strftime("%Y-%m-%d")),
            "r_time": report_data.get("time", "10:00"),
            "s_id": site_id,
            "s_name": site_name,
            "reg": region,
            "loc": location,
            "dept": department,
            "rep_id": "EMP-" + uuid.uuid4().hex[:5].upper(),
            "r_type": report_type,
            "act": activity,
            "desc": desc
        })

        # 2. Upsert report_analysis
        nlp = analysis.get("nlp", {})
        sif = analysis.get("sif", {})
        analysis_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO report_analysis (
                analysis_id, report_id, unsafe_act, unsafe_condition, hazard, energy_source,
                worker_exposure, existing_controls, missing_controls, potential_consequence,
                actual_consequence, causal_chain, key_evidence, model_name, model_version,
                analyzed_at, sif_potential, sif_score, sif_classification, hazard_severity_score,
                energy_score, exposure_score, consequence_score, barrier_failure_score,
                sif_reasoning, sif_analyzed_at, sif_pathway_credibility, exposure_immediacy,
                sif_mechanism_strength, confidence, exposure_status
            ) VALUES (
                :a_id, :r_id, :u_act, :u_cond, :haz, :energy,
                :exp, :e_ctrl, :m_ctrl, :p_conseq,
                :a_conseq, :chain, :evid, :m_name, 'engine-unified-v1',
                :now, :sif_pot, :sif_sc, :sif_class, :haz_sc,
                :eng_sc, :exp_sc, :con_sc, :bar_sc,
                :sif_reason, :now, :path_cred, :exp_imm,
                :mech_str, :conf, 'DOCUMENTED'
            )
            ON CONFLICT (analysis_id) DO NOTHING
        """), {
            "a_id": analysis_id,
            "r_id": report_id,
            "u_act": nlp.get("unsafe_act"),
            "u_cond": nlp.get("unsafe_condition"),
            "haz": nlp.get("hazard"),
            "energy": nlp.get("energy_source"),
            "exp": nlp.get("worker_exposure"),
            "e_ctrl": nlp.get("existing_controls"),
            "m_ctrl": nlp.get("missing_controls"),
            "p_conseq": nlp.get("potential_consequence"),
            "a_conseq": nlp.get("actual_consequence"),
            "chain": json.dumps(nlp.get("causal_chain", [])),
            "evid": json.dumps(nlp.get("key_evidence", [])),
            "m_name": analysis["model_name"],
            "now": now,
            "sif_pot": analysis["sif_potential"],
            "sif_sc": analysis["sif_score"],
            "sif_class": analysis["sif_classification"],
            "haz_sc": sif.get("hazard_severity", 0.5),
            "eng_sc": sif.get("energy_magnitude", 0.5),
            "exp_sc": sif.get("exposure_immediacy", 0.5),
            "con_sc": sif.get("consequence_severity", 0.5),
            "bar_sc": sif.get("critical_barrier_failure", 0.5),
            "sif_reason": sif.get("sif_reasoning", ""),
            "path_cred": sif.get("sif_pathway_credibility", 0.8),
            "exp_imm": sif.get("exposure_immediacy", 0.8),
            "mech_str": sif.get("sif_mechanism_strength", 0.8),
            "conf": sif.get("confidence", 0.9)
        })

        # 3. Life-Saving Rule
        lsr = analysis.get("life_saving_rule", {})
        if lsr and lsr.get("rule_code"):
            rule_row = db.execute(text("SELECT rule_id FROM life_saving_rules WHERE rule_code = :code"), {"code": lsr["rule_code"]}).fetchone()
            if rule_row:
                db.execute(text("""
                    INSERT INTO report_rules (id, report_id, rule_id, confidence, priority, evidence, reasoning, mapping_method, created_at)
                    VALUES (:id, :r_id, :rule_id, :conf, :prio, :evid, :reason, 'ENGINE_UNIFIED', :now)
                """), {
                    "id": str(uuid.uuid4()),
                    "r_id": report_id,
                    "rule_id": rule_row[0],
                    "conf": float(lsr.get("confidence", 0.9)),
                    "prio": lsr.get("priority", "PRIMARY"),
                    "evid": json.dumps([lsr.get("evidence", "")]),
                    "reason": lsr.get("reasoning", ""),
                    "now": now
                })

        # 4. Barriers
        for b in analysis.get("barriers", []):
            b_code = b.get("barrier_code")
            b_row = db.execute(text("SELECT barrier_id FROM barriers WHERE barrier_code = :code"), {"code": b_code}).fetchone()
            if b_row:
                db.execute(text("""
                    INSERT INTO report_barriers (id, report_id, barrier_id, status, criticality, confidence, evidence, reasoning, mapping_method, created_at, updated_at)
                    VALUES (:id, :r_id, :b_id, :status, :crit, :conf, :evid, :reason, 'ENGINE_UNIFIED', :now, :now)
                """), {
                    "id": str(uuid.uuid4()),
                    "r_id": report_id,
                    "b_id": b_row[0],
                    "status": b.get("status", "FAILED"),
                    "crit": float(b.get("criticality", 0.5)),
                    "conf": float(b.get("confidence", 0.9)),
                    "evid": json.dumps([b.get("evidence", "")]),
                    "reason": b.get("reasoning", ""),
                    "now": now
                })

        # 5. Incident Meta
        db.execute(text("""
            INSERT INTO incident_meta (report_id, priority, status, created_at, updated_at)
            VALUES (:r_id, :prio, 'OPEN', :now, :now)
            ON CONFLICT (report_id) DO UPDATE SET priority = EXCLUDED.priority, updated_at = EXCLUDED.updated_at
        """), {
            "r_id": report_id,
            "prio": analysis["priority_level"],
            "now": now
        })

        # 6. Recommended Actions
        for act in analysis.get("recommended_actions", []):
            db.execute(text("""
                INSERT INTO incident_actions (id, report_id, title, description, owner, priority, status, created_at, updated_at)
                VALUES (:id, :r_id, :title, :desc, :owner, :prio, 'TODO', :now, :now)
            """), {
                "id": str(uuid.uuid4()),
                "r_id": report_id,
                "title": act.get("title", "Safety Action"),
                "desc": act.get("description", ""),
                "owner": act.get("suggested_owner", "Site Supervisor"),
                "prio": act.get("priority", "HIGH"),
                "now": now
            })

        # 7. Activity Log
        db.execute(text("""
            INSERT INTO activity_log (id, report_id, actor, event_type, event_data, created_at)
            VALUES (:id, :r_id, 'SIF_Sentinel_Engine', 'INCIDENT_ANALYZED', :data, :now)
        """), {
            "id": str(uuid.uuid4()),
            "r_id": report_id,
            "data": json.dumps({"sif_score": analysis["sif_score"], "priority": analysis["priority_level"], "time_ms": analysis["execution_time_ms"]}),
            "now": now
        })

        db.commit()
        return report_id
