import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, UserCheck, ArrowRight, AlertCircle, Zap, ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, quickLogin, isAuthenticated, error, clearError, isLoading } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('hse');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quickLoginRole, setQuickLoginRole] = useState<UserRole | null>(null);

  const destination = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) navigate(destination, { replace: true });
  }, [isAuthenticated, navigate, destination]);

  const handleTabSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    clearError();
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, role });
      }
    } catch (err: any) {
      // Error is handled by store
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (r: UserRole) => {
    setQuickLoginRole(r);
    setLocalError(null);
    clearError();
    try {
      await quickLogin(r);
    } catch (err: any) {
      // Error handled by store
    } finally {
      setQuickLoginRole(null);
    }
  };

  const displayError = localError || error;
  const isSuccess = mode === 'register' && !displayError && !submitting && email && !password;

  const inputCls = `w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-2.5 px-10 text-[13px] text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]`;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--color-canvas)]">
      {/* ElevenLabs style pastel gradient orbs */}
      <div
        className="absolute pointer-events-none opacity-50"
        style={{
          top: '-15%', left: '-10%',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #a7e5d3 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute pointer-events-none opacity-50"
        style={{
          bottom: '-15%', right: '-10%',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #c8b8e0 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-md relative z-10 px-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-transparent overflow-hidden shadow-sm">
              <img src="/logo.png" alt="Nirikshan Logo" className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
              <div className="text-[28px] font-bold text-[var(--color-text-primary)] tracking-tight leading-none mb-1">
                Nirikshan
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
                HSE Risk Platform
              </div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-surface-elevated)] rounded-[24px] p-8 border border-[var(--color-border)] shadow-sm">
          {/* Tabs */}
          <div className="flex p-1 bg-[var(--color-canvas-soft)] rounded-xl mb-6 border border-[var(--color-border-soft)]">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border-soft)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border-soft)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              Register
            </button>
          </div>

          {/* Quick Demo Login */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { role: 'hse' as UserRole, label: 'HSE Manager', sub: 'Full Access', icon: ShieldCheck },
                { role: 'reporter' as UserRole, label: 'Field Reporter', sub: 'Report Submission', icon: UserCheck },
              ].map(({ role: r, label, sub, icon: Icon }) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickDemo(r)}
                  disabled={submitting || !!quickLoginRole}
                  className="flex flex-col items-start p-3 rounded-xl text-left transition-all disabled:opacity-50 group bg-[var(--color-canvas-soft)] border border-[var(--color-border)] hover:border-[var(--color-primary)]"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <span className="text-[11.5px] font-bold text-[var(--color-text-primary)]">{label}</span>
                    </div>
                    {quickLoginRole === r ? (
                      <div className="w-3 h-3 rounded-full border-2 border-[var(--color-text-tertiary)] border-t-[var(--color-primary)] animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--color-text-secondary)]">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-[var(--color-border)]" />
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
              or {mode === 'login' ? 'enter credentials' : 'create account'}
            </span>
            <div className="flex-grow border-t border-[var(--color-border)]" />
          </div>

          {/* Error/success message */}
          {displayError && (
            <div
              className="mb-5 p-3 rounded-xl flex items-start gap-2.5 text-[12px]"
              style={{
                background: isSuccess ? 'var(--color-success-bg)' : 'var(--color-critical-bg)',
                border: `1px solid ${isSuccess ? 'var(--color-success-border)' : 'var(--color-critical-border)'}`,
                color: isSuccess ? 'var(--color-success)' : 'var(--color-critical)',
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@test.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className={inputCls + ' pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wide">
                    Operational Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { r: 'hse' as UserRole, label: 'HSE Manager', sub: 'Full Access' },
                      { r: 'reporter' as UserRole, label: 'Field Reporter', sub: 'Reporting Only' },
                    ].map(({ r, label, sub }) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className="p-3 rounded-xl text-left transition-all border"
                        style={{
                          background: role === r ? 'var(--color-surface)' : 'var(--color-canvas-soft)',
                          borderColor: role === r ? 'var(--color-primary)' : 'var(--color-border)',
                        }}
                      >
                        <div className={`text-[12px] font-bold ${role === r ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'}`}>{label}</div>
                        <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-[13px] bg-[var(--color-primary)] text-white transition-all hover:bg-[var(--color-primary-active)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Access Platform' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
