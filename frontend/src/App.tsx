import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { NetworkWarning } from './components/NetworkWarning';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LandlordDashboard } from './pages/LandlordDashboard';
import { TenantDashboard } from './pages/TenantDashboard';
import { CreateAgreementPage } from './pages/CreateAgreementPage';
import { AgreementDetailsPage } from './pages/AgreementDetailsPage';
import { AgreementVerificationPage } from './pages/AgreementVerificationPage';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <WalletProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-white">
            <NetworkWarning />
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/landlord" element={<LandlordDashboard />} />
                <Route path="/tenant" element={<TenantDashboard />} />
                <Route path="/agreements/new" element={<CreateAgreementPage />} />
                <Route path="/agreements/:id" element={<AgreementDetailsPage />} />
                <Route path="/verify" element={<AgreementVerificationPage />} />
                <Route path="/transactions" element={<TransactionHistoryPage />} />
                <Route path="/profile" element={<UserProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </WalletProvider>
  );
};

export default App;
