import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../services/api';
import { useWallet } from './WalletContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  loginWithWallet: (role?: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('rentora_token') || localStorage.getItem('rentchain_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { account, getSigner } = useWallet();

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await authApi.getCurrentUser();
          setUser(res.user);
        } catch {
          // Token invalid, clear it
          localStorage.removeItem('rentora_token');
          localStorage.removeItem('rentchain_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (credentials: any) => {
    const res = await authApi.login(credentials);
    localStorage.setItem('rentora_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (userData: any) => {
    const res = await authApi.register(userData);
    localStorage.setItem('rentora_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const loginWithWallet = async (preferredRole: UserRole = 'landlord') => {
    if (!account) {
      throw new Error('Please connect your MetaMask wallet first.');
    }

    const signer = await getSigner();
    if (!signer) {
      throw new Error('MetaMask signer unavailable.');
    }

    // 1. Fetch challenge nonce
    const { nonce, messageToSign } = await authApi.getNonce(account);

    // 2. Request user to sign message in MetaMask
    const signature = await signer.signMessage(messageToSign);

    // 3. Verify signature on backend
    const res = await authApi.walletLogin({
      wallet_address: account,
      signature,
      messageToSign,
      role: preferredRole,
    });

    localStorage.setItem('rentora_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('rentora_token');
    localStorage.removeItem('rentchain_token');
    setToken(null);
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    if (user) {
      setUser({ ...user, role: newRole });
    } else {
      setUser({
        id: 9999,
        name: 'Demo Evaluator',
        email: 'evaluator@rentora.local',
        role: newRole,
        wallet_address: account,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithWallet,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

