class InterventionPrioritizer:
    @staticmethod
    def map_urgency(risk_priority_level: str) -> str:
        """
        Maps Stage 6 Risk Priority Level to Stage 7 Intervention Urgency.
        Never recalculates a risk score.
        """
        mapping = {
            "CRITICAL": "IMMEDIATE",
            "HIGH": "PRIORITY",
            "MEDIUM": "PREVENTIVE",
            "LOW": "MONITOR"
        }
        return mapping.get(risk_priority_level, "MONITOR")
        
    @staticmethod
    def determine_intervention_type(context) -> str:
        """
        Determines the intervention type based on the context evidence.
        """
        if context.pattern_id:
            return "SYSTEMIC"
            
        if context.has_critical_barrier_failure or context.barrier_status in ["FAILED", "BYPASSED"]:
            if context.priority_level in ["CRITICAL", "HIGH"]:
                return "IMMEDIATE_CORRECTIVE"
            return "CORRECTIVE"
            
        if context.priority_level == "LOW" and not context.sif_potential:
            return "MONITORING"
            
        return "PREVENTIVE"
