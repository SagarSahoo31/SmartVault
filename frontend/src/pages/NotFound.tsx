import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowLeft,
  LayoutDashboard,
  FolderLock,
  History,
  UserCheck,
  Lock,
  Compass,
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { useSession } from '../lib/session';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSession();

  const internalLinks = [
    { label: 'Vault Dashboard', to: '/dashboard', icon: LayoutDashboard, desc: 'Overview of storage and metrics' },
    { label: 'My Files', to: '/files', icon: FolderLock, desc: 'Manage your 1 GB encrypted files' },
    { label: 'Audit Trail', to: '/activity', icon: History, desc: 'View session activity logs' },
    { label: 'Profile & Security', to: '/profile', icon: UserCheck, desc: 'Credential & account management' },
  ];

  return (
    <div className="flex min-h-screen flex-col justify-between bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      <SEO
        title="404 — Page Not Found"
        description="The requested page or vault resource does not exist in the SmartVault index."
        canonicalPath="/404"
      />

      {/* Top Bar */}
      <header className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-6 sm:px-12 backdrop-blur-md bg-zinc-950/80">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-white shadow-inner">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-sans text-base font-bold tracking-tight text-white">SMARTVAULT</span>
            <span className="block font-mono text-[9px] uppercase tracking-widest text-zinc-500">
              Confidential Storage
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/60 px-3 py-1 font-mono text-[11px] font-medium text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          HTTP 404 • ROUTE UNRESOLVED
        </div>
      </header>

      {/* Main Error Content */}
      <main className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-2xl space-y-8 text-center">
          {/* Security Icon Emblem */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-2xl backdrop-blur-sm">
            <ShieldAlert className="h-10 w-10 text-white" />
          </div>

          <div className="space-y-3">
            <div className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Security Boundary Notice
            </div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
              404 — Page Not Found
            </h1>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-zinc-400">
              The requested address or encrypted resource could not be located within the SmartVault index. The record may have been relocated, purged, or restricted under zero-knowledge partition rules.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </button>
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-zinc-950 shadow hover:bg-zinc-200 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>{isAuthenticated ? 'Return to Dashboard' : 'Go to Login'}</span>
            </Link>
          </div>

          {/* Internal Navigation Directory */}
          <div className="mt-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 text-left backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Compass className="h-4 w-4 text-white" />
              <span>Direct Vault Navigation Directory</span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {internalLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-3 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all group"
                  >
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 group-hover:text-white">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                        {link.label}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-500">{link.desc}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-4 text-center font-mono text-[11px] text-zinc-600">
        SmartVault Security Architecture • Zero-Knowledge Telemetry • <a href="/llms.txt" className="text-zinc-500 hover:text-zinc-400 underline">LLMs Spec</a>
      </footer>
    </div>
  );
};
