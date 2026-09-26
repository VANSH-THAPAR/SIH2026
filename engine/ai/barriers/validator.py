from typing import List, Dict, Any
from ai.barriers.schemas import BarrierAnalysisResult, BarrierStatus

class BarrierValidator:
    def validate(self, result: BarrierAnalysisResult, taxonomy: List[Dict[str, Any]]) -> BarrierAnalysisResult:
        valid_barriers = []
        valid_codes = {t['barrier_code'] for t in taxonomy}
        seen_codes = set()
        
        for b in result.barriers:
            # 1. Unknown taxonomy code
            if b.barrier_code not in valid_codes:
                continue
                
            # 2. Duplicate code mapping
            if b.barrier_code in seen_codes:
                continue
                
            # 3. Confidence threshold
            if b.confidence < 60.0:
                continue
                
            # 4. Evidence requirement for failed/missing/bypassed/weak/effective
            needs_evidence = b.status in [
                BarrierStatus.FAILED, 
                BarrierStatus.MISSING, 
                BarrierStatus.BYPASSED, 
                BarrierStatus.WEAK,
                BarrierStatus.EFFECTIVE
            ]
            if needs_evidence and (not b.evidence or len(b.evidence) == 0):
                continue
                
            valid_barriers.append(b)
            seen_codes.add(b.barrier_code)
            
        result.barriers = valid_barriers
        
        # Check primary barrier
        if result.primary_barrier_code not in seen_codes:
            if valid_barriers:
                # Fallback: make the highest criticality/confidence barrier the primary
                sorted_barriers = sorted(
                    valid_barriers, 
                    key=lambda x: (x.criticality or 0, x.confidence), 
                    reverse=True
                )
                result.primary_barrier_code = sorted_barriers[0].barrier_code
            else:
                result.primary_barrier_code = None
                
        # Re-evaluate has_critical_barrier_failure
        critical_failure = any(
            b.status in [BarrierStatus.FAILED, BarrierStatus.MISSING, BarrierStatus.BYPASSED] 
            for b in valid_barriers
        )
        result.has_critical_barrier_failure = critical_failure
        
        return result
