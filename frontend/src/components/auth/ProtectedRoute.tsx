import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-surface)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-orange-brand)] animate-spin" />
            <div
              className="absolute flex items-center justify-center w-7 h-7 rounded-full text-white font-black text-[10px]"
              style={{ background: 'var(--color-orange-brand)' }}
            >
              SIF
            </div>
          </div>
          <div className="text-center">
            <p className="text-[13px] font-bold text-[var(--color-text-primary)] tracking-tight">Verifying Security Session</p>
            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">SIF Intelligence &amp; Risk Platform</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
