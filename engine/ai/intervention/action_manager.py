class ActionManager:
    VALID_TRANSITIONS = {
        "OPEN": ["IN_PROGRESS"],
        "IN_PROGRESS": ["PENDING_VERIFICATION", "CLOSED"],
        "PENDING_VERIFICATION": ["CLOSED", "REOPENED"],
        "REOPENED": ["IN_PROGRESS"],
        "CLOSED": []
    }
    
    @classmethod
    def can_transition(cls, current_status: str, new_status: str) -> bool:
        if current_status not in cls.VALID_TRANSITIONS:
            return False
        return new_status in cls.VALID_TRANSITIONS[current_status]
        
    @classmethod
    def require_verification(cls, action_priority: str) -> bool:
        """
        Determines if an action must pass through PENDING_VERIFICATION.
        """
        return action_priority in ["CRITICAL", "HIGH"]
