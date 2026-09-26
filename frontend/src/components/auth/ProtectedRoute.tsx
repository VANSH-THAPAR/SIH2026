import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            <div
              className="absolute flex items-center justify-center w-7 h-7 rounded-full text-white font-black text-[10px]"
              style={{ background: 'linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)' }}
            >
              OIL
            </div>
          </div>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-slate-200">Verifying HSSE Security Session</p>
            <p className="text-[11px] text-slate-400 mt-0.5">IndianOil MAKASTAS Intelligence</p>
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
