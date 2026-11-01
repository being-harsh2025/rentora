import db from './database.js';
import { ethers } from 'ethers';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('[Seed] Seeding demonstrative showcase data...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const landlordWallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.toLowerCase(); // Hardhat Account #0
  const tenantWallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'.toLowerCase();   // Hardhat Account #1

  // Users
  const checkUser = db.prepare('SELECT id FROM users WHERE email = ?');
  if (!checkUser.get('landlord@rentora.local')) {
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role, wallet_address)
      VALUES (?, ?, ?, 'landlord', ?)
    `).run('Vikram Sharma (Landlord)', 'landlord@rentora.local', passwordHash, landlordWallet);
  }

  if (!checkUser.get('tenant@rentora.local')) {
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role, wallet_address)
      VALUES (?, ?, ?, 'tenant', ?)
    `).run('Ananya Sen (Tenant)', 'tenant@rentora.local', passwordHash, tenantWallet);
  }

  // Agreement 1: Active Lease
  const checkAg1 = db.prepare('SELECT id FROM agreements WHERE property_title = ?').get('Flat 402, Green Heights');
  if (!checkAg1) {
    const canonicalString1 = [
      `LANDLORD:${landlordWallet}`,
      `TENANT:${tenantWallet}`,
      `PROPERTY:Flat 402, Block B, Green Heights, Indiranagar, Bangalore`,
      `RENT_ETH:${ethers.parseEther('0.5').toString()}`,
      `DEPOSIT_ETH:${ethers.parseEther('1.0').toString()}`,
      `START:2026-09-01T00:00:00.000Z`,
      `END:2027-08-31T00:00:00.000Z`,
      `INTERVAL_DAYS:30`,
      `TERMS:1. Monthly rent of 0.5 ETH due on the 1st of every month.\n2. Security deposit of 1.0 ETH held in smart contract escrow.\n3. Transparent damage claim process with right to dispute.`
    ].join('|');
    const termsHash1 = ethers.keccak256(ethers.toUtf8Bytes(canonicalString1));

    const res = db.prepare(`
      INSERT INTO agreements (
        blockchain_id, landlord_wallet, tenant_wallet, property_title, property_address,
        rent_amount_eth, deposit_amount_eth, start_date, end_date, payment_interval_days,
        terms_text, terms_hash, status, deposit_status, deposit_held_eth, rent_paid_count, tx_hash
      ) VALUES (1, ?, ?, 'Flat 402, Green Heights', 'Flat 402, Block B, Green Heights, Indiranagar, Bangalore', '0.5', '1.0', '2026-09-01', '2027-08-31', 30, '1. Monthly rent of 0.5 ETH due on the 1st of every month.\n2. Security deposit of 1.0 ETH held in smart contract escrow.\n3. Transparent damage claim process with right to dispute.', ?, 'Active', 'Held', '1.0', 2, '0x3a1f891b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f')
    `).run(landlordWallet, tenantWallet, termsHash1);

    const ag1Id = Number(res.lastInsertRowid);

    db.prepare(`
      INSERT INTO payment_records (agreement_id, blockchain_agreement_id, period_index, amount_eth, is_late, tx_hash, paid_at)
      VALUES (?, 1, 1, '0.5', 0, '0x4b2a902c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a', '2026-09-02')
    `).run(ag1Id);
    db.prepare(`
      INSERT INTO payment_records (agreement_id, blockchain_agreement_id, period_index, amount_eth, is_late, tx_hash, paid_at)
      VALUES (?, 1, 2, '0.5', 0, '0x5c3b013d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0b', '2026-10-01')
    `).run(ag1Id);

    db.prepare(`
      INSERT INTO transactions (agreement_id, blockchain_agreement_id, tx_hash, tx_type, sender_wallet, amount_eth, status)
      VALUES (?, 1, '0x3a1f891b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f', 'AgreementCreated', ?, '0', 'confirmed')
    `).run(ag1Id, landlordWallet);
    db.prepare(`
      INSERT INTO transactions (agreement_id, blockchain_agreement_id, tx_hash, tx_type, sender_wallet, amount_eth, status)
      VALUES (?, 1, '0x2b0e780a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e', 'DepositPaid', ?, '1.0', 'confirmed')
    `).run(ag1Id, tenantWallet);
    db.prepare(`
      INSERT INTO transactions (agreement_id, blockchain_agreement_id, tx_hash, tx_type, sender_wallet, amount_eth, status)
      VALUES (?, 1, '0x4b2a902c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a', 'RentPaid', ?, '0.5', 'confirmed')
    `).run(ag1Id, tenantWallet);
  }

  // Agreement 2: Villa 12, Palm Meadows (Pending Acceptance)
  const checkAg2 = db.prepare('SELECT id FROM agreements WHERE property_title = ?').get('Villa 12, Palm Meadows');
  if (!checkAg2) {
    const canonicalString2 = [
      `LANDLORD:${landlordWallet}`,
      `TENANT:${tenantWallet}`,
      `PROPERTY:Villa 12, Palm Meadows Boulevard, Whitefield, Bangalore`,
      `RENT_ETH:${ethers.parseEther('0.8').toString()}`,
      `DEPOSIT_ETH:${ethers.parseEther('1.6').toString()}`,
      `START:2026-11-15T00:00:00.000Z`,
      `END:2027-11-14T00:00:00.000Z`,
      `INTERVAL_DAYS:30`,
      `TERMS:1. Executive residential lease for Villa 12.\n2. Security deposit of 1.6 ETH to be escrowed upon signature.`
    ].join('|');
    const termsHash2 = ethers.keccak256(ethers.toUtf8Bytes(canonicalString2));

    const res2 = db.prepare(`
      INSERT INTO agreements (
        blockchain_id, landlord_wallet, tenant_wallet, property_title, property_address,
        rent_amount_eth, deposit_amount_eth, start_date, end_date, payment_interval_days,
        terms_text, terms_hash, status, deposit_status, deposit_held_eth, rent_paid_count, tx_hash
      ) VALUES (2, ?, ?, 'Villa 12, Palm Meadows', 'Villa 12, Palm Meadows Boulevard, Whitefield, Bangalore', '0.8', '1.6', '2026-11-15', '2027-11-14', 30, '1. Executive residential lease for Villa 12.\n2. Security deposit of 1.6 ETH to be escrowed upon signature.', ?, 'PendingAcceptance', 'None', '0', 0, '0x6d4c124e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0c')
    `).run(landlordWallet, tenantWallet, termsHash2);

    const ag2Id = Number(res2.lastInsertRowid);
    db.prepare(`
      INSERT INTO transactions (agreement_id, blockchain_agreement_id, tx_hash, tx_type, sender_wallet, amount_eth, status)
      VALUES (?, 2, '0x6d4c124e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0c', 'AgreementCreated', ?, '0', 'confirmed')
    `).run(ag2Id, landlordWallet);
  }

  console.log('[Seed] Database seeded with demo showcase agreements and transactions!');
}

seed().catch(console.error);
