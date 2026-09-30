from datetime import datetime

class EscalationManager:
    @staticmethod
    def evaluate_escalation(action_data: dict) -> dict:
        """
        Evaluates an action dict for escalation based on due date and status.
        Returns a dict with updates if an escalation is required, else {}.
        """
        status = action_data.get('status')
        if status == "CLOSED":
            return {}
            
        due_date = action_data.get('due_date')
        if not due_date:
            return {}
            
        now = datetime.utcnow()
        if due_date >= now:
            return {}
            
        # It's overdue.
        priority = action_data.get('priority')
        days_overdue = (now - due_date).days
        
        level = None
        reason = None
        
        if priority == "CRITICAL":
            level = "LEVEL_3"
            reason = f"CRITICAL action is {days_overdue} days overdue."
        elif priority == "HIGH":
            level = "LEVEL_2"
            reason = f"HIGH priority action is {days_overdue} days overdue."
        elif days_overdue > 30:
            level = "LEVEL_1"
            reason = f"Action is extremely overdue ({days_overdue} days)."
            
        if level:
            return {
                "escalation_level": level,
                "escalation_reason": reason
            }
            
        return {}
