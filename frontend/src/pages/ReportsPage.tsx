import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardKPIs, fetchDashboardTrends } from '@/services/api';
import {
  BarChart3,
  FileText,
  Download,
  Calendar,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Activity,
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

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#D97706',
  LOW: '#16A34A',
};

const EXPOSURE_COLORS = ['#DC2626', '#EA580C', '#D97706', '#94A3B8'];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'facility' | 'barrier'>('summary');

  const { data: kpis, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardKPIs,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: fetchDashboardTrends,
  });

  const isLoading = kpiLoading || trendsLoading;

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-[#F4F5F9] p-7 space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QISD Audits & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive safety reporting, analytics and audit trails
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Apr 24, 2026 - May 28, 2026
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export All Reports
          </button>
        </div>
      </div>

      {/* ─── Summary KPI Tiles ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Incidents', value: kpis?.total_reports ?? 0, icon: FileText, iconBg: 'bg-blue-50 text-blue-600 border-blue-100', note: 'All time' },
          { label: 'SIF Precursors', value: kpis?.sif_potential_count ?? 0, icon: AlertTriangle, iconBg: 'bg-rose-50 text-rose-600 border-rose-100', note: 'High-risk incidents' },
          { label: 'Critical Count', value: kpis?.critical_count ?? 0, icon: TrendingUp, iconBg: 'bg-red-50 text-red-600 border-red-100', note: 'Priority level' },
          { label: 'Failed Barriers', value: kpis?.failed_barriers ?? 0, icon: ShieldCheck, iconBg: 'bg-amber-50 text-amber-600 border-amber-100', note: 'Control failures' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-white border border-slate-200/70 rounded-2xl p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-600">{card.label}</h3>
                  <p className="text-[10px] text-slate-400">{card.note}</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{card.value.toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {/* ─── Tab Nav ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="flex items-center gap-1 p-4 border-b border-slate-100 bg-slate-50/80">
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
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
              <h3 className="font-bold text-slate-800 text-[14px] mb-1">Priority Distribution</h3>
              <p className="text-[12px] text-slate-400 mb-4">Incidents by SIF severity tier</p>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={priorityData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis
                      dataKey="priority"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {priorityData.map((entry: any) => (
                        <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] ?? '#94A3B8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Exposure Distribution Donut */}
            <div>
              <h3 className="font-bold text-slate-800 text-[14px] mb-1">Exposure Classification</h3>
              <p className="text-[12px] text-slate-400 mb-4">Breakdown by documented exposure status</p>
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
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
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
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Site / Facility</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Incidents</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">SIF Potential</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Avg SIF Score</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Critical Count</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {facilityData.map((fac: any, i: number) => {
                  const riskLevel = (fac.avg_sif_score ?? fac.avg_score ?? 0) >= 85 ? 'CRITICAL' : (fac.avg_sif_score ?? fac.avg_score ?? 0) >= 70 ? 'HIGH' : (fac.avg_sif_score ?? fac.avg_score ?? 0) >= 50 ? 'MEDIUM' : 'LOW';
                  const riskStyle: Record<string, string> = {
                    CRITICAL: 'bg-rose-50 text-rose-700 border border-rose-200',
                    HIGH: 'bg-orange-50 text-orange-700 border border-orange-200',
                    MEDIUM: 'bg-amber-50 text-amber-700 border border-amber-200',
                    LOW: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                  };
                  return (
                    <tr key={fac.site_name} className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                      <td className="px-5 py-3.5 font-semibold text-slate-800 text-[13px]">{fac.site_name}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 text-[14px]">{fac.total}</td>
                      <td className="px-5 py-3.5 font-bold text-rose-600 text-[13px]">{fac.sif_potential}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-800 text-[14px]">{(fac.avg_sif_score ?? fac.avg_score ?? '—')}</td>
                      <td className="px-5 py-3.5 font-bold text-red-600 text-[13px]">{fac.critical ?? fac.critical_count ?? 0}</td>
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
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Barrier Name</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Activations</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Failed</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Bypassed</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Failure Rate</th>
                </tr>
              </thead>
              <tbody>
                {barrierData.map((b: any, i: number) => (
                  <tr key={b.barrier_name} className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800 text-[13px]">{b.barrier_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{b.barrier_code}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {b.barrier_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800 text-[14px]">{b.total}</td>
                    <td className="px-5 py-3.5 font-bold text-rose-600 text-[13px]">{b.failed}</td>
                    <td className="px-5 py-3.5 font-bold text-amber-600 text-[13px]">{b.bypassed}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-[13px] ${b.failure_rate > 25 ? 'text-rose-600' : b.failure_rate > 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {b.failure_rate?.toFixed(1)}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${b.failure_rate > 25 ? 'bg-rose-500' : b.failure_rate > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
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
