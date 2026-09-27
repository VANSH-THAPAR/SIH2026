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
import { X } from 'lucide-react';
import { fetchActions, updateAction } from '../services/api';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/Toast';
import { useUIStore } from '../store/uiStore';
import type { ActionSummary, ActionStatus } from '../types';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

const STATUSES: ActionStatus[] = ['TODO', 'IN_PROGRESS', 'VERIFICATION', 'CLOSED'];

const STATUS_CONFIG: Record<ActionStatus, {
  label: string;
  dotColor: string;
  headerBg: string;
  headerText: string;
  topBorder: string;
}> = {
  TODO: {
    label: 'To Do',
    dotColor: 'var(--color-text-tertiary)',
    headerBg: 'var(--color-surface)',
    headerText: 'var(--color-text-secondary)',
    topBorder: 'border-t-[var(--color-border-strong)]',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    dotColor: 'var(--color-high)',
    headerBg: 'var(--color-high-bg)',
    headerText: 'var(--color-high)',
    topBorder: 'border-t-[var(--color-high)]',
  },
  VERIFICATION: {
    label: 'Verification',
    dotColor: 'var(--color-info)',
    headerBg: 'var(--color-info-bg)',
    headerText: 'var(--color-info)',
    topBorder: 'border-t-[var(--color-info)]',
  },
  CLOSED: {
    label: 'Closed',
    dotColor: 'var(--color-low)',
    headerBg: 'var(--color-low-bg)',
    headerText: 'var(--color-low)',
    topBorder: 'border-t-[var(--color-low)]',
  },
};

// ─── Action Card ──────────────────────────────────────────────────────────────

