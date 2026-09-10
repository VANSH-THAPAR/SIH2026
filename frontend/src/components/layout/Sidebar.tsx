import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  AlertTriangle,
  ShieldCheck,
  Brain,
  CheckSquare,
  BarChart3,
  Settings,
  Flame,
  BookOpen,
  Activity,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard, exact: true },
  { path: '/incidents', label: 'Incident Board', icon: AlertTriangle },
  { path: '/sif', label: 'SIF Intelligence', icon: Flame },
  { path: '/controls', label: 'Safety Controls', icon: ShieldCheck },
  { path: '/memory', label: 'Safety Memory', icon: BookOpen },
  { path: '/patterns', label: 'Pattern Intel', icon: Brain },
  { path: '/actions', label: 'Actions Board', icon: CheckSquare },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/admin', label: 'Administration', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div
      className="flex flex-col h-full"
      style={{ width: 240, background: '#0F2744', flexShrink: 0 }}
    >
      {/* Logo / Brand */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded"
            style={{ width: 28, height: 28, background: '#2563EB' }}
          >
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-xs leading-tight">OIL SIF</div>
            <div className="text-blue-300 text-[10px]">Intelligence Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="px-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/60 px-2 py-2 mt-1">
            Main Menu
          </p>
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
                  'flex items-center gap-2.5 px-3 py-2 rounded text-[12px] font-medium mb-0.5 transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-100/70 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-2">
          <div
            className="flex items-center justify-center rounded-full text-white text-[10px] font-bold"
            style={{ width: 24, height: 24, background: '#2563EB' }}
          >
            OP
          </div>
          <div className="overflow-hidden">
            <div className="text-white text-[11px] font-medium truncate">OPS Administrator</div>
            <div className="text-blue-400/60 text-[10px]">HSE Manager</div>
          </div>
        </div>
      </div>
    </div>
  );
}
