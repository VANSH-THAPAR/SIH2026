import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { CommandCenter } from '@/pages/CommandCenter';
import { IncidentBoard } from '@/pages/IncidentBoard';
import { IncidentDetail } from '@/pages/IncidentDetail';
import { SIFIntelligence } from '@/pages/SIFIntelligence';
import { ControlsPage } from '@/pages/ControlsPage';
import { PatternsPage } from '@/pages/PatternsPage';
import { MemoryPage } from '@/pages/MemoryPage';
import { ActionsBoard } from '@/pages/ActionsBoard';
import { ReportsPage } from '@/pages/ReportsPage';
import { AdminPage } from '@/pages/AdminPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ReporterView } from '@/components/ReporterView';
import { useAuthStore } from '@/store/authStore';

function RoleBasedRouter() {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'reporter') {
    return <ReporterView />;
  }
  return <AppShell />;
}

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<RoleBasedRouter />}>
            <Route index element={<CommandCenter />} />
            <Route path="incidents" element={<IncidentBoard />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="sif" element={<SIFIntelligence />} />
            <Route path="controls" element={<ControlsPage />} />
            <Route path="patterns" element={<PatternsPage />} />
            <Route path="memory" element={<MemoryPage />} />
            <Route path="actions" element={<ActionsBoard />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
