import axios from 'axios';
import type {
 IncidentSummary,
 IncidentCreate,
 IncidentDetail,
 DashboardKPIs,
 DashboardTrends,
 ActionSummary,
 PatternCluster,
 BarrierCatalog,
 LSRCatalog,
 Comment,
 ActivityEvent,
 PaginatedResponse,
 SemanticSearchResult,
 IncidentFilters,
 ActionFilters,
 Priority,
 ActionStatus,
 KanbanWorkflowStatus,
 User,
 AuthResponse,
 LoginCredentials,
 RegisterCredentials,
} from '../types';

const api = axios.create({
 baseURL: import.meta.env.VITE_API_URL || '/api',
 headers: { 'Content-Type': 'application/json' },
 timeout: 30000,
});

// Attach Bearer token from localStorage if available
api.interceptors.request.use((config) => {
 const token = localStorage.getItem('token');
 if (token) {
 config.headers.Authorization = `Bearer ${token}`;
 }
 return config;
});

api.interceptors.response.use(
 (res) => res,
 (err) => {
 if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
 localStorage.removeItem('token');
 localStorage.removeItem('user');
 window.location.href = '/login';
 }
 console.error('[API Error]', err.response?.status, err.response?.data ?? err.message);
 return Promise.reject(err);
 }
);

// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginApi = async (credentials: LoginCredentials): Promise<AuthResponse> => {
 const params = new URLSearchParams();
 params.append('username', credentials.email.trim());
 params.append('password', credentials.password);

 const res = await api.post<AuthResponse>('/auth/login', params, {
 headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
 });
 return res.data;
};

export const registerApi = async (credentials: RegisterCredentials): Promise<User> => {
 const res = await api.post<User>('/auth/register', {
 email: credentials.email.trim(),
 password: credentials.password,
 role: credentials.role,
 });
 return res.data;
};

export const fetchMeApi = async (): Promise<User> => {
 const res = await api.get<User>('/auth/me');
 return res.data;
};

// ─── Incidents ───────────────────────────────────────────────────────────────

export const fetchIncidents = async (
 filters: Partial<IncidentFilters> = {}
): Promise<PaginatedResponse<IncidentSummary>> => {
 const params = new URLSearchParams();
 if (filters.page) params.set('page', String(filters.page));
 if (filters.page_size) params.set('page_size', String(filters.page_size));
 if (filters.priority) params.set('priority', filters.priority);
 if (filters.status) params.set('status', filters.status);
 if (filters.sif_only) params.set('sif_only', 'true');
 if (filters.site_name) params.set('site_name', filters.site_name);
 if (filters.department) params.set('department', filters.department);
 if (filters.search) params.set('search', filters.search);
 if (filters.sif_min !== '' && filters.sif_min !== undefined) params.set('sif_min', String(filters.sif_min));
 if (filters.sif_max !== '' && filters.sif_max !== undefined) params.set('sif_max', String(filters.sif_max));
 const res = await api.get<PaginatedResponse<IncidentSummary>>(`/incidents?${params.toString()}`);
 return res.data;
};

export const fetchIncident = async (id: string): Promise<IncidentDetail> => {
 const res = await api.get<IncidentDetail>(`/incidents/${id}`);
 return res.data;
};

export const createIncident = async (body: IncidentCreate): Promise<IncidentSummary> => {
 const res = await api.post<IncidentSummary>('/incidents', body);
 return res.data;
};

export const updateIncident = async (
 id: string,
 body: { priority?: Priority; status?: string; assigned_to?: string; kanban_status?: KanbanWorkflowStatus | null }
): Promise<IncidentDetail> => {
 const res = await api.put<IncidentDetail>(`/incidents/${id}`, body);
 return res.data;
};

/**
 * Move an incident from the List view onto the HSE Kanban workflow.
 * Sets kanban_status = UNDER_ASSESSMENT (initial workflow state).
 * Idempotent — if already on Kanban, use updateKanbanStatus instead.
 */
export const moveToKanban = async (id: string): Promise<IncidentDetail> => {
 return updateIncident(id, { kanban_status: 'UNDER_ASSESSMENT' });
};

