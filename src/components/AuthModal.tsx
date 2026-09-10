import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { ApiService } from '../services/api.js';
import { UserProfile } from '../types.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await ApiService.register(email, password, fullName);
        onLoginSuccess(res.user);
        onClose();
      } else {
        const res = await ApiService.login(email, password);
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'counsel') => {
    setErrorMsg(null);
    setLoading(true);
    const creds =
      role === 'admin'
        ? { email: 'admin@legalrag.internal', pass: 'AdminPass123!' }
        : { email: 'counsel@legalrag.internal', pass: 'UserPass123!' };

    try {
      const res = await ApiService.login(creds.email, creds.pass);
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
      <div className="liquid-glass-card border border-white/90 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 text-zinc-900 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-900 rounded-xl liquid-glass-pill border border-white/80 hover:bg-white/80 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex p-2.5 rounded-2xl liquid-glass-dark text-white shadow-md">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-zinc-900">
            {isRegister ? 'Create Legal Portal Account' : 'Sign In to LexiRAG'}
          </h3>
          <p className="text-xs text-zinc-600">
            Access saved legal inquiry history, export citations, or manage compliance documents.
          </p>
        </div>

        {/* Quick Demo Credentials */}
        <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/80 space-y-2">
          <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-900" />
            <span>Pre-seeded Demo Logins</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="px-2.5 py-2 text-left rounded-xl liquid-glass-card hover:bg-white/90 border border-white/80 text-[11px] text-zinc-700 transition shadow-xs"
            >
              <div className="font-semibold text-zinc-900">Admin / Officer</div>
              <div className="text-[10px] text-zinc-500 truncate">admin@legalrag...</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('counsel')}
              className="px-2.5 py-2 text-left rounded-xl liquid-glass-card hover:bg-white/90 border border-white/80 text-[11px] text-zinc-700 transition shadow-xs"
            >
              <div className="font-semibold text-zinc-900">Legal Counsel</div>
              <div className="text-[10px] text-zinc-500 truncate">counsel@legalrag...</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-800 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g., Alexandra Vance"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs liquid-glass-input border border-white/80 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="name@organization.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs liquid-glass-input border border-white/80 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs liquid-glass-input border border-white/80 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl liquid-glass-dark hover:brightness-110 text-white font-bold text-xs transition shadow-md disabled:opacity-50 mt-2"
          >
            {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg(null);
            }}
            className="text-xs text-zinc-600 hover:text-zinc-900 underline font-medium"
          >
            {isRegister
              ? 'Already have an account? Sign in here'
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};
