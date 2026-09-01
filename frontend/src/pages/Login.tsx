import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Shield, Lock, ArrowRight, ShieldCheck, Database, EyeOff, Eye, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { apiPost } from '../lib/api';
import { LoginResponse } from '../lib/types';
import { useSession } from '../lib/session';
import { SEO } from '../components/SEO';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('user123@example.com');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, checkSession } = useSession();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('Please enter your email or username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = identifier.includes('@')
        ? { email: identifier.trim().toLowerCase(), password }
        : { username: identifier.trim(), password };

      await apiPost<LoginResponse>('/api/auth/login', payload);
      await checkSession();
      toast.success('Authenticated to SmartVault.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'The username or password was not accepted.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="login-page"
      className="flex min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white"
    >
      <SEO
        title="Secure Sign In"
        description="Authenticate securely to your private zero-knowledge SmartVault digital file repository."
        canonicalPath="/login"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'SmartVault Secure Authentication Portal',
          description: 'Authenticate securely to your private zero-knowledge SmartVault digital file repository.',
          url: 'https://smartvault.app/login',
        }}
      />

      {/* Left Intro Banner (Desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between border-r border-zinc-800/80 bg-zinc-950 p-12 lg:flex overflow-hidden">
        {/* Subtle geometric background grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 shadow-md">
              <Shield className="h-6 w-6 text-white" aria-label="SmartVault Shield" />
            </div>
            <div>
              <h1 className="font-sans text-xl font-bold tracking-tight text-white">SMARTVAULT</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Personal Confidential Storage
              </p>
            </div>
          </div>

          <div className="mt-20 max-w-md space-y-4">
            <h2 className="text-3xl font-light tracking-tight text-white leading-tight">
              A quiet place for <span className="font-medium text-white underline decoration-zinc-600 underline-offset-4">private things</span>.
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              SmartVault is designed around a single immutable principle: user data is private.
              Your files and media are never accessible to external analysts or automated inspection models.
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4">
            <ShieldCheck className="h-5 w-5 text-white shrink-0 mt-0.5" />
            <div>
              <h3 className="font-mono text-xs font-semibold uppercase text-zinc-200">Zero-Knowledge Telemetry</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Emits structured operational security metadata without exposing confidential file contents or plaintext credentials.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4">
            <Database className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-mono text-xs font-semibold uppercase text-zinc-200">Isolated Storage Layer</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                High-security 1 GB file system storage with cryptographic session tokens and constant-time bcrypt password hashing.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between font-mono text-[11px] text-zinc-600">
          <span>PLATFORM SPECIFICATION v1.0</span>
          <a href="/llms.txt" className="hover:text-zinc-400 underline flex items-center gap-1">
            <FileCode className="h-3 w-3" />
            <span>llms.txt</span>
          </a>
        </div>
      </div>

      {/* Right Login Card */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/60 px-3 py-1 font-mono text-[11px] font-medium text-zinc-300">
              <Lock className="h-3 w-3 text-white" />
              AUTHENTICATION GATEWAY
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Enter Private Vault</h2>
            <p className="text-xs text-zinc-400">
              Sign in with your credentials to access your stored documents and assets.
            </p>
          </div>

          {/* Form */}
          <form
            data-testid="login-form"
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl"
          >
            {/* Email / Username Input */}
            <div className="space-y-2">
              <label htmlFor="login-identifier" className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400">
                Email Address or Username
              </label>
              <div className="relative">
                <input
                  id="login-identifier"
                  data-testid="login-email-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="user123@example.com"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-white focus:outline-none focus:ring-1 focus:ring-white/40 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  data-testid="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 focus:border-white focus:outline-none focus:ring-1 focus:ring-white/40 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              data-testid="login-submit-button"
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-zinc-950 shadow-md hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
              ) : (
                <>
                  <span>Unlock Vault</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Demo Note */}
            <div
              data-testid="login-security-note"
              className="border-t border-zinc-800/80 pt-4 text-center font-mono text-[11px] text-zinc-500"
            >
              Demo Credentials: <span className="text-zinc-300">user123@example.com</span> / <span className="text-zinc-300">123</span>
            </div>
          </form>

          {/* Privacy & Nav Footnote */}
          <div className="space-y-2 text-center">
            <p className="font-mono text-[11px] text-zinc-600">
              Protected by SmartVault Security Architecture &amp; Opaque Session Tokens
            </p>
            <div className="flex justify-center items-center gap-3 font-mono text-[11px] text-zinc-600">
              <Link to="/404" className="hover:text-zinc-400 transition-colors">Recovery</Link>
              <span>•</span>
              <a href="/sitemap.xml" className="hover:text-zinc-400 transition-colors">Sitemap</a>
              <span>•</span>
              <a href="/llms.txt" className="hover:text-zinc-400 transition-colors">LLMs API Guide</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
