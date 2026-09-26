import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  LayoutGrid,
  List,
  Search,
  X,
  Download,
  ChevronDown,
  ArrowUpRight,
  GitBranch,
  CheckCheck,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { fetchIncidents, moveToKanban, updateKanbanStatus } from '../services/api';
import type { IncidentSummary, Priority, KanbanWorkflowStatus } from '../types';
import { PriorityBadge, StatusBadge, ExposureBadge, KanbanStatusBadge } from '../components/ui/Badge';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { useUIStore } from '../store/uiStore';

// ─── Workflow Column Config ─────────────────────────────────────────────────────
// Columns represent HSE WORKFLOW STATUS, NOT risk level.
// Risk level (Priority) is displayed as a badge INSIDE each card.

const WORKFLOW_COLUMNS: KanbanWorkflowStatus[] = [
  'UNDER_ASSESSMENT',
  'ACTION_IN_PROGRESS',
  'PENDING_VERIFICATION',
  'CLOSED',
];

const WORKFLOW_COLUMN_CONFIG: Record<KanbanWorkflowStatus, {
  label: string;
  description: string;
  dotColor: string;
  headerBg: string;
  headerText: string;
  badge: string;
  cardBorderColor: string;
  emptyText: string;
  icon: React.ElementType;
}> = {
  UNDER_ASSESSMENT: {
    label: 'Under Assessment',
    description: 'HSE is investigating, evaluating risk and cause',
    dotColor: '#4F46E5',
    headerBg: '#EEF2FF',
    headerText: '#3730A3',
    badge: 'bg-indigo-600 text-white',
    cardBorderColor: 'border-l-indigo-400',
    emptyText: 'No incidents under assessment',
    icon: ClipboardList,
  },
  ACTION_IN_PROGRESS: {
    label: 'Action in Progress',
    description: 'Corrective actions identified and being implemented',
    dotColor: '#D97706',
    headerBg: '#FFFBEB',
    headerText: '#92400E',
    badge: 'bg-amber-500 text-white',
    cardBorderColor: 'border-l-amber-400',
    emptyText: 'No actions currently in progress',
    icon: Loader2,
  },
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    description: 'Actions completed — HSE verifying effectiveness',
    dotColor: '#7C3AED',
    headerBg: '#F5F3FF',
    headerText: '#5B21B6',
    badge: 'bg-purple-600 text-white',
    cardBorderColor: 'border-l-purple-400',
    emptyText: 'No incidents pending verification',
    icon: GitBranch,
  },
  CLOSED: {
    label: 'Closed',
    description: 'HSE verified and formally closed',
    dotColor: '#16A34A',
    headerBg: '#F0FDF4',
    headerText: '#14532D',
    badge: 'bg-green-600 text-white',
    cardBorderColor: 'border-l-green-400',
    emptyText: 'No closed incidents',
    icon: CheckCheck,
  },
};

// ─── Kanban Incident Card ───────────────────────────────────────────────────────

interface IncidentCardProps {
  incident: IncidentSummary;
  isDragging?: boolean;
  onClick: (id: string) => void;
}

