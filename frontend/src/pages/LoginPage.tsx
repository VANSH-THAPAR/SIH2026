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
        await login({ email: email.trim(), password });
        navigate(destination, { replace: true });
      } else {
        await register({ email: email.trim(), password, role });
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setLocalError('Registration successful — please sign in.');
      }
    } catch {
      // error handled in store
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (targetRole: UserRole) => {
    setLocalError(null);
    clearError();
    setQuickLoginRole(targetRole);
    try {
      await quickLogin(targetRole);
      navigate(destination, { replace: true });
    } catch {
      // handled in store
    } finally {
      setQuickLoginRole(null);
    }
  };

  const displayError = localError || error;
  const isSuccess = displayError?.includes('successful');

  const inputCls = `w-full pl-10 pr-4 py-2.5 text-[13px] border border-white/10 rounded-xl text-white
    placeholder-white/30 focus:outline-none focus:border-[var(--color-orange-brand)] focus:ring-1
    focus:ring-[var(--color-orange-brand)] transition-colors bg-white/5`;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: '#141311' }}
    >
      {/* Ambient light — warm industrial */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-15%', left: '-10%',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,101,10,0.12) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-15%', right: '-10%',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,101,10,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-7">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-orange-brand)' }}
            >
              <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                <path
                  d="M10 2 L16 5.5 L16 12.5 C16 16 13 18.5 10 19.5 C7 18.5 4 16 4 12.5 L4 5.5 Z"
                  fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round"
                />
                <path
                  d="M8 10.5 C8 9 9 8 10 8 C11 8 12 9 12 10.5 C12 11.5 11 12 10 12.5 C9 13 8 13.5 8 15"
                  stroke="white" strokeWidth="1.3" strokeLinecap="round" fill="none"
                />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-[18px] font-black text-white tracking-tight leading-none">
                SIF Intelligence
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
                style={{ color: 'var(--color-orange-brand)' }}>
                HSE Risk Platform
              </div>
            </div>
          </div>
          <p className="text-[12px] text-white/40 max-w-xs mx-auto">
            Operational Safety & Barrier Integrity Management
          </p>
        </div>

        {/* Auth card */}
        <div
          className="rounded-2xl p-7 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Mode tabs */}
          <div
            className="grid grid-cols-2 p-1 rounded-xl mb-6"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleTabSwitch(m)}
                className={`py-2.5 text-[12.5px] font-semibold rounded-lg transition-all ${
                  mode === m
                    ? 'text-white shadow-md'
                    : 'text-white/40 hover:text-white/70'
                }`}
                style={mode === m ? { background: 'var(--color-orange-brand)' } : undefined}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Quick demo */}
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[10.5px] font-semibold text-white/50 mb-3 uppercase tracking-widest">
              ⚡ 1-Click Demo Access
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: 'hse' as UserRole, label: 'HSE Manager', sub: 'Full Intelligence Access', icon: ShieldCheck },
                { role: 'reporter' as UserRole, label: 'Field Reporter', sub: 'Report Submission', icon: UserCheck },
              ].map(({ role: r, label, sub, icon: Icon }) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickDemo(r)}
                  disabled={submitting || !!quickLoginRole}
                  className="flex flex-col items-start p-3 rounded-xl text-left transition-all disabled:opacity-50 group"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,101,10,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  }}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-orange-brand)' }} />
                      <span className="text-[11.5px] font-bold text-white/80">{label}</span>
                    </div>
                    {quickLoginRole === r ? (
                      <div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3 text-white/20" />
                    )}
                  </div>
                  <span className="text-[10px] text-white/30">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center mb-5">
            <div className="flex-grow border-t border-white/8" />
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-white/30 font-medium">
              or {mode === 'login' ? 'enter credentials' : 'create account'}
            </span>
            <div className="flex-grow border-t border-white/8" />
          </div>

          {/* Error/success message */}
          {displayError && (
            <div
              className="mb-4 p-3 rounded-xl flex items-start gap-2.5 text-[12px]"
              style={{
                background: isSuccess ? 'rgba(26,112,80,0.15)' : 'rgba(196,30,58,0.15)',
                border: `1px solid ${isSuccess ? 'rgba(26,112,80,0.3)' : 'rgba(196,30,58,0.3)'}`,
                color: isSuccess ? '#5BE3AB' : '#FF8080',
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@indianoil.in"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
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
                  <label className="block text-[11px] font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                    Operational Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { r: 'hse' as UserRole, label: 'HSE Manager', sub: 'Full Access' },
                      { r: 'reporter' as UserRole, label: 'Field Reporter', sub: 'Reporting Only' },
                    ].map(({ r, label, sub }) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className="p-3 rounded-xl text-left transition-all"
                        style={{
                          background: role === r ? 'rgba(232,101,10,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${role === r ? 'rgba(232,101,10,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        <div className="text-[12px] font-bold text-white/80">{label}</div>
                        <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[13px] text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-orange-brand)' }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'Signing In…' : 'Creating Account…'}</span>
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
