import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { shortenAddress } from '../utils/formatters';
import {
  ShieldCheck,
  Wallet,
  FilePlus2,
  FileCheck2,
  Receipt,
  LayoutDashboard,
  UserCheck,
  LogOut,
  LogIn,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { account, chainId, balance, isConnecting, connectWallet, isSupportedNetwork } = useWallet();
  const { user, isAuthenticated, logout, switchRole } = useAuth();
  const location = useLocation();

  const activeRole = user?.role || 'landlord';

  const navLinks = [
    { label: 'Landlord', path: '/landlord', icon: LayoutDashboard, role: 'landlord' },
    { label: 'Tenant', path: '/tenant', icon: UserCheck, role: 'tenant' },
    { label: 'Create Lease', path: '/agreements/new', icon: FilePlus2 },
    { label: 'Verify Terms', path: '/verify', icon: FileCheck2 },
    { label: 'Transactions', path: '/transactions', icon: Receipt },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-brand-500" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                Rent<span className="text-brand-500">Chain</span>
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 block -mt-1">
                Smart Contracts
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-brand-400 border border-slate-700/60'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 opacity-80" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Role Switcher Pill */}
          <div className="hidden sm:flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => switchRole('landlord')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeRole === 'landlord'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Landlord
            </button>
            <button
              onClick={() => switchRole('tenant')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeRole === 'tenant'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tenant
            </button>
          </div>

          {/* Network Pill */}
          {account && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupportedNetwork ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-slate-300">
                {chainId === 11155111
                  ? 'Sepolia'
                  : chainId === 31337
                  ? 'Hardhat Local'
                  : `Chain ${chainId}`}
              </span>
            </div>
          )}

          {/* Wallet Connect */}
          {account ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <div className="text-left">
                <p className="text-xs font-mono font-medium text-white">{shortenAddress(account)}</p>
                <p className="text-[10px] text-brand-400 font-mono -mt-0.5">{Number(balance).toFixed(3)} ETH</p>
              </div>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Wallet className="w-3.5 h-3.5" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}

          {/* Auth Button */}
          {isAuthenticated ? (
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
