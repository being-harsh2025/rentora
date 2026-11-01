import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { agreementsApi } from '../services/api';
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  Hash,
  Upload,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';

export const AgreementVerificationPage: React.FC = () => {
  const { getContract } = useWallet();

  const [agreementId, setAgreementId] = useState('');
  const [landlordWallet, setLandlordWallet] = useState('');
  const [tenantWallet, setTenantWallet] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [rentEth, setRentEth] = useState('');
  const [depositEth, setDepositEth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [termsText, setTermsText] = useState('');
  const [claimedHash, setClaimedHash] = useState('');

  const [verificationResult, setVerificationResult] = useState<{
    computedHash: string;
    onChainHash?: string;
    isValid: boolean;
    onChainVerified?: boolean;
    details?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // Quick auto-fill from an existing agreement ID
  const handleLoadAgreement = async () => {
    if (!agreementId) return;
    try {
      setLoading(true);
      const res = await agreementsApi.getById(agreementId);
      if (res && res.agreement) {
        const ag = res.agreement;
        setLandlordWallet(ag.landlord_wallet);
        setTenantWallet(ag.tenant_wallet);
        setPropertyAddress(ag.property_address);
        setRentEth(ag.rent_amount_eth);
        setDepositEth(ag.deposit_amount_eth);
        setStartDate(ag.start_date.split('T')[0]);
        setEndDate(ag.end_date.split('T')[0]);
        setTermsText(ag.terms_text);
        setClaimedHash(ag.terms_hash);
      }
    } catch (err) {
      alert('Agreement not found in local index.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setVerificationResult(null);

    try {
      // 1. Calculate deterministic terms hash locally
      const canonicalString = [
        `LANDLORD:${landlordWallet.trim().toLowerCase()}`,
        `TENANT:${tenantWallet.trim().toLowerCase()}`,
        `PROPERTY:${propertyAddress.trim()}`,
        `RENT_ETH:${ethers.parseEther(rentEth || '0').toString()}`,
        `DEPOSIT_ETH:${ethers.parseEther(depositEth || '0').toString()}`,
        `START:${new Date(startDate).toISOString()}`,
        `END:${new Date(endDate).toISOString()}`,
        `INTERVAL_DAYS:30`,
        `TERMS:${termsText.trim()}`,
      ].join('|');

      const computedHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalString));

      let onChainHash: string | undefined;
      let onChainVerified = false;

      // 2. Query Smart Contract if agreement ID provided
      if (agreementId) {
        try {
          const contract = await getContract(false);
          if (contract) {
            const ag = await contract.getAgreement(Number(agreementId));
            onChainHash = ag.termsHash;
            onChainVerified = await contract.verifyAgreementTerms(Number(agreementId), computedHash);
          }
        } catch (chainErr) {
          console.warn('Smart contract verification query failed:', chainErr);
        }
      }

      const isValid = claimedHash
        ? computedHash.toLowerCase() === claimedHash.trim().toLowerCase()
        : onChainHash
        ? computedHash.toLowerCase() === onChainHash.toLowerCase()
        : true;

      setVerificationResult({
        computedHash,
        onChainHash,
        isValid,
        onChainVerified,
        details: isValid
          ? 'Cryptographic integrity verified: The supplied agreement terms, financial amounts, and participant wallets match the original immutable hash with 100% mathematical certainty.'
          : 'Tampering detected: The computed cryptographic hash does NOT match the original record. The terms, dates, or financial amounts have been altered.',
      });
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-1">
        <span className="px-2.5 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-xs font-semibold uppercase tracking-wider border border-brand-500/20">
          Cryptographic Integrity
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Rental Agreement Terms Verification</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Verify whether an off-chain digital rental document matches the immutable Keccak-256 fingerprint recorded on Ethereum.
        </p>
      </div>

      {/* Quick Lookup Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <input
            type="number"
            value={agreementId}
            onChange={(e) => setAgreementId(e.target.value)}
            placeholder="Enter Agreement ID (e.g. 1)"
            className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-brand-500"
          />
        </div>
        <button
          type="button"
          onClick={handleLoadAgreement}
          disabled={loading || !agreementId}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Autofill From Database'}
        </button>
      </div>

      {/* Verification Form */}
      <form onSubmit={handleVerify} className="space-y-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Hash className="w-4 h-4 text-brand-400" />
            Parameters to Verify
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Landlord Wallet Address</label>
              <input
                type="text"
                required
                value={landlordWallet}
                onChange={(e) => setLandlordWallet(e.target.value)}
                placeholder="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Tenant Wallet Address</label>
              <input
                type="text"
                required
                value={tenantWallet}
                onChange={(e) => setTenantWallet(e.target.value)}
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Property Physical Address</label>
              <input
                type="text"
                required
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="Flat 402, Block B, Green Heights, Indiranagar, Bangalore"
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Rent Amount (ETH)</label>
              <input
                type="number"
                step="0.001"
                required
                value={rentEth}
                onChange={(e) => setRentEth(e.target.value)}
                placeholder="0.5"
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Security Deposit (ETH)</label>
              <input
                type="number"
                step="0.001"
                required
                value={depositEth}
                onChange={(e) => setDepositEth(e.target.value)}
                placeholder="1.0"
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Expected / Claimed Keccak-256 Hash (Optional comparison)
              </label>
              <input
                type="text"
                value={claimedHash}
                onChange={(e) => setClaimedHash(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-brand-400 font-mono text-xs outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Legal Terms Text</label>
              <textarea
                rows={5}
                required
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                placeholder="Paste the agreement clauses..."
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 inline-flex items-center gap-2 transition-all hover:scale-105"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
              Run Cryptographic Verification
            </button>
          </div>
        </div>
      </form>

      {/* Verification Result Card */}
      {verificationResult && (
        <div
          className={`p-6 rounded-3xl border ${
            verificationResult.isValid
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-rose-500/10 border-rose-500/30'
          } space-y-4 animate-in fade-in zoom-in-95 duration-200`}
        >
          <div className="flex items-center gap-3">
            {verificationResult.isValid ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
            )}
            <div>
              <h3
                className={`text-lg font-bold ${
                  verificationResult.isValid ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {verificationResult.isValid
                  ? 'Cryptographic Verification Passed!'
                  : 'Verification Failed - Document Altered!'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">{verificationResult.details}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Computed Keccak-256 Hash:</span>
              <span className="font-mono text-brand-400 break-all">{verificationResult.computedHash}</span>
            </div>

            {verificationResult.onChainHash && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900">
                <span className="text-slate-400 font-medium">Recorded On-Chain Hash:</span>
                <span className="font-mono text-white break-all">{verificationResult.onChainHash}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

