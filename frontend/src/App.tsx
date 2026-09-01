import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { SessionProvider } from './lib/session';
import { ProtectedLayout } from './components/ProtectedLayout';

// Lazy load all route chunks for performance and code splitting
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Files = lazy(() => import('./pages/Files').then((m) => ({ default: m.Files })));
const Activity = lazy(() => import('./pages/Activity').then((m) => ({ default: m.Activity })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

const PageLoadingFallback: React.FC = () => (
  <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 text-zinc-100">
    <div className="flex flex-col items-center gap-3">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-800 border-t-white" />
      <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">Initializing Vault...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoadingFallback />}>
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

              {/* Root redirect to Dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Explicit 404 and Catch-All Unknown Route Handler */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
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
