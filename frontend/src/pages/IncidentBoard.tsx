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
import { LayoutGrid, List, Search, Filter, X } from 'lucide-react';
import { fetchIncidents, updateIncident } from '../services/api';
import type { IncidentSummary, Priority } from '../types';
import { PriorityBadge, StatusBadge, ExposureBadge } from '../components/ui/Badge';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

const PRIORITY_COLUMNS: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const COLUMN_COLORS: Record<Priority, string> = {
 CRITICAL: '#DC2626',
 HIGH: '#EA580C',
 MEDIUM: '#D97706',
 LOW: '#16A34A',
};

const COLUMN_BG: Record<Priority, string> = {
 CRITICAL: '#FEF2F2',
 HIGH: '#FFF7ED',
 MEDIUM: '#FFFBEB',
 LOW: '#F0FDF4',
};

// ─── Sortable Incident Card ───────────────────────────────────────────────────

interface IncidentCardProps {
 incident: IncidentSummary;
 isDragging?: boolean;
 onClick: (id: string) => void;
}

function IncidentCard({ incident, isDragging, onClick }: IncidentCardProps) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
 id: incident.id,
 });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isSortableDragging ? 0.4 : 1,
 };

 return (
 <div
 ref={setNodeRef}
 style={style}
 {...attributes}
 {...listeners}
 className={`bg-canvas border border-hairline rounded-none p-2.5 mb-1.5 cursor-pointer hover:border-zinc-300 hover: transition-all select-none ${isDragging ? '' : ''}`}
 onClick={(e) => {
 e.stopPropagation();
 onClick(incident.id);
 }}
 >
 <div className="flex items-center justify-between mb-1">
 <span className="text-[10px] font-mono text-mute">{incident.id.slice(0, 8)}</span>
 <PriorityBadge priority={incident.priority} size="xs" />
 </div>
 <div className="text-[11px] font-semibold text-ink leading-tight mb-1.5 line-clamp-2">
 {incident.title}
 </div>
 <div className="flex items-center gap-1 mb-1.5 flex-wrap">
 <StatusBadge status={incident.status} size="xs" />
 {incident.sif_potential && (
 <span className="text-[10px] px-1.5 py-0 bg-red-50 text-red-600 border border-red-200 rounded font-semibold">SIF</span>
 )}
 </div>
 <div className="space-y-0.5">
 <div className="flex items-center gap-1 text-[10px] text-mute">
 <span className="text-mute">Site:</span>
 <span className="truncate">{incident.site_name}</span>
 </div>
 {incident.hazard && (
 <div className="flex items-center gap-1 text-[10px] text-mute">
 <span className="text-mute">Hazard:</span>
 <span className="truncate">{incident.hazard}</span>
 </div>
 )}
 <div className="flex items-center justify-between mt-1.5">
 <ExposureBadge status={incident.exposure_status} size="xs" />
 <span className="text-[10px] font-mono font-semibold text-gray-700">
 {incident.sif_score?.toFixed(1) ?? '—'}
 </span>
 </div>
 </div>
 </div>
 );
}

// ─── Static card (for DragOverlay) ───────────────────────────────────────────

function StaticIncidentCard({ incident }: { incident: IncidentSummary }) {
 return (
 <div className="bg-canvas border border-zinc-300 rounded-none p-2.5 -xl cursor-grabbing w-52">
 <div className="flex items-center justify-between mb-1">
 <span className="text-[10px] font-mono text-mute">{incident.id.slice(0, 8)}</span>
 <PriorityBadge priority={incident.priority} size="xs" />
 </div>
 <div className="text-[11px] font-semibold text-ink leading-tight line-clamp-2">
 {incident.title}
 </div>
 </div>
 );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
 priority: Priority;
 incidents: IncidentSummary[];
 onClickIncident: (id: string) => void;
}

