import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, X, ChevronDown, LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function Header() {
  const [localSearch, setLocalSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'OP';

  const roleLabel = user?.role === 'hse' ? 'HSE Manager' : 'Field Reporter';

  return (
    <header
      className="flex items-center justify-between px-6 border-b border-slate-100 bg-white"
      style={{ height: 56, flexShrink: 0 }}
    >
      {/* Center: Global Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-auto">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search incidents, wells, hazards, sites, barriers..."
            className="w-full pl-10 pr-4 py-2.5 text-[13px] border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder-slate-400 text-slate-700 transition-all"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <Bell className="w-4.5 h-4.5" />
            <span
              className="absolute top-1.5 right-1.5 rounded-full bg-rose-500 border-2 border-white"
              style={{ width: 8, height: 8 }}
            />
          </button>
          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl z-50 shadow-[0_8px_24px_rgba(0,0,0,0.1)] overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-[13px] font-bold text-slate-800">Notifications</h3>
                </div>
                <div className="p-5">
                  <p className="text-[12px] text-slate-400 text-center py-4">No new notifications</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div
              className="flex items-center justify-center rounded-full text-white text-[11px] font-bold"
              style={{
                width: 28,
                height: 28,
                background:
                  user?.role === 'reporter'
                    ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
                    : 'linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)',
              }}
            >
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[12px] font-semibold text-slate-800 leading-none mb-0.5 truncate max-w-[130px]">
                {user?.email ? user.email.split('@')[0] : 'OPS Admin'}
              </div>
              <div className="text-[10px] text-slate-400">{roleLabel}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-64 bg-white border border-slate-200 rounded-2xl z-50 shadow-[0_12px_32px_rgba(0,0,0,0.12)] overflow-hidden animate-fadeIn">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="flex items-center justify-center rounded-full text-white text-xs font-bold w-8 h-8"
                    style={{
                      background:
                        user?.role === 'reporter'
                          ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
                          : 'linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)',
                    }}
                  >
                    {initials}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[13px] font-bold text-slate-800 truncate">{user?.email || 'user@indianoil.in'}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {user?.role === 'hse' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          <ShieldCheck className="w-3 h-3" />
                          HSE Manager
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <UserCheck className="w-3 h-3" />
                          Field Reporter
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
