import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { shortenAddress, formatDate } from '../utils/formatters';
import { User, Wallet, Mail, ShieldCheck, LogOut, CheckCircle2 } from 'lucide-react';

export const UserProfilePage: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const { account, balance, chainId, connectWallet } = useWallet();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <span className="px-2.5 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-xs font-semibold uppercase tracking-wider border border-brand-500/20">
          Account Settings
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">User Profile & Identity</h1>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 p-0.5 flex items-center justify-center text-white">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <User className="w-8 h-8 text-brand-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name || 'Active User'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email || 'wallet-authenticated@rentora.local'}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-[11px] font-semibold border border-brand-500/20 capitalize">
                Role: {user?.role || 'Landlord'}
              </span>
              {account && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  MetaMask Linked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Connected Wallet Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Web3 Wallet Association</h3>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 font-medium">MetaMask Address:</span>
              <span className="font-mono text-brand-400 break-all">{account || 'Not Connected'}</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
              <span className="text-slate-400 font-medium">Available Balance:</span>
              <span className="font-mono font-bold text-white">{Number(balance).toFixed(4)} ETH</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
              <span className="text-slate-400 font-medium">Connected Chain ID:</span>
              <span className="font-mono text-slate-300">{chainId || 'None'}</span>
            </div>
          </div>

          {!account && (
            <button
              onClick={connectWallet}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm"
            >
              Connect MetaMask Wallet
            </button>
          )}
        </div>

        {/* Evaluation Role Switcher */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Evaluation Role Switcher (College Demonstration)
          </h3>
          <p className="text-xs text-slate-500">
            Allows evaluators to toggle seamlessly between Landlord perspective and Tenant perspective without having to re-authenticate.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => switchRole('landlord')}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-center transition-all ${
                user?.role === 'landlord'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Switch to Landlord Role
            </button>
            <button
              onClick={() => switchRole('tenant')}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-center transition-all ${
                user?.role === 'tenant'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Switch to Tenant Role
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="pt-6 border-t border-slate-800 flex justify-end">
          <button
            onClick={logout}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