function KanbanColumn({ priority, incidents, onClickIncident }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: priority,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col bg-soft-cloud border border-hairline rounded-none overflow-hidden"
      style={{ minWidth: 220, maxWidth: 260, flex: '1 1 220px' }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2 bg-canvas border-b border-hairline">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">{priority}</span>
        </div>
        <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-ink text-canvas">
          {incidents.length}
        </span>
      </div>

 {/* Droppable area */}
 <SortableContext items={incidents.map((i) => i.id)} strategy={verticalListSortingStrategy}>
 <div
 className="flex-1 overflow-y-auto p-2"
 style={{
 background: COLUMN_BG[priority],
 maxHeight: 'calc(100vh - 200px)',
 minHeight: 100,
 }}
 >
 {incidents.length === 0 ? (
 <div className="text-[10px] text-mute text-center py-6">No incidents</div>
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

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ incidents, onClickIncident }: { incidents: IncidentSummary[]; onClickIncident: (id: string) => void }) {
 return (
 <div className="bg-canvas border border-hairline rounded-none overflow-hidden">
 <table className="w-full text-xs">
 <thead>
 <tr className="border-b border-hairline bg-soft-cloud">
 <th className="px-3 py-2 text-left font-semibold text-mute text-[11px]">ID</th>
 <th className="px-3 py-2 text-left font-semibold text-mute text-[11px]">Title</th>
 <th className="px-3 py-2 text-left font-semibold text-mute text-[11px]">Priority</th>
 <th className="px-3 py-2 text-left font-semibold text-mute text-[11px]">Status</th>
 <th className="px-3 py-2 text-left font-semibold text-mute text-[11px]">Site</th>
 <th className="px-3 py-2 text-left font-semibold text-mute text-[11px]">Hazard</th>
 <th className="px-3 py-2 text-left font-semibold text-mute text-[11px]">SIF Score</th>
 <th className="px-3 py-2 text-left font-semibold text-mute text-[11px]">Exposure</th>
 <th className="px-3 py-2 text-left font-semibold text-mute text-[11px]">Date</th>
 </tr>
 </thead>
 <tbody>
 {incidents.map((inc) => (
 <tr
 key={inc.id}
 className="border-b border-hairline hover:bg-soft-cloud cursor-pointer transition-colors last:border-0"
 onClick={() => onClickIncident(inc.id)}
 >
 <td className="px-3 py-2 font-mono text-[10px] text-mute">{inc.id.slice(0, 8)}</td>
 <td className="px-3 py-2 max-w-xs">
 <div className="flex items-center gap-1">
 <span className="font-medium text-ink truncate">{inc.title}</span>
 {inc.sif_potential && (
 <span className="text-[10px] px-1.5 bg-red-100 text-red-600 rounded font-semibold shrink-0">SIF</span>
 )}
 </div>
 <div className="text-[10px] text-mute">{inc.department}</div>
 </td>
 <td className="px-3 py-2"><PriorityBadge priority={inc.priority} size="xs" /></td>
 <td className="px-3 py-2"><StatusBadge status={inc.status} size="xs" /></td>
 <td className="px-3 py-2 text-mute">{inc.site_name}</td>
 <td className="px-3 py-2 text-mute max-w-32 truncate">{inc.hazard}</td>
 <td className="px-3 py-2 font-mono font-semibold text-ink">{inc.sif_score?.toFixed(1) ?? '—'}</td>
 <td className="px-3 py-2"><ExposureBadge status={inc.exposure_status} size="xs" /></td>
 <td className="px-3 py-2 text-mute whitespace-nowrap">{inc.report_date?.slice(0, 10)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 {incidents.length === 0 && (
 <EmptyState title="No incidents found" description="Try adjusting your filters" />
 )}
 </div>
 );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function IncidentBoard() {
 const navigate = useNavigate();
 const [searchParams, setSearchParams] = useSearchParams();
 const queryClient = useQueryClient();

 const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
 const [search, setSearch] = useState(searchParams.get('search') ?? '');
 const [priority, setPriority] = useState<Priority | ''>(
 (searchParams.get('priority') as Priority) ?? ''
 );
 const [status, setStatus] = useState(searchParams.get('status') ?? '');
 const [site, setSite] = useState(searchParams.get('site_name') ?? '');
 const [sifOnly, setSifOnly] = useState(searchParams.get('sif_only') === 'true');
 const [activeId, setActiveId] = useState<string | null>(null);

 // Optimistic state for priority changes
 const [localPriorityMap, setLocalPriorityMap] = useState<Record<string, Priority>>({});

 const sensors = useSensors(
 useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
 );

 const { data, isLoading, isError, refetch } = useQuery({
 queryKey: ['incidents', search, priority, status, site, sifOnly],
 queryFn: () =>
 fetchIncidents({
 page: 1,
 page_size: 50,
 search,
 priority,
 status: status as never,
 site_name: site,
 sif_only: sifOnly,
 }),
 staleTime: 30000,
 });

 const updateMutation = useMutation({
 mutationFn: ({ id, newPriority }: { id: string; newPriority: Priority }) =>
 updateIncident(id, { priority: newPriority }),
   onSuccess: (_, { id, newPriority }) => {
    // Manually update the cache to prevent full refetch
    queryClient.setQueryData(['incidents', { page: 1, page_size: 50, search, priority, status, site_name, department }], (old: any) => {
      if (!old || !old.items) return old;
      return {
        ...old,
        items: old.items.map((i: any) => i.id === id ? { ...i, priority: newPriority } : i)
      };
    });
  },
 onError: (_err, { id }) => {
 // Rollback optimistic update
 setLocalPriorityMap((prev) => {
 const next = { ...prev };
 delete next[id];
 return next;
 });
 },
 });

 // Sync URL params
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

 // Merge local priority overrides
 const effectiveIncidents = incidents.map((inc) => ({
 ...inc,
 priority: localPriorityMap[inc.id] ?? inc.priority,
 }));

 // Group by priority for kanban
 const grouped: Record<Priority, IncidentSummary[]> = {
 CRITICAL: [],
 HIGH: [],
 MEDIUM: [],
 LOW: [],
 };
 effectiveIncidents.forEach((inc) => {
 const col = inc.priority as Priority;
 if (grouped[col]) grouped[col].push(inc);
 });

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

 // Check if dropped onto a column header or another card
 const overId = String(over.id);
 const overIncident = effectiveIncidents.find((i) => i.id === overId);
 const newPriority = (overIncident?.priority ?? overId) as Priority;

 if (!PRIORITY_COLUMNS.includes(newPriority)) return;
 if (draggedIncident.priority === newPriority) return;

 // Optimistic update
 setLocalPriorityMap((prev) => ({ ...prev, [draggedId]: newPriority }));
 updateMutation.mutate({ id: draggedId, newPriority });
 },
 [effectiveIncidents, updateMutation]
 );

 const handleClickIncident = useCallback(
 (id: string) => navigate(`/incidents/${id}`),
 [navigate]
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
 <div className="flex flex-col h-full">
 {/* Toolbar */}
 <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline bg-canvas">
 <div className="flex items-center gap-1 border border-hairline rounded overflow-hidden">
 <button
 onClick={() => setViewMode('kanban')}
 className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'kanban' ? 'bg-ink text-canvas' : 'text-mute hover:bg-soft-cloud'}`}
 >
 <LayoutGrid className="w-3.5 h-3.5" />
 Kanban
 </button>
 <button
 onClick={() => setViewMode('list')}
 className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'list' ? 'bg-ink text-canvas' : 'text-mute hover:bg-soft-cloud'}`}
 >
 <List className="w-3.5 h-3.5" />
 List
 </button>
 </div>

 <div className="h-4 w-px bg-gray-200" />

 <div className="relative">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-mute" />
 <input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search..."
 className="pl-7 pr-3 py-1.5 text-xs border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink w-48"
 />
 </div>

 <select
 value={priority}
 onChange={(e) => setPriority(e.target.value as Priority | '')}
 className="px-2 py-1.5 text-xs border border-hairline rounded bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
 >
 <option value="">All Priorities</option>
 <option value="CRITICAL">Critical</option>
 <option value="HIGH">High</option>
 <option value="MEDIUM">Medium</option>
 <option value="LOW">Low</option>
 </select>

 <select
 value={status}
 onChange={(e) => setStatus(e.target.value)}
 className="px-2 py-1.5 text-xs border border-hairline rounded bg-canvas focus:outline-none focus:ring-1 focus:ring-ink"
 >
 <option value="">All Statuses</option>
 <option value="OPEN">Open</option>
 <option value="UNDER_REVIEW">Under Review</option>
 <option value="IN_PROGRESS">In Progress</option>
 <option value="ESCALATED">Escalated</option>
 <option value="CLOSED">Closed</option>
 </select>

 <input
 type="text"
 value={site}
 onChange={(e) => setSite(e.target.value)}
 placeholder="Site..."
 className="px-2 py-1.5 text-xs border border-hairline rounded bg-canvas focus:outline-none focus:ring-1 focus:ring-ink w-32"
 />

 <label className="flex items-center gap-1.5 text-xs text-mute cursor-pointer">
 <input
 type="checkbox"
 checked={sifOnly}
 onChange={(e) => setSifOnly(e.target.checked)}
 className="rounded"
 />
 SIF Only
 </label>

 {hasFilters && (
 <button
 onClick={clearFilters}
 className="flex items-center gap-1 text-xs text-mute hover:text-gray-700 px-2 py-1.5 rounded hover:bg-soft-cloud"
 >
 <X className="w-3 h-3" />
 Clear
 </button>
 )}

 <div className="ml-auto flex items-center gap-1.5 text-[11px] text-mute">
 <Filter className="w-3 h-3" />
 {effectiveIncidents.length} incidents
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-auto p-4">
 {viewMode === 'list' ? (
 <ListView incidents={effectiveIncidents} onClickIncident={handleClickIncident} />
 ) : (
 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragStart={handleDragStart}
 onDragEnd={handleDragEnd}
 >
 <div className="flex gap-3 h-full">
 {PRIORITY_COLUMNS.map((col) => (
 <KanbanColumn
 key={col}
 priority={col}
 incidents={grouped[col]}
 onClickIncident={handleClickIncident}
 />
 ))}
 </div>

 <DragOverlay>
 {activeIncident && <StaticIncidentCard incident={activeIncident} />}
 </DragOverlay>
 </DndContext>
 )}
 </div>
 </div>
 );
}