/**
 * Update an incident's Kanban workflow status (e.g. on drag-and-drop).
 * Does NOT change priority/risk level.
 */
export const updateKanbanStatus = async (
 id: string,
 kanban_status: KanbanWorkflowStatus
): Promise<IncidentDetail> => {
 return updateIncident(id, { kanban_status });
};

export const fetchIncidentActions = async (id: string): Promise<ActionSummary[]> => {
 const res = await api.get<ActionSummary[]>(`/incidents/${id}/actions`);
 return res.data;
};

export const createIncidentAction = async (
 id: string,
 body: { title: string; description: string; owner: string; priority: Priority; due_date: string }
): Promise<ActionSummary> => {
 const res = await api.post<ActionSummary>(`/incidents/${id}/actions`, body);
 return res.data;
};

export const createComment = async (
 id: string,
 body: { author: string; content: string }
): Promise<Comment> => {
 const res = await api.post<Comment>(`/incidents/${id}/comments`, body);
 return res.data;
};

export const fetchComments = async (id: string): Promise<Comment[]> => {
 const res = await api.get<Comment[]>(`/incidents/${id}/comments`);
 return res.data;
};

export const fetchActivity = async (id: string): Promise<ActivityEvent[]> => {
 const res = await api.get<ActivityEvent[]>(`/incidents/${id}/activity`);
 return res.data;
};

export const fetchSimilarIncidents = async (id: string): Promise<IncidentSummary[]> => {
 const res = await api.get<IncidentSummary[]>(`/incidents/${id}/similar`);
 return res.data;
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export const fetchActions = async (filters: Partial<ActionFilters> = {}): Promise<ActionSummary[]> => {
 const params = new URLSearchParams();
 if (filters.status) params.set('status', filters.status);
 if (filters.priority) params.set('priority', filters.priority);
 if (filters.report_id) params.set('report_id', filters.report_id);
 const res = await api.get<ActionSummary[]>(`/actions?${params.toString()}`);
 return res.data;
};

export const updateAction = async (
 id: string,
 body: { title?: string; status?: ActionStatus; owner?: string; priority?: Priority; due_date?: string }
): Promise<ActionSummary> => {
 const res = await api.put<ActionSummary>(`/actions/${id}`, body);
 return res.data;
};

export const createActionOutcome = async (
 id: string,
 body: { description: string; created_by: string }
): Promise<void> => {
 await api.post(`/actions/${id}/outcomes`, body);
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const fetchDashboardKPIs = async (): Promise<DashboardKPIs> => {
 const res = await api.get<DashboardKPIs>('/dashboard/summary');
 return res.data;
};

export const fetchDashboardTrends = async (): Promise<DashboardTrends> => {
 const res = await api.get<DashboardTrends>('/dashboard/trends');
 return res.data;
};

// ─── Search ───────────────────────────────────────────────────────────────────

export const semanticSearch = async (
 query: string,
 limit = 10
): Promise<SemanticSearchResult[]> => {
 const res = await api.post<SemanticSearchResult[]>('/search/semantic', { query, limit });
 return res.data;
};

export const keywordSearch = async (
 q: string,
 limit = 20
): Promise<IncidentSummary[]> => {
 const res = await api.get<IncidentSummary[]>(`/search/keyword?q=${encodeURIComponent(q)}&limit=${limit}`);
 return res.data;
};

// ─── Barriers & LSR ───────────────────────────────────────────────────────────

export const fetchBarriers = async (): Promise<BarrierCatalog[]> => {
 const res = await api.get<BarrierCatalog[]>('/barriers');
 return res.data;
};

export const fetchLSRs = async (): Promise<LSRCatalog[]> => {
 const res = await api.get<LSRCatalog[]>('/life-saving-rules');
 return res.data;
};

// ─── Patterns ─────────────────────────────────────────────────────────────────

export const fetchPatterns = async (): Promise<PatternCluster[]> => {
 const res = await api.get<{ patterns: PatternCluster[] } | PatternCluster[]>('/patterns');
 return Array.isArray(res.data) ? res.data : res.data.patterns ?? [];
};

export default api;
