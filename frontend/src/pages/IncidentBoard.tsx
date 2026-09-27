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
import { ErrorState, EmptyState } from '../components/ui/Toast';
import { useUIStore } from '../store/uiStore';

// ─── Workflow Column Config ────────────────────────────────────────────────────

const WORKFLOW_COLUMNS: KanbanWorkflowStatus[] = [
  'UNDER_ASSESSMENT',
  'ACTION_IN_PROGRESS',
  'PENDING_VERIFICATION',
  'CLOSED',
];

const WORKFLOW_COLUMN_CONFIG: Record<
  KanbanWorkflowStatus,
  {
    label: string;
    description: string;
    dotColor: string;
    headerBg: string;
    headerText: string;
    emptyText: string;
    icon: React.ElementType;
    cardBorder: string;
  }
> = {
  UNDER_ASSESSMENT: {
    label: 'Under Assessment',
    description: 'Investigating — evaluating risk and cause',
    dotColor: 'var(--color-info)',
    headerBg: 'var(--color-info-bg)',
    headerText: 'var(--color-info)',
    emptyText: 'No incidents under assessment',
    icon: ClipboardList,
    cardBorder: 'border-l-[var(--color-info)]',
  },
  ACTION_IN_PROGRESS: {
    label: 'Action in Progress',
    description: 'Corrective actions being implemented',
    dotColor: 'var(--color-high)',
    headerBg: 'var(--color-high-bg)',
    headerText: 'var(--color-high)',
    emptyText: 'No actions in progress',
    icon: Loader2,
    cardBorder: 'border-l-[var(--color-high)]',
  },
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    description: 'Actions complete — verifying effectiveness',
    dotColor: 'var(--color-medium)',
    headerBg: 'var(--color-medium-bg)',
    headerText: 'var(--color-medium)',
    emptyText: 'No incidents pending verification',
    icon: GitBranch,
    cardBorder: 'border-l-[var(--color-medium)]',
  },
  CLOSED: {
    label: 'Closed',
    description: 'HSE verified and formally closed',
    dotColor: 'var(--color-low)',
    headerBg: 'var(--color-low-bg)',
    headerText: 'var(--color-low)',
    emptyText: 'No closed incidents',
    icon: CheckCheck,
    cardBorder: 'border-l-[var(--color-low)]',
  },
};

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function IncidentCard({ incident, onClick }: { incident: IncidentSummary; onClick: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: incident.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onClick(incident.id); }}
      className="bg-white border border-[var(--color-border)] border-l-4 border-l-[var(--color-info)] rounded-xl p-3.5 mb-2 cursor-pointer hover:border-[var(--color-border-strong)] hover:shadow-sm transition-all select-none group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
          {incident.id.slice(0, 12)}
        </span>
        <PriorityBadge priority={incident.priority} size="xs" />
      </div>

      <div className="text-[12px] font-semibold text-[var(--color-text-primary)] leading-snug mb-2 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
        {incident.title}
      </div>

      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <StatusBadge status={incident.status} size="xs" />
        {incident.sif_potential && (
          <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-critical-bg)] text-[var(--color-critical)] border border-[var(--color-critical-border)] rounded font-semibold">
            SIF
          </span>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--color-border)] space-y-1">
        <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text-tertiary)] w-8">Site</span>
          <span className="truncate">{incident.site_name || '—'}</span>
        </div>
        {incident.sif_score != null && (
          <div className="flex items-center justify-end">
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
              {incident.sif_score.toFixed(1)} SIF
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Drag Overlay Card ─────────────────────────────────────────────────────────

function StaticIncidentCard({ incident }: { incident: IncidentSummary }) {
  return (
    <div className="bg-white border border-[var(--color-border-strong)] rounded-xl p-3.5 shadow-xl cursor-grabbing w-60 rotate-1 opacity-95">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
          {incident.id.slice(0, 12)}
        </span>
        <PriorityBadge priority={incident.priority} size="xs" />
      </div>
      <div className="text-[12px] font-semibold text-[var(--color-text-primary)] line-clamp-2">
        {incident.title}
      </div>
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  incidents,
  onClickIncident,
}: {
  status: KanbanWorkflowStatus;
  incidents: IncidentSummary[];
  onClickIncident: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: status });
  const cfg = WORKFLOW_COLUMN_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]"
      style={{ minWidth: 256, maxWidth: 300, flex: '1 1 256px' }}
    >
      {/* Column header */}
      <div
        className="px-4 py-3 border-b border-[var(--color-border)]"
        style={{ background: cfg.headerBg }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cfg.headerText }}>
              {cfg.label}
            </span>
          </div>
          <span
            className="text-[11px] font-bold rounded-lg px-2 py-0.5 text-white"
            style={{ backgroundColor: cfg.dotColor }}
          >
            {incidents.length}
          </span>
        </div>
        <p className="text-[10px] mt-1 ml-4" style={{ color: cfg.headerText, opacity: 0.7 }}>
          {cfg.description}
        </p>
      </div>

      {/* Cards */}
      <SortableContext items={incidents.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          className="flex-1 overflow-y-auto p-3"
          style={{ maxHeight: 'calc(100vh - 280px)', minHeight: 100 }}
        >
          {incidents.length === 0 ? (
            <div className="text-[11px] text-[var(--color-text-tertiary)] text-center py-8 bg-white/50 rounded-xl border border-dashed border-[var(--color-border)] flex flex-col items-center gap-2">
              <Icon className="w-5 h-5 opacity-30" />
              {cfg.emptyText}
            </div>
          ) : (
            incidents.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} onClick={onClickIncident} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-1.5 text-[12px] font-medium border border-[var(--color-border)] rounded-lg bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer hover:border-[var(--color-border-strong)] transition-colors"
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-tertiary)] pointer-events-none" />
    </div>
  );
}

