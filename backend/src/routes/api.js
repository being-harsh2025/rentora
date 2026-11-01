import { Router } from 'express';
import {
  register,
  login,
  getWalletNonce,
  verifyWalletLogin,
  getCurrentUser
} from '../controllers/authController.js';
import {
  createAgreementDraft,
  listAgreements,
  getAgreementById,
  verifyAgreementIntegrity,
  syncBlockchainState
} from '../controllers/agreementController.js';
import {
  listTransactions,
  recordTransaction
} from '../controllers/transactionController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Authentication Routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/nonce', getWalletNonce);
router.post('/auth/wallet-login', verifyWalletLogin);
router.get('/auth/me', authenticateToken, getCurrentUser);

// Agreement Routes
router.post('/agreements', optionalAuth, createAgreementDraft);
router.get('/agreements', optionalAuth, listAgreements);
router.get('/agreements/:id', getAgreementById);
router.post('/agreements/verify', verifyAgreementIntegrity);
router.post('/agreements/sync', syncBlockchainState);

// Transaction Routes
router.get('/transactions', listTransactions);
router.post('/transactions', recordTransaction);

export default router;

