const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('rentora_token') || localStorage.getItem('rentchain_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

// Auth API
export const authApi = {
  register: (payload: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getNonce: (wallet: string) => apiRequest(`/auth/nonce?wallet_address=${encodeURIComponent(wallet)}`),
  walletLogin: (payload: any) => apiRequest('/auth/wallet-login', { method: 'POST', body: JSON.stringify(payload) }),
  getCurrentUser: () => apiRequest('/auth/me'),
};

// Agreements API
export const agreementsApi = {
  createDraft: (payload: any) => apiRequest('/agreements', { method: 'POST', body: JSON.stringify(payload) }),
  list: (params?: { wallet_address?: string; role?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/agreements${query ? `?${query}` : ''}`);
  },
  getById: (id: string | number) => apiRequest(`/agreements/${id}`),
  verifyTerms: (payload: any) => apiRequest('/agreements/verify', { method: 'POST', body: JSON.stringify(payload) }),
  syncBlockchain: (payload: any) => apiRequest('/agreements/sync', { method: 'POST', body: JSON.stringify(payload) }),
};

// Transactions API
export const transactionsApi = {
  list: (params?: { agreement_id?: number | string; wallet_address?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/transactions${query ? `?${query}` : ''}`);
  },
  record: (payload: any) => apiRequest('/transactions', { method: 'POST', body: JSON.stringify(payload) }),
};

