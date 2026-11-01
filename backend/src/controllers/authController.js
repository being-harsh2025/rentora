import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { ethers } from 'ethers';
import db from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rental_agreement_jwt_super_secret_dev_key_2026';

export async function register(req, res) {
  try {
    const { name, email, password, role, wallet_address } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    if (!['landlord', 'tenant', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either landlord or tenant.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedWallet = wallet_address ? wallet_address.trim().toLowerCase() : null;

    // Check existing
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    if (normalizedWallet) {
      const existingWallet = db.prepare('SELECT id FROM users WHERE wallet_address = ?').get(normalizedWallet);
      if (existingWallet) {
        return res.status(400).json({ error: 'Wallet address is already registered to another user.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, wallet_address)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(name, normalizedEmail, password_hash, role, normalizedWallet);
    const userId = Number(result.lastInsertRowid);

    const token = jwt.sign(
      { id: userId, email: normalizedEmail, role, wallet_address: normalizedWallet, name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        name,
        email: normalizedEmail,
        role,
        wallet_address: normalizedWallet
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        wallet_address: user.wallet_address,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        wallet_address: user.wallet_address
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

export function getWalletNonce(req, res) {
  try {
    const { wallet_address } = req.query;
    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address query parameter is required.' });
    }

    const normalizedWallet = wallet_address.trim().toLowerCase();
    const nonce = crypto.randomBytes(16).toString('hex');

    // Update nonce if user exists, or return nonce for signing
    const user = db.prepare('SELECT id FROM users WHERE wallet_address = ?').get(normalizedWallet);
    if (user) {
      db.prepare('UPDATE users SET nonce = ? WHERE id = ?').run(nonce, user.id);
    }

    const messageToSign = `Welcome to Rentora!\n\nPlease sign this message to verify ownership of your wallet.\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

    return res.json({ nonce, messageToSign });
  } catch (error) {
    console.error('Nonce generation error:', error);
    return res.status(500).json({ error: 'Failed to generate wallet verification challenge.' });
  }
}

export async function verifyWalletLogin(req, res) {
  try {
    const { wallet_address, signature, messageToSign } = req.body;
    if (!wallet_address || !signature || !messageToSign) {
      return res.status(400).json({ error: 'Wallet address, signature, and message are required.' });
    }

    const normalizedWallet = wallet_address.trim().toLowerCase();
    const recoveredAddress = ethers.verifyMessage(messageToSign, signature).toLowerCase();

    if (recoveredAddress !== normalizedWallet) {
      return res.status(401).json({ error: 'Cryptographic signature verification failed.' });
    }

    let user = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(normalizedWallet);

    if (!user) {
      // Auto-register or prompt for role
      const defaultRole = req.body.role && ['landlord', 'tenant'].includes(req.body.role) ? req.body.role : 'tenant';
      const placeholderEmail = `${normalizedWallet.substring(0, 8)}@rentora.local`;
      const dummyHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const displayName = `User ${normalizedWallet.substring(0, 6)}...${normalizedWallet.substring(38)}`;

      const insert = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, wallet_address)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = insert.run(displayName, placeholderEmail, dummyHash, defaultRole, normalizedWallet);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        wallet_address: user.wallet_address,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Wallet authenticated successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        wallet_address: user.wallet_address
      }
    });
  } catch (error) {
    console.error('Wallet signature verification error:', error);
    return res.status(500).json({ error: 'Failed to verify wallet signature.' });
  }
}

export function getCurrentUser(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = db.prepare('SELECT id, name, email, role, wallet_address, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve current user.' });
  }
}