function IncidentCard({ incident, onClick }: IncidentCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: incident.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const colCfg = WORKFLOW_COLUMN_CONFIG[incident.kanban_status as KanbanWorkflowStatus] ?? WORKFLOW_COLUMN_CONFIG.UNDER_ASSESSMENT;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onClick(incident.id); }}
      className={`bg-white border border-slate-200/80 border-l-4 ${colCfg.cardBorderColor} rounded-xl p-3.5 mb-2 cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.07)] hover:border-slate-300 transition-all select-none group`}
    >
      {/* Top row: ID + RISK badge (Priority = risk level) */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-slate-400 font-medium">{incident.id}</span>
        <PriorityBadge priority={incident.priority} size="xs" />
      </div>

      {/* Title */}
      <div className="text-[12px] font-semibold text-slate-800 leading-snug mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {incident.title}
      </div>

      {/* Status pills row: incident status + SIF flag */}
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <StatusBadge status={incident.status} size="xs" />
        {incident.sif_potential && (
          <span className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg font-semibold tracking-tight">
            SIF PRECURSOR
          </span>
        )}
        {incident.exposure_status && (
          <ExposureBadge status={incident.exposure_status} size="xs" />
        )}
      </div>

      {/* Site & Hazard */}
      <div className="space-y-1 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="font-semibold text-slate-600 min-w-[30px]">Asset:</span>
          <span className="truncate font-medium">{incident.site_name || '—'}</span>
        </div>
        {incident.hazard && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="font-semibold text-slate-600 min-w-[30px]">Hazard:</span>
            <span className="truncate">{incident.hazard}</span>
          </div>
        )}
        {/* SIF Score */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-slate-400">{incident.primary_lsr || incident.barrier_status || ''}</span>
          {incident.sif_score != null && (
            <div className="flex items-center gap-0.5">
              <ArrowUpRight className="w-2.5 h-2.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-700">{incident.sif_score.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drag Overlay Card ──────────────────────────────────────────────────────────

function StaticIncidentCard({ incident }: { incident: IncidentSummary }) {
  return (
    <div className="bg-white border border-blue-300 rounded-xl p-3.5 shadow-xl cursor-grabbing w-64 rotate-2 opacity-95">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-slate-400">{incident.id.slice(0, 12)}</span>
        <PriorityBadge priority={incident.priority} size="xs" />
      </div>
      <div className="text-[12px] font-semibold text-slate-800 leading-snug line-clamp-2">
        {incident.title}
      </div>
      {incident.kanban_status && (
        <div className="mt-2">
          <KanbanStatusBadge status={incident.kanban_status} size="xs" />
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ──────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: KanbanWorkflowStatus;
  incidents: IncidentSummary[];
  onClickIncident: (id: string) => void;
}

function KanbanColumn({ status, incidents, onClickIncident }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });
  const cfg = WORKFLOW_COLUMN_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-2xl border border-slate-200/80 overflow-hidden bg-[#FAFAFA]"
      style={{ minWidth: 260, maxWidth: 320, flex: '1 1 260px' }}
    >
      {/* Column header */}
      <div
        className="flex flex-col px-4 py-3 border-b border-slate-100"
        style={{ background: cfg.headerBg }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.headerText }}>
              {cfg.label}
            </span>
          </div>
          <span className={`text-[11px] font-bold rounded-lg px-2.5 py-0.5 ${cfg.badge}`}>
            {incidents.length}
          </span>
        </div>
        <p className="text-[10px] mt-1 pl-4" style={{ color: cfg.headerText, opacity: 0.7 }}>
          {cfg.description}
        </p>
      </div>

      {/* Cards */}
      <SortableContext items={incidents.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          className="flex-1 overflow-y-auto p-3"
          style={{ maxHeight: 'calc(100vh - 280px)', minHeight: 120 }}
        >
          {incidents.length === 0 ? (
            <div className="text-[11px] text-slate-400 text-center py-8 bg-white/60 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
              <Icon className="w-5 h-5 opacity-30" />
              {cfg.emptyText}
            </div>
          ) : (
            incidents.map((inc) => (
              <IncidentCard
                key={inc.id}
                incident={inc}
                onClick={onClickIncident}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── List View with "Move to Kanban" Action ─────────────────────────────────────

interface ListViewProps {
  incidents: IncidentSummary[];
  onClickIncident: (id: string) => void;
  onMoveToKanban: (incident: IncidentSummary) => void;
  movingIds: Set<string>;
}

function ListView({ incidents, onClickIncident, onMoveToKanban, movingIds }: ListViewProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">ID</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">Incident</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">Risk Level</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">Workflow</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">Site / Asset</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">Hazard</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">SIF Score</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">Exposure</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">Date</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">Action</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc, i) => {
            const isOnKanban = !!inc.kanban_status;
            const isMoving = movingIds.has(inc.id);

            return (
              <tr
                key={inc.id}
                className={`border-b border-slate-50 hover:bg-blue-50/50 cursor-pointer transition-colors last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                onClick={() => onClickIncident(inc.id)}
              >
                <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{inc.id}</td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 truncate hover:text-blue-600 transition-colors">{inc.title}</span>
                    {inc.sif_potential && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-lg font-bold shrink-0">SIF</span>
                    )}
                  </div>
                  {inc.department && <div className="text-[10px] text-slate-400 mt-0.5">{inc.department}</div>}
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={inc.priority} size="xs" /></td>
                <td className="px-4 py-3"><StatusBadge status={inc.status} size="xs" /></td>
                <td className="px-4 py-3">
                  {isOnKanban ? (
                    <KanbanStatusBadge status={inc.kanban_status!} size="xs" />
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Not on Kanban</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-[11px]">{inc.site_name}</td>
                <td className="px-4 py-3 text-slate-500 max-w-32 truncate text-[11px]">{inc.hazard}</td>
                <td className="px-4 py-3 font-bold text-slate-800 text-[12px]">{inc.sif_score?.toFixed(1) ?? '—'}</td>
                <td className="px-4 py-3"><ExposureBadge status={inc.exposure_status} size="xs" /></td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-[10px]">{inc.report_date?.slice(0, 10)}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  {isOnKanban ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                      <CheckCheck className="w-3 h-3" />
                      On Kanban
                    </span>
                  ) : (
                    <button
                      onClick={() => onMoveToKanban(inc)}
                      disabled={isMoving}
                      title="Move this incident to the HSE Kanban workflow"
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-lg px-2.5 py-1.5 transition-all border ${
                        isMoving
                          ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 cursor-pointer'
                      }`}
                    >
                      {isMoving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <GitBranch className="w-3 h-3" />
                      )}
                      {isMoving ? 'Moving…' : 'Move to Kanban'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {incidents.length === 0 && (
        <EmptyState title="No incidents found" description="Try adjusting your filters" />
      )}
    </div>
  );
}

// ─── Filter Pill Component ──────────────────────────────────────────────────────

interface FilterPillProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

function FilterPill({ label, value, options, onChange }: FilterPillProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-1.5 text-[12px] font-medium border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 cursor-pointer hover:border-slate-300 transition-colors shadow-sm"
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
    </div>
  );
}

// ─── Kanban Column Counts Summary ───────────────────────────────────────────────

function WorkflowSummaryBar({ grouped }: { grouped: Record<KanbanWorkflowStatus, IncidentSummary[]> }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {WORKFLOW_COLUMNS.map((col) => {
        const cfg = WORKFLOW_COLUMN_CONFIG[col];
        const count = grouped[col].length;
        return (
          <div
            key={col}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold"
            style={{ background: cfg.headerBg, color: cfg.headerText, borderColor: `${cfg.dotColor}30` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
            {cfg.label}
            <span className="font-bold">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Board ─────────────────────────────────────────────────────────────────

export function IncidentBoard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [priority, setPriority] = useState<Priority | ''>((searchParams.get('priority') as Priority) ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [site, setSite] = useState(searchParams.get('site_name') ?? '');
  const [sifOnly, setSifOnly] = useState(searchParams.get('sif_only') === 'true');
  const [activeId, setActiveId] = useState<string | null>(null);

  // Optimistic local kanban status map: incidentId -> KanbanWorkflowStatus
  const [localKanbanMap, setLocalKanbanMap] = useState<Record<string, KanbanWorkflowStatus>>({});
  // Tracks which IDs are currently being moved to Kanban (for loading state)
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['incidents', search, priority, status, site, sifOnly],
    queryFn: () =>
      fetchIncidents({
        page: 1,
        page_size: 200,
        search,
        priority,
        status: status as never,
        site_name: site,
        sif_only: sifOnly,
      }),
    staleTime: 30000,
  });

  // Mutation: update kanban_status on drag-and-drop
  const kanbanStatusMutation = useMutation({
    mutationFn: ({ id, kanban_status }: { id: string; kanban_status: KanbanWorkflowStatus }) =>
      updateKanbanStatus(id, kanban_status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (_err, { id }) => {
      // Roll back optimistic update
      setLocalKanbanMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      addToast('Failed to update workflow status. Please try again.', 'error');
    },
  });

  // Mutation: move incident to Kanban from List view
  const moveToKanbanMutation = useMutation({
    mutationFn: (id: string) => moveToKanban(id),
    onSuccess: (_data, id) => {
      setMovingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      addToast('Incident moved to Kanban — Under Assessment', 'success');
    },
    onError: (_err, id) => {
      setMovingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      addToast('Failed to move incident to Kanban. Please try again.', 'error');
    },
  });

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (priority) params['priority'] = priority;
    if (status) params['status'] = status;
    if (site) params['site_name'] = site;
    if (sifOnly) params['sif_only'] = 'true';
    setSearchParams(params, { replace: true });
  }, [search, priority, status, site, sifOnly, setSearchParams]);

  const incidents = data?.items ?? [];

  // Apply local optimistic kanban_status overrides
  const effectiveIncidents = incidents.map((inc) => ({
    ...inc,
    kanban_status: localKanbanMap[inc.id] ?? inc.kanban_status ?? null,
  }));

  // Group incidents by kanban_status for the Kanban board view
  // Only incidents that have been explicitly moved to Kanban appear on the board
  const grouped: Record<KanbanWorkflowStatus, IncidentSummary[]> = {
    UNDER_ASSESSMENT: [],
    ACTION_IN_PROGRESS: [],
    PENDING_VERIFICATION: [],
    CLOSED: [],
  };
  effectiveIncidents.forEach((inc) => {
    const ks = inc.kanban_status as KanbanWorkflowStatus;
    if (ks && grouped[ks]) {
      grouped[ks].push(inc as IncidentSummary);
    }
  });

  const totalKanbanCount = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
  const activeIncident = activeId ? effectiveIncidents.find((i) => i.id === activeId) : null;

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = e;
      if (!over) return;

      const draggedId = String(active.id);
      const draggedIncident = effectiveIncidents.find((i) => i.id === draggedId);
      if (!draggedIncident) return;

      const overId = String(over.id);

      // Determine the target column:
      // If dropped onto another card, resolve that card's column.
      // If dropped directly onto a column droppable, overId IS the column status.
      const overIncident = effectiveIncidents.find((i) => i.id === overId);
      let newStatus: KanbanWorkflowStatus;

      if (overIncident?.kanban_status && WORKFLOW_COLUMNS.includes(overIncident.kanban_status as KanbanWorkflowStatus)) {
        newStatus = overIncident.kanban_status as KanbanWorkflowStatus;
      } else if (WORKFLOW_COLUMNS.includes(overId as KanbanWorkflowStatus)) {
        newStatus = overId as KanbanWorkflowStatus;
      } else {
        return; // Invalid drop target
      }

      const currentStatus = draggedIncident.kanban_status as KanbanWorkflowStatus;
      if (currentStatus === newStatus) return; // No change

      // Optimistic update
      setLocalKanbanMap((prev) => ({ ...prev, [draggedId]: newStatus }));
      kanbanStatusMutation.mutate({ id: draggedId, kanban_status: newStatus });
    },
    [effectiveIncidents, kanbanStatusMutation]
  );

  const handleClickIncident = useCallback(
    (id: string) => navigate(`/incidents/${id}`),
    [navigate]
  );

  const handleMoveToKanban = useCallback(
    (incident: IncidentSummary) => {
      if (incident.kanban_status) {
        addToast(`${incident.id} is already on the Kanban board (${WORKFLOW_COLUMN_CONFIG[incident.kanban_status as KanbanWorkflowStatus]?.label ?? incident.kanban_status})`, 'info');
        return;
      }
      setMovingIds((prev) => new Set(prev).add(incident.id));
      moveToKanbanMutation.mutate(incident.id);
    },
    [moveToKanbanMutation, addToast]
  );

  const clearFilters = () => {
    setSearch('');
    setPriority('');
    setStatus('');
    setSite('');
    setSifOnly(false);
  };

  const hasFilters = search || priority || status || site || sifOnly;

  if (isLoading) return <LoadingPage />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col h-full bg-[#F4F5F9]">
      {/* ─── Page Header ───────────────────────────────────────────────────── */}
      <div className="px-7 pt-7 pb-5 bg-[#F4F5F9] flex-shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Incident Board</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track safety performance, SIF precursors, and active barrier integrity
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Export */}
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200/90 rounded-2xl text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Report
            </button>
          </div>
        </div>

        {/* Workflow status summary bar — only in Kanban view */}
        {viewMode === 'kanban' && totalKanbanCount > 0 && (
          <div className="mb-4">
            <WorkflowSummaryBar grouped={grouped} />
          </div>
        )}

        {/* ─── Filter Toolbar ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold transition-all ${viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search wells, rigs, hazards, sites..."
              className="pl-9 pr-3.5 py-2 text-[12px] border border-slate-200 rounded-xl bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 w-56 shadow-sm placeholder-slate-400 text-slate-700 transition-colors"
            />
          </div>

          {/* Risk level / Priority filter — independent from workflow status */}
          <FilterPill
            label="All Risk Levels"
            value={priority}
            onChange={(v) => setPriority(v as Priority | '')}
            options={[
              { label: 'Critical Risk', value: 'CRITICAL' },
              { label: 'High Risk', value: 'HIGH' },
              { label: 'Medium Risk', value: 'MEDIUM' },
              { label: 'Low Risk', value: 'LOW' },
            ]}
          />

          {/* Incident status filter (old workflow status, independent from Kanban) */}
          <FilterPill
            label="All Statuses"
            value={status}
            onChange={setStatus}
            options={[
              { label: 'Open', value: 'OPEN' },
              { label: 'Under Review', value: 'UNDER_REVIEW' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Escalated', value: 'ESCALATED' },
              { label: 'Closed', value: 'CLOSED' },
            ]}
          />

          {/* Site filter pill */}
          <div className="relative">
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-[12px] font-medium border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer shadow-sm"
            >
              <option value="">Site: All IOCL Assets</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          {/* SIF precursor only toggle */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              onClick={() => setSifOnly((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-all ${sifOnly ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sifOnly ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-[12px] font-semibold text-slate-600 group-hover:text-slate-800">SIF Precursor Only</span>
          </label>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-red-500 px-2.5 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          {/* Active count pill */}
          <div className="ml-auto flex items-center gap-3">
            {viewMode === 'kanban' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-700">●</span>
                <span className="text-[12px] font-semibold text-indigo-700">{totalKanbanCount} in Workflow</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
              <span className="text-[11px] font-bold text-blue-700">●</span>
              <span className="text-[12px] font-semibold text-blue-700">{effectiveIncidents.length} Total Incidents</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-7 pb-7">
        {viewMode === 'list' ? (
          <ListView
            incidents={effectiveIncidents as IncidentSummary[]}
            onClickIncident={handleClickIncident}
            onMoveToKanban={handleMoveToKanban}
            movingIds={movingIds}
          />
        ) : (
          <>
            {/* Kanban board hint when empty */}
            {totalKanbanCount === 0 && (
              <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3">
                <GitBranch className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-indigo-800">No incidents in the HSE workflow yet</p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    Switch to <strong>List view</strong> and click <strong>"Move to Kanban"</strong> on any incident to begin the HSE assessment workflow.
                  </p>
                </div>
              </div>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 h-full">
                {WORKFLOW_COLUMNS.map((col) => (
                  <KanbanColumn
                    key={col}
                    status={col}
                    incidents={grouped[col]}
                    onClickIncident={handleClickIncident}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeIncident && <StaticIncidentCard incident={activeIncident as IncidentSummary} />}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </div>
    </div>
  );
}
