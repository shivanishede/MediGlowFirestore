import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Expenses from './pages/Expenses';
import OtherTransactions from './pages/OtherTransactions';
import Customers from './pages/Customers';
import Items from './pages/Items';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import AuthPage from './pages/auth/AuthPage';
import useStore from './store/useStore';
import useAuthStore from './store/useAuthStore';

export default function App() {
  const themeColor = useStore(s => s.profile.themeColor || '#7C6FFF');

  useEffect(() => {
    document.documentElement.style.setProperty('--accent2', themeColor);
  }, [themeColor]);

  const { token } = useAuthStore();

  return (
    <HashRouter>
      {token ? (
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sales/*" element={<Sales />} />
              <Route path="/purchases/*" element={<Purchases />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/other" element={<OtherTransactions />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/items" element={<Items />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          <MobileNav />
        </div>
      ) : (
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      )}
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1A1929', color: '#EFEFEF', border: '1px solid rgba(124,111,255,0.2)', fontFamily: 'Inter, sans-serif', fontSize: '13px' },
          success: { iconTheme: { primary: '#2ECC71', secondary: '#0F0E17' } },
          error: { iconTheme: { primary: '#E74C3C', secondary: '#0F0E17' } },
        }}
      />
    </HashRouter>
  );
}
