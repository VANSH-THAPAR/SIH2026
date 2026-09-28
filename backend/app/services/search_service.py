"""
Search service: keyword and semantic similarity search.
Uses existing pgvector embeddings in report_embeddings table.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, func

from app.models.models import ReportAnalysis, SifReport, IncidentMeta, ReportBarrier, ReportRule, LifeSavingRule
from app.schemas.schemas import IncidentSummary, SemanticSearchResult, SearchResponse
from app.services.safety_engine import calculate_priority, derive_incident_title


def keyword_search(db: Session, query: str, limit: int = 20) -> List[IncidentSummary]:
    """Full-text keyword search across incident data."""
    search_term = f"%{query}%"
    rows = (
        db.query(SifReport, ReportAnalysis)
        .outerjoin(ReportAnalysis, SifReport.report_id == ReportAnalysis.report_id)
        .filter(
            or_(
                SifReport.report_id.ilike(search_term),
                SifReport.description.ilike(search_term),
                SifReport.site_name.ilike(search_term),
                SifReport.department.ilike(search_term),
                SifReport.activity.ilike(search_term),
                SifReport.report_type.ilike(search_term),
                ReportAnalysis.hazard.ilike(search_term),
                ReportAnalysis.unsafe_act.ilike(search_term),
                ReportAnalysis.unsafe_condition.ilike(search_term),
                ReportAnalysis.energy_source.ilike(search_term),
                ReportAnalysis.worker_exposure.ilike(search_term),
            )
        )
        .order_by(ReportAnalysis.sif_score.desc().nullslast())
        .limit(limit)
        .all()
    )

    summaries = []
    for report, analysis in rows:
        sif_score = analysis.sif_score if analysis else None
        title = derive_incident_title(
            report_type=report.report_type,
            hazard=analysis.hazard if analysis else None,
            activity=report.activity,
            unsafe_act=analysis.unsafe_act if analysis else None,
            description=report.description,
        )
        summaries.append(IncidentSummary(
            id=report.report_id,
            title=title,
            report_type=report.report_type or "Unknown",
            site_name=report.site_name,
            region=report.region,
            location=report.location,
            department=report.department,
            activity=report.activity,
            report_date=report.report_date,
            sif_score=sif_score,
            sif_classification=analysis.sif_classification if analysis else None,
            sif_potential=analysis.sif_potential if analysis else None,
            priority=calculate_priority(sif_score),
            hazard=analysis.hazard if analysis else None,
            energy_source=analysis.energy_source if analysis else None,
            exposure_status=analysis.exposure_status if analysis else None,
            confidence=analysis.confidence if analysis else None,
        ))

    return summaries


def semantic_search(db: Session, query: str, limit: int = 10) -> SearchResponse:
    """
    Semantic similarity search using pgvector.
    Encodes the query and finds similar incidents by cosine distance.
    Falls back to keyword search if encoding fails.
    """
    try:
        from ai.embeddings import RemoteSentenceTransformer as SentenceTransformer

        model = SentenceTransformer("all-MiniLM-L6-v2")
        query_embedding = model.encode(query, normalize_embeddings=True)
        embedding_str = "[" + ",".join(str(x) for x in query_embedding.tolist()) + "]"

        # Use pgvector cosine distance operator <=>
        sql = text("""
            SELECT 
                re.report_id,
                1 - (re.embedding <=> :embedding::vector) as similarity
            FROM report_embeddings re
            ORDER BY re.embedding <=> :embedding::vector
            LIMIT :limit
        """)
        rows = db.execute(sql, {"embedding": embedding_str, "limit": limit}).fetchall()

        report_ids = [r[0] for r in rows]
        similarity_map = {r[0]: float(r[1]) for r in rows}

        # Load full data for these reports
        data_rows = (
            db.query(SifReport, ReportAnalysis)
            .outerjoin(ReportAnalysis, SifReport.report_id == ReportAnalysis.report_id)
            .filter(SifReport.report_id.in_(report_ids))
            .all()
        )

        # Map back to similarity scores and sort
        results = []
        for report, analysis in data_rows:
            sif_score = analysis.sif_score if analysis else None
            title = derive_incident_title(
                report_type=report.report_type,
                hazard=analysis.hazard if analysis else None,
                activity=report.activity,
                unsafe_act=analysis.unsafe_act if analysis else None,
                description=report.description,
            )
            summary = IncidentSummary(
                id=report.report_id,
                title=title,
                report_type=report.report_type or "Unknown",
                site_name=report.site_name,
                region=report.region,
                location=report.location,
                department=report.department,
                activity=report.activity,
                report_date=report.report_date,
                sif_score=sif_score,
                sif_classification=analysis.sif_classification if analysis else None,
                sif_potential=analysis.sif_potential if analysis else None,
                priority=calculate_priority(sif_score),
                hazard=analysis.hazard if analysis else None,
                energy_source=analysis.energy_source if analysis else None,
                exposure_status=analysis.exposure_status if analysis else None,
                confidence=analysis.confidence if analysis else None,
            )
            results.append(SemanticSearchResult(
                incident=summary,
                similarity_score=round(similarity_map.get(report.report_id, 0.0), 3),
            ))

        results.sort(key=lambda x: x.similarity_score, reverse=True)

        return SearchResponse(results=results, query=query, total=len(results))

    except Exception as e:
        # Fallback to keyword search
        keyword_results = keyword_search(db, query, limit)
        return SearchResponse(
            results=[SemanticSearchResult(incident=inc, similarity_score=0.5) for inc in keyword_results],
            query=query,
            total=len(keyword_results),
        )


def get_similar_incidents(db: Session, report_id: str, limit: int = 5):
    """Find incidents similar to the given report_id using pgvector."""
    from app.schemas.schemas import SimilarIncident

    try:
        # Get embedding for this report
        sql = text("""
            SELECT 
                re2.report_id,
                1 - (re1.embedding <=> re2.embedding) as similarity
            FROM report_embeddings re1
            JOIN report_embeddings re2 ON re1.report_id != re2.report_id
            WHERE re1.report_id = :report_id
            ORDER BY re1.embedding <=> re2.embedding
            LIMIT :limit
        """)
        rows = db.execute(sql, {"report_id": report_id, "limit": limit}).fetchall()

        similar_ids = [r[0] for r in rows]
        similarity_map = {r[0]: float(r[1]) for r in rows}

        if not similar_ids:
            return []

        data_rows = (
            db.query(SifReport, ReportAnalysis)
            .outerjoin(ReportAnalysis, SifReport.report_id == ReportAnalysis.report_id)
            .filter(SifReport.report_id.in_(similar_ids))
            .all()
        )

        results = []
        for report, analysis in data_rows:
            title = derive_incident_title(
                report_type=report.report_type,
                hazard=analysis.hazard if analysis else None,
                activity=report.activity,
                unsafe_act=analysis.unsafe_act if analysis else None,
                description=report.description,
            )
            results.append(SimilarIncident(
                id=report.report_id,
                title=title,
                site_name=report.site_name,
                report_date=report.report_date,
                sif_score=analysis.sif_score if analysis else None,
                common_hazards=[analysis.hazard] if analysis and analysis.hazard else [],
                common_activity=report.activity,
                similarity_score=round(similarity_map.get(report.report_id, 0.0), 3),
                report_type=report.report_type,
            ))

        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results

    except Exception:
        return []
