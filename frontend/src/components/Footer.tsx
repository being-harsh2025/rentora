import React from 'react';
import { ShieldCheck, ExternalLink, Code2, Cpu } from 'lucide-react';
import RentalAgreementContract from '../contracts/RentalAgreement.json';
import { shortenAddress } from '../utils/formatters';

export const Footer: React.FC = () => {
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || RentalAgreementContract.address;
  const explorerUrl = import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://sepolia.etherscan.io';

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-500" />
              <span className="text-white font-bold tracking-tight">Rentora Decentralized Platform</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              A peer-to-peer rental agreement management platform powered by Solidity smart contracts on the Ethereum blockchain. Features verifiable lease hashes, smart contract deposit escrow, and transparent payment settlement.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pt-1">
              <Cpu className="w-3.5 h-3.5 text-brand-400" />
              <span>Contract Address:</span>
              <a
                href={`${explorerUrl}/address/${contractAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 hover:underline inline-flex items-center gap-1"
              >
                {shortenAddress(contractAddress, 6)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Architecture</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                Solidity 0.8.24 + ReentrancyGuard
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                Ethereum Sepolia & Hardhat Local
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                Deterministic Keccak-256 Hashing
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                Escrow Settlement Mechanism
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Academic Project</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Developed as a collegiate evaluation project demonstrating smart contract architecture, full-stack Web3 engineering, and rigorous security verification.
            </p>
            <div className="mt-3 p-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-amber-300">
              Notice: Uses testnet Sepolia ETH only. Not for real commercial binding.
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Rentora Platform. All smart contracts audited with automated Chai/Mocha tests.</p>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Smart Contract Active
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

