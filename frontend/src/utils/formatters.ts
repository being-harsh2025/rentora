import { ethers } from 'ethers';

export function shortenAddress(address: string | null | undefined, chars = 4): string {
  if (!address) return '';
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

export function formatEth(weiOrEth: string | bigint | number | undefined): string {
  if (weiOrEth === undefined || weiOrEth === null) return '0.00';
  try {
    if (typeof weiOrEth === 'bigint') {
      return Number(ethers.formatEther(weiOrEth)).toFixed(4);
    }
    const str = weiOrEth.toString();
    if (str.includes('.')) {
      return Number(str).toFixed(4);
    }
    if (str.length > 12) {
      return Number(ethers.formatEther(str)).toFixed(4);
    }
    return Number(str).toFixed(4);
  } catch {
    return '0.00';
  }
}

export function formatDate(timestampOrDate: number | string | undefined): string {
  if (!timestampOrDate) return 'N/A';
  try {
    let date: Date;
    if (typeof timestampOrDate === 'number') {
      // If timestamp is in seconds, convert to ms
      date = new Date(timestampOrDate > 1e11 ? timestampOrDate : timestampOrDate * 1000);
    } else {
      date = new Date(timestampOrDate);
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(timestampOrDate);
  }
}

export function getStatusColor(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'Active':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'Accepted':
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
    case 'PendingAcceptance':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'Completed':
      return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' };
    case 'Disputed':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
    case 'ProposedDeduction':
      return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
    case 'Settled':
      return { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' };
    case 'Held':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' };
    default:
      return { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' };
  }
}

