from typing import List, Optional
from .schemas import InterventionContext, InterventionData, HSEActionData
from .prioritizer import InterventionPrioritizer
from .playbook import InterventionPlaybook

class SystemicInterventionGenerator:
    
    SYSTEMIC_MIN_COUNT = 3
    SYSTEMIC_MIN_SCORE = 50.0
    
    @classmethod
    def should_generate_systemic(cls, context: InterventionContext) -> bool:
        if not context.pattern_id:
            return False
            
        if context.total_report_count >= cls.SYSTEMIC_MIN_COUNT:
            if context.pattern_score >= cls.SYSTEMIC_MIN_SCORE or context.trend in ["INCREASING"]:
                return True
                
        return False
        
    @classmethod
    def generate(cls, context: InterventionContext) -> Optional[InterventionData]:
        if not cls.should_generate_systemic(context):
            return None
            
        urgency = InterventionPrioritizer.map_urgency(context.priority_level)
        
        title = f"Systemic Pattern: {context.primary_barrier_name or context.primary_lsr_name} at {context.site_name or 'Multiple Sites'}"
        
        rationale = f"Generated from Systemic Pattern '{context.pattern_type}'. "
        rationale += f"Detected {context.total_report_count} times. Trend is {context.trend}. "
        rationale += f"Pattern Score is {context.pattern_score}."
        
        # Pull actions from playbook
        actions_data = InterventionPlaybook.get_actions(
            lsr_code=context.primary_lsr_code or "",
            barrier_code=context.primary_barrier_code or "",
            barrier_status="FAILED" # Assume worst case for systemic
        )
        
        # Add a systemic specific action
        actions_data.append({
            "action_title": "Conduct Management Review of systemic recurrence",
            "role": "Management",
            "priority": "CRITICAL"
        })
        
        hse_actions = [HSEActionData(**a) for a in actions_data]
        
        return InterventionData(
            intervention_type="SYSTEMIC",
            title=title,
            rationale=rationale,
            priority_level=context.priority_level,
            intervention_urgency=urgency,
            site_name=context.site_name,
            activity=context.activity,
            primary_lsr_code=context.primary_lsr_code,
            primary_barrier_code=context.primary_barrier_code,
            evidence=[f"Pattern: {context.pattern_id}"],
            recommended_actions=hse_actions
        )
