// Re-export from Toast for backward compatibility
export { PageLoading, ErrorState, EmptyState } from './Toast';

export function LoadingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <div className="w-7 h-7 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
      <span className="text-[12px] text-[var(--color-text-tertiary)]">Loading…</span>
    </div>
  );
}
