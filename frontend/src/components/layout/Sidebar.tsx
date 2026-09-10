import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  AlertTriangle,
  ShieldCheck,
  Brain,
  BarChart3,
  Settings,
  Flame,
  Radio,
  PlusCircle,
} from 'lucide-react';
import { useState } from 'react';
import { NewReportForm } from '../forms/NewReportForm';

const NAV_ITEMS = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard, exact: true },
  { path: '/incidents', label: 'Incident Board', icon: AlertTriangle },
  { path: '/sif', label: 'SIF Intelligence', icon: Flame },
  { path: '/controls', label: 'Safety Controls', icon: ShieldCheck },
  { path: '/patterns', label: 'Pattern Intel', icon: Brain },
  { path: '/reports', label: 'QISD Audits', icon: BarChart3 },
  { path: '/admin', label: 'Administration', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);

  return (
    <div
      className="flex flex-col h-full"
      style={{ width: 220, background: '#FFFFFF', flexShrink: 0, borderRight: '1px solid #F0F0F0' }}
    >
      {/* Logo / Brand */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 mb-0.5">
          {/* Logo mark */}
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)' }}
          >
            <span className="text-white font-black text-xs tracking-tight">OIL</span>
          </div>
          <div>
            <div className="font-black text-[13px] leading-none text-slate-900 tracking-tight">INDIANOIL</div>
            <div className="text-[10px] text-slate-400 tracking-wider uppercase font-medium mt-0.5">MAKASTAS</div>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 mt-2 font-medium">HSSE Intelligence System</div>
      </div>

      {/* Live Telemetry pill */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Live Telemetry</span>
          <Radio className="w-3 h-3 text-emerald-500 ml-auto" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto pt-2 px-3">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && item.path !== '/';

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                  isActive
                    ? 'bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                )}
              >
                <Icon
                  className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-slate-400')}
                />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* New Report CTA */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setIsNewReportOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: 'linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
          }}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          New SIF Report
        </button>
      </div>

      {/* Bottom user section */}
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-full text-white text-[10px] font-bold flex-shrink-0"
            style={{ width: 28, height: 28, background: '#1B3A6B' }}
          >
            OP
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <div className="text-slate-800 text-[12px] font-semibold truncate">OPS Administrator</div>
            <div className="text-slate-400 text-[10px]">HSE Manager</div>
          </div>
        </div>
      </div>

      {isNewReportOpen && (
        <NewReportForm onClose={() => setIsNewReportOpen(false)} />
      )}
    </div>
  );
}
