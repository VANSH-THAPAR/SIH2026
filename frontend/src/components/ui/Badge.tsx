import clsx from 'clsx';

// =====================================================
// Priority Badge
// =====================================================
const PRIORITY_STYLES: Record<string, string> = {
 CRITICAL: 'bg-red-100 text-red-700 border-red-200',
 HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
 MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
 LOW: 'bg-green-100 text-green-700 border-green-200',
};

const PRIORITY_DOT: Record<string, string> = {
 CRITICAL: 'bg-red-500',
 HIGH: 'bg-orange-500',
 MEDIUM: 'bg-amber-500',
 LOW: 'bg-green-500',
};

interface PriorityBadgeProps {
 priority: string;
 size?: 'xs' | 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
 if (!priority) return null;
 return (
 <span
 className={clsx(
 'inline-flex items-center gap-1 rounded border font-semibold',
 size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
 PRIORITY_STYLES[priority] || 'bg-soft-cloud text-gray-700'
 )}
 >
 <span className={clsx('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[priority] || 'bg-gray-400')} />
 {priority}
 </span>
 );
}

// =====================================================
// Status Badge
// =====================================================
const STATUS_STYLES: Record<string, string> = {
 OPEN: 'bg-soft-cloud text-ink border-hairline',
 INVESTIGATING: 'bg-purple-100 text-purple-700 border-purple-200',
 ACTION_REQUIRED: 'bg-orange-100 text-orange-700 border-orange-200',
 CLOSED: 'bg-soft-cloud text-mute border-hairline',
 TODO: 'bg-slate-100 text-slate-700 border-slate-200',
 IN_PROGRESS: 'bg-soft-cloud text-ink border-hairline',
 VERIFICATION: 'bg-purple-100 text-purple-700 border-purple-200',
};

interface StatusBadgeProps {
 status: string;
 size?: 'xs' | 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
 if (!status) return null;
 const styles = STATUS_STYLES[status] || 'bg-soft-cloud text-mute border-hairline';
 return (
 <span
 className={clsx(
 'inline-flex items-center rounded border font-medium',
 size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
 styles
 )}
 >
 {status.replace(/_/g, ' ')}
 </span>
 );
}

// =====================================================
// Barrier Status Badge
// =====================================================
const BARRIER_STATUS_STYLES: Record<string, string> = {
 EFFECTIVE: 'bg-green-100 text-green-700 border-green-200',
 PARTIALLY_EFFECTIVE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
 FAILED: 'bg-red-100 text-red-700 border-red-200',
 MISSING: 'bg-red-100 text-red-700 border-red-200',
 BYPASSED: 'bg-orange-100 text-orange-700 border-orange-200',
 DEGRADED: 'bg-amber-100 text-amber-700 border-amber-200',
 UNKNOWN: 'bg-soft-cloud text-mute border-hairline',
 NOT_APPLICABLE: 'bg-soft-cloud text-mute border-hairline',
};

interface BarrierBadgeProps {
 status: string;
 size?: 'xs' | 'sm' | 'md';
}

export function BarrierBadge({ status, size = 'sm' }: BarrierBadgeProps) {
 if (!status) return null;
 const styles = BARRIER_STATUS_STYLES[status] || 'bg-soft-cloud text-mute border-hairline';
 return (
 <span
 className={clsx(
 'inline-flex items-center rounded border font-medium',
 size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
 styles
 )}
 >
 {status.replace(/_/g, ' ')}
 </span>
 );
}

// =====================================================
// SIF Classification Badge
// =====================================================
export interface SIFBadgeProps {
 classification?: string | null;
 score?: number | null;
}

export function SIFBadge({ classification, score }: SIFBadgeProps) {
 if (!classification && score == null) return null;
 const isSIF = classification === 'SIF_POTENTIAL' || (score && score >= 70);
 return (
 <span
 className={clsx(
 'inline-flex items-center gap-1 rounded border font-semibold px-1.5 py-0.5 text-xs',
 isSIF ? 'bg-red-50 text-red-700 border-red-200' : 'bg-soft-cloud text-mute border-hairline'
 )}
 >
 SIF {score != null ? `${Math.round(score)}` : (isSIF ? '⚠' : '—')}
 </span>
 );
}

// =====================================================
// Exposure Status Badge
// =====================================================
const EXPOSURE_STYLES: Record<string, string> = {
 DOCUMENTED_EXPOSURE: 'bg-red-50 text-red-600',
 POTENTIAL_EXPOSURE: 'bg-orange-50 text-orange-600',
 NEAR_MISS_EXPOSURE: 'bg-yellow-50 text-yellow-700',
 NO_DOCUMENTED_EXPOSURE: 'bg-soft-cloud text-mute',
};

export function ExposureBadge({ status }: { status?: string; size?: 'xs' | 'sm' | 'md' }) {
 if (!status) return null;
 const styles = EXPOSURE_STYLES[status] || 'bg-soft-cloud text-mute';
 const label = status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
 return (
 <span className={clsx('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium', styles)}>
 {label}
 </span>
 );
}

// =====================================================
// Trend Badge 
// =====================================================
interface TrendConfig { label: string; styles: string; }
export function TrendBadge({ trend }: { trend: 'INCREASING' | 'STABLE' | 'DECREASING' | string }) {
 const config: Record<string, TrendConfig> = {
 INCREASING: { label: '↑ Increasing', styles: 'bg-red-50 text-red-600' },
 STABLE: { label: '→ Stable', styles: 'bg-soft-cloud text-mute' },
 DECREASING: { label: '↓ Decreasing', styles: 'bg-green-50 text-green-600' },
 };
 const { label, styles } = config[trend] ?? config['STABLE'];
 return (
 <span className={clsx('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium', styles)}>
 {label}
 </span>
 );
}

// =====================================================
// Kanban Workflow Status Badge
// Displays HSE workflow stage — SEPARATE from risk level/priority
// =====================================================
const KANBAN_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
 UNDER_ASSESSMENT: {
   label: 'Under Assessment',
   bg: 'bg-indigo-50',
   text: 'text-indigo-700',
   dot: 'bg-indigo-500',
 },
 ACTION_IN_PROGRESS: {
   label: 'Action in Progress',
   bg: 'bg-amber-50',
   text: 'text-amber-700',
   dot: 'bg-amber-500',
 },
 PENDING_VERIFICATION: {
   label: 'Pending Verification',
   bg: 'bg-purple-50',
   text: 'text-purple-700',
   dot: 'bg-purple-500',
 },
 CLOSED: {
   label: 'Closed',
   bg: 'bg-green-50',
   text: 'text-green-700',
   dot: 'bg-green-500',
 },
};

interface KanbanStatusBadgeProps {
 status: string;
 size?: 'xs' | 'sm' | 'md';
}

export function KanbanStatusBadge({ status, size = 'sm' }: KanbanStatusBadgeProps) {
 if (!status) return null;
 const cfg = KANBAN_STATUS_CONFIG[status] || {
   label: status.replace(/_/g, ' '),
   bg: 'bg-soft-cloud',
   text: 'text-mute',
   dot: 'bg-gray-400',
 };
 return (
 <span
   className={clsx(
     'inline-flex items-center gap-1 rounded border font-semibold',
     size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
     cfg.bg,
     cfg.text,
     'border-transparent',
   )}
 >
   <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
   {cfg.label}
 </span>
 );
}
