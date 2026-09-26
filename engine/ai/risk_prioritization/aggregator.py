from typing import List, Dict, Any

class RiskAggregator:
    @staticmethod
    def aggregate_by_site(priorities: List[Any]) -> List[Dict[str, Any]]:
        return RiskAggregator._aggregate_by_field(priorities, 'site_name')
        
    @staticmethod
    def aggregate_by_activity(priorities: List[Any]) -> List[Dict[str, Any]]:
        return RiskAggregator._aggregate_by_field(priorities, 'activity')
        
    @staticmethod
    def aggregate_by_rule(priorities: List[Any]) -> List[Dict[str, Any]]:
        return RiskAggregator._aggregate_by_field(priorities, 'primary_rule')
        
    @staticmethod
    def aggregate_by_barrier(priorities: List[Any]) -> List[Dict[str, Any]]:
        return RiskAggregator._aggregate_by_field(priorities, 'primary_barrier')
        
    @staticmethod
    def _aggregate_by_field(priorities: List[Any], field_name: str) -> List[Dict[str, Any]]:
        groups = {}
        for p in priorities:
            val = getattr(p, field_name, None)
            if not val:
                val = "UNKNOWN"
            
            if val not in groups:
                groups[val] = {
                    "group_name": val,
                    "report_count": 0,
                    "sif_count": 0,
                    "high_priority_count": 0,
                    "critical_priority_count": 0,
                    "total_score": 0.0,
                    "maximum_priority_score": 0.0
                }
                
            groups[val]["report_count"] += 1
            if getattr(p, "sif_potential", False):
                groups[val]["sif_count"] += 1
                
            level = getattr(p, "final_priority_level", "")
            if level == "HIGH":
                groups[val]["high_priority_count"] += 1
            elif level == "CRITICAL":
                groups[val]["critical_priority_count"] += 1
                
            score = getattr(p, "final_priority_score", 0.0)
            groups[val]["total_score"] += score
            if score > groups[val]["maximum_priority_score"]:
                groups[val]["maximum_priority_score"] = score
                
        result = []
        for g in groups.values():
            g["average_priority_score"] = round(g["total_score"] / g["report_count"], 2) if g["report_count"] > 0 else 0.0
            del g["total_score"] # Remove temp field
            result.append(g)
            
        result.sort(key=lambda x: (x["critical_priority_count"], x["high_priority_count"], x["average_priority_score"]), reverse=True)
        return result
