import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { SessionProvider } from './lib/session';
import { ProtectedLayout } from './components/ProtectedLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Files } from './pages/Files';
import { Activity } from './pages/Activity';
import { Profile } from './pages/Profile';

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Vault Routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/files" element={<Files />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Default Fallback Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#f4f4f5',
              fontFamily: 'Outfit, sans-serif',
            },
          }}
        />
      </SessionProvider>
    </QueryClientProvider>
  );
};
