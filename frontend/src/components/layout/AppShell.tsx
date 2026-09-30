import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '@/components/ui/Toast';

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--color-surface)' }}>
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
