import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { agreementsApi, transactionsApi } from '../services/api';
import { Agreement, TransactionItem } from '../types';
import { shortenAddress, formatEth, formatDate, getStatusColor } from '../utils/formatters';
import {
  FilePlus2,
  Building2,
  Clock,
  CheckCircle2,
  Coins,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Receipt,
  Search,
  Filter
} from 'lucide-react';

export const LandlordDashboard: React.FC = () => {
  const { account, connectWallet } = useWallet();
  const { user } = useAuth();

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const activeWallet = account || (user && user.wallet_address);
      const res = await agreementsApi.list({
        wallet_address: activeWallet || undefined,
        role: 'landlord',
      });
      setAgreements(res.agreements || []);

      const txRes = await transactionsApi.list({
        wallet_address: activeWallet || undefined,
      });
      setTransactions(txRes.transactions || []);
    } catch (err) {
      console.error('Failed to load landlord dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [account, user]);

  // Derived KPIs
  const totalAgreements = agreements.length;
  const activeAgreements = agreements.filter((a) => a.status === 'Active').length;
  const pendingAgreements = agreements.filter((a) => a.status === 'PendingAcceptance' || a.status === 'Accepted').length;
  const completedAgreements = agreements.filter((a) => a.status === 'Completed').length;

  const totalRentReceivedEth = agreements.reduce((sum, a) => {
    const rentPerPeriod = parseFloat(a.rent_amount_eth) || 0;
    const periodsPaid = a.rent_paid_count || 0;
    return sum + rentPerPeriod * periodsPaid;
  }, 0);

  const totalDepositsHeldEth = agreements.reduce((sum, a) => {
    if (a.deposit_status === 'Held' || a.deposit_status === 'ProposedDeduction' || a.deposit_status === 'Disputed') {
      return sum + (parseFloat(a.deposit_held_eth) || parseFloat(a.deposit_amount_eth) || 0);
    }
    return sum;
  }, 0);

  const filteredAgreements = agreements.filter((a) => {
    const matchesStatus = filterStatus === 'all' || a.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch =
      a.property_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.property_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tenant_wallet.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-xs font-semibold uppercase tracking-wider border border-brand-500/20">
              Landlord Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Property Portfolio & Leases</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your digital rental contracts, escrow deposits, and real-time rent collections on Ethereum.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/agreements/new"
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 inline-flex items-center gap-2 transition-all hover:scale-105"
          >
            <FilePlus2 className="w-4 h-4" />
            Create Rental Agreement
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Agreements</span>
            <Building2 className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{totalAgreements}</p>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">{activeAgreements} Active</span>
            <span>•</span>
            <span className="text-amber-400 font-semibold">{pendingAgreements} Pending</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Rent Collected</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {totalRentReceivedEth.toFixed(4)} <span className="text-xs text-brand-400 font-sans">ETH</span>
          </p>
          <p className="mt-2 text-[11px] text-slate-400">Total rent transferred to landlord wallet</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Deposits in Escrow</span>
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {totalDepositsHeldEth.toFixed(4)} <span className="text-xs text-cyan-400 font-sans">ETH</span>
          </p>
          <p className="mt-2 text-[11px] text-slate-400">Locked safely in smart contract escrow</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Completed Leases</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{completedAgreements}</p>
          <p className="mt-2 text-[11px] text-slate-400">Fully settled and archived</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'active', 'pendingacceptance', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterStatus === status
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status === 'pendingacceptance' ? 'Pending' : status}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by property or tenant..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Agreements Table */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">Loading agreements from database & blockchain...</div>
        ) : filteredAgreements.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-400 font-medium text-sm">No rental agreements found</p>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Draft your first smart contract rental agreement with customized terms, rent schedule, and deposit escrow.
            </p>
            <Link
              to="/agreements/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all mt-2"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              Create First Agreement
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Property / Lease</th>
                  <th className="py-3 px-4">Tenant Wallet</th>
                  <th className="py-3 px-4">Rent / Period</th>
                  <th className="py-3 px-4">Deposit Escrow</th>
                  <th className="py-3 px-4">Contract Status</th>
                  <th className="py-3 px-4">Periods Paid</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredAgreements.map((ag) => {
                  const statusStyle = getStatusColor(ag.status);
                  const depositStyle = getStatusColor(ag.deposit_status);
                  return (
                    <tr key={ag.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <Link to={`/agreements/${ag.id}`} className="font-semibold text-white hover:text-brand-400 block">
                          {ag.property_title}
                        </Link>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{ag.property_address}</span>
                      </td>

                      <td className="py-4 px-4 font-mono text-[11px]">
                        <span className="text-slate-300">{shortenAddress(ag.tenant_wallet, 4)}</span>
                      </td>

                      <td className="py-4 px-4 font-mono font-medium text-white">
                        {ag.rent_amount_eth} <span className="text-slate-500 font-sans text-[10px]">ETH</span>
                      </td>

                      <td className="py-4 px-4 font-mono">
                        <div>
                          <span className="font-medium text-white">{ag.deposit_amount_eth} ETH</span>
                          <span className={`block text-[10px] px-1.5 py-0.5 rounded border w-fit mt-0.5 ${depositStyle.bg} ${depositStyle.text} ${depositStyle.border}`}>
                            {ag.deposit_status}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {ag.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono">
                        <span className="text-brand-400 font-semibold">{ag.rent_paid_count}</span>
                        <span className="text-slate-500 text-[10px]"> cycles</span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <Link
                          to={`/agreements/${ag.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                        >
                          View Details
                          <ChevronRight className="w-3.5 h-3.5" />
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

      {/* Recent Blockchain Transactions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Blockchain Transactions</h3>
          </div>
          <Link to="/transactions" className="text-xs text-brand-400 hover:underline">
            View All Transactions →
          </Link>
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No on-chain transactions recorded yet for this wallet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Transaction Hash</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono text-[11px] text-slate-300">
                {transactions.slice(0, 5).map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-2.5 px-3 font-sans font-medium text-white">{tx.tx_type}</td>
                    <td className="py-2.5 px-3 text-brand-400">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline inline-flex items-center gap-1"
                      >
                        {shortenAddress(tx.tx_hash, 6)}
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    </td>
                    <td className="py-2.5 px-3">{tx.amount_eth} ETH</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">{formatDate(tx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

