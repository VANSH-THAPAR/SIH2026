import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronDown, LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function Header() {
  const [localSearch, setLocalSearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      navigate(`/incidents?search=${encodeURIComponent(localSearch.trim())}`);
      setLocalSearch('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'OP';
  const roleLabel = user?.role === 'hse' ? 'HSE Manager' : 'Field Reporter';

  return (
    <header
      className="flex items-center justify-between px-5 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
      style={{ height: 52, flexShrink: 0 }}
    >
      {/* Global Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search incidents, facilities, hazards…"
            className="w-full pl-9 pr-8 py-2 text-[12.5px] border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] placeholder-[var(--color-text-tertiary)] text-[var(--color-text-primary)] transition-all"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </form>

      {/* Right section */}
      <div className="flex items-center gap-2 ml-4">
        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-strong)] transition-colors"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{
                background: user?.role === 'reporter'
                  ? 'var(--color-low)'
                  : 'var(--color-primary)',
              }}
            >
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[11.5px] font-semibold text-[var(--color-text-primary)] leading-none">
                {user?.email?.split('@')[0] || 'Operator'}
              </div>
              <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{roleLabel}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-[var(--color-text-tertiary)] hidden md:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-11 w-56 bg-white border border-[var(--color-border)] rounded-xl z-50 shadow-lg overflow-hidden animate-fade-in">
              <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate">
                  {user?.email || 'user@indianoil.in'}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {user?.role === 'hse' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-info)] bg-[var(--color-info-bg)] px-1.5 py-0.5 rounded">
                      <ShieldCheck className="w-2.5 h-2.5" /> HSE Manager
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-low)] bg-[var(--color-low-bg)] px-1.5 py-0.5 rounded">
                      <UserCheck className="w-2.5 h-2.5" /> Field Reporter
                    </span>
                  )}
                </div>
              </div>
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-semibold text-[var(--color-critical)] hover:bg-[var(--color-critical-bg)] rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
