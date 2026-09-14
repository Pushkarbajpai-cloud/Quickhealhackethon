import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext';
import SidebarLayout from './components/layout/SidebarLayout';
import LiveFeedPage from './pages/LiveFeedPage';
import ForensicsPage from './pages/ForensicsPage';
import LedgerExplorerPage from './pages/LedgerExplorerPage';
import SandboxPage from './pages/SandboxPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuditProvider>
        <Routes>
          <Route element={<SidebarLayout />}>
            <Route index element={<LiveFeedPage />} />
            <Route path="forensics" element={<ForensicsPage />} />
            <Route path="ledger" element={<LedgerExplorerPage />} />
            <Route path="simulate" element={<SandboxPage />} />
            <Route path="sandbox" element={<Navigate to="/simulate" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuditProvider>
    </BrowserRouter>
  );
}
