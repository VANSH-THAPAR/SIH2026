from typing import Dict, Any, Optional, Tuple
from .schemas import RiskPriorityReason

class RiskScorer:
    WEIGHT_SIF = 0.50
    WEIGHT_PATTERN = 0.30
    WEIGHT_BARRIER = 0.10
    WEIGHT_TREND = 0.10
    
    @staticmethod
    def calculate_priority_score(
        individual_sif_score: float,
        pattern_risk_score: float,
        barrier_criticality_score: float,
        trend_score: float,
        sif_potential: bool,
        primary_pattern_id: Optional[str] = None,
        primary_pattern_type: Optional[str] = None
    ) -> Tuple[float, str, bool, RiskPriorityReason]:
        """
        Pure deterministic numerical calculation for Risk Priority.
        Returns:
            final_score (float)
            priority_level (str)
            safety_floor_applied (bool)
            reason_json (RiskPriorityReason)
        """
        # Clamp inputs to 0-100
        individual_sif_score = max(0.0, min(100.0, individual_sif_score))
        pattern_risk_score = max(0.0, min(100.0, pattern_risk_score))
        barrier_criticality_score = max(0.0, min(100.0, barrier_criticality_score))
        trend_score = max(0.0, min(100.0, trend_score))
        
        # Calculate raw formula
        raw_score = (
            (individual_sif_score * RiskScorer.WEIGHT_SIF) +
            (pattern_risk_score * RiskScorer.WEIGHT_PATTERN) +
            (barrier_criticality_score * RiskScorer.WEIGHT_BARRIER) +
            (trend_score * RiskScorer.WEIGHT_TREND)
        )
        
        final_score = raw_score
        safety_floor_applied = False
        
        # Safety floor for critical individual SIF events
        if sif_potential and individual_sif_score >= 65.0:
            if final_score < 75.0:
                final_score = 75.0
                safety_floor_applied = True
                
        # Clamp final output
        final_score = max(0.0, min(100.0, final_score))
        
        # Determine level
        if final_score >= 90.0:
            priority_level = "CRITICAL"
        elif final_score >= 75.0:
            priority_level = "HIGH"
        elif final_score >= 50.0:
            priority_level = "MEDIUM"
        else:
            priority_level = "LOW"
            
        reason = RiskPriorityReason(
            individual_sif_score=individual_sif_score,
            pattern_risk_score=pattern_risk_score,
            barrier_criticality_score=barrier_criticality_score,
            trend_score=trend_score,
            weights={
                "individual_sif": RiskScorer.WEIGHT_SIF,
                "pattern": RiskScorer.WEIGHT_PATTERN,
                "barrier": RiskScorer.WEIGHT_BARRIER,
                "trend": RiskScorer.WEIGHT_TREND
            },
            raw_score=round(raw_score, 2),
            safety_floor_applied=safety_floor_applied,
            primary_pattern_id=primary_pattern_id,
            primary_pattern_type=primary_pattern_type,
            priority_level=priority_level
        )
        
        return round(final_score, 2), priority_level, safety_floor_applied, reason
        
    @staticmethod
    def map_barrier_status_to_score(status: str) -> float:
        """
        Maps deterministic barrier status to a 0-100 score.
        """
        if not status:
            return 0.0
        status_map = {
            "FAILED": 100.0,
            "MISSING": 100.0,
            "BYPASSED": 80.0,
            "WEAK": 60.0,
            "NOT_DETERMINED": 30.0,
            "NOT_APPLICABLE": 0.0,
            "EFFECTIVE": 0.0
        }
        return status_map.get(status.upper(), 0.0)
