import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { agreementsApi, transactionsApi } from '../services/api';
import { Agreement, TransactionItem } from '../types';
import { shortenAddress, formatEth, formatDate, getStatusColor } from '../utils/formatters';
import {
  UserCheck,
  ShieldCheck,
  CreditCard,
  Clock,
  AlertCircle,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  Receipt,
  Scale,
  Calendar,
  Wallet
} from 'lucide-react';

export const TenantDashboard: React.FC = () => {
  const { account, connectWallet } = useWallet();
  const { user } = useAuth();

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      const activeWallet = account || (user && user.wallet_address);
      const res = await agreementsApi.list({
        wallet_address: activeWallet || undefined,
        role: 'tenant',
      });
      setAgreements(res.agreements || []);

      const txRes = await transactionsApi.list({
        wallet_address: activeWallet || undefined,
      });
      setTransactions(txRes.transactions || []);
    } catch (err) {
      console.error('Failed to load tenant dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, [account, user]);

  const activeAgreement = agreements.find((a) => a.status === 'Active');
  const pendingAgreements = agreements.filter((a) => a.status === 'PendingAcceptance' || a.status === 'Accepted');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider border border-blue-500/20">
              Tenant Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Tenant Overview & Rent Escrow</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review lease terms, pay security deposit into smart contract escrow, and submit monthly rent installments.
          </p>
        </div>

        {!account && (
          <button
            onClick={connectWallet}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 inline-flex items-center gap-2 transition-all hover:scale-105"
          >
            <Wallet className="w-4 h-4" />
            Connect MetaMask
          </button>
        )}
      </div>

      {/* Pending Action Alerts */}
      {pendingAgreements.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Action Required: You have {pendingAgreements.length} pending lease agreement(s)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingAgreements.map((ag) => (
              <div key={ag.id} className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold text-xs">{ag.property_title}</h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Deposit: {ag.deposit_amount_eth} ETH • Rent: {ag.rent_amount_eth} ETH
                  </p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                    {ag.status === 'PendingAcceptance' ? 'Needs Your Acceptance' : 'Deposit Escrow Pending'}
                  </span>
                </div>
                <Link
                  to={`/agreements/${ag.id}`}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-colors"
                >
                  {ag.status === 'PendingAcceptance' ? 'Review & Sign' : 'Pay Deposit'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Active Lease Spotlight */}
      {activeAgreement ? (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-navy-950 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
            <div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Active Blockchain Lease
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">{activeAgreement.property_title}</h2>
              <p className="text-xs text-slate-400 mt-1">{activeAgreement.property_address}</p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to={`/agreements/${activeAgreement.id}`}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 inline-flex items-center gap-1.5 transition-colors"
              >
                <FileCheck2 className="w-4 h-4 text-brand-400" />
                View Full Terms
              </Link>
              <Link
                to={`/agreements/${activeAgreement.id}?tab=payment`}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg shadow-brand-500/20 transition-all hover:scale-105"
              >
                <CreditCard className="w-4 h-4" />
                Pay Monthly Rent
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Monthly Rent</p>
              <p className="text-xl font-extrabold text-white font-mono mt-1">
                {activeAgreement.rent_amount_eth} <span className="text-xs text-brand-400 font-sans">ETH</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Cycle: Every 30 Days</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Security Deposit</p>
              <p className="text-xl font-extrabold text-cyan-400 font-mono mt-1">
                {activeAgreement.deposit_held_eth || activeAgreement.deposit_amount_eth} <span className="text-xs font-sans">ETH</span>
              </p>
              <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 mt-1 inline-block">
                Status: {activeAgreement.deposit_status} (In Escrow)
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Installments Paid</p>
              <p className="text-xl font-extrabold text-white font-mono mt-1">
                {activeAgreement.rent_paid_count} <span className="text-xs text-slate-400 font-sans">Cycles</span>
              </p>
              <p className="text-[11px] text-emerald-400 mt-0.5">Up to date on blockchain</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Lease Term</p>
              <p className="text-xs font-mono text-slate-300 mt-2">
                {formatDate(activeAgreement.start_date)}
              </p>
              <p className="text-[11px] text-slate-500">to {formatDate(activeAgreement.end_date)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <UserCheck className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Active Lease Connected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            When a landlord issues an agreement to your wallet address ({shortenAddress(account || user?.wallet_address)}),
            it will appear here for review, cryptographic verification, and smart contract escrow payment.
          </p>
        </div>
      )}

      {/* All Tenant Agreements Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">All Agreements For This Wallet</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading agreements...</div>
        ) : agreements.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No agreements found assigned to your wallet address.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Landlord Wallet</th>
                  <th className="py-3 px-4">Rent</th>
                  <th className="py-3 px-4">Deposit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {agreements.map((ag) => {
                  const statusStyle = getStatusColor(ag.status);
                  return (
                    <tr key={ag.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4 font-semibold text-white">{ag.property_title}</td>
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-400">
                        {shortenAddress(ag.landlord_wallet, 4)}
                      </td>
                      <td className="py-4 px-4 font-mono">{ag.rent_amount_eth} ETH</td>
                      <td className="py-4 px-4 font-mono">{ag.deposit_amount_eth} ETH</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {ag.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          to={`/agreements/${ag.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
