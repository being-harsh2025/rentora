import { ethers } from 'ethers';
import db from '../config/database.js';

/**
 * Deterministically format agreement terms to produce an immutable cryptographic hash
 */
export function computeCanonicalTermsHash(params) {
  const {
    landlord_wallet,
    tenant_wallet,
    property_address,
    rent_amount_eth,
    deposit_amount_eth,
    start_date,
    end_date,
    payment_interval_days = 30,
    terms_text
  } = params;

  // Normalized canonical payload string
  const canonicalString = [
    `LANDLORD:${landlord_wallet.toLowerCase()}`,
    `TENANT:${tenant_wallet.toLowerCase()}`,
    `PROPERTY:${property_address.trim()}`,
    `RENT_ETH:${ethers.parseEther(rent_amount_eth.toString()).toString()}`,
    `DEPOSIT_ETH:${ethers.parseEther(deposit_amount_eth.toString()).toString()}`,
    `START:${new Date(start_date).toISOString()}`,
    `END:${new Date(end_date).toISOString()}`,
    `INTERVAL_DAYS:${payment_interval_days}`,
    `TERMS:${terms_text.trim()}`
  ].join('|');

  const termsHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalString));
  return { canonicalString, termsHash };
}

export function createAgreementDraft(req, res) {
  try {
    const {
      tenant_wallet,
      property_title,
      property_address,
      rent_amount_eth,
      deposit_amount_eth,
      start_date,
      end_date,
      payment_interval_days = 30,
      terms_text,
      landlord_wallet: explicitLandlordWallet
    } = req.body;

    const landlord_wallet = explicitLandlordWallet || (req.user && req.user.wallet_address);

    if (!landlord_wallet || !tenant_wallet || !property_address || !rent_amount_eth || !deposit_amount_eth || !start_date || !end_date || !terms_text) {
      return res.status(400).json({ error: 'All fields including landlord and tenant wallet addresses are required.' });
    }

    if (landlord_wallet.toLowerCase() === tenant_wallet.toLowerCase()) {
      return res.status(400).json({ error: 'Landlord and tenant cannot share the same wallet address.' });
    }

    const { canonicalString, termsHash } = computeCanonicalTermsHash({
      landlord_wallet,
      tenant_wallet,
      property_address,
      rent_amount_eth,
      deposit_amount_eth,
      start_date,
      end_date,
      payment_interval_days,
      terms_text
    });

    const stmt = db.prepare(`
      INSERT INTO agreements (
        landlord_wallet,
        tenant_wallet,
        property_title,
        property_address,
        rent_amount_eth,
        deposit_amount_eth,
        start_date,
        end_date,
        payment_interval_days,
        terms_text,
        terms_hash,
        status,
        deposit_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PendingAcceptance', 'None')
    `);

    const result = stmt.run(
      landlord_wallet.toLowerCase(),
      tenant_wallet.toLowerCase(),
      property_title || property_address,
      property_address,
      rent_amount_eth.toString(),
      deposit_amount_eth.toString(),
      start_date,
      end_date,
      payment_interval_days,
      terms_text,
      termsHash
    );

    const agreementId = Number(result.lastInsertRowid);
    const agreement = db.prepare('SELECT * FROM agreements WHERE id = ?').get(agreementId);

    return res.status(201).json({
      message: 'Agreement draft created successfully',
      agreement,
      canonicalString,
      termsHash
    });
  } catch (error) {
    console.error('Error creating agreement:', error);
    return res.status(500).json({ error: 'Failed to create agreement draft.' });
  }
}

export function listAgreements(req, res) {
  try {
    const { wallet_address, role } = req.query;
    const userWallet = (wallet_address || (req.user && req.user.wallet_address) || '').toLowerCase();

    let query = 'SELECT * FROM agreements';
    const params = [];

    if (userWallet) {
      if (role === 'landlord') {
        query += ' WHERE landlord_wallet = ?';
        params.push(userWallet);
      } else if (role === 'tenant') {
        query += ' WHERE tenant_wallet = ?';
        params.push(userWallet);
      } else {
        query += ' WHERE landlord_wallet = ? OR tenant_wallet = ?';
        params.push(userWallet, userWallet);
      }
    }

    query += ' ORDER BY created_at DESC';
    const agreements = db.prepare(query).all(...params);

    return res.json({ agreements });
  } catch (error) {
    console.error('Error listing agreements:', error);
    return res.status(500).json({ error: 'Failed to retrieve agreements.' });
  }
}