// ─── List View ─────────────────────────────────────────────────────────────────

function ListView({
  incidents,
  onClickIncident,
  onMoveToKanban,
  movingIds,
}: {
  incidents: IncidentSummary[];
  onClickIncident: (id: string) => void;
  onMoveToKanban: (incident: IncidentSummary) => void;
  movingIds: Set<string>;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            {['ID', 'Incident', 'Risk', 'Status', 'Workflow', 'Site', 'SIF Score', 'Date', 'Action'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[10.5px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc, i) => {
            const isOnKanban = !!inc.kanban_status;
            const isMoving = movingIds.has(inc.id);
            return (
              <tr
                key={inc.id}
                onClick={() => onClickIncident(inc.id)}
                className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors last:border-0 ${i % 2 !== 0 ? 'bg-[var(--color-surface)]/40' : ''}`}
              >
                <td className="px-4 py-3 font-mono text-[10px] text-[var(--color-text-tertiary)]">
                  {inc.id.slice(0, 10)}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[var(--color-text-primary)] truncate">{inc.title}</span>
                    {inc.sif_potential && (
                      <span className="text-[9px] px-1 py-0.5 bg-[var(--color-critical-bg)] text-[var(--color-critical)] rounded font-bold shrink-0">
                        SIF
                      </span>
                    )}
                  </div>
                  {inc.department && (
                    <div className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">{inc.department}</div>
                  )}
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={inc.priority} size="xs" /></td>
                <td className="px-4 py-3"><StatusBadge status={inc.status} size="xs" /></td>
                <td className="px-4 py-3">
                  {isOnKanban ? (
                    <KanbanStatusBadge status={inc.kanban_status!} size="xs" />
                  ) : (
                    <span className="text-[10px] text-[var(--color-text-tertiary)] italic">Not on Kanban</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)] text-[11px]">{inc.site_name}</td>
                <td className="px-4 py-3 font-bold text-[var(--color-text-primary)]">
                  {inc.sif_score?.toFixed(1) ?? '—'}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-tertiary)] whitespace-nowrap text-[10.5px]">
                  {inc.report_date?.slice(0, 10)}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  {isOnKanban ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-low)] bg-[var(--color-low-bg)] border border-[var(--color-low-border)] rounded-lg px-2 py-1">
                      <CheckCheck className="w-3 h-3" /> On Kanban
                    </span>
                  ) : (
                    <button
                      onClick={() => onMoveToKanban(inc)}
                      disabled={isMoving}
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-lg px-2.5 py-1.5 border transition-all ${
                        isMoving
                          ? 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)] border-[var(--color-border)] cursor-not-allowed'
                          : 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)] hover:bg-[var(--color-info-bg)] cursor-pointer'
                      }`}
                    >
                      {isMoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitBranch className="w-3 h-3" />}
                      {isMoving ? 'Moving…' : 'To Kanban'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {incidents.length === 0 && (
        <EmptyState
          title="No incidents found"
          description="Try adjusting your filters or search query"
        />
      )}
    </div>
  );
}

// ─── Workflow Summary Bar ──────────────────────────────────────────────────────

function WorkflowSummaryBar({ grouped }: { grouped: Record<KanbanWorkflowStatus, IncidentSummary[]> }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {WORKFLOW_COLUMNS.map((col) => {
        const cfg = WORKFLOW_COLUMN_CONFIG[col];
        const count = grouped[col].length;
        return (
          <div
            key={col}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border"
            style={{ background: cfg.headerBg, color: cfg.headerText, borderColor: cfg.dotColor + '30' }}
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

// ─── Main Board ────────────────────────────────────────────────────────────────

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
  const [localKanbanMap, setLocalKanbanMap] = useState<Record<string, KanbanWorkflowStatus>>({});
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['incidents', search, priority, status, site, sifOnly],
    queryFn: () => fetchIncidents({
      page: 1, page_size: 200, search, priority,
      status: status as never, site_name: site, sif_only: sifOnly,
    }),
    staleTime: 30000,
  });

  const kanbanStatusMutation = useMutation({
    mutationFn: ({ id, kanban_status }: { id: string; kanban_status: KanbanWorkflowStatus }) =>
      updateKanbanStatus(id, kanban_status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] }),
    onError: (_err, { id }) => {
      setLocalKanbanMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
      addToast('Failed to update workflow status. Please try again.', 'error');
    },
  });

  const moveToKanbanMutation = useMutation({
    mutationFn: (id: string) => moveToKanban(id),
    onSuccess: (_data, id) => {
      setMovingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      addToast('Incident moved to Kanban — Under Assessment', 'success');
    },
    onError: (_err, id) => {
      setMovingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      addToast('Failed to move incident to Kanban.', 'error');
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
  const effectiveIncidents = incidents.map((inc) => ({
    ...inc,
    kanban_status: localKanbanMap[inc.id] ?? inc.kanban_status ?? null,
  }));

  const grouped: Record<KanbanWorkflowStatus, IncidentSummary[]> = {
    UNDER_ASSESSMENT: [],
    ACTION_IN_PROGRESS: [],
    PENDING_VERIFICATION: [],
    CLOSED: [],
  };
  effectiveIncidents.forEach((inc) => {
    const ks = inc.kanban_status as KanbanWorkflowStatus;
    if (ks && grouped[ks]) grouped[ks].push(inc as IncidentSummary);
  });

  const totalKanbanCount = Object.values(grouped).reduce((s, a) => s + a.length, 0);
  const activeIncident = activeId ? effectiveIncidents.find((i) => i.id === activeId) : null;

  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(String(e.active.id)), []);
  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const draggedId = String(active.id);
    const draggedIncident = effectiveIncidents.find((i) => i.id === draggedId);
    if (!draggedIncident) return;
    const overId = String(over.id);
    const overIncident = effectiveIncidents.find((i) => i.id === overId);
    let newStatus: KanbanWorkflowStatus;
    if (overIncident?.kanban_status && WORKFLOW_COLUMNS.includes(overIncident.kanban_status as KanbanWorkflowStatus)) {
      newStatus = overIncident.kanban_status as KanbanWorkflowStatus;
    } else if (WORKFLOW_COLUMNS.includes(overId as KanbanWorkflowStatus)) {
      newStatus = overId as KanbanWorkflowStatus;
    } else {
      return;
    }
    const currentStatus = draggedIncident.kanban_status as KanbanWorkflowStatus;
    if (currentStatus === newStatus) return;
    setLocalKanbanMap((prev) => ({ ...prev, [draggedId]: newStatus }));
    kanbanStatusMutation.mutate({ id: draggedId, kanban_status: newStatus });
  }, [effectiveIncidents, kanbanStatusMutation]);

  const handleClickIncident = useCallback((id: string) => navigate(`/incidents/${id}`), [navigate]);
  const handleMoveToKanban = useCallback((incident: IncidentSummary) => {
    if (incident.kanban_status) {
      addToast(`${incident.id.slice(0, 8)} is already on the Kanban board.`, 'info');
      return;
    }
    setMovingIds((prev) => new Set(prev).add(incident.id));
    moveToKanbanMutation.mutate(incident.id);
  }, [moveToKanbanMutation, addToast]);

  const clearFilters = () => {
    setSearch(''); setPriority(''); setStatus(''); setSite(''); setSifOnly(false);
  };
  const hasFilters = search || priority || status || site || sifOnly;

  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-surface)' }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="px-7 pt-7 pb-5 flex-shrink-0 border-b border-[var(--color-border)] bg-white">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight">
              Incident Board
            </h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
              {effectiveIncidents.length} incidents · {totalKanbanCount} in workflow
            </p>
          </div>
        </div>

        {viewMode === 'kanban' && totalKanbanCount > 0 && (
          <div className="mb-4">
            <WorkflowSummaryBar grouped={grouped} />
          </div>
        )}

        {/* Filter toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
            {(['kanban', 'list'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[11.5px] font-semibold transition-all ${
                  viewMode === mode
                    ? 'bg-[var(--color-text-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {mode === 'kanban' ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                {mode === 'kanban' ? 'Kanban' : 'List'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incidents…"
              className="pl-9 pr-3.5 py-2 text-[12px] border border-[var(--color-border)] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] w-52 placeholder-[var(--color-text-tertiary)] text-[var(--color-text-primary)] transition-colors"
            />
          </div>

          <FilterPill
            label="All Risk Levels"
            value={priority}
            onChange={(v) => setPriority(v as Priority | '')}
            options={[
              { label: 'Critical', value: 'CRITICAL' },
              { label: 'High', value: 'HIGH' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'Low', value: 'LOW' },
            ]}
          />

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

          {/* SIF toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setSifOnly((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-all ${sifOnly ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sifOnly ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">SIF Only</span>
          </label>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-critical)] px-2 py-1.5 rounded-lg hover:bg-[var(--color-critical-bg)] transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-7 py-5">
        {isLoading ? (
          viewMode === 'list' ? (
            <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden animate-skeleton">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    {['ID', 'Incident', 'Risk', 'Status', 'Workflow', 'Site', 'SIF Score', 'Date', 'Action'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10.5px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <tr key={i} className="border-b border-[var(--color-border)]">
                      <td className="px-4 py-3"><div className="h-3 w-16 bg-[var(--color-border)] rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-48 bg-[var(--color-border)] rounded mb-1" /><div className="h-3 w-24 bg-[var(--color-surface-strong)] rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 bg-[var(--color-border)] rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 bg-[var(--color-border)] rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 bg-[var(--color-surface-strong)] rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-24 bg-[var(--color-border)] rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-8 bg-[var(--color-border)] rounded" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-16 bg-[var(--color-border)] rounded" /></td>
                      <td className="px-4 py-3"><div className="h-6 w-20 bg-[var(--color-surface-strong)] rounded-lg" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex gap-4 h-full animate-skeleton">
              {[1, 2, 3, 4].map((col) => (
                <div key={col} className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" style={{ minWidth: 256, maxWidth: 300, flex: '1 1 256px' }}>
                  <div className="px-4 py-3 border-b border-[var(--color-border)] h-[58px] bg-white/50" />
                  <div className="flex-1 p-3 space-y-2">
                    {[1, 2, 3].map((card) => (
                      <div key={card} className="bg-white border border-[var(--color-border)] rounded-xl p-3.5 h-[116px]" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : viewMode === 'list' ? (
          <ListView
            incidents={effectiveIncidents as IncidentSummary[]}
            onClickIncident={handleClickIncident}
            onMoveToKanban={handleMoveToKanban}
            movingIds={movingIds}
          />
        ) : (
          <>
            {totalKanbanCount === 0 && (
              <div className="mb-4 p-4 bg-[var(--color-info-bg)] border border-[var(--color-info-border)] rounded-xl flex items-start gap-3">
                <GitBranch className="w-4 h-4 text-[var(--color-info)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-[var(--color-info)]">No incidents in the HSE workflow yet</p>
                  <p className="text-[12px] text-[var(--color-info)] opacity-80 mt-0.5">
                    Switch to <strong>List view</strong> and click <strong>"To Kanban"</strong> on any incident to begin assessment.
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
