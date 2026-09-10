import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, X, ChevronDown } from 'lucide-react';

export function Header() {
  const [localSearch, setLocalSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      navigate(`/incidents?search=${encodeURIComponent(localSearch.trim())}`);
      setLocalSearch('');
    }
  };

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
            {/* Alert dot */}
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
        <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
          <div
            className="flex items-center justify-center rounded-full text-white text-[11px] font-bold"
            style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)' }}
          >
            OP
          </div>
          <div className="hidden md:block text-left">
            <div className="text-[12px] font-semibold text-slate-800 leading-none mb-0.5">OPS Admin</div>
            <div className="text-[10px] text-slate-400">HSE Manager</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
        </button>
      </div>
    </header>
  );
}
