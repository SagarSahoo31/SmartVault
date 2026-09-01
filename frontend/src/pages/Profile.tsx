import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCheck, Key, ShieldCheck, User as UserIcon, Save } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPut, apiPost } from '../lib/api';
import { User, EmailStatus } from '../lib/types';
import { useSession } from '../lib/session';

export const Profile: React.FC = () => {
  const { user, checkSession } = useSession();

  // Profile Form state
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setEmail(user.email);
    }
  }, [user]);

  // Query integration status
  const { data: emailStatus } = useQuery<EmailStatus>({
    queryKey: ['emailStatus'],
    queryFn: () => apiGet<EmailStatus>('/api/internal/integrations/email-status'),
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !email) {
      toast.error('Display name and email are required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await apiPut<User>('/api/users/me', {
        display_name: displayName,
        email: email.trim().toLowerCase(),
      });
      await checkSession();
      toast.success('Account profile updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in current and new password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 3) {
      toast.error('New password must be at least 3 characters long.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await apiPost('/api/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <UserCheck className="h-3 w-3" />
          ACCOUNT SETTINGS & CREDENTIALS
        </div>
        <h1 className="mt-1 text-3xl font-light tracking-tight text-white">Security & Profile</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Manage your account identity and vault authentication credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Panel 1: Profile Details */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
            <UserIcon className="h-4 w-4 text-emerald-400" />
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Identity Profile
            </h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Primary Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                Legacy Compatibility Username
              </label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm text-zinc-500 font-mono cursor-not-allowed"
              />
              <span className="font-mono text-[10px] text-zinc-600 block">
                Immutable username assigned for compatibility.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-zinc-950 shadow hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSavingProfile ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Panel 2: Password Security */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
            <Key className="h-4 w-4 text-zinc-400" />
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Password Security
            </h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isUpdatingPassword ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Key className="h-3.5 w-3.5" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Security Architecture & Integration Status */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm space-y-4">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          Cryptographic Protection & Service Integrations
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-400">
          <div className="space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-4">
            <span className="font-mono text-[11px] uppercase font-semibold text-zinc-200 block">
              Password Storage Standard
            </span>
            <p className="leading-relaxed">
              Passwords are salted and hashed using standard bcrypt (12 rounds) with constant-time verification. Passwords are never stored in plaintext and never leaked into security telemetry.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-4">
            <span className="font-mono text-[11px] uppercase font-semibold text-zinc-200 block">
              Resend Email Integration Adapter
            </span>
            <p className="leading-relaxed">
              Server-side transactional email adapter: <span className="font-mono text-emerald-400">{emailStatus?.provider || 'resend'}</span>
              {emailStatus?.configured ? ' (Configured)' : ' (Development Mode / Simulated)'} with sender <span className="font-mono text-zinc-300">{emailStatus?.sender || 'onboarding@resend.dev'}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
