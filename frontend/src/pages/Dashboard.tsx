import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FolderLock,
  HardDrive,
  ShieldCheck,
  UploadCloud,
  FileText,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { apiGet } from '../lib/api';
import { DashboardData } from '../lib/types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardData>('/api/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
        Unable to load vault dashboard data. Please refresh.
      </div>
    );
  }

  const storagePercentage = Math.min(Math.round((data.storage_used / (25 * 1024 * 1024)) * 100), 100);

  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            CONFIDENTIAL VAULT STATUS: ACTIVE
          </div>
          <h1 className="mt-1 text-3xl font-light tracking-tight text-white sm:text-4xl">
            Welcome back, <span className="font-medium text-white">{data.user.display_name}</span>
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            Vault Account: {data.user.email} (ID: {data.user.id})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/files')}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-950 shadow hover:bg-zinc-200 transition-colors"
          >
            <UploadCloud className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Stored Files */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400">Stored Files</span>
            <FolderLock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">{data.file_count}</span>
            <span className="font-mono text-xs text-zinc-500">encrypted items</span>
          </div>
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <button
              onClick={() => navigate('/files')}
              className="flex items-center gap-1 font-mono text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span>Manage file inventory</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Total Storage Used */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400">Storage Used</span>
            <HardDrive className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">{formatBytes(data.storage_used)}</span>
            <span className="font-mono text-xs text-zinc-500">of 25 MB allocation</span>
          </div>
          <div className="mt-4 space-y-1.5 border-t border-zinc-800/60 pt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${storagePercentage}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-zinc-500">
              <span>{storagePercentage}% used</span>
              <span>25 MB max limit</span>
            </div>
          </div>
        </div>

        {/* Privacy Status */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400">Privacy Status</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-emerald-400">Zero-Knowledge</span>
          </div>
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Telemetry records security events only. No analyst has access to file contents.
            </p>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Files & Recent Activity */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Files Panel */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2">
              <FolderLock className="h-4 w-4 text-zinc-400" />
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Recent Vault Assets
              </h3>
            </div>
            <button
              onClick={() => navigate('/files')}
              className="font-mono text-xs text-zinc-400 hover:text-white transition-colors"
            >
              View all ({data.file_count})
            </button>
          </div>

          <div className="mt-4 divide-y divide-zinc-800/60">
            {data.recent_files.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-zinc-500 font-mono">No confidential files stored yet.</p>
                <button
                  onClick={() => navigate('/files')}
                  className="mt-3 inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:text-white"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload First File
                </button>
              </div>
            ) : (
              data.recent_files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => navigate('/files')}
                  className="flex items-center justify-between py-3 hover:bg-zinc-800/30 px-2 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-zinc-300 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-200">{file.original_filename}</p>
                      <p className="font-mono text-[11px] text-zinc-500">{formatBytes(file.file_size)}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                    {new Date(file.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent User Activity */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Recent Account Activity
              </h3>
            </div>
            <button
              onClick={() => navigate('/activity')}
              className="font-mono text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Full log
            </button>
          </div>

          <div className="mt-4 divide-y divide-zinc-800/60">
            {data.recent_activity.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                No recent activity recorded.
              </div>
            ) : (
              data.recent_activity.map((act) => (
                <div key={act.id} className="flex items-center justify-between py-3 px-2">
                  <div className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <div>
                      <p className="text-xs text-zinc-200">{act.description}</p>
                      <p className="font-mono text-[10px] uppercase text-zinc-500">{act.event_type}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
