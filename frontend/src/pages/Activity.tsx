import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { History, Clock, CheckCircle2, Lock, FileText, UserCheck, Key, FolderLock, LayoutDashboard } from 'lucide-react';
import { apiGet } from '../lib/api';
import { ActivityItem } from '../lib/types';
import { SEO } from '../components/SEO';

function getActivityIcon(eventType: string) {
  switch (eventType) {
    case 'LOGIN_SUCCESS':
    case 'SESSION_CREATED':
      return CheckCircle2;
    case 'FILE_UPLOADED':
    case 'FILE_VIEWED':
    case 'FILE_DOWNLOADED':
    case 'FILE_DELETED':
      return FileText;
    case 'PROFILE_VIEWED':
    case 'PROFILE_UPDATED':
      return UserCheck;
    case 'PASSWORD_CHANGE':
      return Key;
    default:
      return History;
  }
}

export const Activity: React.FC = () => {
  const { data: activities = [], isLoading, error } = useQuery<ActivityItem[]>({
    queryKey: ['activity'],
    queryFn: () => apiGet<ActivityItem[]>('/api/activity'),
  });

  return (
    <div className="space-y-8">
      <SEO
        title="Security Audit Trail"
        description="Chronological security audit trail documenting authentication and file interactions within SmartVault."
        canonicalPath="/activity"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'SmartVault Personal Audit Trail',
          description: 'Immutable record of authenticated user interactions.',
          url: 'https://smartvault.app/activity',
        }}
      />

      {/* Top Header */}
      <section aria-labelledby="activity-heading" className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <History className="h-3 w-3 text-white" />
            PERSONAL AUDIT TRAIL
          </div>
          <h1 id="activity-heading" className="mt-1 text-3xl font-light tracking-tight text-white">
            Security Audit Trail
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Chronological record of interactions within your private digital vault.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/files"
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <FolderLock className="h-4 w-4 text-white" />
            <span>Go to Files</span>
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </section>

      {/* Activity Timeline List */}
      <section aria-label="Activity Event Log" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm shadow-xl">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">Loading audit history...</span>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-400">
            Failed to load activity logs. Please refresh.
          </div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 font-mono">
            No personal activity recorded yet.
          </div>
        ) : (
          <div className="relative border-l border-zinc-800 ml-4 space-y-6 py-2">
            {activities.map((item) => {
              const Icon = getActivityIcon(item.event_type);
              return (
                <article key={item.id} className="relative pl-6 group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-2.5 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-white group-hover:border-zinc-400 transition-colors">
                    <Icon className="h-3 w-3" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <h2 className="text-sm font-medium text-zinc-200">{item.description}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                          {item.event_type}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="font-mono text-[10px] uppercase text-zinc-300">
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <time dateTime={item.timestamp}>{new Date(item.timestamp).toLocaleString()}</time>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Privacy Notice */}
      <section aria-label="Privacy Boundary Guarantee" className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 text-xs text-zinc-400 flex items-start gap-3">
        <Lock className="h-4 w-4 text-white shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-zinc-200">Personal Audit Notice:</strong> This activity log reflects only your authenticated session events.
          SmartVault never exposes your actions to other accounts, and external security telemetry only receives non-confidential metadata.
        </p>
      </section>
    </div>
  );
};
