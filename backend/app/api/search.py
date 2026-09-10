from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.schemas.schemas import SearchQuery, SearchResponse
from app.services.search_service import semantic_search, keyword_search

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("/semantic", response_model=SearchResponse)
def do_semantic_search(query: SearchQuery, db: Session = Depends(get_db)):
    """Semantic similarity search using pgvector."""
    return semantic_search(db, query.query, query.limit)


@router.get("/keyword")
def do_keyword_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Keyword search across incident data."""
    results = keyword_search(db, q, limit)
    return {"results": results, "query": q, "total": len(results)}
