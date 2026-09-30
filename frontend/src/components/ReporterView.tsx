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
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-transparent overflow-hidden shadow-sm"
          >
            <img src="/logo.png" alt="Nirikshan Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-bold text-[15px] leading-none text-[var(--color-text-primary)] tracking-tight">Nirikshan</div>
            <div className="text-[11px] text-[var(--color-text-secondary)] tracking-wider uppercase font-semibold mt-0.5">Field Reporter</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 border border-[var(--color-border)] shadow-sm">
             <div
              className="flex items-center justify-center rounded-full text-white text-[10px] font-bold"
              style={{
                width: 24,
                height: 24,
                background: 'var(--color-low)',
              }}
            >
              {user?.email ? user.email.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
              {user?.email ? user.email.split('@')[0] : 'Reporter'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-critical)] hover:bg-[var(--color-critical-bg)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-lg bg-white border border-[var(--color-border)]">
        <NewReportForm isModal={false} onClose={() => {}} />
      </div>
    </div>
  );
}
