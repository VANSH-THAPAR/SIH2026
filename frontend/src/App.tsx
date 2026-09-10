import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { CommandCenter } from '@/pages/CommandCenter';
import { IncidentBoard } from '@/pages/IncidentBoard';
import { IncidentDetail } from '@/pages/IncidentDetail';
import { ActionsBoard } from '@/pages/ActionsBoard';
import { SIFIntelligence } from '@/pages/SIFIntelligence';
import { ControlsPage } from '@/pages/ControlsPage';
import { MemoryPage } from '@/pages/MemoryPage';
import { PatternsPage } from '@/pages/PatternsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AdminPage } from '@/pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<CommandCenter />} />
          <Route path="incidents" element={<IncidentBoard />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
          <Route path="actions" element={<ActionsBoard />} />
          <Route path="sif" element={<SIFIntelligence />} />
          <Route path="controls" element={<ControlsPage />} />
          <Route path="memory" element={<MemoryPage />} />
          <Route path="patterns" element={<PatternsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
