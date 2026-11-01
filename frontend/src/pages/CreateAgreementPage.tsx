import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { agreementsApi } from '../services/api';
import { TransactionModal } from '../components/TransactionModal';
import {
  FilePlus2,
  Building,
  User,
  Coins,
  ShieldCheck,
  Calendar,
  Clock,
  FileText,
  Hash,
  AlertCircle,
  HelpCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export const CreateAgreementPage: React.FC = () => {
  const navigate = useNavigate();
  const { account, connectWallet, getContract, isSupportedNetwork, switchNetwork } = useWallet();
  const { user } = useAuth();

  const [tenantWallet, setTenantWallet] = useState('');
  const [propertyTitle, setPropertyTitle] = useState('Flat 402, Green Heights');
  const [propertyAddress, setPropertyAddress] = useState('Flat 402, Block B, Green Heights Apartments, Indiranagar, Bangalore');
  const [rentAmountEth, setRentAmountEth] = useState('0.5');
  const [depositAmountEth, setDepositAmountEth] = useState('1.0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentIntervalDays, setPaymentIntervalDays] = useState(30);
  const [termsText, setTermsText] = useState(
`1. The Tenant agrees to pay the agreed monthly rent on or before the due date for each 30-day period.
2. The Security Deposit shall be held in the RentChain Smart Contract Escrow throughout the lease term.
3. The Landlord may only propose legitimate deductions for documented physical damages beyond standard wear-and-tear.
4. The Tenant retains the right to dispute any proposed deduction on-chain.
5. In case of mutual agreement or end of lease with no damages, the Security Deposit shall be fully refunded to the Tenant.`
  );

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    status: 'idle' | 'awaiting_signature' | 'pending' | 'confirmed' | 'failed';
    txHash: string | null;
    errorMessage: string | null;
  }>({
    isOpen: false,
    status: 'idle',
    txHash: null,
    errorMessage: null,
  });

  const activeLandlordWallet = account || (user && user.wallet_address) || '';

  // Real-time deterministic Keccak256 hash calculation
  const calculatedTermsHash = useMemo(() => {
    if (!activeLandlordWallet || !tenantWallet) return '0x0000000000000000000000000000000000000000000000000000000000000000';
    try {
      const canonicalString = [
        `LANDLORD:${activeLandlordWallet.toLowerCase()}`,
        `TENANT:${tenantWallet.trim().toLowerCase()}`,
        `PROPERTY:${propertyAddress.trim()}`,
        `RENT_ETH:${ethers.parseEther(rentAmountEth || '0').toString()}`,
        `DEPOSIT_ETH:${ethers.parseEther(depositAmountEth || '0').toString()}`,
        `START:${new Date(startDate).toISOString()}`,
        `END:${new Date(endDate).toISOString()}`,
        `INTERVAL_DAYS:${paymentIntervalDays}`,
        `TERMS:${termsText.trim()}`,
      ].join('|');

      return ethers.keccak256(ethers.toUtf8Bytes(canonicalString));
    } catch {
      return 'Invalid parameters for hash';
    }
  }, [
    activeLandlordWallet,
    tenantWallet,
    propertyAddress,
    rentAmountEth,
    depositAmountEth,
    startDate,
    endDate,
    paymentIntervalDays,
    termsText,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      await connectWallet();
      return;
    }

    if (!isSupportedNetwork) {
      await switchNetwork();
      return;
    }

    if (!ethers.isAddress(tenantWallet.trim())) {
      alert('Please enter a valid Ethereum address for the tenant.');
      return;
    }

    if (tenantWallet.trim().toLowerCase() === account.toLowerCase()) {
      alert('Landlord and Tenant wallet addresses cannot be identical.');
      return;
    }

    const startTs = Math.floor(new Date(startDate).getTime() / 1000);
    const endTs = Math.floor(new Date(endDate).getTime() / 1000);

    if (endTs <= startTs) {
      alert('End date must be strictly after the start date.');
      return;
    }

    try {
      setModalState({
        isOpen: true,
        status: 'awaiting_signature',
        txHash: null,
        errorMessage: null,
      });

      // 1. Create draft on backend first
      const draftRes = await agreementsApi.createDraft({
        tenant_wallet: tenantWallet.trim(),
        property_title: propertyTitle,
        property_address: propertyAddress,
        rent_amount_eth: rentAmountEth,
        deposit_amount_eth: depositAmountEth,
        start_date: startDate,
        end_date: endDate,
        payment_interval_days: paymentIntervalDays,
        terms_text: termsText,
        landlord_wallet: account,
      });

      const draftAgreement = draftRes.agreement;

      // 2. Interact with Smart Contract
      const contract = await getContract(true);
      if (!contract) throw new Error('Contract instance not available.');

      const rentWei = ethers.parseEther(rentAmountEth);
      const depositWei = ethers.parseEther(depositAmountEth);
      const intervalSecs = paymentIntervalDays * 24 * 60 * 60;

      const tx = await contract.createAgreement(
        tenantWallet.trim(),
        propertyAddress,
        rentWei,
        depositWei,
        startTs,
        endTs,
        intervalSecs,
        calculatedTermsHash
      );

      setModalState({
        isOpen: true,
        status: 'pending',
        txHash: tx.hash,
        errorMessage: null,
      });

      const receipt = await tx.wait();

      // Find AgreementCreated event to extract on-chain agreementId
      let blockchainAgreementId = 1;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'AgreementCreated') {
            blockchainAgreementId = Number(parsed.args.agreementId);
            break;
          }
        } catch {}
      }

      // 3. Sync blockchain state back to backend database
      await agreementsApi.syncBlockchain({
        id: draftAgreement.id,
        blockchain_id: blockchainAgreementId,
        status: 'PendingAcceptance',
        deposit_status: 'None',
        deposit_held_eth: '0',
        rent_paid_count: 0,
        tx_hash: tx.hash,
        tx_type: 'AgreementCreated',
        sender_wallet: account,
        amount_eth: '0',
      });

      setModalState({
        isOpen: true,
        status: 'confirmed',
        txHash: tx.hash,
        errorMessage: null,
      });
    } catch (err: any) {
      console.error('Agreement creation error:', err);
      setModalState({
        isOpen: true,
        status: 'failed',
        txHash: null,
        errorMessage: err.reason || err.message || 'Transaction reverted by smart contract.',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-1">
        <span className="px-2.5 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-xs font-semibold uppercase tracking-wider border border-brand-500/20">
          Smart Contract Deployment
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Create New Rental Agreement</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Define terms, calculate cryptographic Keccak-256 fingerprint, and publish the agreement onto Ethereum.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Landlord & Tenant Wallets */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-brand-400" />
            1. Participant Wallet Addresses
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Landlord Wallet (You)
              </label>
              <input
                type="text"
                readOnly
                value={account || 'Please connect MetaMask'}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-brand-400 font-mono text-xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Tenant Wallet Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={tenantWallet}
                onChange={(e) => setTenantWallet(e.target.value)}
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 text-white font-mono text-xs outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Designated tenant who will accept and deposit funds into escrow.
              </p>
            </div>
          </div>
        </div>

        {/* Property Information */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-400" />
            2. Property Specifications
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Property Title</label>
              <input
                type="text"
                required
                value={propertyTitle}
                onChange={(e) => setPropertyTitle(e.target.value)}
                placeholder="Flat 402, Green Heights"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 text-white text-xs outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Physical Address / Identifier</label>
              <input
                type="text"
                required
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="Flat 402, Block B, Indiranagar, Bangalore"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 text-white text-xs outline-none"
              />
            </div>
          </div>
        </div>

        {/* Financial & Schedule Parameters */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-brand-400" />
            3. Financial Terms & Schedule
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Monthly Rent (ETH)</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={rentAmountEth}
                onChange={(e) => setRentAmountEth(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 text-white font-mono text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Security Deposit (ETH)</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={depositAmountEth}
                onChange={(e) => setDepositAmountEth(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 text-cyan-400 font-mono text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Lease Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Lease End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 text-white text-xs outline-none"
              />
            </div>
          </div>
        </div>

        {/* Custom Terms & Cryptographic Hash */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-400" />
            4. Legal Clauses & Deterministic Hash
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Agreement Terms & Clauses</label>
            <textarea
              rows={6}
              required
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 text-slate-200 text-xs font-mono leading-relaxed outline-none"
            />
          </div>

          {/* Cryptographic Keccak-256 Preview Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Hash className="w-3.5 h-3.5 text-brand-400" />
                Deterministic Terms Hash (Keccak-256)
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                To be stored on-chain
              </span>
            </div>
            <p className="font-mono text-xs text-brand-400 break-all bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              {calculatedTermsHash}
            </p>
            <p className="text-[11px] text-slate-500">
              Any alteration to clauses, dates, wallets, or amounts produces a completely different hash, guaranteeing tamper-evidence.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/landlord')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all hover:scale-105"
          >
            <ShieldCheck className="w-4 h-4" />
            Publish Agreement to Blockchain
          </button>
        </div>
      </form>

      <TransactionModal
        isOpen={modalState.isOpen}
        status={modalState.status}
        txHash={modalState.txHash}
        errorMessage={modalState.errorMessage}
        title="Deploying Rental Agreement"
        onClose={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
          if (modalState.status === 'confirmed') {
            navigate('/landlord');
          }
        }}
      />
    </div>
  );
};
