from typing import List, Dict, Any
from sqlalchemy import text
from vector_store import PostgresManager


class SemanticSimilarity:
    def __init__(self, db_manager: PostgresManager):
        self.db = db_manager
        # Pre-loaded: report_id -> (sif_potential bool, report_date str)
        self._report_meta: Dict[str, Dict] = {}

    # ------------------------------------------------------------------
    # Batch pre-load (call once per rebuild)
    # ------------------------------------------------------------------
    def preload(self, all_report_ids: List[str]) -> None:
        """Fetches SIF potential and dates for all reports in one query."""
        if not all_report_ids:
            return

        session = self.db.SessionLocal()
        try:
            ids_csv = "','".join(all_report_ids)
            sql = f"""
                SELECT r.report_id, a.sif_potential, r.report_date
                FROM sif_reports r
                LEFT JOIN report_analysis a ON r.report_id = a.report_id
                WHERE r.report_id IN ('{ids_csv}')
            """
            rows = session.execute(text(sql)).fetchall()
            for row in rows:
                self._report_meta[row[0]] = {
                    "sif_potential": bool(row[1]) if row[1] is not None else False,
                    "report_date": str(row[2]) if row[2] else ""
                }
        except Exception as e:
            print(f"[SemanticSimilarity] preload error: {e}")
        finally:
            session.close()

    # ------------------------------------------------------------------
    # Representative evidence selection (pure Python after preload)
    # ------------------------------------------------------------------
    def get_representative_evidence(self, candidate: Dict[str, Any], top_k: int = 5) -> List[str]:
        """
        Selects up to top_k representative report IDs from the candidate's
        report set, prioritising SIF=True then most recent.
        No DB call needed — uses preloaded metadata.
        """
        report_ids = candidate.get('report_ids', [])
        if not report_ids:
            return []

        def sort_key(rid):
            meta = self._report_meta.get(rid, {})
            sif_priority = 0 if meta.get("sif_potential") else 1  # SIF first
            date_str = meta.get("report_date", "")
            return (sif_priority, date_str)   # later dates sort higher for same priority

        sorted_ids = sorted(report_ids, key=sort_key, reverse=True)
        return sorted_ids[:top_k]
