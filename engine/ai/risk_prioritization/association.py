from typing import List, Any, Optional

class PatternAssociationService:
    @staticmethod
    def get_primary_pattern_for_report(report_id: str, patterns: List[Any]) -> Optional[Any]:
        """
        Deterministically selects the primary pattern for a given report_id.
        Patterns should be SQLAlchemy Pattern objects.
        
        Selection Order:
        1. Valid direct report-pattern association (report_id in evidence_report_ids)
        2. Highest pattern_score
        3. Highest SIF density
        4. Highest report count
        5. Stable pattern key tie-breaker
        """
        associated_patterns = []
        for pattern in patterns:
            evidence_ids = pattern.evidence_report_ids or []
            if report_id in evidence_ids:
                associated_patterns.append(pattern)
                
        if not associated_patterns:
            return None
            
        # We want to sort descending, so we sort by a tuple of values.
        # Since string (pattern_key) reverse sorting can be tricky, we handle it natively:
        # Python's sort is stable, so we can sort by pattern_key ascending first,
        # then sort by the numeric metrics descending.
        
        # 1. Sort by ID ascending (for stable tie breaking)
        associated_patterns.sort(key=lambda p: p.pattern_key or "")
        
        # 2. Sort by numeric metrics descending
        associated_patterns.sort(
            key=lambda p: (
                p.pattern_score or 0.0,
                p.sif_density or 0.0,
                p.total_report_count or 0
            ),
            reverse=True
        )
        
        return associated_patterns[0]
