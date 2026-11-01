import React from 'react';
import { useWallet } from '../context/WalletContext';
import { shortenAddress } from '../utils/formatters';
import { Settings, Cpu, Globe, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import RentalAgreementContract from '../contracts/RentalAgreement.json';

export const SettingsPage: React.FC = () => {
  const { chainId, switchNetwork, isSupportedNetwork } = useWallet();
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || RentalAgreementContract.address;
  const explorerUrl = import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://sepolia.etherscan.io';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <span className="px-2.5 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-xs font-semibold uppercase tracking-wider border border-brand-500/20">
          Configuration
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Platform & Network Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Smart contract environment parameters, testnet endpoints, and blockchain explorer linkages.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Network Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-400" />
            Ethereum Network Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-5 rounded-2xl border ${
                chainId === 11155111
                  ? 'bg-brand-500/10 border-brand-500/40 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              } space-y-3`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">Ethereum Sepolia Testnet</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                  Chain ID: 11155111
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Official Ethereum test network for staging smart contracts before mainnet deployment.
              </p>
              <button
                onClick={() => switchNetwork(11155111)}
                className="w-full py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Switch MetaMask to Sepolia
              </button>
            </div>

            <div
              className={`p-5 rounded-2xl border ${
                chainId === 31337
                  ? 'bg-brand-500/10 border-brand-500/40 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              } space-y-3`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">Hardhat Localhost</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                  Chain ID: 31337
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Local high-speed testing node for automated assertions and zero gas expenditure.
              </p>
              <button
                onClick={() => switchNetwork(31337)}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Switch MetaMask to Localhost
              </button>
            </div>
          </div>
        </div>

        {/* Smart Contract Specifications */}
        <div className="pt-6 border-t border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-400" />
            Verified Smart Contract Bytecode
          </h3>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="text-slate-400 font-medium">Contract Address:</span>
              <span className="font-mono text-brand-400 break-all">{contractAddress}</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
              <span className="text-slate-400 font-medium">Solidity Version:</span>
              <span className="font-mono text-white">0.8.24 (viaIR enabled)</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
              <span className="text-slate-400 font-medium">Block Explorer:</span>
              <a
                href={`${explorerUrl}/address/${contractAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 hover:underline font-mono inline-flex items-center gap-1"
              >
                {explorerUrl} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
