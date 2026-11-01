import React, { useState, useEffect } from 'react';
import { transactionsApi } from '../services/api';
import { TransactionItem } from '../types';
import { shortenAddress, formatDate } from '../utils/formatters';
import { Receipt, ExternalLink, Filter, Search, ShieldCheck } from 'lucide-react';

export const TransactionHistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await transactionsApi.list();
      setTransactions(res.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const explorerBaseUrl = import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://sepolia.etherscan.io';

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = filterType === 'all' || tx.tx_type.toLowerCase() === filterType.toLowerCase();
    const matchesSearch =
      tx.tx_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.sender_wallet.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.tx_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <span className="px-2.5 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-xs font-semibold uppercase tracking-wider border border-brand-500/20">
          Blockchain Ledger
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Transaction History & Receipts</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Every lease creation, escrow deposit, rent installment, and settlement is verified on the Ethereum blockchain.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'AgreementCreated', 'DepositPaid', 'RentPaid', 'DepositRefunded'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterType === type
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type === 'all' ? 'All Events' : type}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by hash, wallet, event..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading blockchain transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-400 font-medium text-sm">No transactions match your criteria</p>
            <p className="text-xs text-slate-600">
              Transactions will appear here as soon as agreements are deployed or payments are signed on Ethereum.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table */}
            <div className="hidden md:block overflow-x-auto pb-2 scrollbar-none">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Event / Action</th>
                    <th className="py-3 px-4">Transaction Hash</th>
                    <th className="py-3 px-4">Sender Wallet</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4 text-right">Block Explorer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-medium text-white">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                          {tx.tx_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-brand-400 font-semibold">
                        {shortenAddress(tx.tx_hash, 6)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">{shortenAddress(tx.sender_wallet, 4)}</td>

                      <td className="py-3.5 px-4 font-bold text-white">
                        {tx.amount_eth && tx.amount_eth !== '0' ? `${tx.amount_eth} ETH` : '—'}
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                          {tx.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-sans text-slate-400">{formatDate(tx.created_at)}</td>

                      <td className="py-3.5 px-4 text-right font-sans">
                        <a
                          href={`${explorerBaseUrl}/tx/${tx.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                        >
                          Sepolia Etherscan
                          <ExternalLink className="w-3 h-3 text-brand-400" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Transaction Cards */}
            <div className="md:hidden space-y-3">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                      {tx.tx_type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                      {tx.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-y border-slate-900">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Amount</span>
                      <p className="font-mono font-medium text-white">
                        {tx.amount_eth && tx.amount_eth !== '0' ? `${tx.amount_eth} ETH` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Date</span>
                      <p className="text-[11px] text-slate-400">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="font-mono text-brand-400">{shortenAddress(tx.tx_hash, 6)}</span>
                    <a
                      href={`${explorerBaseUrl}/tx/${tx.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                    >
                      Etherscan <ExternalLink className="w-3 h-3 text-brand-400" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

