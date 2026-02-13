import React, { useState } from 'react';
import { Shield, Mail, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'LOGIN' | 'FORGOT'>('LOGIN');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    }
    // If successful, the auth state listener in useAuth will update and App.tsx will re-render
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Enter your email address first');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await resetPassword(email);
    if (error) {
      setError(error);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/3 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgb(2,6,23)_100%)]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Header */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl mb-6 shadow-2xl">
            <Shield className="text-blue-500" size={36} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Wilson Speed</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">AI Infrastructure Dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-[2rem] p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          
          {mode === 'LOGIN' ? (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white tracking-tight">Sign In</h2>
                <p className="text-slate-500 text-sm mt-1">Enter your credentials to access the dashboard</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="eric@wilsonspeed.com"
                      required
                      disabled={loading}
                      className="w-full bg-slate-950/60 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-4 text-white font-medium focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700 disabled:opacity-50"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      className="w-full bg-slate-950/60 border border-slate-700/80 rounded-2xl pl-12 pr-12 py-4 text-white font-medium focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700 disabled:opacity-50"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <p className="text-xs font-bold">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <ArrowRight size={18} />
                      Sign In
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setMode('FORGOT'); setError(null); setResetSent(false); }}
                  className="text-sm text-slate-500 hover:text-blue-400 transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white tracking-tight">Reset Password</h2>
                <p className="text-slate-500 text-sm mt-1">We'll send you a link to reset your password</p>
              </div>

              {resetSent ? (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                    <CheckCircle className="text-emerald-500" size={40} />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Check Your Email</h4>
                  <p className="text-slate-400 text-sm mb-6">Password reset link sent to <span className="text-white font-bold">{email}</span></p>
                  <button
                    onClick={() => { setMode('LOGIN'); setResetSent(false); setError(null); }}
                    className="text-sm text-blue-400 hover:text-blue-300 font-bold transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="eric@wilsonspeed.com"
                        required
                        disabled={loading}
                        className="w-full bg-slate-950/60 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-4 text-white font-medium focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700 disabled:opacity-50"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                      <AlertCircle size={16} className="flex-shrink-0" />
                      <p className="text-xs font-bold">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setMode('LOGIN'); setError(null); }}
                      className="text-sm text-slate-500 hover:text-blue-400 transition-colors font-medium"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-in fade-in duration-700 delay-300">
          <p className="text-xs text-slate-600 font-medium">
            Secured by Southport AI Solutions &middot; © 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