export function getAgreementById(req, res) {
  try {
    const { id } = req.params;
    const agreement = db.prepare('SELECT * FROM agreements WHERE id = ? OR blockchain_id = ?').get(id, id);

    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found.' });
    }

    const transactions = db.prepare('SELECT * FROM transactions WHERE agreement_id = ? OR blockchain_agreement_id = ? ORDER BY created_at DESC').all(agreement.id, agreement.blockchain_id);
    const payments = db.prepare('SELECT * FROM payment_records WHERE agreement_id = ? OR blockchain_agreement_id = ? ORDER BY period_index ASC').all(agreement.id, agreement.blockchain_id);
    const deduction = db.prepare('SELECT * FROM deduction_proposals WHERE agreement_id = ? OR blockchain_agreement_id = ? ORDER BY created_at DESC LIMIT 1').get(agreement.id, agreement.blockchain_id);

    return res.json({
      agreement,
      transactions,
      payments,
      deductionProposal: deduction || null
    });
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return res.status(500).json({ error: 'Failed to fetch agreement details.' });
  }
}

export function verifyAgreementIntegrity(req, res) {
  try {
    const {
      agreement_id,
      landlord_wallet,
      tenant_wallet,
      property_address,
      rent_amount_eth,
      deposit_amount_eth,
      start_date,
      end_date,
      payment_interval_days = 30,
      terms_text,
      claimed_hash
    } = req.body;

    const { canonicalString, termsHash } = computeCanonicalTermsHash({
      landlord_wallet,
      tenant_wallet,
      property_address,
      rent_amount_eth,
      deposit_amount_eth,
      start_date,
      end_date,
      payment_interval_days,
      terms_text
    });

    let dbAgreement = null;
    if (agreement_id) {
      dbAgreement = db.prepare('SELECT * FROM agreements WHERE id = ? OR blockchain_id = ?').get(agreement_id, agreement_id);
    }

    const matchesClaimedHash = claimed_hash ? termsHash.toLowerCase() === claimed_hash.toLowerCase() : null;
    const matchesDatabaseHash = dbAgreement ? termsHash.toLowerCase() === dbAgreement.terms_hash.toLowerCase() : null;

    return res.json({
      computedHash: termsHash,
      canonicalString,
      isValid: claimed_hash ? matchesClaimedHash : (dbAgreement ? matchesDatabaseHash : true),
      matchesClaimedHash,
      matchesDatabaseHash,
      databaseStoredHash: dbAgreement ? dbAgreement.terms_hash : null,
      blockchainId: dbAgreement ? dbAgreement.blockchain_id : null
    });
  } catch (error) {
    console.error('Integrity verification error:', error);
    return res.status(500).json({ error: 'Verification failed.' });
  }
}

export function syncBlockchainState(req, res) {
  try {
    const {
      id,
      blockchain_id,
      status,
      deposit_status,
      deposit_held_eth,
      rent_paid_count,
      tx_hash,
      tx_type,
      sender_wallet,
      amount_eth
    } = req.body;

    let agreement = db.prepare('SELECT * FROM agreements WHERE id = ? OR blockchain_id = ?').get(id, blockchain_id);

    if (agreement) {
      db.prepare(`
        UPDATE agreements
        SET 
          blockchain_id = COALESCE(?, blockchain_id),
          status = COALESCE(?, status),
          deposit_status = COALESCE(?, deposit_status),
          deposit_held_eth = COALESCE(?, deposit_held_eth),
          rent_paid_count = COALESCE(?, rent_paid_count),
          tx_hash = COALESCE(?, tx_hash),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(blockchain_id, status, deposit_status, deposit_held_eth, rent_paid_count, tx_hash, agreement.id);
    }

    // Record transaction
    if (tx_hash) {
      const existingTx = db.prepare('SELECT id FROM transactions WHERE tx_hash = ?').get(tx_hash);
      if (!existingTx && tx_type) {
        db.prepare(`
          INSERT INTO transactions (
            agreement_id,
            blockchain_agreement_id,
            tx_hash,
            tx_type,
            sender_wallet,
            amount_eth,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
        `).run(
          agreement ? agreement.id : null,
          blockchain_id,
          tx_hash,
          tx_type,
          (sender_wallet || '').toLowerCase(),
          amount_eth || '0'
        );
      }
    }

    const updated = db.prepare('SELECT * FROM agreements WHERE id = ? OR blockchain_id = ?').get(id, blockchain_id);
    return res.json({ message: 'State synchronized', agreement: updated });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: 'State sync failed.' });
  }
}
