import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Cell,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { fetchDashboardKPIs, fetchDashboardTrends } from '../services/api';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { ErrorState, SkeletonCard } from '../components/ui/Toast';

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 shadow-lg text-[11.5px]">
      <div className="font-semibold text-[var(--color-text-primary)] mb-1.5">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[var(--color-text-secondary)]">{entry.name}</span>
          </div>
          <span className="font-bold text-[var(--color-text-primary)]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  subtext,
  accent = false,
  onClick,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-5 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:border-[var(--color-border-strong)] transition-colors group' : ''} ${accent ? 'border-[var(--color-high-border)] bg-[var(--color-high-bg)]' : 'border-[var(--color-border)]'}`}
    >
      <div className="text-[11.5px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-3xl font-bold tracking-tight ${accent ? 'text-[var(--color-high)]' : 'text-[var(--color-text-primary)]'}`}>
        {value}
      </div>
      {subtext && (
        <div className="text-[11px] text-[var(--color-text-tertiary)]">{subtext}</div>
      )}
      {onClick && (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-orange-brand)] opacity-0 group-hover:opacity-100 transition-opacity">
          View details <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CommandCenter() {
  const navigate = useNavigate();

  const kpiQuery = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: fetchDashboardKPIs,
    refetchInterval: 60000,
  });

  const trendQuery = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: fetchDashboardTrends,
    refetchInterval: 60000,
  });

  const kpi = kpiQuery.data;
  const trends = trendQuery.data;

  // Build monthly trend data from real API (trends.monthly_trend)
  const monthlyData = useMemo(() => {
    if (!trends?.monthly_trend?.length) return [];
    return trends.monthly_trend.map((m) => ({
      month: m.month,
      'Total Incidents': m.total,
      'SIF Precursors': m.sif_potential,
      Critical: m.critical,
    }));
  }, [trends]);

  // Facility risk data from real API
  const facilityData = useMemo(() => {
    if (!trends?.facility_risk?.length) return [];
    const maxTotal = Math.max(...trends.facility_risk.map((f) => f.total)) || 1;
    return trends.facility_risk.slice(0, 6).map((f) => ({
      name: f.site_name.length > 18 ? f.site_name.slice(0, 16) + '…' : f.site_name,
      total: f.total,
      sif: f.sif_potential,
      pct: Math.round((f.total / maxTotal) * 100),
    }));
  }, [trends]);

  // Score distribution from real API
  const scoreDistData = useMemo(() => {
    if (!trends?.sif_score_distribution?.length) return [];
    return trends.sif_score_distribution.map((d) => ({
      range: d.range,
      count: d.count,
    }));
  }, [trends]);

  // Priority distribution colors
  const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: 'var(--color-critical)',
    HIGH: 'var(--color-high)',
    MEDIUM: 'var(--color-medium)',
    LOW: 'var(--color-low)',
  };

  const lastUpdated = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (kpiQuery.isLoading) return (
    <div className="p-7 space-y-6 max-w-[1600px] mx-auto animate-skeleton">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-6 w-40 bg-[var(--color-border)] rounded mb-1" />
          <div className="h-3 w-64 bg-[var(--color-surface-subtle)] rounded" />
        </div>
        <div className="h-4 w-24 bg-[var(--color-surface-subtle)] rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-3">
            <div className="h-3 w-20 bg-[var(--color-surface-subtle)] rounded" />
            <div className="h-8 w-16 bg-[var(--color-border)] rounded" />
            <div className="h-2 w-24 bg-[var(--color-surface-subtle)] rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-[var(--color-border)] rounded-xl p-4">
            <div className="h-2 w-16 bg-[var(--color-surface-subtle)] rounded mb-2" />
            <div className="h-6 w-12 bg-[var(--color-border)] rounded mb-2" />
            <div className="h-2 w-20 bg-[var(--color-surface-subtle)] rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white border border-[var(--color-border)] rounded-xl p-6 h-[320px]" />
        <div className="lg:col-span-4 bg-white border border-[var(--color-border)] rounded-xl p-6 h-[320px]" />
      </div>
    </div>
  );
  if (kpiQuery.isError) return <ErrorState onRetry={() => kpiQuery.refetch()} message="Failed to load dashboard data." />;

  const barrierIntegrity =
    kpi && kpi.total_barrier_mappings > 0
      ? (((kpi.total_barrier_mappings - kpi.failed_barriers) / kpi.total_barrier_mappings) * 100).toFixed(1)
      : '—';

  return (
    <div className="p-7 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight">
            Command Center
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Safety performance, SIF precursors, and barrier integrity
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
          <RefreshCw className="w-3 h-3" />
          <span>Updated {lastUpdated}</span>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Incidents"
          value={kpi?.total_reports?.toLocaleString() ?? '—'}
          subtext="All processed reports"
          onClick={() => navigate('/incidents')}
        />
        <KPICard
          label="SIF Precursors"
          value={kpi?.sif_potential_count?.toLocaleString() ?? '—'}
          subtext={`Avg score ${kpi?.avg_sif_score?.toFixed(1) ?? '—'}`}
          accent
          onClick={() => navigate('/sif')}
        />
        <KPICard
          label="Critical Priority"
          value={kpi?.critical_count ?? '—'}
          subtext={`${kpi?.high_count ?? '—'} high priority`}
          onClick={() => navigate('/incidents?priority=CRITICAL')}
        />
        <KPICard
          label="Open Actions"
          value={kpi?.open_actions ?? '—'}
          subtext={kpi?.overdue_actions ? `${kpi.overdue_actions} overdue` : undefined}
        />
      </div>

      {/* ── Secondary KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Barrier Integrity', value: `${barrierIntegrity}%`, sub: `${kpi?.failed_barriers ?? '—'} failed` },
          { label: 'Failed Barriers', value: kpi?.failed_barriers ?? '—', sub: `of ${kpi?.total_barrier_mappings ?? '—'} mapped` },
          { label: 'LSR Mappings', value: kpi?.lsr_mappings ?? '—', sub: 'Life-saving rules' },
          { label: 'Documented Exposure', value: kpi?.documented_exposure ?? '—', sub: 'Confirmed contact' },
          { label: 'Near Misses', value: kpi?.near_miss_exposure ?? '—', sub: 'Potential contact' },
          { label: 'Non-SIF Count', value: kpi?.non_sif_count ?? '—', sub: 'Classified safe' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-[10.5px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1.5">
              {label}
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)]">{value}</div>
            <div className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Trend — 8 cols */}
        <div className="lg:col-span-8 bg-white border border-[var(--color-border)] rounded-xl p-6">
          <div className="mb-5">
            <h2 className="text-[14px] font-bold text-[var(--color-text-primary)]">
              Monthly Incident Trend
            </h2>
            <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">
              Total incidents vs SIF precursors by month
            </p>
          </div>
          {monthlyData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-[12px] text-[var(--color-text-tertiary)]">
              No trend data available yet
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Total Incidents" fill="var(--color-border)" radius={[2, 2, 0, 0]} maxBarSize={14} />
                  <Line
                    type="monotone"
                    dataKey="SIF Precursors"
                    stroke="var(--color-orange-brand)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--color-orange-brand)', strokeWidth: 0 }}
                    activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Critical"
                    stroke="var(--color-critical)"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Legend */}
          <div className="flex items-center gap-5 mt-3">
            {[
              { label: 'SIF Precursors', color: 'var(--color-orange-brand)' },
              { label: 'Critical', color: 'var(--color-critical)', dashed: true },
              { label: 'Total (bars)', color: 'var(--color-border)' },
            ].map(({ label, color, dashed }) => (
              <div key={label} className="flex items-center gap-1.5 text-[10.5px] text-[var(--color-text-tertiary)]">
                <span
                  className="inline-block w-4 h-0.5"
                  style={{
                    borderStyle: dashed ? 'dashed' : 'solid',
                    borderTop: `1.5px ${dashed ? 'dashed' : 'solid'} ${color}`,
                    backgroundColor: 'transparent',
                  }}
                />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* SIF Score Distribution — 4 cols */}
        <div className="lg:col-span-4 bg-white border border-[var(--color-border)] rounded-xl p-6">
          <div className="mb-5">
            <h2 className="text-[14px] font-bold text-[var(--color-text-primary)]">
              SIF Score Distribution
            </h2>
            <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">
              Incidents by risk tier
            </p>
          </div>
          {scoreDistData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-[12px] text-[var(--color-text-tertiary)]">
              No score data available
            </div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreDistData.map((_, i) => {
                      const colors = ['var(--color-low)', 'var(--color-medium)', 'var(--color-high)', 'var(--color-critical)'];
                      return <Cell key={i} fill={colors[i % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Facility Risk Table ──────────────────────────────────────────────── */}
      {facilityData.length > 0 && (
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[14px] font-bold text-[var(--color-text-primary)]">Facility Risk Profile</h2>
              <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">
                Incident volume and SIF potential by facility
              </p>
            </div>
            <button
              onClick={() => navigate('/incidents')}
              className="text-[11.5px] font-semibold text-[var(--color-orange-brand)] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {facilityData.map((f) => (
              <div key={f.name} className="flex items-center gap-4">
                <div className="text-[12px] font-medium text-[var(--color-text-primary)] w-40 flex-shrink-0 truncate">
                  {f.name}
                </div>
                <div className="flex-1 h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${f.pct}%`,
                      background: 'var(--color-orange-brand)',
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div className="text-[11.5px] font-bold text-[var(--color-text-primary)] w-10 text-right flex-shrink-0">
                  {f.total}
                </div>
                <div className="text-[11px] text-[var(--color-high)] font-semibold w-14 text-right flex-shrink-0">
                  {f.sif} SIF
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
