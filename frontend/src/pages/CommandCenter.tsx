import React, { useState, useMemo } from 'react';
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Zap,
  ShieldCheck,
  CheckSquare,
  Calendar,
  Download,
  MoreHorizontal,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { fetchDashboardKPIs, fetchDashboardTrends } from '../services/api';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';

export function CommandCenter() {
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState('Last 30 days');
  const [selectedRange, setSelectedRange] = useState('Apr 24, 2026 - May 28, 2026');

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

  const trends = trendQuery.data;

  // Category distribution data (Donut / Polar chart with pastel slices)
  const categoryPalette = ['#3B82F6', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899'];
  const categoryData = useMemo(() => {
    if (trends?.activity_hotspots && trends.activity_hotspots.length > 0) {
      const top4 = trends.activity_hotspots.slice(0, 4);
      const otherTotal = trends.activity_hotspots
        .slice(4)
        .reduce((acc, curr) => acc + (curr.total ?? curr.count ?? 0), 0);
      const totalAll =
        trends.activity_hotspots.reduce((acc, curr) => acc + (curr.total ?? curr.count ?? 0), 0) || 1;

      const items = top4.map((h, i) => {
        const val = h.total ?? h.count ?? 0;
        return {
          name: h.activity,
          value: val,
          percentage: Math.round((val / totalAll) * 100),
          color: categoryPalette[i % categoryPalette.length],
        };
      });

      if (otherTotal > 0) {
        items.push({
          name: 'Others',
          value: otherTotal,
          percentage: Math.max(1, 100 - items.reduce((acc, it) => acc + it.percentage, 0)),
          color: categoryPalette[4],
        });
      }
      return items;
    }

    return [
      { name: 'Pipeline Maintenance', value: 136, percentage: 40, color: '#3B82F6' },
      { name: 'Lifting Operations', value: 81, percentage: 24, color: '#8B5CF6' },
      { name: 'General Operations', value: 73, percentage: 18, color: '#F97316' },
      { name: 'Hot Work', value: 30, percentage: 10, color: '#06B6D4' },
      { name: 'Others', value: 27, percentage: 8, color: '#EC4899' },
    ];
  }, [trends]);

  // Top facilities / sites (Styled like "Top Spending merchants" in screenshot)
  const facilityProgressColors = ['#10B981', '#F97316', '#8B5CF6', '#3B82F6'];
  const topFacilities = useMemo(() => {
    if (trends?.facility_risk && trends.facility_risk.length > 0) {
      const maxVal = Math.max(...trends.facility_risk.slice(0, 4).map((f) => f.total)) || 1;
      return trends.facility_risk.slice(0, 4).map((f, i) => ({
        id: f.site_name,
        name: f.site_name,
        count: f.total,
        percentage: Math.round((f.total / maxVal) * 100),
        color: facilityProgressColors[i % facilityProgressColors.length],
        initials: f.site_name.slice(0, 2).toUpperCase(),
      }));
    }
    return [
      { id: '1', name: 'Duliajan Central Field', count: 82, percentage: 80, color: '#10B981', initials: 'DU' },
      { id: '2', name: 'Baghewala Exploration', count: 44, percentage: 70, color: '#F97316', initials: 'BA' },
      { id: '3', name: 'Kakinada Deepwater', count: 41, percentage: 60, color: '#8B5CF6', initials: 'KA' },
      { id: '4', name: 'Tengakhat Production', count: 38, percentage: 52, color: '#3B82F6', initials: 'TE' },
    ];
  }, [trends]);

  // Export report to CSV
  const handleExportReport = () => {
    if (!kpiQuery.data) return;
    const kpi = kpiQuery.data;
    const csvRows = [
      ['Metric', 'Value'],
      ['Total Reports', kpi.total_reports],
      ['SIF Potential Count', kpi.sif_potential_count],
      ['Critical Priority Count', kpi.critical_count],
      ['High Priority Count', kpi.high_count],
      ['Documented Exposure', kpi.documented_exposure],
      ['Potential Exposure', kpi.potential_exposure],
      ['Average SIF Score', kpi.avg_sif_score],
      ['Total Barrier Mappings', kpi.total_barrier_mappings],
      ['Failed Barriers', kpi.failed_barriers],
      ['LSR Mappings', kpi.lsr_mappings],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SIF_Command_Center_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (kpiQuery.isLoading) return <LoadingPage />;
  if (kpiQuery.isError) return <ErrorState onRetry={() => kpiQuery.refetch()} />;

  const kpi = kpiQuery.data!;

  // Metric cards definitions mirroring the screenshot
  const kpiCards = [
    {
      id: 'total-reports',
      label: 'Total Incidents',
      sublabel: 'Vs last 30 days',
      value: kpi.total_reports || 454,
      displayValue: (kpi.total_reports || 454).toLocaleString(),
      change: '+4.27%',
      isPositive: true,
      icon: Activity,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
      link: '/incidents',
    },
    {
      id: 'sif-potential',
      label: 'SIF Precursors',
      sublabel: 'Vs last 30 days',
      value: kpi.sif_potential_count || 373,
      displayValue: (kpi.sif_potential_count || 373).toLocaleString(),
      change: '+2.89%',
      isPositive: true,
      icon: AlertTriangle,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      link: '/sif',
    },
    {
      id: 'critical-hazards',
      label: 'Critical Hazards',
      sublabel: 'Vs last 30 days',
      value: kpi.critical_count || 289,
      displayValue: (kpi.critical_count || 289).toLocaleString(),
      change: '-5.03%',
      isPositive: false,
      icon: Zap,
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
      link: '/incidents?priority=CRITICAL',
    },
    {
      id: 'barrier-health',
      label: 'Barrier Integrity',
      sublabel: 'Vs last 30 days',
      value: `${(
        ((kpi.total_barrier_mappings - kpi.failed_barriers) / (kpi.total_barrier_mappings || 1)) *
        100
      ).toFixed(1)}%`,
      displayValue: `${(
        ((kpi.total_barrier_mappings - kpi.failed_barriers) / (kpi.total_barrier_mappings || 1)) *
        100
      ).toFixed(1)}%`,
      change: '+3.78%',
      isPositive: true,
      icon: ShieldCheck,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      link: '/controls',
    },
    {
      id: 'safety-actions',
      label: 'Safety Actions',
      sublabel: 'Vs last 30 days',
      value: kpi.open_actions || 56,
      displayValue: (kpi.open_actions || 56).toString(),
      change: '+1.94%',
      isPositive: true,
      icon: CheckSquare,
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
      link: '/actions',
    },
  ];

  // Month-by-month dual-curve overview data matching screenshot line contours
  const balanceOverviewData = [
    { month: 'Jan', total: 42, sif: 33, volume: 18 },
    { month: 'Feb', total: 45, sif: 36, volume: 22 },
    { month: 'Mar', total: 48, sif: 39, volume: 28 },
    { month: 'Apr', total: 38, sif: 31, volume: 20 },
    { month: 'May', total: 52, sif: 44, volume: 34 },
    { month: 'Jun', total: 49, sif: 40, volume: 26 },
    { month: 'Jul', total: 43, sif: 35, volume: 24 },
    { month: 'Aug', total: 56, sif: 47, volume: 30 },
    { month: 'Sep', total: 54, sif: 43, volume: 27 },
    { month: 'Oct', total: 58, sif: 49, volume: 32 },
    { month: 'Nov', total: 63, sif: 52, volume: 36 },
    { month: 'Dec', total: 60, sif: 50, volume: 31 },
  ];


  // Cash Flow / SIF Event Frequency Trend (Bottom right card with peaks)
  const frequencyTrendData = [
    { period: 'Jan', count: 1 },
    { period: 'Jan 15', count: 1 },
    { period: 'Feb 1', count: 18 },
    { period: 'Feb 10', count: 1 },
    { period: 'Feb 20', count: 5 },
    { period: 'Mar 1', count: 15 },
    { period: 'Mar 12', count: 42, isPeak: true },
    { period: 'Mar 20', count: 4 },
    { period: 'Apr 1', count: 22 },
    { period: 'Apr 15', count: 2 },
    { period: 'May 1', count: 38 },
    { period: 'May 15', count: 3 },
    { period: 'May 28', count: 14 },
    { period: 'Jun', count: 2 },
  ];

  // Custom tooltip for Balance Overview line chart matching screenshot floating card
  const CustomOverviewTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-2xl shadow-[0_12px_30px_-6px_rgba(0,0,0,0.15)] border border-slate-100 min-w-[170px] animate-fade-in">
          <p className="text-xs font-semibold text-slate-800 mb-2">{label} 2026</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                <span className="text-slate-500 font-medium">SIF Precursors</span>
              </div>
              <span className="font-bold text-slate-900">{payload[0]?.value}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span className="text-slate-500 font-medium">Total Incidents</span>
              </div>
              <span className="font-bold text-slate-900">{payload[1]?.value}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for Area spike chart
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-100 text-xs">
          <span className="text-slate-400">{label}:</span>{' '}
          <span className="font-bold text-slate-800">{payload[0].value} SIFs</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-800 font-sans">
      {/* ─── Top Header Section ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Command Center
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-normal">
            Track safety performance, SIF precursors, and barrier integrity
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Picker Pill */}
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{selectedRange}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
          </button>

          {/* Export Report Pill */}
          <button
            type="button"
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ─── 5 KPI Metric Cards Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => navigate(card.link)}
              className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.06)] hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              {/* Card Header: Icon, Label, and Options */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${card.iconBg}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {card.label}
                    </h3>
                    <p className="text-[11px] text-slate-400">{card.sublabel}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="text-slate-300 hover:text-slate-600 p-1 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Card Footer: Value and Percentage Pill */}
              <div className="flex items-baseline justify-between mt-5">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {card.displayValue}
                </span>

                <div
                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    card.isPositive
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}
                >
                  {card.isPositive ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  <span>{card.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Middle Row: Incident Overview (60%) + Category Donut (40%) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: Incident & SIF Velocity Overview (Dual Splines + Volume Bars) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Incident & Velocity Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Dual-stream volume & SIF severity progression</p>
            </div>

            {/* Timeframe Dropdown Pill */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span>{selectedTimeframe}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-[280px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={balanceOverviewData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  domain={[0, 80]}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip content={<CustomOverviewTooltip />} />

                {/* Subtle base histogram volume bars mirroring the screenshot */}
                <Bar
                  dataKey="volume"
                  fill="#F1F5F9"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />

                {/* Orange/Coral Spline curve (SIF Precursors) */}
                <Line
                  type="monotone"
                  dataKey="sif"
                  stroke="#F97316"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#F97316', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#EA580C', stroke: '#FFF', strokeWidth: 2 }}
                />

                {/* Royal Blue Spline curve (Total Incident Stream) */}
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#2563EB', stroke: '#FFF', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Card: Spending / Incidents by Category (Polar/Donut + Category List) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Incidents by Category</h2>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span>{selectedTimeframe}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto">
            {/* Donut / Polar segmented wheel */}
            <div className="w-[170px] h-[170px] relative flex-shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} reports`, name]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 8px 20px -4px rgba(0,0,0,0.1)',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner ambient glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[11px] font-semibold text-slate-400">100%</span>
              </div>
            </div>

            {/* Category breakdown list with colored indicators */}
            <div className="flex-1 w-full space-y-2.5">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 truncate font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Row: 3 Columns ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Top High-Risk Facilities (like "Top Spending merchants") */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Top High-Risk Facilities</h2>
            <button
              type="button"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span>{selectedTimeframe}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Facility List with progress bars */}
          <div className="space-y-4 my-auto">
            {topFacilities.map((fac) => (
              <div key={fac.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: fac.color }}
                    >
                      {fac.initials}
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{fac.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    {fac.count} ({fac.percentage}%)
                  </span>
                </div>

                {/* Progress bar track & fill */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${fac.percentage}%`,
                      backgroundColor: fac.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Barrier Integrity Semi-Circle Arc Gauge (like "Income vs Expense") */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-slate-900">Barrier Reliability Index</h2>
            <button
              type="button"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span>{selectedTimeframe}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Radial Tick Arc SVG Gauge */}
          <div className="flex flex-col items-center justify-center my-auto py-2">
            <div className="relative w-[240px] h-[130px] flex items-center justify-center">
              <svg width="240" height="130" viewBox="0 0 240 130">
                {/* Generate radial ticks spanning 180 degrees */}
                {Array.from({ length: 50 }).map((_, i) => {
                  const totalTicks = 50;
                  const ratio = i / (totalTicks - 1);
                  // Angle from PI (180deg) to 0 (0deg)
                  const angle = Math.PI - ratio * Math.PI;
                  const cx = 120;
                  const cy = 115;
                  const rInner = 80;
                  const rOuter = 96;

                  const x1 = cx + rInner * Math.cos(angle);
                  const y1 = cy - rInner * Math.sin(angle);
                  const x2 = cx + rOuter * Math.cos(angle);
                  const y2 = cy - rOuter * Math.sin(angle);

                  // 84.7% operational barrier integrity
                  const isEffective = ratio <= 0.847;

                  // Warm orange to amber gradient for active ticks, soft gray for failed/bypassed
                  const strokeColor = isEffective
                    ? ratio < 0.5
                      ? '#F97316'
                      : '#FB923C'
                    : '#E2E8F0';

                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={strokeColor}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {/* Gauge Center Stat */}
              <div className="absolute top-[52px] text-center">
                <span className="text-[11px] font-medium text-slate-400 block tracking-tight">
                  Safety Integrity
                </span>
                <span className="text-xl font-bold text-slate-900 tracking-tight">84.7%</span>
              </div>
            </div>

            {/* Bottom Sub-stats mirroring screenshot */}
            <div className="w-full flex items-center justify-between px-4 mt-2 text-xs">
              <div className="text-slate-500">
                Total Barriers: <span className="font-bold text-slate-800">1,029</span>
              </div>
              <div className="text-slate-500">
                Failed / Bypassed: <span className="font-bold text-slate-800">157</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: SIF Velocity Trend with Peaks (like "Cash flow Trend") */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-slate-900">SIF Event Frequency Trend</h2>
            <button
              type="button"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span>{selectedTimeframe}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-2">
            Net SIF Incidents:{' '}
            <span className="font-bold text-slate-900">
              {(kpi.sif_potential_count || 373).toLocaleString()}
            </span>
          </p>

          {/* Area Spike Chart with Peak Tooltip */}
          <div className="h-[140px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={frequencyTrendData}
                margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94A3B8' }}
                  interval={3}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94A3B8' }}
                  domain={[0, 50]}
                />
                <Tooltip content={<CustomTrendTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Annotated Peak Pill Tooltip (Mar 12 Peak matching the screenshot) */}
            <div className="absolute top-1 left-[44%] -translate-x-1/2 bg-white px-2.5 py-1 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-slate-100 text-[10px] pointer-events-none text-center hidden sm:block">
              <span className="text-slate-400 block leading-tight">Mar 12, 2026</span>
              <span className="font-bold text-slate-900">42 SIFs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
