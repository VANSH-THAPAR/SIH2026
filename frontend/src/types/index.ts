// ─── Shared / Enum Types ────────────────────────────────────────────────────

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Status = 'OPEN' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'CLOSED' | 'ESCALATED';
export type SIFClassification = 'SIF_POTENTIAL' | 'NON_SIF' | 'UNDETERMINED';
export type BarrierStatus = 'EFFECTIVE' | 'FAILED' | 'BYPASSED' | 'MISSING' | 'UNKNOWN';
export type ExposureStatus = 'DOCUMENTED' | 'POTENTIAL' | 'NEAR_MISS' | 'ACTUAL';
export type ActionStatus = 'TODO' | 'IN_PROGRESS' | 'VERIFICATION' | 'CLOSED';
export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';

// ─── Incident Types ──────────────────────────────────────────────────────────

export interface SiteInfo {
  site_id?: string;
  site_name?: string;
  region?: string;
}

export interface ReporterInfo {
  emp_id?: string;
  name?: string;
}

export interface IncidentCreate {
  report_id?: string;
  report_date?: string;
  time?: string;
  site?: SiteInfo;
  site_id?: string;
  site_name?: string;
  region?: string;
  location?: string;
  department?: string;
  reported_by?: ReporterInfo[];
  primary_reporter_id?: string;
  report_type: string;
  activity?: string;
  description: string;
  source?: string;
}

export interface IncidentSummary {
 id: string;
 title: string;
 report_type: string;
 site_name: string;
 region: string;
 location: string;
 department: string;
 activity: string;
 report_date: string;
 sif_score: number;
 sif_classification: SIFClassification;
 sif_potential: boolean;
 priority: Priority;
 status: Status;
 assigned_to: string;
 hazard: string;
 energy_source: string;
 exposure_status: ExposureStatus;
 confidence: number;
 barrier_status: BarrierStatus;
 primary_lsr: string;
}

export interface BarrierDetail {
 barrier_id: string;
 barrier_code: string;
 barrier_name: string;
 barrier_type: string;
 status: BarrierStatus;
 description: string;
 failure_mode?: string;
 effectiveness_score?: number;
}

export interface LSRDetail {
 rule_id: string;
 rule_code: string;
 rule_name: string;
 description: string;
 violated: boolean;
 confidence: number;
}

export interface SimilarIncident {
 id: string;
 title: string;
 site_name: string;
 report_date: string;
 sif_score: number;
 similarity_score: number;
 priority: Priority;
 hazard: string;
}

export interface EscalationNode {
 id: string;
 label: string;
 type: string;
 description: string;
}

export interface EscalationEdge {
 source: string;
 target: string;
 label: string;
}

export interface EscalationGraph {
 nodes: EscalationNode[];
 edges: EscalationEdge[];
}

export interface SIFFactors {
 energy_type?: string;
 energy_level?: string;
 exposure_frequency?: string;
 worker_count?: number;
 existing_barriers_count?: number;
 failed_barriers_count?: number;
 [key: string]: unknown;
}

export interface RecommendedAction {
 id?: string;
 title: string;
 description: string;
 priority: Priority;
 category?: string;
 owner?: string;
 due_date?: string;
}

export interface IncidentDetail extends IncidentSummary {
 description: string;
 source: string;
 unsafe_act: string;
 unsafe_condition: string;
 worker_exposure: string;
 existing_controls: string;
 missing_controls: string;
 potential_consequence: string;
 actual_consequence: string;
 causal_chain: string[];
 key_evidence: string[];
 sif_factors: SIFFactors;
 sif_evidence: string[];
 sif_reasoning: string;
 model_name: string;
 analyzed_at: string;
 barriers: BarrierDetail[];
 life_saving_rules: LSRDetail[];
 similar_incidents: SimilarIncident[];
 escalation_graph: EscalationGraph;
 recommended_actions: RecommendedAction[];
}

// ─── Dashboard Types ─────────────────────────────────────────────────────────

