import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBarriers, fetchLSRs } from '../services/api';
import { Shield, AlertTriangle, CheckCircle, Activity, Search } from 'lucide-react';
import clsx from 'clsx';
import { ErrorState, EmptyState } from '../components/ui/Toast';

export function ControlsPage() {
  const [activeTab, setActiveTab] = useState<'barriers' | 'lsr'>('barriers');
  const [search, setSearch] = useState('');

  const { data: barriers, isLoading: barriersLoading, isError: barrierError } = useQuery({
    queryKey: ['barriers'],
    queryFn: fetchBarriers,
  });

  const { data: lsrs, isLoading: lsrsLoading, isError: lsrError } = useQuery({
    queryKey: ['lsr'],
    queryFn: fetchLSRs,
  });

  const isLoading = barriersLoading || lsrsLoading;

  const filteredBarriers = (barriers ?? []).filter(
    (b) =>
      !search ||
      b.barrier_name.toLowerCase().includes(search.toLowerCase()) ||
      b.barrier_code?.toLowerCase().includes(search.toLowerCase()) ||
      b.barrier_type?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLSRs = (lsrs ?? []).filter(
    (l) =>
      !search ||
      l.rule_name.toLowerCase().includes(search.toLowerCase()) ||
      l.rule_code?.toLowerCase().includes(search.toLowerCase())
  );

  const totalBarriers = barriers?.length ?? 0;
  const totalMappings = barriers?.reduce((acc, b) => acc + (b.incident_count ?? 0), 0) ?? 0;
  const totalFailed = barriers?.reduce((acc, b) => acc + (b.failed_count ?? 0), 0) ?? 0;
  const atRiskBarriers = barriers?.filter((b) =>
    b.incident_count > 0 && (b.failed_count / b.incident_count) * 100 > 25
  ).length ?? 0;
  const overallRate = totalMappings > 0 ? (totalFailed / totalMappings) * 100 : 0;

  if (isLoading) return (
    <div className="p-7 space-y-6 max-w-[1600px] mx-auto animate-skeleton">
      <div>
        <div className="h-6 w-40 bg-[var(--color-border)] rounded mb-1" />
        <div className="h-3 w-64 bg-[var(--color-surface-strong)] rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-strong)]" />
              <div>
                <div className="h-3 w-24 bg-[var(--color-surface-strong)] rounded mb-1" />
                <div className="h-2 w-16 bg-[var(--color-surface-strong)] rounded" />
              </div>
            </div>
            <div className="h-8 w-16 bg-[var(--color-border)] rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] h-[65px] bg-white/50" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-[var(--color-border)] rounded-xl p-5 h-[160px]" />
          ))}
        </div>
      </div>
    </div>
  );
  if (barrierError || lsrError) return <ErrorState message="Failed to load controls data" />;

  return (
    <div className="p-7 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight">
          Safety Controls
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
          Critical barrier performance and Life-Saving Rules monitoring
        </p>
      </div>

      {/* ── Summary Stats (barriers tab only) ───────────────────────────────── */}
      {activeTab === 'barriers' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Barriers Catalogued',
              value: totalBarriers,
              icon: Shield,
              note: 'In safety catalogue',
              accent: 'var(--color-info)',
              bg: 'var(--color-info-bg)',
            },
            {
              label: 'At-Risk Barriers',
              value: atRiskBarriers,
              icon: AlertTriangle,
              note: '>25% failure rate',
              accent: 'var(--color-critical)',
              bg: 'var(--color-critical-bg)',
            },
            {
              label: 'Total Mappings',
              value: totalMappings,
              icon: Activity,
              note: 'Incident–barrier links',
              accent: 'var(--color-high)',
              bg: 'var(--color-high-bg)',
            },
            {
              label: 'Overall Failure Rate',
              value: `${overallRate.toFixed(1)}%`,
              icon: CheckCircle,
              note: 'Across all barriers',
              accent: overallRate > 20 ? 'var(--color-critical)' : 'var(--color-low)',
              bg: overallRate > 20 ? 'var(--color-critical-bg)' : 'var(--color-low-bg)',
            },
          ].map(({ label, value, icon: Icon, note, accent, bg }) => (
            <div key={label} className="bg-white border border-[var(--color-border)] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
                <div>
                  <div className="text-[11.5px] font-semibold text-[var(--color-text-secondary)]">{label}</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">{note}</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Bar + Search ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1">
            {(['barriers', 'lsr'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-4 py-2 text-[12px] font-semibold rounded-md transition-all',
                  activeTab === tab
                    ? 'bg-[var(--color-text-primary)] text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                )}
              >
                {tab === 'barriers' ? 'Critical Barriers' : 'Life-Saving Rules'}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'barriers' ? 'Search barriers…' : 'Search LSRs…'}
              className="pl-9 pr-4 py-2 text-[12px] border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] w-52 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] transition-colors"
            />
          </div>
        </div>

        {/* ── Barriers Tab ────────────────────────────────────────────────── */}
        {activeTab === 'barriers' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBarriers.map((barrier) => {
              const failureRate = barrier.incident_count > 0
                ? (barrier.failed_count / barrier.incident_count) * 100
                : 0;
              const isAtRisk = failureRate > 25;
              const barColor = isAtRisk
                ? 'var(--color-critical)'
                : failureRate > 10
                ? 'var(--color-medium)'
                : 'var(--color-low)';

              return (
                <div
                  key={barrier.barrier_id}
                  className={clsx(
                    'bg-white border rounded-xl p-5 hover:shadow-sm transition-all',
                    isAtRisk
                      ? 'border-[var(--color-critical-border)] bg-[var(--color-critical-bg)]/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-[var(--color-text-primary)] text-[13px] leading-tight">
                        {barrier.barrier_name}
                      </h3>
                      <div className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">
                        {barrier.barrier_code} · {barrier.barrier_type}
                      </div>
                    </div>
                    {isAtRisk && (
                      <div
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--color-critical-bg)' }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--color-critical)' }} />
                      </div>
                    )}
                  </div>

                  {barrier.description && (
                    <p className="text-[11.5px] text-[var(--color-text-secondary)] mb-4 line-clamp-2 leading-relaxed">
                      {barrier.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--color-border)]">
                    <div>
                      <div className="text-[10px] text-[var(--color-text-tertiary)] font-medium mb-1">Mappings</div>
                      <div className="text-base font-bold text-[var(--color-text-primary)]">{barrier.incident_count}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--color-text-tertiary)] font-medium mb-1">Failed</div>
                      <div className="text-base font-bold" style={{ color: 'var(--color-critical)' }}>
                        {barrier.failed_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--color-text-tertiary)] font-medium mb-1">Failure %</div>
                      <div className="text-base font-bold" style={{ color: barColor }}>
                        {failureRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 w-full h-1.5 rounded-full overflow-hidden bg-[var(--color-surface)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(failureRate, 100)}%`, background: barColor }}
                    />
                  </div>
                </div>
              );
            })}
            {filteredBarriers.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="No barriers found" description="Try adjusting your search" />
              </div>
            )}
          </div>
        )}

        {/* ── LSR Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'lsr' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredLSRs.map((lsr, i) => {
              const accentColors = [
                'var(--color-primary)',
                'var(--color-critical)',
                'var(--color-high)',
                'var(--color-medium)',
                'var(--color-low)',
                'var(--color-info)',
              ];
              const accent = accentColors[i % accentColors.length];

              return (
                <div
                  key={lsr.rule_id}
                  className="bg-white border border-[var(--color-border)] rounded-xl p-5 hover:shadow-sm hover:border-[var(--color-border-strong)] transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: accent }}
                    >
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--color-text-primary)] text-[13px] leading-snug">
                        {lsr.rule_name}
                      </h3>
                      <div className="text-[10.5px] text-[var(--color-text-tertiary)] font-mono mt-0.5">
                        {lsr.rule_code}
                      </div>
                    </div>
                  </div>

                  {lsr.description && (
                    <p className="text-[11.5px] text-[var(--color-text-secondary)] mb-4 line-clamp-2 leading-relaxed">
                      {lsr.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                    <div>
                      <div className="text-[10px] text-[var(--color-text-tertiary)] font-medium">Incident Mappings</div>
                      <div className="text-lg font-bold text-[var(--color-text-primary)]">{lsr.incident_count}</div>
                    </div>
                    <div
                      className="text-[10.5px] font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-tertiary)' }}
                    >
                      LSR–{String(i + 1).padStart(2, '0')}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredLSRs.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="No Life-Saving Rules found" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
