import clsx from 'clsx';

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<string, { label: string; dot: string; styles: string }> = {
  CRITICAL: {
    label: 'CRITICAL',
    dot: 'bg-[var(--color-critical)]',
    styles: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)] border-[var(--color-critical-border)]',
  },
  HIGH: {
    label: 'HIGH',
    dot: 'bg-[var(--color-high)]',
    styles: 'bg-[var(--color-high-bg)] text-[var(--color-high)] border-[var(--color-high-border)]',
  },
  MEDIUM: {
    label: 'MEDIUM',
    dot: 'bg-[var(--color-medium)]',
    styles: 'bg-[var(--color-medium-bg)] text-[var(--color-medium)] border-[var(--color-medium-border)]',
  },
  LOW: {
    label: 'LOW',
    dot: 'bg-[var(--color-low)]',
    styles: 'bg-[var(--color-low-bg)] text-[var(--color-low)] border-[var(--color-low-border)]',
  },
};

export function PriorityBadge({ priority, size = 'sm' }: { priority: string; size?: 'xs' | 'sm' | 'md' }) {
  if (!priority) return null;
  const cfg = PRIORITY_CFG[priority] || { label: priority, dot: 'bg-gray-400', styles: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded border font-semibold',
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-[12.5px]',
        cfg.styles
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, string> = {
  OPEN: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]',
  UNDER_REVIEW: 'bg-[var(--color-medium-bg)] text-[var(--color-medium)] border-[var(--color-medium-border)]',
  IN_PROGRESS: 'bg-[var(--color-high-bg)] text-[var(--color-high)] border-[var(--color-high-border)]',
  ESCALATED: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)] border-[var(--color-critical-border)]',
  CLOSED: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-low-border)]',
  INVESTIGATING: 'bg-[var(--color-medium-bg)] text-[var(--color-medium)] border-[var(--color-medium-border)]',
  ACTION_REQUIRED: 'bg-[var(--color-high-bg)] text-[var(--color-high)] border-[var(--color-high-border)]',
  TODO: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
  IN_PROGRESS_ACTION: 'bg-[var(--color-high-bg)] text-[var(--color-high)] border-[var(--color-high-border)]',
  VERIFICATION: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]',
};

export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' | 'md' }) {
  if (!status) return null;
  const styles = STATUS_CFG[status] || 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded border font-medium',
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-[12.5px]',
        styles
      )}
    >
      {label}
    </span>
  );
}

// ─── SIF Badge ────────────────────────────────────────────────────────────────

export interface SIFBadgeProps {
  classification?: string | null;
  score?: number | null;
}

export function SIFBadge({ classification, score }: SIFBadgeProps) {
  if (!classification && score == null) return null;
  const isSIF = classification === 'SIF_POTENTIAL' || (score != null && score >= 70);
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded border font-semibold px-1.5 py-0.5 text-xs',
        isSIF
          ? 'bg-[var(--color-critical-bg)] text-[var(--color-critical)] border-[var(--color-critical-border)]'
          : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
      )}
    >
      {isSIF && <span className="w-1 h-1 rounded-full bg-[var(--color-critical)] flex-shrink-0" />}
      {isSIF ? 'SIF' : 'NON-SIF'}
      {score != null && <span className="font-bold">{Math.round(score)}</span>}
    </span>
  );
}

// ─── Barrier Status Badge ─────────────────────────────────────────────────────

const BARRIER_CFG: Record<string, string> = {
  EFFECTIVE: 'bg-[var(--color-low-bg)] text-[var(--color-low)] border-[var(--color-low-border)]',
  PARTIALLY_EFFECTIVE: 'bg-[var(--color-medium-bg)] text-[var(--color-medium)] border-[var(--color-medium-border)]',
  FAILED: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)] border-[var(--color-critical-border)]',
  MISSING: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)] border-[var(--color-critical-border)]',
  BYPASSED: 'bg-[var(--color-high-bg)] text-[var(--color-high)] border-[var(--color-high-border)]',
  DEGRADED: 'bg-[var(--color-medium-bg)] text-[var(--color-medium)] border-[var(--color-medium-border)]',
  UNKNOWN: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-tertiary)] border-[var(--color-border)]',
  NOT_APPLICABLE: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-tertiary)] border-[var(--color-border)]',
};

