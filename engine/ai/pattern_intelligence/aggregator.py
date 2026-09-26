from typing import List, Dict, Any
from sqlalchemy import text
from vector_store import PostgresManager
from datetime import datetime

class PatternAggregator:
    def __init__(self, db_manager: PostgresManager):
        self.db = db_manager

    def generate_candidates(self, min_reports: int = 3) -> List[Dict[str, Any]]:
        """
        Executes SQL queries to find candidate patterns meeting the minimum report threshold.
        """
        candidates = []
        
        queries = [
            self._get_site_activity_query(min_reports),
            self._get_site_rule_query(min_reports),
            self._get_site_barrier_query(min_reports),
            self._get_activity_rule_query(min_reports),
            self._get_activity_barrier_query(min_reports),
            self._get_rule_barrier_query(min_reports),
            self._get_cross_site_barrier_query(min_reports),
            self._get_cross_site_rule_query(min_reports)
        ]
        
        session = self.db.SessionLocal()
        try:
            for q_dict in queries:
                result = session.execute(text(q_dict['sql'])).mappings().all()
                for row in result:
                    candidate = dict(row)
                    candidate['pattern_type'] = q_dict['type']
                    candidate['pattern_key'] = self._generate_key(candidate, q_dict['type'])
                    candidates.append(candidate)
            return candidates
        except Exception as e:
            print(f"Error executing aggregation queries: {e}")
            return []
        finally:
            session.close()

    def _generate_key(self, row: dict, p_type: str) -> str:
        """Generates a stable, canonical key for the pattern to prevent duplicates."""
        parts = [p_type]
        if 'site_name' in row and row['site_name']:
            parts.append(str(row['site_name']).strip().upper())
        if 'activity' in row and row['activity']:
            parts.append(str(row['activity']).strip().upper())
        if 'rule_name' in row and row['rule_name']:
            parts.append(str(row['rule_name']).strip().upper())
        if 'barrier_name' in row and row['barrier_name']:
            parts.append(str(row['barrier_name']).strip().upper())
        return "|".join(parts)

    def _get_site_activity_query(self, min_reports: int) -> dict:
        sql = f"""
            SELECT 
                r.site_name, 
                r.activity, 
                COUNT(r.report_id) as total_report_count,
                SUM(CASE WHEN a.sif_potential = TRUE THEN 1 ELSE 0 END) as sif_report_count,
                COUNT(DISTINCT r.site_name) as site_count,
                JSON_AGG(r.report_id) as report_ids
            FROM sif_reports r
            LEFT JOIN report_analysis a ON r.report_id = a.report_id
            WHERE r.site_name IS NOT NULL AND r.activity IS NOT NULL
            GROUP BY r.site_name, r.activity
            HAVING COUNT(r.report_id) >= {min_reports}
        """
        return {"type": "SITE_ACTIVITY", "sql": sql}

    def _get_site_rule_query(self, min_reports: int) -> dict:
        sql = f"""
            SELECT 
                r.site_name, 
                lr.rule_name, 
                COUNT(DISTINCT r.report_id) as total_report_count,
                SUM(CASE WHEN a.sif_potential = TRUE THEN 1 ELSE 0 END) as sif_report_count,
                COUNT(DISTINCT r.site_name) as site_count,
                JSON_AGG(DISTINCT r.report_id) as report_ids
            FROM sif_reports r
            JOIN report_rules rr ON r.report_id = rr.report_id
            JOIN life_saving_rules lr ON rr.rule_id = lr.rule_id
            LEFT JOIN report_analysis a ON r.report_id = a.report_id
            WHERE r.site_name IS NOT NULL
            GROUP BY r.site_name, lr.rule_name
            HAVING COUNT(DISTINCT r.report_id) >= {min_reports}
        """
        return {"type": "SITE_RULE", "sql": sql}

    def _get_site_barrier_query(self, min_reports: int) -> dict:
        sql = f"""
            SELECT 
                r.site_name, 
                b.barrier_name, 
                COUNT(DISTINCT r.report_id) as total_report_count,
                SUM(CASE WHEN a.sif_potential = TRUE THEN 1 ELSE 0 END) as sif_report_count,
                COUNT(DISTINCT r.site_name) as site_count,
                JSON_AGG(DISTINCT r.report_id) as report_ids
            FROM sif_reports r
            JOIN report_barriers rb ON r.report_id = rb.report_id
            JOIN barriers b ON rb.barrier_id = b.barrier_id
            LEFT JOIN report_analysis a ON r.report_id = a.report_id
            WHERE r.site_name IS NOT NULL
            GROUP BY r.site_name, b.barrier_name
            HAVING COUNT(DISTINCT r.report_id) >= {min_reports}
        """
        return {"type": "SITE_BARRIER", "sql": sql}

    def _get_activity_rule_query(self, min_reports: int) -> dict:
        sql = f"""
            SELECT 
                r.activity, 
                lr.rule_name, 
                COUNT(DISTINCT r.report_id) as total_report_count,
                SUM(CASE WHEN a.sif_potential = TRUE THEN 1 ELSE 0 END) as sif_report_count,
                COUNT(DISTINCT r.site_name) as site_count,
                JSON_AGG(DISTINCT r.report_id) as report_ids
            FROM sif_reports r
            JOIN report_rules rr ON r.report_id = rr.report_id
            JOIN life_saving_rules lr ON rr.rule_id = lr.rule_id
            LEFT JOIN report_analysis a ON r.report_id = a.report_id
            WHERE r.activity IS NOT NULL
            GROUP BY r.activity, lr.rule_name
            HAVING COUNT(DISTINCT r.report_id) >= {min_reports}
        """
        return {"type": "ACTIVITY_RULE", "sql": sql}

    def _get_activity_barrier_query(self, min_reports: int) -> dict:
        sql = f"""
            SELECT 
                r.activity, 
                b.barrier_name, 
                COUNT(DISTINCT r.report_id) as total_report_count,
                SUM(CASE WHEN a.sif_potential = TRUE THEN 1 ELSE 0 END) as sif_report_count,
                COUNT(DISTINCT r.site_name) as site_count,
                JSON_AGG(DISTINCT r.report_id) as report_ids
            FROM sif_reports r
            JOIN report_barriers rb ON r.report_id = rb.report_id
            JOIN barriers b ON rb.barrier_id = b.barrier_id
            LEFT JOIN report_analysis a ON r.report_id = a.report_id
            WHERE r.activity IS NOT NULL
            GROUP BY r.activity, b.barrier_name
            HAVING COUNT(DISTINCT r.report_id) >= {min_reports}
        """
        return {"type": "ACTIVITY_BARRIER", "sql": sql}

    def _get_rule_barrier_query(self, min_reports: int) -> dict:
        sql = f"""
            SELECT 
                lr.rule_name, 
                b.barrier_name, 
                COUNT(DISTINCT r.report_id) as total_report_count,
                SUM(CASE WHEN a.sif_potential = TRUE THEN 1 ELSE 0 END) as sif_report_count,
                COUNT(DISTINCT r.site_name) as site_count,
                JSON_AGG(DISTINCT r.report_id) as report_ids
            FROM sif_reports r
            JOIN report_rules rr ON r.report_id = rr.report_id
            JOIN life_saving_rules lr ON rr.rule_id = lr.rule_id
            JOIN report_barriers rb ON r.report_id = rb.report_id
            JOIN barriers b ON rb.barrier_id = b.barrier_id
            LEFT JOIN report_analysis a ON r.report_id = a.report_id
            GROUP BY lr.rule_name, b.barrier_name
            HAVING COUNT(DISTINCT r.report_id) >= {min_reports}
        """
        return {"type": "RULE_BARRIER", "sql": sql}

    def _get_cross_site_barrier_query(self, min_reports: int) -> dict:
        sql = f"""
            SELECT 
                b.barrier_name, 
                COUNT(DISTINCT r.report_id) as total_report_count,
                SUM(CASE WHEN a.sif_potential = TRUE THEN 1 ELSE 0 END) as sif_report_count,
                COUNT(DISTINCT r.site_name) as site_count,
                JSON_AGG(DISTINCT r.report_id) as report_ids
            FROM sif_reports r
            JOIN report_barriers rb ON r.report_id = rb.report_id
            JOIN barriers b ON rb.barrier_id = b.barrier_id
            LEFT JOIN report_analysis a ON r.report_id = a.report_id
            GROUP BY b.barrier_name
            HAVING COUNT(DISTINCT r.report_id) >= {min_reports} AND COUNT(DISTINCT r.site_name) > 1
        """
        return {"type": "CROSS_SITE_BARRIER", "sql": sql}

    def _get_cross_site_rule_query(self, min_reports: int) -> dict:
        sql = f"""
            SELECT 
                lr.rule_name, 
                COUNT(DISTINCT r.report_id) as total_report_count,
                SUM(CASE WHEN a.sif_potential = TRUE THEN 1 ELSE 0 END) as sif_report_count,
                COUNT(DISTINCT r.site_name) as site_count,
                JSON_AGG(DISTINCT r.report_id) as report_ids
            FROM sif_reports r
            JOIN report_rules rr ON r.report_id = rr.report_id
            JOIN life_saving_rules lr ON rr.rule_id = lr.rule_id
            LEFT JOIN report_analysis a ON r.report_id = a.report_id
            GROUP BY lr.rule_name
            HAVING COUNT(DISTINCT r.report_id) >= {min_reports} AND COUNT(DISTINCT r.site_name) > 1
        """
        return {"type": "CROSS_SITE_RULE", "sql": sql}
