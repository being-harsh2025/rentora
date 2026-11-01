import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { agreementsApi, transactionsApi } from '../services/api';
import { Agreement, PaymentRecord, DeductionProposal, TransactionItem } from '../types';
import { shortenAddress, formatEth, formatDate, getStatusColor } from '../utils/formatters';
import { TransactionModal } from '../components/TransactionModal';
import {
  ShieldCheck,
  Building,
  User,
  Coins,
  Calendar,
  CreditCard,
  Lock,
  Scale,
  Receipt,
  FileCheck2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Hash,
  Loader2,
  ArrowRight
} from 'lucide-react';

export const AgreementDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { account, getContract, connectWallet, isSupportedNetwork, switchNetwork } = useWallet();
  const { user } = useAuth();

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [deductionProposal, setDeductionProposal] = useState<DeductionProposal | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Form states for deduction proposal & dispute
  const [deductionAmount, setDeductionAmount] = useState('0.1');
  const [deductionReason, setDeductionReason] = useState('Wall paint scratches and repairs');
  const [disputeReason, setDisputeReason] = useState('Damages existed prior to occupancy as per check-in inspection');
  const [agreedCompromise, setAgreedCompromise] = useState('0.05');

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    status: 'idle' | 'awaiting_signature' | 'pending' | 'confirmed' | 'failed';
    txHash: string | null;
    errorMessage: string | null;
    actionTitle: string;
  }>({
    isOpen: false,
    status: 'idle',
    txHash: null,
    errorMessage: null,
    actionTitle: '',
  });

  const fetchAgreementDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await agreementsApi.getById(id);
      setAgreement(res.agreement);
      setPayments(res.payments || []);
      setDeductionProposal(res.deductionProposal || null);
      setTransactions(res.transactions || []);

      // If blockchain_id is available, also check contract state for real-time freshness
      if (res.agreement?.blockchain_id) {
        try {
          const contract = await getContract(false);
          if (contract) {
            const onChainAg = await contract.getAgreement(res.agreement.blockchain_id);
            const onChainHistory = await contract.getPaymentHistory(res.agreement.blockchain_id);
            const onChainProp = await contract.getDeductionProposal(res.agreement.blockchain_id);

            // Map onchain enum to string
            const statusMap = ['PendingAcceptance', 'Accepted', 'Active', 'Completed', 'Terminated'];
            const depositMap = ['None', 'Held', 'ProposedDeduction', 'Disputed', 'Settled'];

            const onChainStatus = statusMap[Number(onChainAg.status)] || res.agreement.status;
            const onChainDepositStatus = depositMap[Number(onChainAg.depositStatus)] || res.agreement.deposit_status;

            setAgreement((prev) =>
              prev
                ? {
                    ...prev,
                    status: onChainStatus as any,
                    deposit_status: onChainDepositStatus as any,
                    deposit_held_eth: ethers.formatEther(onChainAg.depositHeld),
                    rent_paid_count: Number(onChainAg.rentPaidCount),
                  }
                : null
            );

            if (onChainProp && onChainProp.proposedTimestamp > 0) {
              setDeductionProposal({
                amount: ethers.formatEther(onChainProp.amount),
                reason: onChainProp.reason,
                proposedTimestamp: Number(onChainProp.proposedTimestamp),
                isDisputed: onChainProp.isDisputed,
                disputeReason: onChainProp.disputeReason,
                isResolved: onChainProp.isResolved,
              });
            }
          }
        } catch (chainErr) {
          console.warn('Could not read real-time contract state (network may be offline):', chainErr);
        }
      }
    } catch (err) {
      console.error('Failed to load agreement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreementDetails();
  }, [id, account]);

  const activeWallet = (account || user?.wallet_address || '').toLowerCase();
  const isLandlord = activeWallet === agreement?.landlord_wallet.toLowerCase();
  const isTenant = activeWallet === agreement?.tenant_wallet.toLowerCase();

  // Helper for executing transactions
  const executeBlockchainTx = async (
    title: string,
    txMethod: (contract: ethers.Contract) => Promise<ethers.ContractTransactionResponse>,
    syncPayload: any
  ) => {
    if (!account) {
      await connectWallet();
      return;
    }
    if (!isSupportedNetwork) {
      await switchNetwork();
      return;
    }

    try {
      setModalState({
        isOpen: true,
        status: 'awaiting_signature',
        txHash: null,
        errorMessage: null,
        actionTitle: title,
      });

      const contract = await getContract(true);
      if (!contract) throw new Error('Contract instance unavailable');

      const tx = await txMethod(contract);

      setModalState({
        isOpen: true,
        status: 'pending',
        txHash: tx.hash,
        errorMessage: null,
        actionTitle: title,
      });

      await tx.wait();

      // Sync state with backend
      await agreementsApi.syncBlockchain({
        id: agreement?.id,
        blockchain_id: agreement?.blockchain_id,
        tx_hash: tx.hash,
        sender_wallet: account,
        ...syncPayload,
      });

      setModalState({
        isOpen: true,
        status: 'confirmed',
        txHash: tx.hash,
        errorMessage: null,
        actionTitle: title,
      });

      await fetchAgreementDetails();
    } catch (err: any) {
      console.error(`${title} failed:`, err);
      setModalState({
        isOpen: true,
        status: 'failed',
        txHash: null,
        errorMessage: err.reason || err.message || 'Transaction reverted.',
        actionTitle: title,
      });
    }
  };

  // 1. Accept Agreement
  const handleAcceptAgreement = async () => {
    if (!agreement?.blockchain_id) return;
    await executeBlockchainTx(
      'Accepting Rental Agreement',
      (c) => c.acceptAgreement(agreement.blockchain_id),
      {
        status: 'Accepted',
        tx_type: 'AgreementAccepted',
      }
    );
  };

  // 2. Pay Security Deposit
  const handlePayDeposit = async () => {
    if (!agreement?.blockchain_id) return;
    const depositWei = ethers.parseEther(agreement.deposit_amount_eth);
    await executeBlockchainTx(
      'Paying Security Deposit Escrow',
      (c) => c.paySecurityDeposit(agreement.blockchain_id, { value: depositWei }),
      {
        status: 'Active',
        deposit_status: 'Held',
        deposit_held_eth: agreement.deposit_amount_eth,
        tx_type: 'DepositPaid',
        amount_eth: agreement.deposit_amount_eth,
      }
    );
  };

  // 3. Pay Monthly Rent
  const handlePayRent = async () => {
    if (!agreement?.blockchain_id) return;
    const rentWei = ethers.parseEther(agreement.rent_amount_eth);
    await executeBlockchainTx(
      'Paying Monthly Rent Installment',
      (c) => c.payRent(agreement.blockchain_id, { value: rentWei }),
      {
        rent_paid_count: (agreement.rent_paid_count || 0) + 1,
        tx_type: 'RentPaid',
        amount_eth: agreement.rent_amount_eth,
      }
    );
  };

  // 4. Propose Deduction (Landlord)
  const handleProposeDeduction = async () => {
    if (!agreement?.blockchain_id) return;
    const amountWei = ethers.parseEther(deductionAmount);
    await executeBlockchainTx(
      'Proposing Deposit Deduction',
      (c) => c.proposeDeduction(agreement.blockchain_id, amountWei, deductionReason),
      {
        deposit_status: 'ProposedDeduction',
        tx_type: 'DeductionProposed',
        amount_eth: deductionAmount,
      }
    );
  };

  // 5. Accept Deduction (Tenant)
  const handleAcceptDeduction = async () => {
    if (!agreement?.blockchain_id) return;
    await executeBlockchainTx(
      'Accepting Deposit Deduction Settlement',
      (c) => c.acceptDeduction(agreement.blockchain_id),
      {
        deposit_status: 'Settled',
        deposit_held_eth: '0',
        tx_type: 'DeductionAccepted',
      }
    );
  };

  // 6. Dispute Deduction (Tenant)
  const handleDisputeDeduction = async () => {
    if (!agreement?.blockchain_id) return;
    await executeBlockchainTx(
      'Disputing Proposed Deduction',
      (c) => c.disputeDeduction(agreement.blockchain_id, disputeReason),
      {
        deposit_status: 'Disputed',
        tx_type: 'DeductionDisputed',
      }
    );
  };

  // 7. Settle Dispute (Mutual compromise)
  const handleSettleDispute = async () => {
    if (!agreement?.blockchain_id) return;
    const agreedWei = ethers.parseEther(agreedCompromise);
    await executeBlockchainTx(
      'Mutually Settling Deposit Dispute',
      (c) => c.settleDispute(agreement.blockchain_id, agreedWei),
      {
        deposit_status: 'Settled',
        deposit_held_eth: '0',
        tx_type: 'DisputeSettled',
        amount_eth: agreedCompromise,
      }
    );
  };

  // 8. Full Refund (Landlord)
  const handleFullRefund = async () => {
    if (!agreement?.blockchain_id) return;
    await executeBlockchainTx(
      'Issuing 100% Deposit Refund',
      (c) => c.refundDepositFull(agreement.blockchain_id),
      {
        deposit_status: 'Settled',
        deposit_held_eth: '0',
        tx_type: 'DepositRefunded',
        amount_eth: agreement.deposit_held_eth || agreement.deposit_amount_eth,
      }
    );
  };

  // 9. Complete Agreement
  const handleCompleteAgreement = async () => {
    if (!agreement?.blockchain_id) return;
    await executeBlockchainTx(
      'Finalizing Agreement Completion',
      (c) => c.completeAgreement(agreement.blockchain_id),
      {
        status: 'Completed',
        tx_type: 'AgreementCompleted',
      }
    );
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
        <p className="text-xs text-slate-400">Fetching smart contract data...</p>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Agreement Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested agreement ID ({id}) does not exist in the database or blockchain.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const statusStyle = getStatusColor(agreement.status);
  const depositStyle = getStatusColor(agreement.deposit_status);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Agreement Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                Status: {agreement.status}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${depositStyle.bg} ${depositStyle.text} ${depositStyle.border}`}>
                Deposit: {agreement.deposit_status}
              </span>
              {agreement.blockchain_id && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  On-Chain ID #{agreement.blockchain_id}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{agreement.property_title}</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{agreement.property_address}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/verify"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-400 text-xs font-semibold border border-slate-700 inline-flex items-center gap-1.5 transition-colors"
            >
              <FileCheck2 className="w-4 h-4" />
              Verify Hash Proof
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Monthly Rent</p>
            <p className="text-lg font-bold font-mono text-white mt-0.5">
              {agreement.rent_amount_eth} <span className="text-xs text-brand-400 font-sans">ETH</span>
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Security Deposit</p>
            <p className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
              {agreement.deposit_held_eth || agreement.deposit_amount_eth} <span className="text-xs font-sans">ETH</span>
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Rent Payments</p>
            <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {agreement.rent_paid_count} <span className="text-xs text-slate-400 font-sans">Cycles Paid</span>
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Lease Duration</p>
            <p className="text-xs font-mono text-slate-300 mt-1">
              {formatDate(agreement.start_date)} - {formatDate(agreement.end_date)}
            </p>
          </div>
        </div>

        {/* Participant Wallets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-400 font-medium">Landlord:</span>
              <span className="font-mono text-white">{shortenAddress(agreement.landlord_wallet, 6)}</span>
            </div>
            {isLandlord && (
              <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded font-bold">You</span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-slate-400 font-medium">Tenant:</span>
              <span className="font-mono text-white">{shortenAddress(agreement.tenant_wallet, 6)}</span>
            </div>
            {isTenant && (
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold">You</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2">
        {[
          { key: 'overview', label: 'Overview & Terms', icon: FileCheck2 },
          { key: 'deposit', label: 'Deposit Escrow', icon: Lock },
          { key: 'payment', label: 'Rent Payments', icon: CreditCard },
          { key: 'transactions', label: 'Blockchain Audit Log', icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-slate-800 text-brand-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Terms */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Action Callouts based on state */}
          {agreement.status === 'PendingAcceptance' && isTenant && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-amber-300 font-bold text-sm">Agreement Pending Your Digital Signature</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Please review the legal clauses and terms below. Accepting records your approval directly on the Ethereum contract.
                </p>
              </div>
              <button
                onClick={handleAcceptAgreement}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                Sign & Accept Agreement
              </button>
            </div>
          )}

          {agreement.status === 'Accepted' && isTenant && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-blue-300 font-bold text-sm">Agreement Accepted! Deposit Escrow Required</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Deposit {agreement.deposit_amount_eth} ETH into the smart contract escrow to activate the lease.
                </p>
              </div>
              <button
                onClick={handlePayDeposit}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Lock className="w-4 h-4" />
                Deposit {agreement.deposit_amount_eth} ETH to Escrow
              </button>
            </div>
          )}

          {/* Legal Terms Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-brand-400" />
              Verified Agreement Terms & Legal Clauses
            </h3>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
              {agreement.terms_text}
            </div>

            {/* Cryptographic Seal */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                  <Hash className="w-3.5 h-3.5 text-brand-400" />
                  On-Chain Keccak-256 Fingerprint
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Immutable State
                </span>
              </div>
              <p className="font-mono text-xs text-brand-400 break-all bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                {agreement.terms_hash}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Deposit Escrow */}
      {activeTab === 'deposit' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Smart Contract Escrow Vault</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Security deposit funds are held directly in the contract bytecode until lease completion or settlement.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Escrow Balance</span>
                <p className="text-2xl font-extrabold text-cyan-400 font-mono">
                  {agreement.deposit_held_eth || '0.00'} <span className="text-xs font-sans">ETH</span>
                </p>
              </div>
            </div>

            {/* If deposit not yet paid */}
            {agreement.deposit_status === 'None' && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <Lock className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-white font-bold text-sm">Escrow Awaiting Security Deposit</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {isTenant
                    ? `Please pay the required security deposit of ${agreement.deposit_amount_eth} ETH to activate the agreement.`
                    : 'The tenant has not yet deposited the security funds into the escrow contract.'}
                </p>
                {isTenant && agreement.status === 'Accepted' && (
                  <button
                    onClick={handlePayDeposit}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 inline-flex items-center gap-1.5"
                  >
                    <Lock className="w-4 h-4" />
                    Deposit {agreement.deposit_amount_eth} ETH Now
                  </button>
                )}
              </div>
            )}

            {/* If deposit is Held */}
            {agreement.deposit_status === 'Held' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span>Security deposit of {agreement.deposit_held_eth} ETH is securely escrowed.</span>
                  </div>
                </div>

                {isLandlord && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                    {/* Full Refund Option */}
                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                        Option A: Full 100% Refund
                      </h4>
                      <p className="text-xs text-slate-400">
                        If no damage or arrears occurred, release 100% of the deposit directly back to the tenant.
                      </p>
                      <button
                        onClick={handleFullRefund}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
                      >
                        Release Full {agreement.deposit_held_eth} ETH to Tenant
                      </button>
                    </div>

                    {/* Propose Deduction Option */}
                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                        Option B: Propose Damage Deduction
                      </h4>
                      <p className="text-xs text-slate-400">
                        Specify damage repairs. Tenant will be prompted to review, accept, or dispute.
                      </p>
                      <div className="space-y-2">
                        <input
                          type="number"
                          step="0.01"
                          max={agreement.deposit_held_eth}
                          value={deductionAmount}
                          onChange={(e) => setDeductionAmount(e.target.value)}
                          placeholder="Amount in ETH"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={deductionReason}
                          onChange={(e) => setDeductionReason(e.target.value)}
                          placeholder="Reason (e.g. Broken tile repair)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                        />
                      </div>
                      <button
                        onClick={handleProposeDeduction}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-colors"
                      >
                        Submit Deduction Proposal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If Deduction Proposed */}
            {agreement.deposit_status === 'ProposedDeduction' && deductionProposal && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-amber-300 font-bold text-sm">Proposed Deposit Deduction</h4>
                  <span className="text-xs font-mono font-bold text-white">
                    Amount: {deductionProposal.amount} ETH
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  <strong>Landlord Reason:</strong> {deductionProposal.reason}
                </p>

                {isTenant && (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleAcceptDeduction}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                    >
                      Accept Deduction ({deductionProposal.amount} ETH to Landlord, Remainder Refunded)
                    </button>
                    <button
                      onClick={handleDisputeDeduction}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                    >
                      Dispute Deduction
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* If Disputed */}
            {agreement.deposit_status === 'Disputed' && (
              <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <Scale className="w-5 h-5" />
                  <span>Deduction Formally Disputed by Tenant</span>
                </div>
                <p className="text-xs text-slate-300">
                  {deductionProposal?.disputeReason || 'Disputed on grounds of pre-existing wear and tear.'}
                </p>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                    Mutual Settlement Resolution
                  </h5>
                  <p className="text-xs text-slate-400">
                    Both parties can agree upon a compromise deduction. Once signed on-chain, the contract immediately disperses the funds.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.01"
                      value={agreedCompromise}
                      onChange={(e) => setAgreedCompromise(e.target.value)}
                      placeholder="Agreed Deduction (ETH)"
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white w-48"
                    />
                    <button
                      onClick={handleSettleDispute}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
                    >
                      Execute Mutual Settlement
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* If Settled */}
            {agreement.deposit_status === 'Settled' && (
              <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  <span>Security deposit has been completely settled and refunded according to contract rules.</span>
                </div>
                {agreement.status === 'Active' && (
                  <button
                    onClick={handleCompleteAgreement}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
                  >
                    Mark Agreement Completed
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Rent Payments */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Monthly Rent Settlement</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tenant pays rent installments directly through the smart contract, transferring funds straight to the landlord.
                </p>
              </div>

              {isTenant && agreement.status === 'Active' && (
                <button
                  onClick={handlePayRent}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 inline-flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay Rent ({agreement.rent_amount_eth} ETH)
                </button>
              )}
            </div>

            {/* Payment History Table */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Confirmed Payment History</h4>

              {payments.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No rent payments recorded yet for this agreement.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                        <th className="py-2.5 px-3">Period #</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Timeliness</th>
                        <th className="py-2.5 px-3">Date Paid</th>
                        <th className="py-2.5 px-3">Transaction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono text-[11px] text-slate-300">
                      {payments.map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-sans font-medium text-white">Period #{p.periodIndex}</td>
                          <td className="py-2.5 px-3">{p.amount} ETH</td>
                          <td className="py-2.5 px-3 font-sans">
                            {p.isLate ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Late Payment
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                On Time
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400">{formatDate(p.timestamp || p.paid_at)}</td>
                          <td className="py-2.5 px-3 text-brand-400">
                            {p.tx_hash ? (
                              <a
                                href={`https://sepolia.etherscan.io/tx/${p.tx_hash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline inline-flex items-center gap-1"
                              >
                                {shortenAddress(p.tx_hash, 4)}
                                <ExternalLink className="w-3 h-3 text-slate-500" />
                              </a>
                            ) : (
                              'On-chain verified'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Blockchain Audit Log */}
      {activeTab === 'transactions' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-400" />
            Immutable Blockchain Transaction Log
          </h3>

          {transactions.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No transactions recorded for this agreement.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                    <th className="py-2.5 px-3">Transaction Event</th>
                    <th className="py-2.5 px-3">Tx Hash</th>
                    <th className="py-2.5 px-3">Sender</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono text-[11px] text-slate-300">
                  {transactions.map((tx) => (
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
                      <td className="py-2.5 px-3 text-slate-400">{shortenAddress(tx.sender_wallet, 4)}</td>
                      <td className="py-2.5 px-3">{tx.amount_eth} ETH</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400">{formatDate(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={modalState.isOpen}
        status={modalState.status}
        txHash={modalState.txHash}
        errorMessage={modalState.errorMessage}
        title={modalState.actionTitle}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
