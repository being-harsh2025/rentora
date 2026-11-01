export type UserRole = 'landlord' | 'tenant' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  wallet_address: string | null;
}

export type AgreementStatus = 'PendingAcceptance' | 'Accepted' | 'Active' | 'Completed' | 'Terminated';
export type DepositStatus = 'None' | 'Held' | 'ProposedDeduction' | 'Disputed' | 'Settled';

export interface Agreement {
  id: number;
  blockchain_id?: number | null;
  landlord_wallet: string;
  tenant_wallet: string;
  property_title: string;
  property_address: string;
  rent_amount_eth: string;
  deposit_amount_eth: string;
  start_date: string;
  end_date: string;
  payment_interval_days: number;
  terms_text: string;
  terms_hash: string;
  status: AgreementStatus;
  deposit_status: DepositStatus;
  deposit_held_eth: string;
  rent_paid_count: number;
  tx_hash?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PaymentRecord {
  id?: number;
  paymentIndex: number;
  amount: string;
  timestamp: number;
  periodIndex: number;
  isLate: boolean;
  tx_hash?: string;
  paid_at?: string;
}

export interface DeductionProposal {
  amount: string;
  reason: string;
  proposedTimestamp: number;
  isDisputed: boolean;
  disputeReason?: string;
  isResolved: boolean;
}

export interface TransactionItem {
  id: number;
  agreement_id?: number;
  blockchain_agreement_id?: number;
  tx_hash: string;
  tx_type: string;
  sender_wallet: string;
  amount_eth: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  metadata?: any;
}
