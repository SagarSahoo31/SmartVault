import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../lib/session';
import { VaultShell } from './VaultShell';

export const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
          <span className="font-mono text-xs tracking-wider uppercase text-zinc-500">Decrypting Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <VaultShell>
      <Outlet />
    </VaultShell>
  );
};
