import uuid
from typing import List, Dict, Any, Optional
from .schemas import RiskPriorityCalculation
from .scorer import RiskScorer
from .association import PatternAssociationService

class RiskEngine:
    def __init__(self, db_manager: Optional[Any] = None):
        if db_manager is None:
            from vector_store import PostgresManager
            self.db = PostgresManager()
        else:
            self.db = db_manager
        
    def process_risk_priority(self, report_id: str) -> Optional[RiskPriorityCalculation]:
        """
        Process risk priority for a single report. 
        Fetches Stage 2 (SIF), Stage 4 (Barriers), and Stage 5 (Patterns) data from DB.
        """
        from vector_store import ReportRecord, ReportAnalysis, ReportBarrier, Pattern, Barrier
        session = self.db.SessionLocal()
        try:
            # 1. Fetch Stage 2 Data (SIF Potential & Score)
            report_analysis = session.query(ReportAnalysis).filter(ReportAnalysis.report_id == report_id).first()
            if not report_analysis:
                return None
                
            report_record = session.query(ReportRecord).filter(ReportRecord.report_id == report_id).first()
            
            sif_potential = report_analysis.sif_potential or False
            individual_sif_score = report_analysis.sif_score or 0.0
            
            # 2. Fetch Stage 4 Data (Barriers)
            barriers_query = session.query(ReportBarrier, Barrier).join(Barrier, ReportBarrier.barrier_id == Barrier.barrier_id).filter(ReportBarrier.report_id == report_id).all()
            barrier_criticality_score = 0.0
            primary_barrier_name = None
            
            for rb, b in barriers_query:
                score = rb.criticality if rb.criticality is not None else RiskScorer.map_barrier_status_to_score(rb.status)
                if score >= barrier_criticality_score:
                    barrier_criticality_score = score
                    primary_barrier_name = b.barrier_name
                    
            # 3. Fetch Stage 5 Data (Patterns)
            all_patterns = session.query(Pattern).all()
            
            primary_pattern = PatternAssociationService.get_primary_pattern_for_report(report_id, all_patterns)
            
            pattern_risk_score = 0.0
            trend_score = 0.0
            primary_pattern_id = None
            primary_pattern_type = None
            primary_pattern_description = None
            
            if primary_pattern:
                pattern_risk_score = primary_pattern.pattern_score or 0.0
                trend_score = primary_pattern.trend_score or 0.0
                primary_pattern_id = primary_pattern.pattern_id
                primary_pattern_type = primary_pattern.pattern_type
                primary_pattern_description = primary_pattern.title or primary_pattern.description
                
            # 4. Calculate Final Score
            final_score, level, floor_applied, reason = RiskScorer.calculate_priority_score(
                individual_sif_score=individual_sif_score,
                pattern_risk_score=pattern_risk_score,
                barrier_criticality_score=barrier_criticality_score,
                trend_score=trend_score,
                sif_potential=sif_potential,
                primary_pattern_id=primary_pattern_id,
                primary_pattern_type=primary_pattern_type
            )
            
            calc = RiskPriorityCalculation(
                report_id=report_id,
                individual_risk_score=individual_sif_score,
                pattern_risk_score=pattern_risk_score,
                barrier_criticality_score=barrier_criticality_score,
                trend_score=trend_score,
                final_priority_score=final_score,
                final_priority_level=level,
                primary_pattern_id=primary_pattern_id,
                primary_pattern_score=pattern_risk_score if primary_pattern_id else None,
                primary_pattern_type=primary_pattern_type,
                primary_pattern_description=primary_pattern_description,
                sif_potential=sif_potential,
                safety_floor_applied=floor_applied,
                site_name=report_record.site_name if report_record else None,
                activity=report_record.activity if report_record else None,
                primary_barrier=primary_barrier_name,
                reason_json=reason
            )
            
            # Save to DB
            db_data = calc.dict()
            if 'reason_json' in db_data and hasattr(db_data['reason_json'], 'dict'):
                db_data['reason_json'] = db_data['reason_json'].dict()
                
            self.db.save_risk_priorities_bulk([db_data])
            return calc
            
        finally:
            session.close()

    def rebuild_all_priorities(self) -> Dict[str, Any]:
        """
        Batch reconstructs risk priorities for all reports without per-report DB overhead.
        """
        from vector_store import ReportRecord, ReportAnalysis, ReportBarrier, Pattern, Barrier
        session = self.db.SessionLocal()
        try:
            # 1. Bulk Load Data
            reports = session.query(ReportRecord).all()
            analyses = session.query(ReportAnalysis).all()
            
            barriers_query = session.query(ReportBarrier, Barrier).join(Barrier, ReportBarrier.barrier_id == Barrier.barrier_id).all()
            
            patterns = session.query(Pattern).all()
            
            # 2. Build Python Maps
            analysis_map = {a.report_id: a for a in analyses}
            
            barrier_map = {}
            for rb, b in barriers_query:
                if rb.report_id not in barrier_map:
                    barrier_map[rb.report_id] = []
                barrier_map[rb.report_id].append((rb, b))
                
            # 3. Process
            results = []
            stats = {
                "reports_processed": 0,
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "safety_floor_applied": 0,
                "reports_without_pattern": 0,
                "reports_with_pattern": 0,
                "average_score": 0.0
            }
            
            total_score_sum = 0.0
            
            for report in reports:
                report_id = report.report_id
                analysis = analysis_map.get(report_id)
                if not analysis:
                    continue # Can't score without Stage 2
                    
                sif_potential = analysis.sif_potential or False
                individual_sif_score = analysis.sif_score or 0.0
                
                report_barriers = barrier_map.get(report_id, [])
                barrier_criticality_score = 0.0
                primary_barrier_name = None
                
                for rb, b in report_barriers:
                    score = rb.criticality if rb.criticality is not None else RiskScorer.map_barrier_status_to_score(rb.status)
                    if score >= barrier_criticality_score:
                        barrier_criticality_score = score
                        primary_barrier_name = b.barrier_name
                        
                primary_pattern = PatternAssociationService.get_primary_pattern_for_report(report_id, patterns)
                
                pattern_risk_score = 0.0
                trend_score = 0.0
                primary_pattern_id = None
                primary_pattern_type = None
                primary_pattern_description = None
                
                if primary_pattern:
                    pattern_risk_score = primary_pattern.pattern_score or 0.0
                    trend_score = primary_pattern.trend_score or 0.0
                    primary_pattern_id = primary_pattern.pattern_id
                    primary_pattern_type = primary_pattern.pattern_type
                    primary_pattern_description = primary_pattern.title or primary_pattern.description
                    stats["reports_with_pattern"] += 1
                else:
                    stats["reports_without_pattern"] += 1
                    
                final_score, level, floor_applied, reason = RiskScorer.calculate_priority_score(
                    individual_sif_score=individual_sif_score,
                    pattern_risk_score=pattern_risk_score,
                    barrier_criticality_score=barrier_criticality_score,
                    trend_score=trend_score,
                    sif_potential=sif_potential,
                    primary_pattern_id=primary_pattern_id,
                    primary_pattern_type=primary_pattern_type
                )
                
                calc = RiskPriorityCalculation(
                    report_id=report_id,
                    individual_risk_score=individual_sif_score,
                    pattern_risk_score=pattern_risk_score,
                    barrier_criticality_score=barrier_criticality_score,
                    trend_score=trend_score,
                    final_priority_score=final_score,
                    final_priority_level=level,
                    primary_pattern_id=primary_pattern_id,
                    primary_pattern_score=pattern_risk_score if primary_pattern_id else None,
                    primary_pattern_type=primary_pattern_type,
                    primary_pattern_description=primary_pattern_description,
                    sif_potential=sif_potential,
                    safety_floor_applied=floor_applied,
                    site_name=report.site_name,
                    activity=report.activity,
                    primary_barrier=primary_barrier_name,
                    reason_json=reason
                )
                
                results.append(calc)
                
                # Update stats
                stats["reports_processed"] += 1
                total_score_sum += final_score
                if floor_applied: stats["safety_floor_applied"] += 1
                if level == "CRITICAL": stats["critical"] += 1
                elif level == "HIGH": stats["high"] += 1
                elif level == "MEDIUM": stats["medium"] += 1
                else: stats["low"] += 1
                
            # 4. Save
            if results:
                db_data = []
                for r in results:
                    d = r.dict()
                    if 'reason_json' in d and hasattr(d['reason_json'], 'dict'):
                        d['reason_json'] = d['reason_json'].dict()
                    db_data.append(d)
                self.db.save_risk_priorities_bulk(db_data)
                
            if stats["reports_processed"] > 0:
                stats["average_score"] = round(total_score_sum / stats["reports_processed"], 2)
                
            return stats
        finally:
            session.close()
