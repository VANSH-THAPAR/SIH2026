import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchIncidents, fetchDashboardKPIs, fetchDashboardTrends } from '../services/api';
import { PriorityBadge, SIFBadge, ExposureBadge } from '../components/ui/Badge';
import { Link } from 'react-router-dom';
import { AlertTriangle, Activity, ShieldAlert, Search, Eye, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
} from 'recharts';
import { ErrorState, EmptyState } from '../components/ui/Toast';

const EXPOSURE_COLORS: Record<string, string> = {
  'Documented Exposure': 'var(--color-critical)',
  'Potential Exposure': 'var(--color-high)',
  'Near Miss Exposure': 'var(--color-medium)',
  'No Documented Exposure': 'var(--color-border-strong)',
};

const DIST_COLORS = [
  'var(--color-low)',
  'var(--color-medium)',
  'var(--color-high)',
  'var(--color-critical)',
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl px-3 py-2.5 shadow-lg text-[11.5px]">
      <div className="font-semibold text-[var(--color-text-primary)] mb-1">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="text-[var(--color-text-secondary)]">{entry.name ?? 'Count'}</span>
          <span className="font-bold text-[var(--color-text-primary)]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SIFIntelligence() {
  const [search, setSearch] = useState('');

  const { data: kpis, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardKPIs,
  });

  const { data: trends } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: fetchDashboardTrends,
  });

  const { data: incidents, isLoading: incidentsLoading, isError } = useQuery({
    queryKey: ['sif-incidents', search],
    queryFn: () => fetchIncidents({ sif_only: true, page_size: 100, search }),
  });

  const isLoading = kpiLoading || incidentsLoading;

  const filteredIncidents = incidents?.items ?? [];

  const scoreDistData = trends?.sif_score_distribution?.map((d: any) => ({
    range: d.range, count: d.count,
  })) ?? [];

  const exposureData = trends?.exposure_distribution?.map((d: any) => ({
    name: d.exposure_status ?? d.type,
    value: d.count,
    color: EXPOSURE_COLORS[d.exposure_status ?? d.type] ?? 'var(--color-border-strong)',
  })) ?? [];

  if (isLoading) return (
    <div className="p-7 space-y-6 max-w-[1600px] mx-auto animate-skeleton">
      <div>
        <div className="h-6 w-48 bg-[var(--color-border)] rounded mb-1" />
        <div className="h-3 w-72 bg-[var(--color-surface-strong)] rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[var(--color-border)] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-strong)]" />
              <div className="h-3 w-24 bg-[var(--color-surface-strong)] rounded" />
            </div>
            <div className="h-8 w-16 bg-[var(--color-border)] rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 h-[270px]" />
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 h-[270px]" />
      </div>
      <div className="bg-white border border-[var(--color-border)] rounded-xl h-[400px]" />
    </div>
  );
  if (isError) return <ErrorState message="Failed to load Nirikshan data." />;

  return (
    <div className="p-7 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight">
          Nirikshan
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
          Serious Injury and Fatality precursor incidents and exposure analysis
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'SIF Potential Incidents',
            value: kpis?.sif_potential_count ?? '—',
            icon: AlertTriangle,
            accent: 'var(--color-critical)',
            accentBg: 'var(--color-critical-bg)',
          },
          {
            label: 'Average SIF Score',
            value: kpis?.avg_sif_score != null ? kpis.avg_sif_score.toFixed(1) : '—',
            icon: Activity,
            accent: 'var(--color-high)',
            accentBg: 'var(--color-high-bg)',
          },
          {
            label: 'Critical Priority',
            value: kpis?.critical_count ?? '—',
            icon: ShieldAlert,
            accent: 'var(--color-primary)',
            accentBg: 'var(--color-surface-strong)',
          },
          {
            label: 'Documented Exposure',
            value: kpis?.documented_exposure ?? '—',
            icon: Eye,
            accent: 'var(--color-info)',
            accentBg: 'var(--color-info-bg)',
          },
        ].map(({ label, value, icon: Icon, accent, accentBg }) => (
          <div
            key={label}
            className="bg-white border border-[var(--color-border)] rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: accentBg }}
              >
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
              <span className="text-[11.5px] font-semibold text-[var(--color-text-secondary)] leading-tight">
                {label}
              </span>
            </div>
            <div className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SIF Score Distribution */}
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-1">
            SIF Score Distribution
          </h2>
          <p className="text-[11.5px] text-[var(--color-text-tertiary)] mb-5">
            Incidents by risk classification tier
          </p>
          {scoreDistData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-[12px] text-[var(--color-text-tertiary)]">
              No distribution data yet
            </div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreDistData.map((_, i) => (
                      <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Exposure Distribution */}
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-1">
            Exposure Status Breakdown
          </h2>
          <p className="text-[11.5px] text-[var(--color-text-tertiary)] mb-5">
            Distribution by exposure severity
          </p>
          {exposureData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-[12px] text-[var(--color-text-tertiary)]">
              No exposure data yet
            </div>
          ) : (
            <div className="flex items-center gap-6 h-44">
              <div className="w-40 h-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exposureData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {exposureData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} incidents`, name]}
                      contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {exposureData.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between text-[11.5px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[var(--color-text-secondary)] font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-[var(--color-text-primary)]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SIF Incidents Table ──────────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-bold text-[var(--color-text-primary)]">
              SIF Potential Incidents
            </h2>
            <p className="text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">
              {filteredIncidents.length} incidents flagged as SIF precursors
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SIF incidents…"
              className="pl-9 pr-4 py-2 text-[12px] border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] w-52 transition-colors text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)]"
            />
          </div>
        </div>

        {filteredIncidents.length === 0 ? (
          <EmptyState
            title="No SIF incidents found"
            description="Incidents flagged with SIF potential will appear here"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  {['ID', 'Incident', 'SIF Score', 'Exposure', 'Priority', 'Site', 'Action'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10.5px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc, i) => (
                  <tr
                    key={inc.id}
                    className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors last:border-0 ${i % 2 !== 0 ? 'bg-[var(--color-surface)]/40' : ''}`}
                  >
                    <td className="px-5 py-3.5 font-mono text-[10px] text-[var(--color-text-tertiary)]">
                      <Link to={`/incidents/${inc.id}`} className="hover:text-[var(--color-primary)] transition-colors">
                        {inc.id.slice(0, 12)}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="font-semibold text-[var(--color-text-primary)] line-clamp-1">
                        <Link to={`/incidents/${inc.id}`} className="hover:text-[var(--color-primary)] transition-colors">
                          {inc.title}
                        </Link>
                      </div>
                      {inc.hazard && (
                        <div className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5 truncate">{inc.hazard}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <SIFBadge score={inc.sif_score} classification={inc.sif_classification} />
                    </td>
                    <td className="px-5 py-3.5">
                      <ExposureBadge status={inc.exposure_status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={inc.priority} size="xs" />
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{inc.site_name}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/incidents/${inc.id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-[var(--color-primary)] font-semibold hover:underline"
                      >
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
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
