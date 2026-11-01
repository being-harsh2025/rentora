import React from 'react';
import { useWallet } from '../context/WalletContext';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const NetworkWarning: React.FC = () => {
  const { account, chainId, isSupportedNetwork, switchNetwork } = useWallet();

  if (!account || isSupportedNetwork) return null;

  return (
    <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2.5 text-rose-300 text-sm flex items-center justify-between">
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>
          Unsupported Network (Chain ID: <strong>{chainId || 'Unknown'}</strong>). Please switch to{' '}
          <strong>Ethereum Sepolia</strong> (11155111) or <strong>Hardhat Localhost</strong> (31337) to interact with smart contracts.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => switchNetwork(11155111)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Sepolia
        </button>
        <button
          onClick={() => switchNetwork(31337)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition-colors"
        >
          Localhost
        </button>
      </div>
    </div>
  );
};

