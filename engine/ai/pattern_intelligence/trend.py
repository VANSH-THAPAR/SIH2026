from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy import text
from vector_store import PostgresManager


class TrendAnalyzer:
    def __init__(self, db_manager: PostgresManager):
        self.db = db_manager
        # Pre-loaded: report_id -> parsed datetime or None
        self._report_dates: Dict[str, Any] = {}

    # ------------------------------------------------------------------
    # Batch pre-load (call once per rebuild)
    # ------------------------------------------------------------------
    def preload(self, all_report_ids: List[str]) -> None:
        """Fetches all report dates in ONE query."""
        if not all_report_ids:
            return

        session = self.db.SessionLocal()
        try:
            ids_csv = "','".join(all_report_ids)
            sql = f"SELECT report_id, report_date FROM sif_reports WHERE report_id IN ('{ids_csv}')"
            rows = session.execute(text(sql)).fetchall()
            for row in rows:
                rid, dt_str = row[0], row[1]
                self._report_dates[rid] = self._parse_date(dt_str)
        except Exception as e:
            print(f"[TrendAnalyzer] preload error: {e}")
        finally:
            session.close()

    # ------------------------------------------------------------------
    # Public method — pure Python after preload
    # ------------------------------------------------------------------
    def calculate_trend(self, candidate: Dict[str, Any]) -> Dict[str, Any]:
        report_ids = candidate.get('report_ids', [])
        if not report_ids:
            return self._no_data()

        now = datetime.utcnow()
        current_start = now - timedelta(days=30)
        previous_start = current_start - timedelta(days=30)

        current_count = 0
        previous_count = 0

        for rid in report_ids:
            dt = self._report_dates.get(rid)
            if dt is None:
                continue
            if dt >= current_start:
                current_count += 1
            elif previous_start <= dt < current_start:
                previous_count += 1

        return self._classify(current_count, previous_count)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _parse_date(self, dt_str: str):
        if not dt_str:
            return None
        try:
            if 'T' in str(dt_str):
                dt = datetime.fromisoformat(str(dt_str).replace('Z', '+00:00'))
            else:
                dt = datetime.strptime(str(dt_str).split(' ')[0], '%Y-%m-%d')
            return dt.replace(tzinfo=None)
        except Exception:
            return None

    def _classify(self, current: int, previous: int) -> Dict[str, Any]:
        if previous == 0 and current == 0:
            return {
                "current_period_count": 0,
                "previous_period_count": 0,
                "trend": "INSUFFICIENT_DATA",
                "trend_change_percent": 0.0,
            }
        if previous == 0 and current > 0:
            return {
                "current_period_count": current,
                "previous_period_count": 0,
                "trend": "NEW",
                "trend_change_percent": 0.0,
            }

        change_pct = ((current - previous) / previous) * 100.0

        if change_pct > 30.0:
            trend = "INCREASING"
        elif change_pct < -30.0:
            trend = "DECREASING"
        else:
            trend = "STABLE"

        return {
            "current_period_count": current,
            "previous_period_count": previous,
            "trend": trend,
            "trend_change_percent": round(change_pct, 2),
        }

    def _no_data(self) -> Dict[str, Any]:
        return {
            "current_period_count": 0,
            "previous_period_count": 0,
            "trend": "INSUFFICIENT_DATA",
            "trend_change_percent": 0.0,
        }
