import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  FolderLock,
  History,
  UserCheck,
  LogOut,
  Menu,
  X,
  Lock,
} from 'lucide-react';
import { useSession } from '../lib/session';

interface VaultShellProps {
  children: React.ReactNode;
}

export const VaultShell: React.FC<VaultShellProps> = ({ children }) => {
  const { user, logout } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Files', to: '/files', icon: FolderLock },
    { label: 'Activity', to: '/activity', icon: History },
    { label: 'Profile', to: '/profile', icon: UserCheck },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-zinc-800/80 bg-zinc-950/95 p-6 backdrop-blur-md transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-8">
          {/* Logo & Tagline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-white shadow-inner">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <span className="font-sans text-lg font-bold tracking-tight text-white">SMARTVAULT</span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Private Storage
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded p-1 text-zinc-400 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <div className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Vault Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Privacy Boundary & User Info */}
        <div className="space-y-5">
          {/* Privacy Guarantee Card */}
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              <Lock className="h-3.5 w-3.5" />
              Private by Design
            </div>
            <p className="mt-1.5 leading-relaxed text-zinc-400 text-[11px]">
              Your files belong to you. Security systems inspect event metadata only—never your confidential contents.
            </p>
          </div>

          {/* Current User & Logout */}
          <div className="border-t border-zinc-800/80 pt-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="truncate text-xs font-semibold text-zinc-200">{user?.display_name || 'Demo User'}</p>
                <p className="truncate font-mono text-[11px] text-zinc-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SESSION ENCRYPTED • ZERO-KNOWLEDGE BOUNDARY
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-mono text-zinc-400">{user?.email}</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
