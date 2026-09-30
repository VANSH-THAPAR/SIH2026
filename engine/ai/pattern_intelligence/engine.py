import time
from typing import Dict, Any, List
from vector_store import PostgresManager, Pattern
from ai.pattern_intelligence.aggregator import PatternAggregator
from ai.pattern_intelligence.trend import TrendAnalyzer
from ai.pattern_intelligence.scorer import PatternScorer
from ai.pattern_intelligence.similarity import SemanticSimilarity
from ai.pattern_intelligence.explainer import PatternExplainer
from sqlalchemy import text
from datetime import datetime
import uuid


class PatternEngine:
    def __init__(self):
        self.db = PostgresManager()
        self.aggregator = PatternAggregator(self.db)
        self.trend_analyzer = TrendAnalyzer(self.db)
        self.scorer = PatternScorer(self.db)
        self.similarity = SemanticSimilarity(self.db)
        self.explainer = PatternExplainer()

    # ------------------------------------------------------------------
    # FULL REBUILD
    # ------------------------------------------------------------------
    def rebuild(self, min_reports: int = 3, max_llm_calls: int = 10) -> Dict[str, Any]:
        start_time = time.time()

        # ── Step 1: Generate candidates via SQL aggregation ──────────────
        print("[PatternEngine] Generating structured candidates...")
        candidates = self.aggregator.generate_candidates(min_reports=min_reports)
        print(f"[PatternEngine] Generated {len(candidates)} candidates")

        # ── Step 2: Collect ALL report IDs that participate ───────────────
        all_report_ids: List[str] = []
        for c in candidates:
            all_report_ids.extend(c.get('report_ids', []))
        # Deduplicate
        all_report_ids = list(set(all_report_ids))
        print(f"[PatternEngine] Preloading data for {len(all_report_ids)} participating reports...")

        # ── Step 3: Bulk preload — ONE query per data source ──────────────
        self.trend_analyzer.preload(all_report_ids)
        self.scorer.preload(all_report_ids)
        self.similarity.preload(all_report_ids)

        # ── Step 4: Score all candidates (pure Python, zero DB calls) ─────
        print("[PatternEngine] Calculating recurrence, SIF density, trends, and ranking...")
        scored: List[Dict[str, Any]] = []
        for candidate in candidates:
            try:
                trend_data = self.trend_analyzer.calculate_trend(candidate)
                scores = self.scorer.calculate_scores(candidate, trend_data)
                evidence_ids = self.similarity.get_representative_evidence(candidate, top_k=5)

                now = datetime.utcnow()
                pattern_payload = {
                    "pattern_id":    str(uuid.uuid4()),
                    "pattern_type":  candidate.get("pattern_type"),
                    "pattern_key":   candidate.get("pattern_key"),
                    "site_name":     candidate.get("site_name"),
                    "activity":      candidate.get("activity"),
                    "rule_name":     candidate.get("rule_name"),
                    "barrier_name":  candidate.get("barrier_name"),

                    "total_report_count": int(candidate.get("total_report_count", 0)),
                    "sif_report_count":   int(candidate.get("sif_report_count", 0)),
                    "site_count":         int(candidate.get("site_count", 0)),

                    "sif_density":              scores["sif_density"],
                    "recurrence_score":         scores["recurrence_score"],
                    "trend_score":              scores["trend_score"],
                    "barrier_criticality_score":scores["barrier_criticality_score"],
                    "site_concentration_score": scores["site_concentration_score"],
                    "pattern_score":            scores["pattern_score"],
                    "priority_level":           scores["priority_level"],

                    "current_period_count":  trend_data["current_period_count"],
                    "previous_period_count": trend_data["previous_period_count"],
                    "trend":                 trend_data["trend"],
                    "trend_change_percent":  trend_data["trend_change_percent"],

                    "evidence_report_ids": evidence_ids,
                    "first_detected":      now,
                    "last_detected":       now,

                    # LLM fields - filled in step 6
                    "llm_summary":        None,
                    "llm_recommendation": None,
                    "title":              None,
                }
                scored.append(pattern_payload)
            except Exception as e:
                print(f"[PatternEngine] Error scoring candidate {candidate.get('pattern_key')}: {e}")
                continue

        # ── Step 5: Sort and persist ALL patterns (dashboard ready ASAP) ──
        scored.sort(key=lambda x: x.get("pattern_score", 0), reverse=True)
        print(f"[PatternEngine] Persisting {len(scored)} patterns...")

        persisted_count = 0
        session = self.db.SessionLocal()
        try:
            for pattern_payload in scored:
                try:
                    key = pattern_payload["pattern_key"]
                    existing = session.query(Pattern).filter(Pattern.pattern_key == key).first()
                    if existing:
                        for k, v in pattern_payload.items():
                            if k != "pattern_id" and hasattr(existing, k):
                                setattr(existing, k, v)
                        existing.updated_at = datetime.utcnow()
                    else:
                        record = Pattern(**{k: v for k, v in pattern_payload.items() if hasattr(Pattern, k)})
                        session.add(record)
                    persisted_count += 1
                except Exception as e:
                    print(f"[PatternEngine] Error staging pattern {pattern_payload.get('pattern_key')}: {e}")
                    continue
            session.commit()
            print(f"[PatternEngine] Persisted {persisted_count} patterns.")
        except Exception as e:
            session.rollback()
            print(f"[PatternEngine] Batch persist error: {e}")
        finally:
            session.close()

        # ── Step 6: Optional LLM explanations for TOP N only ─────────────
        top_patterns_db = self._fetch_top_n(max_llm_calls)
        print(f"[PatternEngine] Top {len(top_patterns_db)} patterns selected for LLM explanation.")

        llm_calls = 0
        llm_failures = 0
        llm_session = self.db.SessionLocal()
        try:
            for i, tp in enumerate(top_patterns_db):
                print(f"[PatternEngine] Generating LLM explanations: {i+1}/{len(top_patterns_db)}")
                evidence_ids = tp.evidence_report_ids or []
                evidence_texts = self._fetch_evidence_texts(evidence_ids)

                explanation = self.explainer.explain(
                    {
                        "pattern_type": tp.pattern_type,
                        "site_name": tp.site_name,
                        "activity": tp.activity,
                        "rule_name": tp.rule_name,
                        "barrier_name": tp.barrier_name,
                        "total_report_count": tp.total_report_count,
                        "sif_report_count": tp.sif_report_count,
                        "sif_density": tp.sif_density,
                        "trend": tp.trend,
                        "trend_change_percent": tp.trend_change_percent,
                        "pattern_score": tp.pattern_score,
                        "priority_level": tp.priority_level,
                    },
                    evidence_texts
                )

                llm_calls += 1
                if explanation.get("llm_summary") is None:
                    llm_failures += 1

                tp.llm_summary = explanation.get("llm_summary")
                tp.llm_recommendation = explanation.get("llm_recommendation")
                if explanation.get("title"):
                    tp.title = explanation["title"]
                tp.updated_at = datetime.utcnow()

            llm_session.commit()
        except Exception as e:
            llm_session.rollback()
            print(f"[PatternEngine] LLM batch update error: {e}")
        finally:
            llm_session.close()

        execution_time = time.time() - start_time
        print("[PatternEngine] Complete.")

        return {
            "total_candidates": len(candidates),
            "persisted_patterns": persisted_count,
            "llm_calls": llm_calls,
            "llm_failures": llm_failures,
            "execution_time_seconds": round(execution_time, 2),
        }

    # ------------------------------------------------------------------
    # INCREMENTAL UPDATE
    # ------------------------------------------------------------------
    def incremental_update(self, report_data: Dict[str, Any] = None) -> None:
        """
        Limitation: Currently triggers a full rebuild with LLM disabled
        for speed. A true incremental implementation would identify the
        pattern keys affected by the new report and recalculate only those.
        This is safe for the ~450-report prototype dataset.
        """
        print("[PatternEngine] Incremental update triggered (performing fast full rebuild, LLM skipped).")
        self.rebuild(max_llm_calls=0)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _fetch_top_n(self, n: int) -> list:
        session = self.db.SessionLocal()
        try:
            return session.query(Pattern).order_by(Pattern.pattern_score.desc()).limit(n).all()
        finally:
            session.close()

    def _fetch_evidence_texts(self, report_ids: List[str]) -> List[str]:
        if not report_ids:
            return []
        session = self.db.SessionLocal()
        try:
            from vector_store import ReportRecord
            records = session.query(ReportRecord).filter(
                ReportRecord.report_id.in_(report_ids)
            ).all()
            return [r.description for r in records if r.description]
        except Exception:
            return []
        finally:
            session.close()
