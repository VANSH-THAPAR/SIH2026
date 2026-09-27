import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardKPIs, fetchDashboardTrends } from '@/services/api';
import {
  BarChart3,
  FileText,
  Download,
  Activity,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { ErrorState } from '@/components/ui/Toast';

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--color-critical)',
  HIGH: 'var(--color-high)',
  MEDIUM: 'var(--color-medium)',
  LOW: 'var(--color-low)',
};

const EXPOSURE_COLORS = [
  'var(--color-critical)',
  'var(--color-high)',
  'var(--color-medium)',
  'var(--color-border-strong)',
];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'facility' | 'barrier'>('summary');

  const { data: kpis, isLoading: kpiLoading, isError: kpiError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardKPIs,
  });

  const { data: trends, isLoading: trendsLoading, isError: trendsError } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: fetchDashboardTrends,
  });

  const isLoading = kpiLoading || trendsLoading;
  const isError = kpiError || trendsError;

  const priorityData = trends?.priority_distribution ?? [];
  const exposureData = trends?.exposure_distribution?.map((d: any, i: number) => ({
    name: d.exposure_status ?? d.type ?? `Exposure ${i}`,
    value: d.count,
    color: EXPOSURE_COLORS[i % EXPOSURE_COLORS.length],
  })) ?? [];
  const facilityData = trends?.facility_risk?.slice(0, 10) ?? [];
  const barrierData = trends?.barrier_health
    ?.sort((a: any, b: any) => b.failure_rate - a.failure_rate)
    .slice(0, 8) ?? [];

  if (isLoading) return (
    <div className="flex flex-col min-h-full p-7 space-y-6 max-w-[1600px] mx-auto animate-skeleton" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="h-6 w-48 bg-[var(--color-border)] rounded mb-1" />
          <div className="h-3 w-64 bg-[var(--color-surface-subtle)] rounded" />
        </div>
        <div className="h-8 w-32 bg-[var(--color-border)] rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[var(--color-border)] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-subtle)]" />
              <div>
                <div className="h-3 w-24 bg-[var(--color-surface-subtle)] rounded mb-1" />
                <div className="h-2 w-16 bg-[var(--color-surface-subtle)] rounded" />
              </div>
            </div>
            <div className="h-8 w-16 bg-[var(--color-border)] rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden h-[400px]">
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] h-[55px]" />
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[220px] bg-[var(--color-surface-subtle)] rounded-xl" />
          <div className="h-[220px] bg-[var(--color-surface-subtle)] rounded-xl" />
        </div>
      </div>
    </div>
  );
  if (isError) return <ErrorState message="Failed to load reports data." />;

  return (
    <div className="flex flex-col min-h-full p-7 space-y-6 max-w-[1600px] mx-auto" style={{ background: 'var(--color-surface)' }}>
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight">QISD Audits & Reports</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Comprehensive safety reporting, analytics and audit trails
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--color-border)] rounded-xl text-[12px] font-semibold text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-border-strong)] transition-colors">
            <Download className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
            Export All Reports
          </button>
        </div>
      </div>

      {/* ─── Summary KPI Tiles ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Incidents', value: kpis?.total_reports ?? 0, icon: FileText, iconBg: 'var(--color-info-bg)', color: 'var(--color-info)', note: 'All time' },
          { label: 'SIF Precursors', value: kpis?.sif_potential_count ?? 0, icon: AlertTriangle, iconBg: 'var(--color-critical-bg)', color: 'var(--color-critical)', note: 'High-risk incidents' },
          { label: 'Critical Count', value: kpis?.critical_count ?? 0, icon: TrendingUp, iconBg: 'var(--color-orange-light)', color: 'var(--color-orange-brand)', note: 'Priority level' },
          { label: 'Failed Barriers', value: kpis?.failed_barriers ?? 0, icon: ShieldCheck, iconBg: 'var(--color-medium-bg)', color: 'var(--color-medium)', note: 'Control failures' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-[var(--color-border)] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--color-border)]" style={{ background: card.iconBg }}>
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <div>
                  <h3 className="text-[11.5px] font-semibold text-[var(--color-text-secondary)]">{card.label}</h3>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">{card.note}</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">{card.value.toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {/* ─── Tab Nav ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-1 p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          {[
            { key: 'summary', label: 'Priority & Exposure', icon: Activity },
            { key: 'facility', label: 'Facility Risk Report', icon: BarChart3 },
            { key: 'barrier', label: 'Barrier Health Report', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-[var(--color-text-primary)] text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── Summary Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'summary' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Distribution */}
            <div>
              <h3 className="font-bold text-[var(--color-text-primary)] text-[14px] mb-1">Priority Distribution</h3>
              <p className="text-[12px] text-[var(--color-text-secondary)] mb-4">Incidents by SIF severity tier</p>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={priorityData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} />
                    <YAxis
                      dataKey="priority"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {priorityData.map((entry: any) => (
                        <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] ?? 'var(--color-border-strong)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Exposure Distribution Donut */}
            <div>
              <h3 className="font-bold text-[var(--color-text-primary)] text-[14px] mb-1">Exposure Classification</h3>
              <p className="text-[12px] text-[var(--color-text-secondary)] mb-4">Breakdown by documented exposure status</p>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exposureData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {exposureData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val}`, name]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '11px' }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ─── Facility Risk Tab ─────────────────────────────────────────── */}
        {activeTab === 'facility' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Site / Facility</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Total Incidents</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">SIF Potential</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Avg SIF Score</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Critical Count</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {facilityData.map((fac: any, i: number) => {
                  const score = fac.avg_sif_score ?? fac.avg_score ?? 0;
                  const riskLevel = score >= 85 ? 'CRITICAL' : score >= 70 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';
                  const riskStyle: Record<string, string> = {
                    CRITICAL: 'bg-[var(--color-critical-bg)] text-[var(--color-critical)] border border-[var(--color-critical-border)]',
                    HIGH: 'bg-[var(--color-high-bg)] text-[var(--color-high)] border border-[var(--color-high-border)]',
                    MEDIUM: 'bg-[var(--color-medium-bg)] text-[var(--color-medium)] border border-[var(--color-medium-border)]',
                    LOW: 'bg-[var(--color-low-bg)] text-[var(--color-low)] border border-[var(--color-low-border)]',
                  };
                  return (
                    <tr key={fac.site_name} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors ${i % 2 === 0 ? '' : 'bg-[var(--color-surface-subtle)]'}`}>
                      <td className="px-5 py-3.5 font-semibold text-[var(--color-text-primary)] text-[13px]">{fac.site_name}</td>
                      <td className="px-5 py-3.5 font-bold text-[var(--color-text-primary)] text-[14px]">{fac.total}</td>
                      <td className="px-5 py-3.5 font-bold text-[var(--color-critical)] text-[13px]">{fac.sif_potential}</td>
                      <td className="px-5 py-3.5 font-bold text-[var(--color-text-primary)] text-[14px]">{score}</td>
                      <td className="px-5 py-3.5 font-bold text-[var(--color-critical)] text-[13px]">{fac.critical ?? fac.critical_count ?? 0}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${riskStyle[riskLevel]}`}>{riskLevel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Barrier Health Tab ────────────────────────────────────────── */}
        {activeTab === 'barrier' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Barrier Name</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Total Activations</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Failed</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Bypassed</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">Failure Rate</th>
                </tr>
              </thead>
              <tbody>
                {barrierData.map((b: any, i: number) => (
                  <tr key={b.barrier_name} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors ${i % 2 === 0 ? '' : 'bg-[var(--color-surface-subtle)]'}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[var(--color-text-primary)] text-[13px]">{b.barrier_name}</div>
                      <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono mt-0.5">{b.barrier_code}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-subtle)] px-2.5 py-1 rounded-lg border border-[var(--color-border)]">
                        {b.barrier_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-[var(--color-text-primary)] text-[14px]">{b.total}</td>
                    <td className="px-5 py-3.5 font-bold text-[var(--color-critical)] text-[13px]">{b.failed}</td>
                    <td className="px-5 py-3.5 font-bold text-[var(--color-high)] text-[13px]">{b.bypassed}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-[13px] ${b.failure_rate > 25 ? 'text-[var(--color-critical)]' : b.failure_rate > 10 ? 'text-[var(--color-medium)]' : 'text-[var(--color-low)]'}`}>
                          {b.failure_rate?.toFixed(1)}%
                        </span>
                        <div className="w-16 h-1.5 bg-[var(--color-surface-subtle)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${b.failure_rate > 25 ? 'bg-[var(--color-critical)]' : b.failure_rate > 10 ? 'bg-[var(--color-medium)]' : 'bg-[var(--color-low)]'}`}
                            style={{ width: `${Math.min(b.failure_rate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
