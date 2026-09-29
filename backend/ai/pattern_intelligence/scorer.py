from typing import Dict, Any, List
from sqlalchemy import text
from vector_store import PostgresManager


class PatternScorer:
    def __init__(self, db_manager: PostgresManager):
        self.db = db_manager
        # Pre-loaded lookup tables populated once per rebuild
        self._barrier_stats: Dict[str, Dict[str, int]] = {}    # report_id -> {status: count}
        self._report_sites: Dict[str, str] = {}                 # report_id -> site_name

    # ------------------------------------------------------------------
    # Batch pre-load (call once before scoring all candidates)
    # ------------------------------------------------------------------
    def preload(self, all_report_ids: List[str]) -> None:
        """
        Fetches barrier statuses and site names for all participating reports
        in ONE query each, so individual candidate scoring needs zero DB calls.
        """
        if not all_report_ids:
            return

        session = self.db.SessionLocal()
        try:
            ids_csv = "','".join(all_report_ids)

            # 1. Barrier statuses
            sql_barriers = f"""
                SELECT rb.report_id, rb.status
                FROM report_barriers rb
                WHERE rb.report_id IN ('{ids_csv}')
            """
            rows = session.execute(text(sql_barriers)).fetchall()
            for row in rows:
                rid, status = row[0], (row[1] or "").upper()
                if rid not in self._barrier_stats:
                    self._barrier_stats[rid] = {}
                self._barrier_stats[rid][status] = self._barrier_stats[rid].get(status, 0) + 1

            # 2. Site names (for cross-site concentration)
            sql_sites = f"""
                SELECT report_id, site_name
                FROM sif_reports
                WHERE report_id IN ('{ids_csv}')
            """
            rows = session.execute(text(sql_sites)).fetchall()
            for row in rows:
                self._report_sites[row[0]] = row[1] or ""

        except Exception as e:
            print(f"[PatternScorer] preload error: {e}")
        finally:
            session.close()

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------
    def calculate_scores(self, candidate: Dict[str, Any], trend_metrics: Dict[str, Any]) -> Dict[str, Any]:
        total = candidate.get('total_report_count', 0)
        sif = candidate.get('sif_report_count', 0)

        sif_density = (sif / total * 100.0) if total > 0 else 0.0
        recurrence_score = self._calculate_recurrence(total)
        trend = trend_metrics.get('trend', 'STABLE')
        trend_score = self._calculate_trend_score(trend, trend_metrics.get('trend_change_percent', 0.0))
        site_concentration_score = self._calculate_site_concentration(candidate)
        barrier_criticality_score = self._calculate_barrier_criticality(candidate)

        pattern_score = (
            (sif_density * 0.30) +
            (recurrence_score * 0.25) +
            (trend_score * 0.20) +
            (barrier_criticality_score * 0.15) +
            (site_concentration_score * 0.10)
        )
        pattern_score = max(0.0, min(100.0, pattern_score))
        priority_level = self._get_priority(pattern_score)

        return {
            "sif_density": round(sif_density, 2),
            "recurrence_score": round(recurrence_score, 2),
            "trend_score": round(trend_score, 2),
            "barrier_criticality_score": round(barrier_criticality_score, 2),
            "site_concentration_score": round(site_concentration_score, 2),
            "pattern_score": round(pattern_score, 2),
            "priority_level": priority_level,
        }

    # ------------------------------------------------------------------
    # Component calculators (pure Python, no DB calls)
    # ------------------------------------------------------------------
    def _calculate_recurrence(self, count: int) -> float:
        if count < 3:  return 0.0
        if count <= 4:  return 25.0
        if count <= 9:  return 50.0
        if count <= 19: return 75.0
        return 100.0

    def _calculate_trend_score(self, trend: str, change: float) -> float:
        if trend == "INCREASING":
            return min(100.0, 50.0 + (abs(change) / 2))
        if trend == "NEW":
            return 75.0
        if trend == "STABLE":
            return 50.0
        if trend == "DECREASING":
            return max(0.0, 50.0 - (abs(change) / 2))
        return 0.0  # INSUFFICIENT_DATA

    def _calculate_site_concentration(self, candidate: Dict[str, Any]) -> float:
        """For site-specific patterns: 100. For cross-site: max site share."""
        p_type = candidate.get('pattern_type', '')
        report_ids = candidate.get('report_ids', [])
        if not report_ids:
            return 0.0
        if "CROSS_SITE" not in p_type:
            return 100.0

        # Use preloaded site lookup
        site_counts: Dict[str, int] = {}
        for rid in report_ids:
            site = self._report_sites.get(rid, "UNKNOWN")
            site_counts[site] = site_counts.get(site, 0) + 1

        if not site_counts:
            return 0.0
        max_site_count = max(site_counts.values())
        return round((max_site_count / len(report_ids)) * 100.0, 2)

    def _calculate_barrier_criticality(self, candidate: Dict[str, Any]) -> float:
        """Uses preloaded barrier stats — no DB call."""
        report_ids = candidate.get('report_ids', [])
        if not report_ids:
            return 0.0

        STATUS_WEIGHTS = {
            "FAILED": 100.0,
            "BYPASSED": 90.0,
            "MISSING": 80.0,
            "WEAK": 50.0,
            "NOT_DETERMINED": 20.0,
            "EFFECTIVE": 0.0,
            "NOT_APPLICABLE": 0.0,
        }

        total_weighted = 0.0
        total_barriers = 0

        for rid in report_ids:
            statuses = self._barrier_stats.get(rid, {})
            for status, cnt in statuses.items():
                weight = STATUS_WEIGHTS.get(status, 20.0)
                total_weighted += weight * cnt
                total_barriers += cnt

        if total_barriers == 0:
            return 0.0
        return round(min(100.0, total_weighted / total_barriers), 2)

    def _get_priority(self, score: float) -> str:
        if score >= 90: return "CRITICAL"
        if score >= 75: return "HIGH"
        if score >= 50: return "MEDIUM"
        return "LOW"
