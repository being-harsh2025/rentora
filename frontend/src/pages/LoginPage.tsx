import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { ShieldCheck, Wallet, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithWallet } = useAuth();
  const { account, connectWallet } = useWallet();

  const [role, setRole] = useState<UserRole>('landlord');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate(role === 'landlord' ? '/landlord' : '/tenant');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletSignIn = async () => {
    setError(null);
    setWalletLoading(true);

    try {
      if (!account) {
        await connectWallet();
      }
      await loginWithWallet(role);
      navigate(role === 'landlord' ? '/landlord' : '/tenant');
    } catch (err: any) {
      setError(err.message || 'Wallet authentication failed.');
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 items-center justify-center text-brand-400 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to Rentora</h2>
          <p className="text-xs text-slate-400 mt-1">
            Access your agreements, escrow deposits, and payment tracking
          </p>
        </div>

        {/* Role Toggle */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex mb-6">
          <button
            type="button"
            onClick={() => setRole('landlord')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              role === 'landlord'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Landlord Portal
          </button>
          <button
            type="button"
            onClick={() => setRole('tenant')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              role === 'tenant'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tenant Portal
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* One-Click MetaMask Sign-In */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleWalletSignIn}
            disabled={walletLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            {walletLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wallet className="w-4 h-4" />
            )}
            Sign in with MetaMask (Web3 Signature)
          </button>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            Verifies ownership using an off-chain cryptographic challenge signature.
          </p>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-mono">Or with email credentials</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="landlord@rentora.local"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-white text-xs outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-white text-xs outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Sign In with Email
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-400 font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

