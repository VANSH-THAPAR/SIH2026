import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBarriers, fetchLSRs } from '@/services/api';
import { Shield, AlertTriangle, CheckCircle, Activity, Download, Calendar, ChevronDown, Search } from 'lucide-react';
import clsx from 'clsx';

export function ControlsPage() {
  const [activeTab, setActiveTab] = useState<'barriers' | 'lsr'>('barriers');
  const [search, setSearch] = useState('');

  const { data: barriers, isLoading: barriersLoading, error: barrierError } = useQuery({
    queryKey: ['barriers'],
    queryFn: fetchBarriers,
  });

  const { data: lsrs, isLoading: lsrsLoading, error: lsrError } = useQuery({
    queryKey: ['lsr'],
    queryFn: fetchLSRs,
  });

  const isLoading = barriersLoading || lsrsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (barrierError || lsrError) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Failed to load controls data
      </div>
    );
  }

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

  // Compute aggregate stats for barriers
  const totalBarriers = barriers?.length ?? 0;
  const atRiskBarriers = barriers?.filter((b) => (b.incident_count > 0 ? (b.failed_count / b.incident_count) * 100 : 0) > 25).length ?? 0;
  const totalMappings = barriers?.reduce((acc, b) => acc + (b.incident_count ?? 0), 0) ?? 0;
  const totalFailed = barriers?.reduce((acc, b) => acc + (b.failed_count ?? 0), 0) ?? 0;

  const overallRate = totalMappings > 0 ? ((totalFailed / totalMappings) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full bg-[#F4F5F9] p-7 space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Safety Controls</h1>
          <p className="text-sm text-slate-500 mt-1">
            Critical barriers and Life-Saving Rules performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Report
          </button>
        </div>
      </div>

      {/* ─── Summary KPI Cards ───────────────────────────────────────────────── */}
      {activeTab === 'barriers' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Barriers',
              value: totalBarriers,
              icon: Shield,
              iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
              note: 'In catalogue',
            },
            {
              label: 'At-Risk Barriers',
              value: atRiskBarriers,
              icon: AlertTriangle,
              iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
              note: '>25% failure rate',
            },
            {
              label: 'Total Mappings',
              value: totalMappings,
              icon: Activity,
              iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
              note: 'Incident-barrier links',
            },
            {
              label: 'Overall Failure Rate',
              value: `${overallRate.toFixed(1)}%`,
              icon: CheckCircle,
              iconBg: overallRate > 20
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-100',
              note: 'Across all barriers',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.06)] transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-600">{card.label}</h3>
                    <p className="text-[10px] text-slate-400">{card.note}</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Tab Bar + Search ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('barriers')}
              className={clsx(
                'px-4 py-2 text-[12px] font-semibold rounded-lg transition-all',
                activeTab === 'barriers'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Critical Barriers
            </button>
            <button
              onClick={() => setActiveTab('lsr')}
              className={clsx(
                'px-4 py-2 text-[12px] font-semibold rounded-lg transition-all',
                activeTab === 'lsr'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Life-Saving Rules
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'barriers' ? 'Search barriers...' : 'Search LSRs...'}
              className="pl-9 pr-4 py-2 text-[12px] border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-52 transition-colors"
            />
          </div>
        </div>

        {/* ─── Barriers Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'barriers' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBarriers.map((barrier) => {
              const failureRate = barrier.incident_count > 0
                ? (barrier.failed_count / barrier.incident_count) * 100
                : 0;
              const isAtRisk = failureRate > 25;

              return (
                <div
                  key={barrier.barrier_id}
                  className={clsx(
                    'bg-white border rounded-2xl p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all',
                    isAtRisk
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200/80 hover:border-slate-300'
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-slate-800 text-[13px] leading-tight">{barrier.barrier_name}</h3>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {barrier.barrier_code} · <span className="font-medium text-slate-500">{barrier.barrier_type}</span>
                      </div>
                    </div>
                    {isAtRisk && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                    )}
                  </div>

                  {barrier.description && (
                    <p className="text-[12px] text-slate-500 mb-4 line-clamp-2 leading-relaxed">{barrier.description}</p>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">Mappings</div>
                      <div className="text-[16px] font-bold text-slate-800">{barrier.incident_count}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">Failed</div>
                      <div className="text-[16px] font-bold text-rose-600">{barrier.failed_count}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">Failure %</div>
                      <div
                        className={clsx(
                          'text-[16px] font-bold',
                          isAtRisk ? 'text-rose-600' : failureRate > 10 ? 'text-amber-600' : 'text-emerald-600'
                        )}
                      >
                        {failureRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all', isAtRisk ? 'bg-rose-500' : failureRate > 10 ? 'bg-amber-500' : 'bg-emerald-500')}
                        style={{ width: `${Math.min(failureRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredBarriers.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                No barriers found
              </div>
            )}
          </div>
        )}

        {/* ─── LSR Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'lsr' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredLSRs.map((lsr, i) => {
              const lsrColors = [
                'bg-blue-500', 'bg-rose-500', 'bg-amber-500', 'bg-purple-500',
                'bg-emerald-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
              ];
              const colorClass = lsrColors[i % lsrColors.length];

              return (
                <div
                  key={lsr.rule_id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-[13px] leading-snug">{lsr.rule_name}</h3>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{lsr.rule_code}</div>
                    </div>
                  </div>

                  {lsr.description && (
                    <p className="text-[12px] text-slate-500 mb-4 line-clamp-2 leading-relaxed">{lsr.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Incident Mappings</div>
                      <div className="text-[18px] font-bold text-slate-800">{lsr.incident_count}</div>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                      LSR #{i + 1}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredLSRs.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                No Life-Saving Rules found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
