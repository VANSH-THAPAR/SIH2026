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
  Server,
  Globe,
} from 'lucide-react';
import { ErrorState } from '@/components/ui/Toast';

export function AdminPage() {
  const { data: kpis, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardKPIs,
  });

  if (isLoading) return (
    <div className="flex flex-col min-h-full p-7 space-y-6 max-w-[1600px] mx-auto animate-skeleton" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="h-6 w-40 bg-[var(--color-border)] rounded mb-1" />
          <div className="h-3 w-64 bg-[var(--color-surface-subtle)] rounded" />
        </div>
        <div className="h-8 w-32 bg-[var(--color-border)] rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[var(--color-border)] rounded-xl p-5">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-subtle)] mb-4" />
            <div className="h-6 w-16 bg-[var(--color-border)] rounded mb-1" />
            <div className="h-3 w-32 bg-[var(--color-surface-subtle)] rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden h-[400px]">
        <div className="p-5 border-b border-[var(--color-border)] h-[72px]" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
  if (isError) return <ErrorState message="Failed to load admin stats." />;

  const systemStats = [
    { label: 'Total Reports Processed', value: kpis?.total_reports ?? 0, icon: FileText, color: 'var(--color-info)', bg: 'var(--color-info-bg)', border: 'var(--color-info-border)' },
    { label: 'SIF Precursors Detected', value: kpis?.sif_potential_count ?? 0, icon: AlertTriangle, color: 'var(--color-critical)', bg: 'var(--color-critical-bg)', border: 'var(--color-critical-border)' },
    { label: 'Total Barrier Mappings', value: kpis?.total_barrier_mappings ?? 0, icon: Shield, color: 'var(--color-high)', bg: 'var(--color-high-bg)', border: 'var(--color-high-border)' },
    { label: 'LSR Mappings', value: kpis?.lsr_mappings ?? 0, icon: Activity, color: 'var(--color-low)', bg: 'var(--color-low-bg)', border: 'var(--color-low-border)' },
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
    <div className="flex flex-col min-h-full p-7 space-y-6 max-w-[1600px] mx-auto" style={{ background: 'var(--color-surface)' }}>
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight">Administration</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            System health, configuration, and platform management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--color-border)] rounded-xl text-[12px] font-semibold text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-border-strong)] transition-colors">
            <Download className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
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
              className="bg-white border border-[var(--color-border)] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border mb-4"
                style={{ background: stat.bg, borderColor: stat.border }}
              >
                <Icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{stat.value.toLocaleString()}</div>
              <div className="text-[12px] text-[var(--color-text-secondary)] font-medium">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* ─── System Modules ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--color-text-primary)]">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">System Modules</h2>
            <p className="text-[12px] text-[var(--color-text-secondary)]">Real-time status of core platform components</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[var(--color-low)]"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-low)]"></span>
            </span>
            <span className="text-[11.5px] font-bold text-[var(--color-low)]">All Systems Operational</span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.name}
                className="flex items-start gap-4 p-5 bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-xl hover:bg-white hover:border-[var(--color-border-strong)] hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[var(--color-text-primary)]">
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-[var(--color-text-primary)] text-[13px] leading-tight">{mod.name}</h3>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed mb-3">{mod.description}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-low)]" />
                    <span className="text-[11px] font-bold text-[var(--color-low)]">{mod.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Platform Information ─────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
        <h2 className="text-[15px] font-bold text-[var(--color-text-primary)] mb-5">Platform Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: 'Platform', value: 'SIF Intelligence v2.1' },
            { label: 'Organization', value: 'Corporate HSE' },
            { label: 'Deployment', value: 'HSSE Intelligence System' },
            { label: 'Data Source', value: 'Global Incident Database' },
          ].map((info) => (
            <div key={info.label}>
              <div className="text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">{info.label}</div>
              <div className="text-[13px] font-bold text-[var(--color-text-primary)]">{info.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
