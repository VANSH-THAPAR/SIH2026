import pytest
from ai.risk_prioritization.scorer import RiskScorer
from ai.risk_prioritization.association import PatternAssociationService

class DummyPattern:
    def __init__(self, pattern_key, score, density, count, evidence):
        self.pattern_key = pattern_key
        self.pattern_score = score
        self.sif_density = density
        self.total_report_count = count
        self.evidence_report_ids = evidence

def test_high_sif_no_pattern():
    # TEST 1: SIF = 85, Pattern = 0, Barrier = 50, Trend = 0
    # Expected: HIGH or above, safety floor applied
    score, level, floor, reason = RiskScorer.calculate_priority_score(
        individual_sif_score=85,
        pattern_risk_score=0,
        barrier_criticality_score=50,
        trend_score=0,
        sif_potential=True
    )
    # Raw = (85*0.5) + (0) + (50*0.1) + 0 = 42.5 + 5 = 47.5
    # Since SIF=85 (>=65), Floor should kick in and make it 75 (HIGH)
    assert floor is True
    assert score == 75.0
    assert level == "HIGH"

def test_high_sif_high_pattern():
    # TEST 2: SIF = 85, Pattern = 90, Barrier = 80, Trend = 90
    score, level, floor, reason = RiskScorer.calculate_priority_score(
        individual_sif_score=85,
        pattern_risk_score=90,
        barrier_criticality_score=80,
        trend_score=90,
        sif_potential=True
    )
    # Raw = 42.5 + 27 + 8 + 9 = 86.5 -> HIGH
    assert floor is False
    assert score == 86.5
    assert level == "HIGH"

def test_low_sif_critical_pattern():
    # TEST 3: SIF = 20, Pattern = 95, Barrier = 100, Trend = 90
    score, level, floor, reason = RiskScorer.calculate_priority_score(
        individual_sif_score=20,
        pattern_risk_score=95,
        barrier_criticality_score=100,
        trend_score=90,
        sif_potential=True
    )
    # Raw = 10 + 28.5 + 10 + 9 = 57.5 -> MEDIUM
    assert floor is False
    assert score == 57.5
    assert level == "MEDIUM"

def test_non_sif_recurring_barrier():
    # TEST 4: SIF = 20, sif_potential=False, Pattern=90, Barrier=100, Trend=80
    score, level, floor, reason = RiskScorer.calculate_priority_score(
        individual_sif_score=20,
        pattern_risk_score=90,
        barrier_criticality_score=100,
        trend_score=80,
        sif_potential=False
    )
    # Raw = 10 + 27 + 10 + 8 = 55.0 -> MEDIUM
    assert floor is False
    assert score == 55.0
    assert level == "MEDIUM"

def test_new_critical_sif_no_history():
    # TEST 5: SIF = 90, Pattern = 0, Barrier = 70, Trend = 0
    score, level, floor, reason = RiskScorer.calculate_priority_score(
        individual_sif_score=90,
        pattern_risk_score=0,
        barrier_criticality_score=70,
        trend_score=0,
        sif_potential=True
    )
    # Raw = 45 + 0 + 7 + 0 = 52.0
    # Floor -> 75
    assert floor is True
    assert score == 75.0
    assert level == "HIGH"

def test_all_zero():
    # TEST 6: All zero
    score, level, floor, reason = RiskScorer.calculate_priority_score(0, 0, 0, 0, False)
    assert score == 0.0
    assert level == "LOW"

def test_all_max():
    # TEST 7: All 100
    score, level, floor, reason = RiskScorer.calculate_priority_score(100, 100, 100, 100, True)
    assert score == 100.0
    assert level == "CRITICAL"

def test_multiple_patterns():
    # TEST 8: Deterministic primary pattern selection
    p1 = DummyPattern("P1", 50, 0.5, 10, ["R1"])
    p2 = DummyPattern("P2", 80, 0.2, 5, ["R1"])
    p3 = DummyPattern("P3", 80, 0.4, 6, ["R1"])
    p_no_match = DummyPattern("P4", 100, 1.0, 100, ["R2"]) # Not associated
    
    primary = PatternAssociationService.get_primary_pattern_for_report("R1", [p1, p2, p3, p_no_match])
    
    # Should select P3 because score is tie (80), but density is higher (0.4 > 0.2)
    assert primary.pattern_key == "P3"

def test_threshold_boundaries():
    # TEST 14: Boundaries 49.99, 50, 74.99, 75, 89.99, 90, 100
    # We can manipulate individual_sif_score (weight 0.5) to hit exact boundaries (assume others 0)
    
    def get_level(target_score):
        # By setting all inputs to target_score, the sum is target_score * 1.0
        _, lvl, _, _ = RiskScorer.calculate_priority_score(target_score, target_score, target_score, target_score, False)
        return lvl
        
    assert get_level(49.99) == "LOW"
    assert get_level(50.0) == "MEDIUM"
    assert get_level(74.99) == "MEDIUM"
    assert get_level(75.0) == "HIGH"
    assert get_level(89.99) == "HIGH"
    assert get_level(90.0) == "CRITICAL"

def test_barrier_mapping():
    assert RiskScorer.map_barrier_status_to_score("FAILED") == 100.0
    assert RiskScorer.map_barrier_status_to_score("MISSING") == 100.0
    assert RiskScorer.map_barrier_status_to_score("BYPASSED") == 80.0
    assert RiskScorer.map_barrier_status_to_score("WEAK") == 60.0
    assert RiskScorer.map_barrier_status_to_score("NOT_DETERMINED") == 30.0
    assert RiskScorer.map_barrier_status_to_score("NOT_APPLICABLE") == 0.0
    assert RiskScorer.map_barrier_status_to_score("EFFECTIVE") == 0.0
