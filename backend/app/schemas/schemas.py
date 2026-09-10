from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel


# =====================================================
# CORE INCIDENT SCHEMAS
# =====================================================

class IncidentSummary(BaseModel):
    """Compact incident for lists and board cards."""
    id: str  # report_id
    title: str  # derived from description or report_type
    report_type: str
    site_name: Optional[str] = None
    region: Optional[str] = None
    location: Optional[str] = None
    department: Optional[str] = None
    activity: Optional[str] = None
    report_date: Optional[str] = None
    # Analysis data
    sif_score: Optional[float] = None
    sif_classification: Optional[str] = None
    sif_potential: Optional[bool] = None
    priority: str = "HIGH"
    status: str = "OPEN"
    assigned_to: Optional[str] = None
    hazard: Optional[str] = None
    energy_source: Optional[str] = None
    exposure_status: Optional[str] = None
    confidence: Optional[float] = None
    # Barrier/LSR summary
    barrier_status: Optional[str] = None  # worst barrier status
    primary_lsr: Optional[str] = None

    model_config = {"from_attributes": True}


class SIFFactors(BaseModel):
    """SIF score factor breakdown."""
    hazard_severity: Optional[float] = None
    energy: Optional[float] = None
    exposure: Optional[float] = None
    consequence: Optional[float] = None
    barrier_failure: Optional[float] = None
    causal_chain: Optional[float] = None
    sif_pathway_credibility: Optional[float] = None
    exposure_immediacy: Optional[float] = None
    escalation_evidence: Optional[float] = None
    sif_mechanism_strength: Optional[float] = None


class BarrierDetail(BaseModel):
    """Barrier with catalog info."""
    id: str
    barrier_code: str
    barrier_name: str
    barrier_type: str
    status: str
    criticality: Optional[float] = None
    confidence: Optional[float] = None
    evidence: Optional[List[str]] = None
    reasoning: Optional[str] = None


class LSRDetail(BaseModel):
    """Life Saving Rule with mapping info."""
    id: str
    rule_code: str
    rule_name: str
    description: Optional[str] = None
    confidence: Optional[float] = None
    priority: Optional[str] = None
    trigger: Optional[str] = None
    evidence: Optional[List[str]] = None
    reasoning: Optional[str] = None


class EscalationNode(BaseModel):
    """Node in escalation graph."""
    id: str
    label: str
    type: str  # event, hazard, barrier, consequence, exposure
    description: Optional[str] = None


class EscalationEdge(BaseModel):
    """Edge in escalation graph."""
    source: str
    target: str
    label: Optional[str] = None


class EscalationGraph(BaseModel):
    """Full escalation pathway graph."""
    nodes: List[EscalationNode]
    edges: List[EscalationEdge]


class SimilarIncident(BaseModel):
    """Similar historical incident."""
    id: str
    title: str
    site_name: Optional[str] = None
    report_date: Optional[str] = None
    sif_score: Optional[float] = None
    common_hazards: List[str] = []
    common_barriers: List[str] = []
    common_activity: Optional[str] = None
    similarity_score: float
    report_type: Optional[str] = None


class IncidentDetail(BaseModel):
    """Full incident intelligence workspace data."""
    id: str
    title: str
    report_type: str
    site_name: Optional[str] = None
    region: Optional[str] = None
    location: Optional[str] = None
    department: Optional[str] = None
    activity: Optional[str] = None
    report_date: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    # Application meta
    priority: str = "HIGH"
    status: str = "OPEN"
    assigned_to: Optional[str] = None
    # Analysis
    unsafe_act: Optional[str] = None
    unsafe_condition: Optional[str] = None
    hazard: Optional[str] = None
    energy_source: Optional[str] = None
    worker_exposure: Optional[str] = None
    existing_controls: Optional[str] = None
    missing_controls: Optional[str] = None
    potential_consequence: Optional[str] = None
    actual_consequence: Optional[str] = None
    causal_chain: Optional[List[str]] = None
    key_evidence: Optional[List[str]] = None
    # SIF
    sif_potential: Optional[bool] = None
    sif_score: Optional[float] = None
    sif_classification: Optional[str] = None
    sif_factors: Optional[SIFFactors] = None
    sif_evidence: Optional[List[str]] = None
    sif_reasoning: Optional[str] = None
    exposure_status: Optional[str] = None
    confidence: Optional[float] = None
    # AI metadata
    model_name: Optional[str] = None
    analyzed_at: Optional[str] = None
    sif_analyzed_at: Optional[str] = None
    # Related data
    barriers: List[BarrierDetail] = []
    life_saving_rules: List[LSRDetail] = []
    similar_incidents: List[SimilarIncident] = []
    escalation_graph: Optional[EscalationGraph] = None
    recommended_actions: List[str] = []

    model_config = {"from_attributes": True}


# =====================================================
# INCIDENT LIST / FILTER SCHEMAS
# =====================================================