export interface DashboardKPIs {
 total_reports: number;
 sif_potential_count: number;
 non_sif_count: number;
 critical_count: number;
 high_count: number;
 medium_count: number;
 low_count: number;
 documented_exposure: number;
 potential_exposure: number;
 near_miss_exposure: number;
 avg_sif_score: number;
 open_actions: number;
 overdue_actions: number;
 failed_barriers: number;
 total_barrier_mappings: number;
 lsr_mappings: number;
}

export interface MonthlyTrend {
 month: string;
 total: number;
 sif_potential: number;
 critical: number;
}

export interface FacilityRisk {
 site_name: string;
 total: number;
 sif_potential: number;
 avg_sif_score: number;
 critical: number;
}

export interface BarrierHealth {
 barrier_name: string;
 barrier_type: string;
 total: number;
 failed: number;
 failure_rate: number;
}

export interface LSRFrequency {
 rule_name: string;
 rule_code: string;
 count: number;
 violated_count: number;
}

export interface ActivityHotspot {
 activity: string;
 count: number;
 sif_potential: number;
}

export interface SIFScoreDistribution {
 range: string;
 count: number;
}

export interface PriorityDistribution {
 priority: Priority;
 count: number;
}

export interface ExposureDistribution {
 exposure_status: ExposureStatus;
 count: number;
}

export interface DashboardTrends {
 monthly_trend: MonthlyTrend[];
 facility_risk: FacilityRisk[];
 barrier_health: BarrierHealth[];
 lsr_frequency: LSRFrequency[];
 activity_hotspots: ActivityHotspot[];
 sif_score_distribution: SIFScoreDistribution[];
 priority_distribution: PriorityDistribution[];
 exposure_distribution: ExposureDistribution[];
}

// ─── Action Types ────────────────────────────────────────────────────────────

export interface ActionSummary {
 id: string;
 report_id: string;
 title: string;
 description: string;
 owner: string;
 priority: Priority;
 status: ActionStatus;
 due_date: string;
 created_at: string;
 updated_at: string;
}

// ─── Pattern / Cluster Types ─────────────────────────────────────────────────

export interface PatternCluster {
 id: string;
 label: string;
 hazard_type: string;
 count: number;
 recent_count: number;
 facility_count: number;
 trend: TrendDirection;
 avg_sif_score: number;
 incident_ids: string[];
 facilities: string[];
}

// ─── Barrier / LSR Catalog Types ─────────────────────────────────────────────

export interface BarrierCatalog {
 barrier_id: string;
 barrier_code: string;
 barrier_name: string;
 barrier_type: string;
 description: string;
 active: boolean;
 incident_count: number;
 failed_count: number;
}

export interface LSRCatalog {
 rule_id: string;
 rule_code: string;
 rule_name: string;
 description: string;
 active: boolean;
 incident_count: number;
}

// ─── Comment / Activity Types ─────────────────────────────────────────────────

export interface Comment {
 id: string;
 report_id: string;
 author: string;
 content: string;
 created_at: string;
}

export interface ActivityEvent {
 id: string;
 report_id: string;
 event_type: string;
 description: string;
 user: string;
 timestamp: string;
 metadata?: Record<string, unknown>;
}

// ─── API Pagination ───────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
 items: T[];
 total: number;
 page: number;
 page_size: number;
 pages: number;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SemanticSearchResult {
 id: string;
 title: string;
 site_name: string;
 hazard: string;
 sif_score: number;
 priority: Priority;
 similarity_score: number;
 report_date: string;
}

// ─── Filter State ─────────────────────────────────────────────────────────────

export interface IncidentFilters {
 page: number;
 page_size: number;
 priority?: Priority | '';
 status?: Status | '';
 sif_only?: boolean;
 site_name?: string;
 department?: string;
 search?: string;
 sif_min?: number | '';
 sif_max?: number | '';
}

export interface ActionFilters {
 status?: ActionStatus | '';
 priority?: Priority | '';
 report_id?: string;
}
