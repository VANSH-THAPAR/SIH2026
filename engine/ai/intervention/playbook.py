from typing import List, Dict, Any

class InterventionPlaybook:
    """
    Deterministic mapping of LSR/Barriers to concrete HSE Actions.
    """
    
    LSR_MAPPING = {
        "ENERGY_ISOLATION": [
            {"action_title": "Verify complete isolation before work begins", "role": "Site Supervisor", "priority": "HIGH"},
            {"action_title": "Verify LOTO application", "role": "HSE Officer", "priority": "HIGH"},
            {"action_title": "Review isolation procedure for task", "role": "Operations Manager", "priority": "MEDIUM"}
        ],
        "WORKING_AT_HEIGHT": [
            {"action_title": "Verify fall protection equipment", "role": "HSE Officer", "priority": "HIGH"},
            {"action_title": "Inspect anchor points and lifeline", "role": "Site Supervisor", "priority": "HIGH"}
        ],
        "CONFINED_SPACE": [
            {"action_title": "Verify confined space permit and atmosphere", "role": "Site Supervisor", "priority": "HIGH"},
            {"action_title": "Ensure standby rescue personnel present", "role": "HSE Officer", "priority": "HIGH"}
        ],
        "LIFTING_OPERATIONS": [
            {"action_title": "Verify lifting plan and load rating", "role": "Lifting Supervisor", "priority": "HIGH"},
            {"action_title": "Establish exclusion zone", "role": "Site Supervisor", "priority": "HIGH"}
        ]
    }
    
    BARRIER_MAPPING = {
        "DEPRESSURIZATION": [
            {"action_title": "Verify complete depressurization before opening equipment", "role": "Site Supervisor", "priority": "HIGH"},
            {"action_title": "Require documented pressure verification", "role": "Operations Manager", "priority": "MEDIUM"}
        ],
        "GAS_TESTING": [
            {"action_title": "Perform required atmospheric testing", "role": "Gas Tester", "priority": "HIGH"},
            {"action_title": "Verify gas detector calibration", "role": "HSE Officer", "priority": "MEDIUM"}
        ],
        "EXCLUSION_ZONE": [
            {"action_title": "Enforce physical exclusion zone barriers", "role": "Site Supervisor", "priority": "HIGH"}
        ]
    }
    
    DEFAULT_ACTIONS = [
        {"action_title": "Conduct targeted toolbox talk on identified risk", "role": "Site Supervisor", "priority": "MEDIUM"},
        {"action_title": "Review risk assessment for task", "role": "HSE Officer", "priority": "MEDIUM"}
    ]
    
    @classmethod
    def get_actions(cls, lsr_code: str, barrier_code: str, barrier_status: str) -> List[Dict[str, str]]:
        actions = []
        
        # Add LSR specific
        if lsr_code in cls.LSR_MAPPING:
            actions.extend(cls.LSR_MAPPING[lsr_code])
            
        # Add Barrier specific
        if barrier_code in cls.BARRIER_MAPPING:
            actions.extend(cls.BARRIER_MAPPING[barrier_code])
            
        # If barrier failed, make sure we emphasize restoration
        if barrier_status in ["FAILED", "BYPASSED", "MISSING"]:
            actions.append({
                "action_title": f"Restore and verify {barrier_code} control immediately", 
                "role": "Site Supervisor", 
                "priority": "CRITICAL"
            })
            
        # Fallback
        if not actions:
            actions.extend(cls.DEFAULT_ACTIONS)
            
        # Deduplicate by title
        unique_actions = []
        seen = set()
        for a in actions:
            if a.get("action_title") not in seen:
                seen.add(a.get("action_title"))
                unique_actions.append(a)
                
        return unique_actions
