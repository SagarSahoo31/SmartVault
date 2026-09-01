import React, { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
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
  ChevronRight,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import { useSession } from '../lib/session';

interface VaultShellProps {
  children: React.ReactNode;
}

export const VaultShell: React.FC<VaultShellProps> = ({ children }) => {
  const { user, logout } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Files', to: '/files', icon: FolderLock },
    { label: 'Activity', to: '/activity', icon: History },
    { label: 'Profile', to: '/profile', icon: UserCheck },
  ];

  // Derive breadcrumb label from current path
  const currentNav = navItems.find((item) => item.to === location.pathname);
  const breadcrumbName = currentNav ? currentNav.label : 'Vault Resource';

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      <div className="flex flex-1">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          aria-label="Vault Primary Navigation"
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-zinc-800/80 bg-zinc-950/95 p-6 backdrop-blur-md transition-transform duration-200 ease-in-out lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="space-y-8">
            {/* Logo & Tagline */}
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-white shadow-inner">
                  <Shield className="h-5 w-5 text-white" aria-label="SmartVault Secure Emblem" />
                </div>
                <div>
                  <span className="font-sans text-lg font-bold tracking-tight text-white">SMARTVAULT</span>
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    Private Storage
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="rounded p-1 text-zinc-400 hover:text-white lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Items */}
            <nav aria-label="Primary" className="space-y-1">
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
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-200">
                <Lock className="h-3.5 w-3.5 text-white" />
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
                  title="Sign out of SmartVault"
                  aria-label="Sign out of SmartVault"
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
                aria-label="Open navigation menu"
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/60 px-3 py-1 font-mono text-[11px] font-medium text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                SESSION ENCRYPTED • ZERO-KNOWLEDGE BOUNDARY
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/profile')}
                aria-label="View profile settings"
                className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-white" />
                <span className="font-mono text-zinc-400">{user?.email}</span>
              </button>
            </div>
          </header>

          {/* Breadcrumbs Navigation */}
          <nav
            aria-label="Breadcrumb"
            className="border-b border-zinc-800/40 bg-zinc-950/40 px-6 py-2.5 lg:px-10"
          >
            <ol className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
              <li>
                <Link to="/dashboard" className="text-zinc-400 hover:text-zinc-200 transition-colors">
                  SmartVault
                </Link>
              </li>
              <li>
                <ChevronRight className="h-3 w-3 text-zinc-600" />
              </li>
              <li className="font-semibold text-zinc-200" aria-current="page">
                {breadcrumbName}
              </li>
            </ol>
          </nav>

          {/* Page Content Viewport */}
          <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto">
            {children}
          </main>

          {/* Structured Semantic Footer with Internal Links */}
          <footer className="border-t border-zinc-800/80 bg-zinc-950 px-6 py-6 lg:px-10">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
              <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
                <Link to="/dashboard" className="hover:text-zinc-300 transition-colors">Overview</Link>
                <span>•</span>
                <Link to="/files" className="hover:text-zinc-300 transition-colors">My Files (1 GB)</Link>
                <span>•</span>
                <Link to="/activity" className="hover:text-zinc-300 transition-colors">Audit Trail</Link>
                <span>•</span>
                <Link to="/profile" className="hover:text-zinc-300 transition-colors">Security &amp; Profile</Link>
                <span>•</span>
                <a href="/llms.txt" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                  <FileCode className="h-3 w-3" />
                  <span>llms.txt</span>
                </a>
                <span>•</span>
                <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  <span>Sitemap</span>
                </a>
              </div>

              <div className="font-mono text-[11px] text-zinc-600">
                © {new Date().getFullYear()} SmartVault. Zero-Knowledge Cryptographic Storage.
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
