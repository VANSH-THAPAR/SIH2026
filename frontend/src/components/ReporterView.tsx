import { NewReportForm } from './forms/NewReportForm';
import { useAuthStore } from '@/store/authStore';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ReporterView() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)' }}
          >
            <span className="text-white font-black text-xs tracking-tight">OIL</span>
          </div>
          <div>
            <div className="font-black text-sm leading-none text-white tracking-tight">INDIANOIL</div>
            <div className="text-[11px] text-slate-400 tracking-wider uppercase font-medium mt-0.5">MAKASTAS</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1.5 border border-slate-700">
             <div
              className="flex items-center justify-center rounded-full text-white text-[10px] font-bold"
              style={{
                width: 24,
                height: 24,
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
              }}
            >
              {user?.email ? user.email.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <span className="text-xs font-medium text-slate-300">
              {user?.email ? user.email.split('@')[0] : 'Reporter'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl bg-white border border-slate-200">
        <NewReportForm isModal={false} onClose={() => {}} />
      </div>
    </div>
  );
}
