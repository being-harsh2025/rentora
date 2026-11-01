import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Receipt,
  FileCheck2,
  CheckCircle2,
  Layers,
  Sparkles,
  Cpu,
  Coins,
  Scale
} from 'lucide-react';
import { agreementsApi } from '../services/api';
import { useWallet } from '../context/WalletContext';

export const LandingPage: React.FC = () => {
  const { account, connectWallet } = useWallet();
  const [agreementCount, setAgreementCount] = useState<number>(0);

  useEffect(() => {
    agreementsApi.list().then((res) => {
      if (res && res.agreements) {
        setAgreementCount(res.agreements.length);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-24 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Rentora • Smart Renting. Secure Agreements.
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            Trustless Rental Agreements with{' '}
            <span className="text-emerald-400 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent inline-block">
              Smart Contract Escrow
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate landlord-tenant deposit conflicts, payment disputes, and manual paperwork.
            Immutable agreement terms hashed on-chain, verifiable transactions, and automated settlement.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-xl mx-auto">
            <Link
              to="/agreements/new"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-xl shadow-brand-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Create Rental Agreement
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/tenant"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              Tenant Dashboard
            </Link>

            <Link
              to="/verify"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-brand-400 border border-brand-500/20 font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <FileCheck2 className="w-4 h-4" />
              Verify Lease Hash
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-white font-mono">{agreementCount}</p>
              <p className="text-xs text-slate-400 mt-1">Platform Agreements</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-brand-400 font-mono">100%</p>
              <p className="text-xs text-slate-400 mt-1">On-Chain Escrowed</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-white font-mono">0.8.24</p>
              <p className="text-xs text-slate-400 mt-1">Solidity Compiler</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-emerald-400 font-mono">Sepolia</p>
              <p className="text-xs text-slate-400 mt-1">Ethereum Testnet</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How Rentora Solves Traditional Rental Friction
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Engineered with strict Ethereum smart contract verification, cryptographic proofs, and escrow security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 relative group hover:border-brand-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart Contract Deposit Escrow</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Security deposits are held directly by the verified Ethereum contract bytecode. Neither landlord nor tenant can unilaterally seize funds without following contract rules.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 relative group hover:border-brand-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Deterministic Terms Hash</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every clause, payment frequency, and property identifier is hashed into a 32-byte Keccak-256 fingerprint stored on-chain. Any tampering with off-chain documents immediately invalidates the proof.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 relative group hover:border-brand-500/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Documented Dispute Resolution</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Landlords must specify exact deduction reasons with amounts. Tenants have the right to accept or formally dispute, triggering mutual compromise settlement directly on-chain.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison: Traditional vs Rentora */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">
            Traditional Paper Leases vs. Rentora Smart Contracts
          </h2>

          <div className="overflow-x-auto pb-2 scrollbar-none">
            <table className="w-full min-w-[580px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-4 px-4 font-semibold">Feature / Aspect</th>
                  <th className="py-4 px-4 font-semibold text-rose-400">Traditional System</th>
                  <th className="py-4 px-4 font-semibold text-brand-400">Rentora Smart Contract</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Deposit Custody</td>
                  <td className="py-3.5 px-4 text-slate-400">Held in landlord's personal account; risk of non-refund</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-medium">Locked in decentralized smart contract escrow</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Agreement Terms</td>
                  <td className="py-3.5 px-4 text-slate-400">Physical paper or unhashed PDFs prone to alteration</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-medium">Cryptographic Keccak-256 hash verified on-chain</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Payment Proof</td>
                  <td className="py-3.5 px-4 text-slate-400">Manual receipts, screenshots, bank statement arguments</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-medium">Immutable block timestamps and transaction receipts</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Deduction Handling</td>
                  <td className="py-3.5 px-4 text-slate-400">Arbitrary deductions with zero formal recourse</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-medium">On-chain deduction proposals, dispute & mutual settlement</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Transparency</td>
                  <td className="py-3.5 px-4 text-slate-400">Opaque, bilateral trust reliance</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-medium">100% public verifiable state on Ethereum Sepolia</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-brand-900/40 via-slate-900 to-teal-950/40 border border-brand-500/20 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Ready to deploy your next rental agreement on Ethereum?
          </h2>
          <p className="mt-3 text-slate-300 text-sm max-w-xl mx-auto">
            Connect your MetaMask wallet, draft customized terms, and invite your tenant to review and activate on-chain.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <Link
              to="/agreements/new"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/20 transition-all hover:scale-105 inline-flex items-center justify-center gap-2"
            >
              Draft New Lease Now
            </Link>
            <Link
              to="/verify"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all inline-flex items-center justify-center gap-2"
            >
              Verify Existing Agreement
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

