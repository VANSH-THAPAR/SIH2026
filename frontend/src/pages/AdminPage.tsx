import { useQuery } from '@tanstack/react-query';
import { fetchDashboardKPIs } from '@/services/api';
import {
  Settings,
  Database,
  Users,
  Activity,
  Shield,
  FileText,
  AlertTriangle,
  Download,
  Calendar,
  ChevronDown,
  Server,
  Globe,
} from 'lucide-react';

export function AdminPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardKPIs,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const systemStats = [
    { label: 'Total Reports Processed', value: kpis?.total_reports ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    { label: 'SIF Precursors Detected', value: kpis?.sif_potential_count ?? 0, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
    { label: 'Total Barrier Mappings', value: kpis?.total_barrier_mappings ?? 0, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
    { label: 'LSR Mappings', value: kpis?.lsr_mappings ?? 0, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  ];

  const modules = [
    {
      name: 'Incident Data Engine',
      description: 'Processes and classifies incoming incident reports using ML models.',
      status: 'OPERATIONAL',
      icon: Database,
    },
    {
      name: 'SIF Analysis Pipeline',
      description: 'Computes SIF scores, exposure status, and causal factor identification.',
      status: 'OPERATIONAL',
      icon: Activity,
    },
    {
      name: 'Barrier Intelligence',
      description: 'Maps incident data to safety barriers and computes failure rates.',
      status: 'OPERATIONAL',
      icon: Shield,
    },
    {
      name: 'Pattern Recognition',
      description: 'Clusters similar incidents and detects recurring hazard patterns.',
      status: 'OPERATIONAL',
      icon: Globe,
    },
    {
      name: 'User Access Management',
      description: 'Role-based access control for HSSE team members.',
      status: 'OPERATIONAL',
      icon: Users,
    },
    {
      name: 'API Gateway',
      description: 'Central API gateway for all HSSE data services and integrations.',
      status: 'OPERATIONAL',
      icon: Server,
    },
  ];

  return (
    <div className="flex flex-col min-h-full bg-[#F4F5F9] p-7 space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administration</h1>
          <p className="text-sm text-slate-500 mt-1">
            System health, configuration, and platform management
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
            System Report
          </button>
        </div>
      </div>

      {/* ─── Platform Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.06)] transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-4 ${stat.bg}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value.toLocaleString()}</div>
              <div className="text-[12px] text-slate-500 font-medium">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* ─── System Modules ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">System Modules</h2>
            <p className="text-[12px] text-slate-400">Real-time status of core platform components</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">All Systems Operational</span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.name}
                className="flex items-start gap-4 p-5 bg-slate-50/80 border border-slate-200/70 rounded-2xl hover:bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-slate-300 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 text-[13px] leading-tight">{mod.name}</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{mod.description}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-semibold text-emerald-600">{mod.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Platform Information ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]">
        <h2 className="text-base font-bold text-slate-900 mb-5">Platform Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: 'Platform', value: 'OIL SIF Intelligence v2.1' },
            { label: 'Organization', value: 'INDIANOIL – MAKASTAS' },
            { label: 'Deployment', value: 'HSSE Intelligence System' },
            { label: 'Data Source', value: 'OIL HSE Platform' },
          ].map((info) => (
            <div key={info.label}>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{info.label}</div>
              <div className="text-[13px] font-semibold text-slate-800">{info.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
