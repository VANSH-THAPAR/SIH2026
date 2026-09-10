import unittest
from ai.intervention.action_manager import ActionManager
from ai.intervention.verifier import ActionVerifier
from ai.intervention.escalation import EscalationManager
from ai.intervention.prioritizer import InterventionPrioritizer
from ai.intervention.schemas import InterventionContext
from datetime import datetime, timedelta

class TestInterventionEngine(unittest.TestCase):

    def test_action_manager_transitions(self):
        # Valid
        self.assertTrue(ActionManager.can_transition("OPEN", "IN_PROGRESS"))
        self.assertTrue(ActionManager.can_transition("IN_PROGRESS", "PENDING_VERIFICATION"))
        self.assertTrue(ActionManager.can_transition("PENDING_VERIFICATION", "CLOSED"))
        self.assertTrue(ActionManager.can_transition("PENDING_VERIFICATION", "REOPENED"))
        self.assertTrue(ActionManager.can_transition("REOPENED", "IN_PROGRESS"))
        
        # Invalid
        self.assertFalse(ActionManager.can_transition("OPEN", "CLOSED"))
        self.assertFalse(ActionManager.can_transition("CLOSED", "OPEN"))

    def test_verifier(self):
        self.assertEqual(ActionVerifier.verify("PENDING_VERIFICATION", "PASSED"), "CLOSED")
        self.assertEqual(ActionVerifier.verify("PENDING_VERIFICATION", "FAILED"), "REOPENED")
        
        with self.assertRaises(ValueError):
            ActionVerifier.verify("OPEN", "PASSED")

    def test_escalation(self):
        now = datetime.utcnow()
        # Not overdue
        action1 = {"status": "OPEN", "due_date": now + timedelta(days=5), "priority": "CRITICAL"}
        self.assertEqual(EscalationManager.evaluate_escalation(action1), {})
        
        # Overdue Critical
        action2 = {"status": "OPEN", "due_date": now - timedelta(days=2), "priority": "CRITICAL"}
        res2 = EscalationManager.evaluate_escalation(action2)
        self.assertEqual(res2.get("escalation_level"), "LEVEL_3")
        
        # Overdue High
        action3 = {"status": "IN_PROGRESS", "due_date": now - timedelta(days=5), "priority": "HIGH"}
        res3 = EscalationManager.evaluate_escalation(action3)
        self.assertEqual(res3.get("escalation_level"), "LEVEL_2")
        
        # Very overdue Low
        action4 = {"status": "OPEN", "due_date": now - timedelta(days=35), "priority": "LOW"}
        res4 = EscalationManager.evaluate_escalation(action4)
        self.assertEqual(res4.get("escalation_level"), "LEVEL_1")

    def test_prioritizer(self):
        self.assertEqual(InterventionPrioritizer.map_urgency("CRITICAL"), "IMMEDIATE")
        self.assertEqual(InterventionPrioritizer.map_urgency("HIGH"), "PRIORITY")
        self.assertEqual(InterventionPrioritizer.map_urgency("LOW"), "MONITOR")
        
        # Test intervention type
        ctx = InterventionContext(
            pattern_id="123",
            priority_level="HIGH"
        )
        self.assertEqual(InterventionPrioritizer.determine_intervention_type(ctx), "SYSTEMIC")
        
        ctx2 = InterventionContext(
            has_critical_barrier_failure=True,
            priority_level="HIGH"
        )
        self.assertEqual(InterventionPrioritizer.determine_intervention_type(ctx2), "IMMEDIATE_CORRECTIVE")

if __name__ == '__main__':
    unittest.main()
