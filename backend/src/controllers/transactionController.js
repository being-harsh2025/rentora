import { ethers } from 'ethers';
import db from '../config/database.js';

export function listTransactions(req, res) {
  try {
    const { agreement_id, wallet_address } = req.query;
    let query = 'SELECT * FROM transactions';
    const params = [];

    if (agreement_id) {
      query += ' WHERE agreement_id = ? OR blockchain_agreement_id = ?';
      params.push(agreement_id, agreement_id);
    } else if (wallet_address) {
      query += ' WHERE sender_wallet = ?';
      params.push(wallet_address.toLowerCase());
    }

    query += ' ORDER BY created_at DESC LIMIT 100';
    const txs = db.prepare(query).all(...params);

    return res.json({ transactions: txs });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
}

export function recordTransaction(req, res) {
  try {
    const {
      agreement_id,
      blockchain_agreement_id,
      tx_hash,
      tx_type,
      sender_wallet,
      amount_eth,
      status = 'confirmed',
      metadata
    } = req.body;

    if (!tx_hash || !tx_type || !sender_wallet) {
      return res.status(400).json({ error: 'tx_hash, tx_type, and sender_wallet are required.' });
    }

    const existing = db.prepare('SELECT id FROM transactions WHERE tx_hash = ?').get(tx_hash);
    if (existing) {
      return res.json({ message: 'Transaction already recorded', transactionId: existing.id });
    }

    const stmt = db.prepare(`
      INSERT INTO transactions (
        agreement_id,
        blockchain_agreement_id,
        tx_hash,
        tx_type,
        sender_wallet,
        amount_eth,
        status,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      agreement_id || null,
      blockchain_agreement_id || null,
      tx_hash,
      tx_type,
      sender_wallet.toLowerCase(),
      amount_eth || '0',
      status,
      metadata ? JSON.stringify(metadata) : null
    );

    return res.status(201).json({
      message: 'Transaction recorded successfully',
      transactionId: Number(result.lastInsertRowid)
    });
  } catch (error) {
    console.error('Error recording transaction:', error);
    return res.status(500).json({ error: 'Failed to record transaction.' });
  }
}

