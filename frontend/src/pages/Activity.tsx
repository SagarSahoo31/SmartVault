import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Clock, CheckCircle2, Lock, FileText, UserCheck, Key } from 'lucide-react';
import { apiGet } from '../lib/api';
import { ActivityItem } from '../lib/types';

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
      {/* Top Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <History className="h-3 w-3" />
          PERSONAL AUDIT TRAIL
        </div>
        <h1 className="mt-1 text-3xl font-light tracking-tight text-white">Account Activity</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Chronological record of interactions within your private digital vault.
        </p>
      </div>

      {/* Activity Timeline List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm shadow-xl">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
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
                <div key={item.id} className="relative pl-6 group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-2.5 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-emerald-400 group-hover:border-emerald-500 transition-colors">
                    <Icon className="h-3 w-3" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{item.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                          {item.event_type}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="font-mono text-[10px] uppercase text-emerald-400">
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 text-xs text-zinc-400 flex items-start gap-3">
        <Lock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-zinc-200">Personal Audit Notice:</strong> This activity log reflects only your authenticated session events.
          SmartVault never exposes your actions to other accounts, and external security telemetry only receives non-confidential metadata.
        </p>
      </div>
    </div>
  );
};
