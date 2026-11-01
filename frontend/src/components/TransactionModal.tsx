import React from 'react';
import { CheckCircle2, XCircle, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import { shortenAddress } from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  status: 'idle' | 'awaiting_signature' | 'pending' | 'confirmed' | 'failed';
  txHash?: string | null;
  errorMessage?: string | null;
  title: string;
  onClose: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  status,
  txHash,
  errorMessage,
  title,
  onClose,
}) => {
  if (!isOpen) return null;

  const explorerBaseUrl = import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://sepolia.etherscan.io';
  const explorerUrl = txHash ? `${explorerBaseUrl}/tx/${txHash}` : '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>

        <div className="py-6 flex flex-col items-center justify-center">
          {status === 'awaiting_signature' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <p className="text-slate-300 font-medium">Confirm transaction in MetaMask...</p>
              <p className="text-xs text-slate-500">Please review gas fees and approve the prompt in your wallet.</p>
            </div>
          )}

          {status === 'pending' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <p className="text-slate-300 font-medium">Transaction Submitted to Blockchain</p>
              <p className="text-xs text-slate-400">
                Awaiting block confirmation. Do not close this browser window.
              </p>
              {txHash && (
                <div className="mt-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 text-xs text-amber-300 font-mono">
                  <span>Tx: {shortenAddress(txHash, 6)}</span>
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {status === 'confirmed' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <p className="text-emerald-400 font-semibold text-lg">Transaction Confirmed!</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Smart contract state has been updated and recorded permanently on Ethereum.
              </p>
              {txHash && (
                <div className="mt-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 text-xs text-emerald-400 font-mono">
                  <span>Tx: {shortenAddress(txHash, 6)}</span>
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white inline-flex items-center gap-1"
                  >
                    Explorer <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {status === 'failed' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <XCircle className="w-9 h-9" />
              </div>
              <p className="text-rose-400 font-semibold text-lg">Transaction Failed</p>
              <p className="text-xs text-slate-400 max-w-xs break-words">
                {errorMessage || 'The blockchain transaction was rejected or reverted by smart contract validation.'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {(status === 'confirmed' || status === 'failed') && (
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
