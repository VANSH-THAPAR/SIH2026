import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Radio,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, quickLogin, isAuthenticated, error, clearError, isLoading } =
    useAuthStore();

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

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, destination]);

  // Clear errors when switching tabs
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
        setLocalError('Password must be at least 6 characters long.');
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
        setLocalError('Registration successful. Please log in.'); // Using localError to display a message (it gets styled as an error, but it's better than nothing)
      }
    } catch {
      // Error handled in store
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
      // Handled in store
    } finally {
      setQuickLoginRole(null);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950 font-sans">
      {/* Background radial ambient lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-950/20 blur-[160px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Banner */}
        <div className="text-center mb-6">


          <div className="flex items-center justify-center gap-3 mb-2">
            <div
              className="flex items-center justify-center rounded-xl shadow-lg shadow-blue-900/40"
              style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)' }}
            >
              <span className="text-white font-black text-sm tracking-tight">OIL</span>
            </div>
            <div className="text-left">
              <h1 className="font-black text-xl leading-none text-white tracking-tight">INDIANOIL</h1>
              <p className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider mt-0.5">
                SIF Precursor Intelligence
              </p>
            </div>
          </div>
          <p className="text-[12px] text-slate-400 max-w-xs mx-auto">
            Operational Safety & Barrier Integrity Management System
          </p>
        </div>

        {/* Auth Glass Box */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/70 rounded-xl border border-slate-800/80 mb-6">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`py-2 text-[13px] font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              className={`py-2 text-[13px] font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Account
            </button>
          </div>

          {/* Quick Demo Login Option */}
          <div className="mb-6 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Demo Access (1-Click)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('hse')}
                disabled={submitting || !!quickLoginRole}
                className="flex flex-col items-start p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-700/60 hover:border-blue-500/50 text-left transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    HSE Admin
                  </span>
                  {quickLoginRole === 'hse' ? (
                    <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 truncate w-full">Full Intelligence Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('reporter')}
                disabled={submitting || !!quickLoginRole}
                className="flex flex-col items-start p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-700/60 hover:border-emerald-500/50 text-left transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    Field Reporter
                  </span>
                  {quickLoginRole === 'reporter' ? (
                    <div className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 truncate w-full">Field Reporting View</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center mb-5">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
              Or {mode === 'login' ? 'enter credentials' : 'create credentials'}
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Message Box */}
          {displayError && (
            <div className={`mb-4 p-3 rounded-xl border flex items-start gap-2.5 text-[12px] animate-fadeIn ${
              displayError.includes('successful')
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                displayError.includes('successful') ? 'text-emerald-400' : 'text-rose-400'
              }`} />
              <span>{displayError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@indianoil.in"
                  className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-[13px] bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Registration Specific Fields */}
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                    Operational Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('hse')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        role === 'hse'
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[12px] font-bold">HSE Officer</div>
                      <div className="text-[10px] text-slate-400">Auditor & Command</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('reporter')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        role === 'reporter'
                          ? 'bg-emerald-600/20 border-emerald-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[12px] font-bold">Field Reporter</div>
                      <div className="text-[10px] text-slate-400">Incident Logging</div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[13px] text-white transition-all shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)',
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'Authenticating...' : 'Registering...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Access Command System' : 'Create & Sign In'}</span>
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