function ActionCard({
  action,
  isDragging,
  onClick,
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

  const isOverdue = action.due_date && new Date(action.due_date) < new Date() && action.status !== 'CLOSED';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={clsx(
        'bg-white border border-[var(--color-border)] rounded-xl p-3.5 hover:border-[var(--color-border-strong)] hover:shadow-sm transition-all select-none group',
        isDragging && 'rotate-1 shadow-xl'
      )}
    >
      {/* Drag handle row */}
      <div className="flex items-center justify-between mb-2 cursor-grab" {...listeners}>
        <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
          {action.id.slice(0, 8)}
        </span>
        <PriorityBadge priority={action.priority} size="xs" />
      </div>

      <div
        className="text-[12.5px] font-semibold text-[var(--color-text-primary)] mb-2.5 line-clamp-2 cursor-pointer group-hover:text-[var(--color-primary)] transition-colors"
        onClick={onClick}
      >
        {action.title}
      </div>

      {action.report_id && (
        <div className="text-[11px] text-[var(--color-text-tertiary)] mb-2.5">
          Incident:{' '}
          <Link
            to={`/incidents/${action.report_id}`}
            className="hover:text-[var(--color-primary)] hover:underline font-medium"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {action.report_id.slice(0, 12)}
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-[var(--color-border)]">
        <span className="text-[var(--color-text-secondary)] truncate max-w-[130px]">
          {action.owner || 'Unassigned'}
        </span>
        {action.due_date && (
          <span
            className="font-medium"
            style={{ color: isOverdue ? 'var(--color-critical)' : 'var(--color-text-tertiary)' }}
          >
            {action.due_date}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Board Column ─────────────────────────────────────────────────────────────

function BoardColumn({
  status,
  actions,
  onCardClick,
}: {
  status: ActionStatus;
  actions: ActionSummary[];
  onCardClick: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div
      className={clsx(
        'flex flex-col rounded-xl border-t-4 border border-[var(--color-border)] overflow-hidden',
        cfg.topBorder
      )}
      style={{ minWidth: 260, maxWidth: 300, flex: '1 1 260px', background: 'var(--color-surface)' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: cfg.headerBg }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cfg.headerText }}>
            {cfg.label}
          </span>
        </div>
        <span
          className="text-[11px] font-bold text-white rounded-lg px-2 py-0.5"
          style={{ backgroundColor: cfg.dotColor }}
        >
          {actions.length}
        </span>
      </div>

      <SortableContext items={actions.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ maxHeight: 'calc(100vh - 210px)' }}>
          {actions.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-[var(--color-text-tertiary)]">
              No actions
            </div>
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

// ─── Actions Board Page ────────────────────────────────────────────────────────

export function ActionsBoard() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [activeDrag, setActiveDrag] = useState<ActionSummary | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: actions = [], isLoading, isError, refetch } = useQuery({
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

  if (isLoading) return (
    <div className="flex flex-col h-full animate-skeleton" style={{ background: 'var(--color-surface)' }}>
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-white px-7 py-5">
        <div className="h-6 w-40 bg-[var(--color-border)] rounded mb-1" />
        <div className="h-3 w-64 bg-[var(--color-surface-strong)] rounded" />
      </div>
      <div className="flex gap-4 p-7 h-full overflow-x-auto flex-1">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="flex flex-col rounded-xl border-t-4 border border-[var(--color-border)] bg-[var(--color-surface)]" style={{ minWidth: 260, maxWidth: 300, flex: '1 1 260px' }}>
            <div className="px-4 py-3 border-b border-[var(--color-border)] h-[45px] bg-white/50" />
            <div className="flex-1 p-3 space-y-2.5">
              {[1, 2, 3].map((card) => (
                <div key={card} className="bg-white border border-[var(--color-border)] rounded-xl p-3.5 h-[120px]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (isError) return <ErrorState message="Failed to load actions" onRetry={() => refetch()} />;

  const selectedAction = actions.find((a) => a.id === selectedActionId);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-surface)' }}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-white px-7 py-5">
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight">Actions Board</h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
          Track and manage safety interventions across {actions.length} actions
        </p>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-hidden flex relative">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-7 h-full overflow-x-auto flex-1">
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
            {activeDrag ? <ActionCard action={activeDrag} isDragging /> : null}
          </DragOverlay>
        </DndContext>

        {/* Detail Drawer */}
        {selectedAction && (
          <div
            className="flex-shrink-0 border-l border-[var(--color-border)] bg-white h-full flex flex-col absolute right-0 top-0 z-10 transition-transform shadow-xl"
            style={{ width: 380 }}
          >
            <div
              className="p-5 border-b border-[var(--color-border)] flex items-center justify-between"
              style={{ background: 'var(--color-surface)' }}
            >
              <h2 className="text-[13px] font-bold text-[var(--color-text-primary)]">Action Details</h2>
              <button
                onClick={() => setSelectedActionId(null)}
                className="p-1.5 hover:bg-[var(--color-border)] rounded-lg text-[var(--color-text-tertiary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              <div>
                <label className="text-[11px] font-semibold text-[var(--color-text-tertiary)] block mb-1.5 uppercase tracking-wide">
                  Title
                </label>
                <div className="text-[13px] text-[var(--color-text-primary)] font-semibold leading-snug">
                  {selectedAction.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-text-tertiary)] block mb-1.5 uppercase tracking-wide">
                    Status
                  </label>
                  <StatusBadge status={selectedAction.status as any} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-text-tertiary)] block mb-1.5 uppercase tracking-wide">
                    Priority
                  </label>
                  <PriorityBadge priority={selectedAction.priority} />
                </div>
              </div>

              {selectedAction.description && (
                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-text-tertiary)] block mb-1.5 uppercase tracking-wide">
                    Description
                  </label>
                  <div className="text-[12.5px] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                    {selectedAction.description}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-text-tertiary)] block mb-1.5 uppercase tracking-wide">
                    Owner
                  </label>
                  <div className="text-[12.5px] text-[var(--color-text-primary)]">
                    {selectedAction.owner || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--color-text-tertiary)] block mb-1.5 uppercase tracking-wide">
                    Due Date
                  </label>
                  <div className="text-[12.5px] text-[var(--color-text-primary)]">
                    {selectedAction.due_date || 'Not set'}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--color-text-tertiary)] block mb-1.5 uppercase tracking-wide">
                  Related Incident
                </label>
                <Link
                  to={`/incidents/${selectedAction.report_id}`}
                  className="text-[12.5px] font-medium hover:text-[var(--color-primary)] hover:underline font-mono text-[var(--color-text-primary)] transition-colors"
                >
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
