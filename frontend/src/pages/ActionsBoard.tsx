import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Search } from 'lucide-react';
import { fetchActions, updateAction } from '@/services/api';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { PageLoading, ErrorState, Card } from '@/components/ui/Toast';
import { useUIStore } from '@/store/uiStore';
import type { ActionSummary, ActionStatus } from '@/types';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

const STATUSES: ActionStatus[] = ['TODO', 'IN_PROGRESS', 'VERIFICATION', 'CLOSED'];
const STATUS_COLORS: Record<ActionStatus, string> = {
  TODO: 'border-t-slate-400',
  IN_PROGRESS: 'border-t-blue-500',
  VERIFICATION: 'border-t-purple-500',
  CLOSED: 'border-t-gray-400',
};

// =====================================================
// Action Card
// =====================================================
function ActionCard({
  action,
  isDragging,
  onClick
}: {
  action: ActionSummary;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: action.id,
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
      className={clsx(
        'bg-white border border-gray-200 rounded p-3 hover:border-blue-300 hover:shadow-sm transition-all select-none group relative',
        isDragging && 'shadow-lg rotate-1'
      )}
    >
      <div className="flex items-center justify-between mb-2 cursor-grab" {...listeners}>
        <span className="text-[10px] font-mono text-gray-400">{action.id.slice(0, 8)}</span>
        <PriorityBadge priority={action.priority} />
      </div>

      <div 
        className="text-sm text-gray-800 font-medium mb-2 line-clamp-2 cursor-pointer hover:text-blue-600"
        onClick={onClick}
      >
        {action.title}
      </div>

      {action.report_id && (
        <div className="text-xs text-gray-500 mb-2">
          Report: <Link to={`/incidents/${action.report_id}`} className="hover:underline text-blue-600" onPointerDown={e => e.stopPropagation()}>{action.report_id}</Link>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
        <span className="truncate max-w-[120px]">{action.owner || 'Unassigned'}</span>
        {action.due_date && (
          <span className={clsx(new Date(action.due_date) < new Date() && action.status !== 'CLOSED' ? 'text-red-500 font-medium' : '')}>
            {action.due_date}
          </span>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Board Column
// =====================================================
function BoardColumn({
  status,
  actions,
  onCardClick,
}: {
  status: ActionStatus;
  actions: ActionSummary[];
  onCardClick: (id: string) => void;
}) {
  return (
    <div className={clsx('flex flex-col rounded-md border-t-4', STATUS_COLORS[status], 'bg-gray-50 border border-gray-200 min-w-[260px] w-[260px] shrink-0')}>
      <div className="px-3 py-2 flex items-center justify-between bg-white bg-opacity-50">
        <span className="text-xs font-bold text-gray-700 tracking-wide">{status.replace(/_/g, ' ')}</span>
        <span className="text-xs font-semibold bg-gray-200 text-gray-700 rounded px-1.5 py-0.5">
          {actions.length}
        </span>
      </div>

      <SortableContext items={actions.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-200px)]">
          {actions.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">No actions</div>
          ) : (
            actions.map((action) => (
              <ActionCard 
                key={action.id} 
                action={action} 
                onClick={() => onCardClick(action.id)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// =====================================================
// Actions Board
// =====================================================
export function ActionsBoard() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [activeDrag, setActiveDrag] = useState<ActionSummary | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: actions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['actions', 'all'],
    queryFn: () => fetchActions(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActionStatus }) =>
      updateAction(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions', 'all'] });
    },
    onError: () => {
      addToast('Failed to update action status.', 'error');
      queryClient.invalidateQueries({ queryKey: ['actions', 'all'] });
    },
  });

  const byStatus: Record<ActionStatus, ActionSummary[]> = {
    TODO: [],
    IN_PROGRESS: [],
    VERIFICATION: [],
    CLOSED: [],
  };

  actions.forEach((a) => {
    if (a.status in byStatus) {
      byStatus[a.status as ActionStatus].push(a);
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    const action = actions.find((a) => a.id === event.active.id);
    if (action) setActiveDrag(action);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const overStatus = STATUSES.find((s) =>
      byStatus[s].some((a) => a.id === over.id)
    ) || (STATUSES.includes(over.id as ActionStatus) ? over.id as ActionStatus : null);

    if (!overStatus) return;

    const action = actions.find((a) => a.id === active.id);
    if (!action || action.status === overStatus) return;

    queryClient.setQueryData(['actions', 'all'], (old: ActionSummary[] = []) => 
      old.map((a) => a.id === action.id ? { ...a, status: overStatus } : a)
    );

    updateMutation.mutate({ id: action.id, status: overStatus });
  };

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorState message="Failed to load actions" onRetry={() => refetch()} />;

  const selectedAction = actions.find(a => a.id === selectedActionId);

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-lg font-bold text-gray-900">Actions Board</h1>
        <p className="text-xs text-gray-500">Track and manage safety interventions</p>
      </div>

      <div className="flex-1 overflow-hidden flex relative">
        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-6 h-full overflow-x-auto flex-1">
            {STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                actions={byStatus[status]}
                onCardClick={setSelectedActionId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDrag ? (
              <ActionCard action={activeDrag} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Side Drawer */}
        {selectedAction && (
          <div className="w-[400px] border-l border-gray-200 bg-white shadow-xl h-full flex flex-col absolute right-0 top-0 z-10 transition-transform">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="font-semibold text-gray-800">Action Details</h2>
              <button onClick={() => setSelectedActionId(null)} className="p-1 hover:bg-gray-200 rounded text-gray-500">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Title</label>
                <div className="text-sm text-gray-900">{selectedAction.title}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Status</label>
                  <StatusBadge status={selectedAction.status as any} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Priority</label>
                  <PriorityBadge priority={selectedAction.priority} />
                </div>
              </div>

              {selectedAction.description && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Description</label>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAction.description}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Owner</label>
                  <div className="text-sm text-gray-700">{selectedAction.owner || 'Unassigned'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Due Date</label>
                  <div className="text-sm text-gray-700">{selectedAction.due_date || 'Not set'}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Related Incident</label>
                <Link to={`/incidents/${selectedAction.report_id}`} className="text-sm text-blue-600 hover:underline">
                  {selectedAction.report_id}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
