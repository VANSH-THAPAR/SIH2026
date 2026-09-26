import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchIncidents, fetchDashboardKPIs, fetchDashboardTrends } from '@/services/api';
import { PriorityBadge, SIFBadge, ExposureBadge } from '@/components/ui/Badge';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Activity,
  ShieldAlert,
  TrendingUp,
  Search,
  ChevronDown,
  Download,
  Calendar,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const EXPOSURE_COLORS: Record<string, string> = {
  'Documented Exposure': '#DC2626',
  'Potential Exposure': '#EA580C',
  'Near Miss Exposure': '#D97706',
  'No Documented Exposure': '#94A3B8',
};

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

  const { data: incidents, isLoading: incidentsLoading, error } = useQuery({
    queryKey: ['sif-incidents', search],
    queryFn: () => fetchIncidents({ sif_only: true, page_size: 100, search }),
  });

  const isLoading = kpiLoading || incidentsLoading;

  const filteredIncidents = incidents?.items ?? [];

  // Build score distribution data from trends
  const scoreDistData = trends?.sif_score_distribution?.map((d: any) => ({
    range: d.range,
    count: d.count,
  })) ?? [];

  const exposureData = trends?.exposure_distribution?.map((d: any) => ({
    name: d.exposure_status ?? d.type,
    value: d.count,
    color: EXPOSURE_COLORS[d.exposure_status ?? d.type] ?? '#94A3B8',
  })) ?? [];

  const kpiCards = [
    {
      id: 'total-sif',
      label: 'Total SIF Potential',
      value: kpis?.sif_potential_count ?? 0,
      icon: AlertTriangle,
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
    },
    {
      id: 'avg-score',
      label: 'Avg SIF Score',
      value: (kpis?.avg_sif_score ?? 0).toFixed(1),
      icon: Activity,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
    },
    {
      id: 'critical-sif',
      label: 'Critical Priority',
      value: kpis?.critical_count ?? 0,
      icon: ShieldAlert,
      iconBg: 'bg-red-50 text-red-600 border border-red-100',
    },
    {
      id: 'documented',
      label: 'Documented Exposure',
      value: kpis?.documented_exposure ?? 0,
      icon: TrendingUp,
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !incidents) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Failed to load SIF intelligence data
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-[#F4F5F9] p-7 space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SIF Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">
            Deep dive into Serious Injury & Fatality precursor incidents and exposure patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Report
          </button>
        </div>
      </div>

      {/* ─── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.06)] transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-600">{card.label}</h3>
                  </div>
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-4">
                <span className="text-2xl font-bold tracking-tight text-slate-900">{card.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Charts Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SIF Score Distribution */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">SIF Score Distribution</h2>
              <p className="text-xs text-slate-400 mt-0.5">Incidents by risk classification tier</p>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    boxShadow: '0 8px 20px -4px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  fill="#3B82F6"
                >
                  {scoreDistData.map((entry: any, index: number) => {
                    const colors = ['#10B981', '#D97706', '#EA580C', '#DC2626'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exposure Distribution */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Exposure Status Breakdown</h2>
              <p className="text-xs text-slate-400 mt-0.5">Distribution by exposure severity</p>
            </div>
          </div>
          <div className="flex items-center gap-6 h-[200px]">
            <div className="flex-shrink-0 w-[180px] h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={exposureData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {exposureData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} incidents`, name]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {exposureData.map((item: any) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Incidents Table ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-900">SIF Potential Incidents</h2>
            <p className="text-xs text-slate-400 mt-0.5">{filteredIncidents.length} incidents flagged as SIF precursors</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incidents..."
              className="pl-9 pr-4 py-2 text-[12px] border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-52 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredIncidents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              No SIF incidents found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50/80 sticky top-0">
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Incident Title</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">SIF Score</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Exposure</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Site</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc, i) => (
                  <tr
                    key={inc.id}
                    className={`border-b border-slate-50 hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                  >
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      <Link to={`/incidents/${inc.id}`} className="hover:text-blue-600 transition-colors">{inc.id}</Link>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="font-semibold text-slate-800 text-[13px] line-clamp-1 hover:text-blue-600 transition-colors">
                        <Link to={`/incidents/${inc.id}`}>{inc.title}</Link>
                      </div>
                      {inc.hazard && (
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">{inc.hazard}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <SIFBadge score={inc.sif_score} classification={inc.sif_classification} />
                    </td>
                    <td className="px-5 py-3.5">
                      <ExposureBadge status={inc.exposure_status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={inc.priority} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-[12px]">{inc.site_name}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/incidents/${inc.id}`}
                        className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
