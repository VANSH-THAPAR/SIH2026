import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  AlertTriangle,
  ShieldCheck,
  Brain,
  Network,
  FileText,
  Settings,
  LogOut,
  SquareActivity,
  ClipboardCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const PRIMARY_NAV = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard, exact: true },
  { path: '/incidents', label: 'Incident Board', icon: AlertTriangle },
  { path: '/sif', label: 'SIF Intelligence', icon: SquareActivity },
  { path: '/controls', label: 'Safety Controls', icon: ShieldCheck },
  { path: '/patterns', label: 'Pattern Intel', icon: Network },
  { path: '/memory', label: 'Safety Memory', icon: Brain },
  { path: '/actions', label: 'Action Management', icon: ClipboardCheck },
];

const SECONDARY_NAV = [
  { path: '/reports', label: 'HSSE Reports', icon: FileText },
  { path: '/admin', label: 'Administration', icon: Settings },
];

function NavItem({ path, label, icon: Icon, exact }: typeof PRIMARY_NAV[0]) {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === path
    : location.pathname.startsWith(path) && path !== '/';

  return (
    <NavLink
      to={path}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-100',
        isActive
          ? 'bg-[var(--color-orange-light)] text-[var(--color-orange-brand)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]'
      )}
    >
      <Icon
        className={clsx(
          'w-4 h-4 flex-shrink-0',
          isActive ? 'text-[var(--color-orange-brand)]' : 'text-[var(--color-text-tertiary)]'
        )}
      />
      <span className="truncate">{label}</span>
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-orange-brand)] flex-shrink-0" />
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'OP';
  const username = user?.email ? user.email.split('@')[0] : 'Operator';
  const roleLabel = user?.role === 'hse' ? 'HSE Manager' : 'Field Reporter';

  return (
    <div
      className="flex flex-col h-full bg-[var(--color-surface-elevated)] border-r border-[var(--color-border)]"
      style={{ width: 216, flexShrink: 0 }}
    >
      {/* Brand */}
      <div className="px-4 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-orange-brand)' }}
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path
                d="M10 2 L16 5.5 L16 12.5 C16 16 13 18.5 10 19.5 C7 18.5 4 16 4 12.5 L4 5.5 Z"
                fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round"
              />
              <path
                d="M8 10.5 C8 9 9 8 10 8 C11 8 12 9 12 10.5 C12 11.5 11 12 10 12.5 C9 13 8 13.5 8 15"
                stroke="white" strokeWidth="1.3" strokeLinecap="round" fill="none"
              />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-bold text-[var(--color-text-primary)] tracking-tight leading-none">
              SIF Intelligence
            </div>
            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5 font-medium tracking-wide uppercase">
              HSE Risk Platform
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        <div className="mb-1 px-1">
          <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-widest">
            Operations
          </span>
        </div>
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}

        <div className="mt-4 mb-1 px-1">
          <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-widest">
            System
          </span>
        </div>
        {SECONDARY_NAV.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{
              background:
                user?.role === 'reporter'
                  ? 'var(--color-low)'
                  : 'var(--color-orange-brand)',
            }}
          >
            {initials}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <div className="text-[11.5px] font-semibold text-[var(--color-text-primary)] truncate">
              {username}
            </div>
            <div className="text-[10px] text-[var(--color-text-tertiary)]">{roleLabel}</div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-critical)] hover:bg-[var(--color-critical-bg)] transition-colors flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
