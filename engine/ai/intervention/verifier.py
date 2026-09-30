from datetime import datetime

class ActionVerifier:
    @staticmethod
    def verify(action_status: str, verification_status: str) -> str:
        """
        Processes a verification result.
        Returns the new action status.
        """
        if action_status != "PENDING_VERIFICATION":
            raise ValueError("Action must be PENDING_VERIFICATION to be verified.")
            
        if verification_status == "PASSED":
            return "CLOSED"
        elif verification_status == "FAILED":
            return "REOPENED"
            
        return action_status
