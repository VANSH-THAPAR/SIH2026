import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import clsx from 'clsx';

// ─── Toast Container ──────────────────────────────────────────────────────────

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' };
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 200);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info;

  const styles: Record<string, string> = {
    success: 'bg-[var(--color-low-bg)] border-[var(--color-low-border)] text-[var(--color-low)]',
    error: 'bg-[var(--color-critical-bg)] border-[var(--color-critical-border)] text-[var(--color-critical)]',
    info: 'bg-[var(--color-info-bg)] border-[var(--color-info-border)] text-[var(--color-info)]',
    warning: 'bg-[var(--color-medium-bg)] border-[var(--color-medium-border)] text-[var(--color-medium)]',
  };

  return (
    <div
      className={clsx(
        'pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-lg max-w-xs text-[12.5px] font-medium transition-all duration-200',
        styles[toast.type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Loading states ───────────────────────────────────────────────────────────

/** Full-page loading (use only at route level) */
export function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-6 h-6 border-2 border-[var(--color-border)] border-t-[var(--color-orange-brand)] rounded-full animate-spin" />
      <span className="text-[12px] text-[var(--color-text-tertiary)]">Loading…</span>
    </div>
  );
}

/** Inline section skeleton — mimics a card shape */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={clsx('bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl p-5 animate-skeleton', className)}>
      <div className="h-3 w-24 bg-[var(--color-border)] rounded mb-3" />
      <div className="h-7 w-16 bg-[var(--color-border)] rounded mb-2" />
      <div className="h-2.5 w-32 bg-[var(--color-surface-subtle)] rounded" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--color-border)] animate-skeleton">
      <div className="h-2.5 w-20 bg-[var(--color-border)] rounded" />
      <div className="h-2.5 w-48 bg-[var(--color-border)] rounded flex-1" />
      <div className="h-5 w-14 bg-[var(--color-border)] rounded" />
      <div className="h-5 w-14 bg-[var(--color-surface-subtle)] rounded" />
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 px-8 text-center">
      <div className="w-10 h-10 rounded-full bg-[var(--color-critical-bg)] flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-[var(--color-critical)]" />
      </div>
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Unable to load data</p>
      <p className="text-[12px] text-[var(--color-text-secondary)]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 px-4 py-2 text-[12px] font-semibold rounded-lg border border-[var(--color-border)] bg-white hover:bg-[var(--color-surface)] text-[var(--color-text-primary)] transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-8 text-center">
      <div className="w-10 h-10 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center mb-3">
        <Info className="w-4.5 h-4.5 text-[var(--color-text-tertiary)]" />
      </div>
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</p>
      {description && (
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 px-4 py-2 text-[12px] font-semibold rounded-lg border border-[var(--color-border)] bg-white hover:bg-[var(--color-surface)] text-[var(--color-text-primary)] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className = '',
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={clsx(
        'bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl',
        onClick && 'cursor-pointer hover:border-[var(--color-border-strong)] transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
}