class IncidentListResponse(BaseModel):
    items: List[IncidentSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


# =====================================================
# INCIDENT UPDATE SCHEMAS
# =====================================================

class IncidentUpdate(BaseModel):
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None


class IncidentCreate(BaseModel):
    report_type: str
    title: str
    description: str
    site_name: Optional[str] = None
    region: Optional[str] = None
    location: Optional[str] = None
    department: Optional[str] = None
    report_date: Optional[str] = None
    activity: Optional[str] = None


# =====================================================
# ACTION SCHEMAS
# =====================================================

class ActionSummary(BaseModel):
    id: str
    report_id: str
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    priority: str = "HIGH"
    status: str = "TODO"
    due_date: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class ActionCreate(BaseModel):
    report_id: str
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    priority: str = "HIGH"
    due_date: Optional[str] = None


class ActionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None


# =====================================================
# COMMENT SCHEMAS
# =====================================================

class CommentCreate(BaseModel):
    author: str
    content: str


class CommentResponse(BaseModel):
    id: str
    report_id: str
    author: str
    content: str
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


# =====================================================
# ACTIVITY LOG SCHEMAS
# =====================================================

class ActivityEntry(BaseModel):
    id: str
    report_id: Optional[str] = None
    action_id: Optional[str] = None
    actor: Optional[str] = None
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


# =====================================================
# DASHBOARD SCHEMAS
# =====================================================

class DashboardKPIs(BaseModel):
    total_reports: int
    sif_potential_count: int
    non_sif_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    documented_exposure: int
    potential_exposure: int
    near_miss_exposure: int
    avg_sif_score: float
    open_actions: int
    overdue_actions: int
    failed_barriers: int
    total_barrier_mappings: int
    lsr_mappings: int


class TrendDataPoint(BaseModel):
    period: str
    sif_count: int
    non_sif_count: int
    avg_score: float


class FacilityRisk(BaseModel):
    site_name: str
    total: int
    sif_potential: int
    avg_score: float
    critical_count: int


class BarrierHealthSummary(BaseModel):
    barrier_name: str
    barrier_code: str
    barrier_type: str
    total: int
    failed: int
    bypassed: int
    effective: int
    failure_rate: float


class LSRFrequency(BaseModel):
    rule_name: str
    rule_code: str
    total: int
    primary_count: int
    avg_confidence: float


class ActivityHotspot(BaseModel):
    activity: str
    total: int
    sif_count: int
    avg_score: float


class DashboardTrends(BaseModel):
    monthly_trend: List[TrendDataPoint]
    facility_risk: List[FacilityRisk]
    barrier_health: List[BarrierHealthSummary]
    lsr_frequency: List[LSRFrequency]
    activity_hotspots: List[ActivityHotspot]
    sif_score_distribution: List[Dict[str, Any]]
    priority_distribution: List[Dict[str, Any]]
    exposure_distribution: List[Dict[str, Any]]


# =====================================================
# SEARCH SCHEMAS
# =====================================================

class SearchQuery(BaseModel):
    query: str
    limit: int = 10


class SemanticSearchResult(BaseModel):
    incident: IncidentSummary
    similarity_score: float


class SearchResponse(BaseModel):
    results: List[SemanticSearchResult]
    query: str
    total: int


# =====================================================
# PATTERN SCHEMAS
# =====================================================

class PatternCluster(BaseModel):
    id: str
    label: str
    hazard_type: str
    activity_type: Optional[str] = None
    barrier_type: Optional[str] = None
    count: int
    recent_count: int  # last 30 days
    facility_count: int
    trend: str  # INCREASING, STABLE, DECREASING
    avg_sif_score: float
    incident_ids: List[str]
    facilities: List[str]


class PatternListResponse(BaseModel):
    patterns: List[PatternCluster]
    total: int


# =====================================================
# BARRIER SCHEMAS (catalog level)
# =====================================================

class BarrierCatalog(BaseModel):
    barrier_id: str
    barrier_code: str
    barrier_name: str
    barrier_type: str
    description: Optional[str] = None
    active: bool = True
    incident_count: int = 0
    failed_count: int = 0

    model_config = {"from_attributes": True}


# =====================================================
# LSR SCHEMAS (catalog level)
# =====================================================

class LSRCatalog(BaseModel):
    rule_id: str
    rule_code: str
    rule_name: str
    description: Optional[str] = None
    active: bool = True
    incident_count: int = 0

    model_config = {"from_attributes": True}


# =====================================================
# INTERVENTION OUTCOME SCHEMAS
# =====================================================

class OutcomeCreate(BaseModel):
    action_id: str
    report_id: str
    effectiveness: str  # YES, PARTIALLY, NO
    before_sif_score: Optional[float] = None
    after_sif_score: Optional[float] = None
    before_priority: Optional[str] = None
    after_priority: Optional[str] = None
    before_barrier_status: Optional[str] = None
    after_barrier_status: Optional[str] = None
    evidence: Optional[str] = None
    reviewer: Optional[str] = None
    notes: Optional[str] = None


class OutcomeResponse(OutcomeCreate):
    id: str
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}
