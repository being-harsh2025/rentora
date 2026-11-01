import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { ShieldCheck, User, Mail, Lock, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { UserRole } from '../types';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { account, connectWallet } = useWallet();

  const [role, setRole] = useState<UserRole>('landlord');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        role,
        wallet_address: account || undefined,
      });
      navigate(role === 'landlord' ? '/landlord' : '/tenant');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 items-center justify-center text-brand-400 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create an Account</h2>
          <p className="text-xs text-slate-400 mt-1">
            Join Rentora to issue or execute smart contract rental agreements
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
            I am a Landlord
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
            I am a Tenant
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-white text-xs outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
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
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-white text-xs outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Connected MetaMask Wallet</label>
            <div className="relative">
              <Wallet className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                readOnly
                value={account || ''}
                placeholder="Connect wallet below to link automatically"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-brand-400 font-mono text-xs outline-none cursor-not-allowed placeholder:text-slate-600"
              />
            </div>
            {!account && (
              <button
                type="button"
                onClick={connectWallet}
                className="mt-2 text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 font-semibold"
              >
                + Connect MetaMask to link address
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] mt-6"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Complete Registration
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

