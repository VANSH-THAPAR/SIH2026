import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { AlertTriangle, TrendingUp, Shield, CheckSquare, Activity, Zap } from 'lucide-react';
import { fetchDashboardKPIs, fetchDashboardTrends } from '../services/api';
import { Card } from '../components/ui/Card';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#D97706',
  LOW: '#16A34A',
};

const EXPOSURE_COLORS = ['#2563EB', '#D97706', '#EA580C', '#DC2626'];

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

  if (kpiQuery.isLoading) return <LoadingPage />;
  if (kpiQuery.isError) return <ErrorState onRetry={() => kpiQuery.refetch()} />;

  const kpi = kpiQuery.data!;
  const trends = trendQuery.data;

  const kpiCards = [
    {
      label: 'Total Reports',
      value: kpi.total_reports,
      icon: Activity,
      color: '#1B3A6B',
      bg: '#EFF6FF',
      link: '/incidents',
    },
    {
      label: 'SIF Potential',
      value: kpi.sif_potential_count,
      icon: AlertTriangle,
      color: '#DC2626',
      bg: '#FEF2F2',
      link: '/sif',
    },
    {
      label: 'Critical',
      value: kpi.critical_count,
      icon: Zap,
      color: '#DC2626',
      bg: '#FEF2F2',
      link: '/incidents?priority=CRITICAL',
    },
    {
      label: 'High Priority',
      value: kpi.high_count,
      icon: TrendingUp,
      color: '#EA580C',
      bg: '#FFF7ED',
      link: '/incidents?priority=HIGH',
    },
    {
      label: 'Open Actions',
      value: kpi.open_actions,
      icon: CheckSquare,
      color: '#2563EB',
      bg: '#EFF6FF',
      link: '/actions',
    },
    {
      label: 'Overdue Actions',
      value: kpi.overdue_actions,
      icon: AlertTriangle,
      color: '#DC2626',
      bg: '#FEF2F2',
      link: '/actions',
    },
    {
      label: 'Failed Barriers',
      value: kpi.failed_barriers,
      icon: Shield,
      color: '#EA580C',
      bg: '#FFF7ED',
      link: '/controls',
    },
    {
      label: 'Avg SIF Score',
      value: kpi.avg_sif_score?.toFixed(1) ?? '—',
      icon: Activity,
      color: '#7C3AED',
      bg: '#F5F3FF',
      link: '/sif',
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Command Center</h2>
          <p className="text-xs text-gray-500 mt-0.5">HSSE SIF Precursor Intelligence Dashboard</p>
        </div>
        <div className="text-xs text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 xl:grid-cols-8">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              onClick={() => navigate(card.link)}
              className="bg-white border border-gray-200 rounded-md p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all col-span-2 xl:col-span-1"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{card.label}</span>
                <div
                  className="flex items-center justify-center rounded"
                  style={{ width: 22, height: 22, background: card.bg }}
                >
                  <Icon style={{ width: 12, height: 12, color: card.color }} />
                </div>
              </div>
              <div className="text-xl font-bold" style={{ color: card.color }}>{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="col-span-1">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Priority Breakdown</div>
          <div className="space-y-1.5">
            {[
              { label: 'Critical', value: kpi.critical_count, color: '#DC2626' },
              { label: 'High', value: kpi.high_count, color: '#EA580C' },
              { label: 'Medium', value: kpi.medium_count, color: '#D97706' },
              { label: 'Low', value: kpi.low_count, color: '#16A34A' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-[11px] text-gray-600 flex-1">{item.label}</span>
                <span className="text-[11px] font-semibold text-gray-900">{item.value}</span>
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${kpi.total_reports ? (item.value / kpi.total_reports) * 100 : 0}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="sm" className="col-span-1">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Exposure Status</div>
          <div className="space-y-1.5">
            {[
              { label: 'Documented', value: kpi.documented_exposure, color: '#2563EB' },
              { label: 'Potential', value: kpi.potential_exposure, color: '#D97706' },
              { label: 'Near Miss', value: kpi.near_miss_exposure, color: '#EA580C' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-[11px] text-gray-600 flex-1">{item.label}</span>
                <span className="text-[11px] font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="sm" className="col-span-1">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Barrier & LSR Summary</div>
          <div className="space-y-1.5">
            {[
              { label: 'Barrier Mappings', value: kpi.total_barrier_mappings },
              { label: 'Failed Barriers', value: kpi.failed_barriers },
              { label: 'LSR Mappings', value: kpi.lsr_mappings },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">{item.label}</span>
                <span className="text-[11px] font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      {trends && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {/* Monthly Trend */}
            <Card padding="sm">
              <div className="text-[11px] font-semibold text-gray-700 mb-3">Monthly SIF Trend</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trends.monthly_trend}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={1.5} dot={false} name="Total" />
                  <Line type="monotone" dataKey="sif_potential" stroke="#DC2626" strokeWidth={1.5} dot={false} name="SIF Potential" />
                  <Line type="monotone" dataKey="critical" stroke="#EA580C" strokeWidth={1.5} dot={false} name="Critical" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Priority Distribution */}
            <Card padding="sm">
              <div className="text-[11px] font-semibold text-gray-700 mb-3">Priority Distribution</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trends.priority_distribution} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="priority" type="category" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" radius={[0, 2, 2, 0]}>
                    {trends.priority_distribution.map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] ?? '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Facility Risk */}
            <Card padding="sm" className="col-span-2">
              <div className="text-[11px] font-semibold text-gray-700 mb-3">Facility Risk (Top 10)</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trends.facility_risk.slice(0, 10)}>
                  <XAxis dataKey="site_name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="total" fill="#2563EB" name="Total" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="sif_potential" fill="#DC2626" name="SIF" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Exposure Distribution */}
            <Card padding="sm">
              <div className="text-[11px] font-semibold text-gray-700 mb-3">Exposure Distribution</div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={trends.exposure_distribution}
                    dataKey="count"
                    nameKey="exposure_status"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ exposure_status, percent }: any) =>
                      `${exposure_status} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {trends.exposure_distribution.map((_, i) => (
                      <Cell key={i} fill={EXPOSURE_COLORS[i % EXPOSURE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Activity Hotspots */}
            <Card padding="sm">
              <div className="text-[11px] font-semibold text-gray-700 mb-3">Activity Hotspots</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={trends.activity_hotspots.slice(0, 8)}>
                  <XAxis dataKey="activity" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="#1B3A6B" name="Incidents" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="sif_potential" fill="#DC2626" name="SIF" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* LSR Frequency */}
            <Card padding="sm">
              <div className="text-[11px] font-semibold text-gray-700 mb-3">LSR Frequency</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={trends.lsr_frequency.slice(0, 8)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="rule_code" type="category" tick={{ fontSize: 9 }} width={50} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="#7C3AED" name="Count" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="violated_count" fill="#DC2626" name="Violated" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
