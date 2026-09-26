import uuid
from typing import Dict, Any, List
from vector_store import PostgresManager, ReportRecord, ReportAnalysis, RiskPriority, ReportBarrier, Barrier, ReportRule, LifeSavingRule, Pattern
from .schemas import InterventionContext
from .recommender import InterventionRecommender
from .systemic import SystemicInterventionGenerator
import time

class InterventionEngine:
    def __init__(self, db_manager: PostgresManager = None):
        self.db = db_manager or PostgresManager()
        self.recommender = InterventionRecommender()
        
    def rebuild(self, use_llm: bool = True) -> Dict[str, Any]:
        """
        Bulk generation of interventions for all reports and patterns.
        Re-uses the Bulk Data loading strategy from RiskEngine to avoid N+1 queries.
        """
        start_time = time.time()
        session = self.db.SessionLocal()
        try:
            print("[InterventionEngine] Loading data in bulk...")
            reports = session.query(ReportRecord).all()
            analyses = session.query(ReportAnalysis).all()
            risks = session.query(RiskPriority).all()
            
            # Map them
            analysis_map = {a.report_id: a for a in analyses}
            risk_map = {r.report_id: r for r in risks}
            
            # Load patterns
            patterns = session.query(Pattern).all()
            pattern_map = {p.pattern_id: p for p in patterns}
            
            # Load barriers and rules
            barriers_query = session.query(ReportBarrier, Barrier).join(Barrier, ReportBarrier.barrier_id == Barrier.barrier_id).all()
            barrier_map = {}
            for rb, b in barriers_query:
                if rb.report_id not in barrier_map:
                    barrier_map[rb.report_id] = []
                barrier_map[rb.report_id].append((rb, b))
                
            rules_query = session.query(ReportRule, LifeSavingRule).join(LifeSavingRule, ReportRule.rule_id == LifeSavingRule.rule_id).all()
            rule_map = {}
            for rr, lsr in rules_query:
                if rr.report_id not in rule_map:
                    rule_map[rr.report_id] = []
                rule_map[rr.report_id].append((rr, lsr))
                
            print("[InterventionEngine] Generating individual interventions...")
            
            interventions_payload = []
            actions_payload = []
            
            # 1. Process Individual Interventions
            for report in reports:
                r_id = report.report_id
                analysis = analysis_map.get(r_id)
                risk = risk_map.get(r_id)
                
                if not analysis or not risk:
                    continue
                    
                context = InterventionContext(
                    report_id=r_id,
                    site_name=report.site_name,
                    activity=report.activity,
                    sif_potential=analysis.sif_potential or False,
                    sif_score=analysis.sif_score or 0.0,
                    priority_level=risk.final_priority_level,
                    final_priority_score=risk.final_priority_score,
                    report_description=report.description
                )
                
                # Assign primary rule
                if r_id in rule_map and rule_map[r_id]:
                    # Pick the primary rule or highest confidence
                    primary_rule = rule_map[r_id][0][1]
                    context.primary_lsr_code = primary_rule.rule_code
                    context.primary_lsr_name = primary_rule.rule_name
                    
                # Assign primary barrier
                if r_id in barrier_map and barrier_map[r_id]:
                    # Find highest criticality or failed status
                    b_list = barrier_map[r_id]
                    b_list.sort(key=lambda x: (x[0].status == 'FAILED', x[0].criticality or 0.0), reverse=True)
                    primary_barrier_rb, primary_barrier_b = b_list[0]
                    context.primary_barrier_code = primary_barrier_b.barrier_code
                    context.primary_barrier_name = primary_barrier_b.barrier_name
                    context.barrier_status = primary_barrier_rb.status
                    if primary_barrier_rb.status in ["FAILED", "BYPASSED"]:
                        context.has_critical_barrier_failure = True
                        
                intervention = self.recommender.generate_intervention(context, use_llm=use_llm)
                
                # Prepare DB payload
                int_id = f"INT-{uuid.uuid4().hex[:8].upper()}"
                
                db_intervention = {
                    "id": str(uuid.uuid4()),
                    "intervention_id": int_id,
                    "report_id": r_id,
                    "pattern_id": None,
                    "intervention_type": intervention.intervention_type,
                    "title": intervention.title,
                    "rationale": intervention.rationale,
                    "priority_level": intervention.priority_level,
                    "intervention_urgency": intervention.intervention_urgency,
                    "site_name": intervention.site_name,
                    "activity": intervention.activity,
                    "primary_lsr_code": intervention.primary_lsr_code,
                    "primary_barrier_code": intervention.primary_barrier_code,
                    "barrier_status": intervention.barrier_status,
                    "evidence": intervention.evidence,
                    "status": "OPEN"
                }
                
                interventions_payload.append(db_intervention)
                
                for act in intervention.recommended_actions:
                    db_action = {
                        "id": str(uuid.uuid4()),
                        "action_id": f"ACT-{uuid.uuid4().hex[:8].upper()}",
                        "intervention_id": db_intervention["id"],
                        "action_title": act.action_title,
                        "action_description": act.action_description,
                        "owner_role": act.owner_role,
                        "owner_department": act.owner_department,
                        "priority": act.priority,
                        "status": "OPEN"
                    }
                    actions_payload.append(db_action)
                    
            # 2. Process Systemic Interventions
            print("[InterventionEngine] Generating systemic interventions...")
            for pattern in patterns:
                context = InterventionContext(
                    pattern_id=pattern.pattern_id,
                    site_name=pattern.site_name,
                    activity=pattern.activity,
                    priority_level=pattern.priority_level or "MEDIUM",
                    primary_lsr_code=pattern.rule_code,
                    primary_barrier_code=pattern.barrier_code,
                    pattern_type=pattern.pattern_type,
                    pattern_score=pattern.pattern_score or 0.0,
                    trend=pattern.trend or "STABLE",
                    total_report_count=pattern.total_report_count or 0
                )
                
                intervention = SystemicInterventionGenerator.generate(context)
                if intervention:
                    int_id = f"SYS-{uuid.uuid4().hex[:8].upper()}"
                    
                    db_intervention = {
                        "id": str(uuid.uuid4()),
                        "intervention_id": int_id,
                        "report_id": None,
                        "pattern_id": pattern.pattern_id,
                        "intervention_type": intervention.intervention_type,
                        "title": intervention.title,
                        "rationale": intervention.rationale,
                        "priority_level": intervention.priority_level,
                        "intervention_urgency": intervention.intervention_urgency,
                        "site_name": intervention.site_name,
                        "activity": intervention.activity,
                        "primary_lsr_code": intervention.primary_lsr_code,
                        "primary_barrier_code": intervention.primary_barrier_code,
                        "barrier_status": intervention.barrier_status,
                        "evidence": intervention.evidence,
                        "status": "OPEN"
                    }
                    
                    interventions_payload.append(db_intervention)
                    
                    for act in intervention.recommended_actions:
                        db_action = {
                            "id": str(uuid.uuid4()),
                            "action_id": f"ACT-{uuid.uuid4().hex[:8].upper()}",
                            "intervention_id": db_intervention["id"],
                            "action_title": act.action_title,
                            "action_description": act.action_description,
                            "owner_role": act.owner_role,
                            "owner_department": act.owner_department,
                            "priority": act.priority,
                            "status": "OPEN"
                        }
                        actions_payload.append(db_action)

            # 3. Save to DB
            print(f"[InterventionEngine] Persisting {len(interventions_payload)} interventions and {len(actions_payload)} actions...")
            self.db.save_interventions_bulk(interventions_payload)
            self.db.save_hse_actions_bulk(actions_payload)
            
            execution_time = time.time() - start_time
            print("[InterventionEngine] Complete.")
            
            return {
                "interventions_generated": len(interventions_payload),
                "actions_generated": len(actions_payload),
                "execution_time_seconds": round(execution_time, 2)
            }
        finally:
            session.close()