export function BarrierBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' | 'md' }) {
  if (!status) return null;
  const styles = BARRIER_CFG[status] || 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded border font-medium',
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-[12.5px]',
        styles
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Exposure Badge ───────────────────────────────────────────────────────────

const EXPOSURE_CFG: Record<string, string> = {
  DOCUMENTED: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)]',
  POTENTIAL: 'bg-[var(--color-high-bg)] text-[var(--color-high)]',
  NEAR_MISS: 'bg-[var(--color-medium-bg)] text-[var(--color-medium)]',
  ACTUAL: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)]',
  // Legacy keys
  DOCUMENTED_EXPOSURE: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)]',
  POTENTIAL_EXPOSURE: 'bg-[var(--color-high-bg)] text-[var(--color-high)]',
  NEAR_MISS_EXPOSURE: 'bg-[var(--color-medium-bg)] text-[var(--color-medium)]',
  NO_DOCUMENTED_EXPOSURE: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]',
};

export function ExposureBadge({ status }: { status?: string; size?: 'xs' | 'sm' | 'md' }) {
  if (!status) return null;
  const styles = EXPOSURE_CFG[status] || 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]';
  const label = status.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()).toLowerCase().replace(/^./, c => c.toUpperCase());
  return (
    <span className={clsx('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium', styles)}>
      {label}
    </span>
  );
}

// ─── Trend Badge ──────────────────────────────────────────────────────────────

export function TrendBadge({ trend }: { trend: string }) {
  const cfg: Record<string, { label: string; styles: string }> = {
    UP: { label: '↑ Rising', styles: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)]' },
    INCREASING: { label: '↑ Rising', styles: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)]' },
    DOWN: { label: '↓ Declining', styles: 'bg-[var(--color-low-bg)] text-[var(--color-low)]' },
    DECREASING: { label: '↓ Declining', styles: 'bg-[var(--color-low-bg)] text-[var(--color-low)]' },
    STABLE: { label: '→ Stable', styles: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]' },
  };
  const { label, styles } = cfg[trend] ?? cfg['STABLE'];
  return (
    <span className={clsx('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold', styles)}>
      {label}
    </span>
  );
}

// ─── Kanban Workflow Status Badge ─────────────────────────────────────────────

const KANBAN_CFG: Record<string, { label: string; styles: string; dot: string }> = {
  UNDER_ASSESSMENT: {
    label: 'Under Assessment',
    styles: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]',
    dot: 'bg-[var(--color-info)]',
  },
  ACTION_IN_PROGRESS: {
    label: 'Action in Progress',
    styles: 'bg-[var(--color-high-bg)] text-[var(--color-high)] border-[var(--color-high-border)]',
    dot: 'bg-[var(--color-high)]',
  },
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    styles: 'bg-[var(--color-medium-bg)] text-[var(--color-medium)] border-[var(--color-medium-border)]',
    dot: 'bg-[var(--color-medium)]',
  },
  CLOSED: {
    label: 'Closed',
    styles: 'bg-[var(--color-low-bg)] text-[var(--color-low)] border-[var(--color-low-border)]',
    dot: 'bg-[var(--color-low)]',
  },
};

export function KanbanStatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' | 'md' }) {
  if (!status) return null;
  const cfg = KANBAN_CFG[status] || {
    label: status.replace(/_/g, ' '),
    styles: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
    dot: 'bg-gray-400',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded border font-semibold',
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-[12.5px]',
        cfg.styles
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
}
