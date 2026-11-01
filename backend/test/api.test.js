import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { computeCanonicalTermsHash } from '../src/controllers/agreementController.js';

test('Backend Module Test Suite', async (t) => {
  await t.test('1. Deterministic Keccak-256 Agreement Hash Computation', () => {
    const payload = {
      landlord_wallet: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      tenant_wallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      property_address: 'Flat 402, Green Heights, Indiranagar, Bangalore',
      rent_amount_eth: '0.5',
      deposit_amount_eth: '1.0',
      start_date: '2026-11-01T00:00:00.000Z',
      end_date: '2027-11-01T00:00:00.000Z',
      payment_interval_days: 30,
      terms_text: 'The tenant agrees to pay monthly rent on time.',
    };

    const { canonicalString, termsHash } = computeCanonicalTermsHash(payload);

    assert.ok(termsHash.startsWith('0x'));
    assert.equal(termsHash.length, 66); // 32 bytes hex encoded + 0x

    // Idempotency: exact same input produces exact same hash
    const { termsHash: termsHash2 } = computeCanonicalTermsHash(payload);
    assert.equal(termsHash, termsHash2);

    // Tamper detection: altering even 1 character alters the hash completely
    const tamperedPayload = { ...payload, rent_amount_eth: '0.51' };
    const { termsHash: tamperedHash } = computeCanonicalTermsHash(tamperedPayload);
    assert.notEqual(termsHash, tamperedHash);
  });

  await t.test('2. Isolated SQLite Schema & CRUD Integrity', () => {
    // Use an isolated in-memory test database for clean assertions
    const testDb = new DatabaseSync(':memory:');
    testDb.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        wallet_address TEXT UNIQUE
      );

      CREATE TABLE agreements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blockchain_id INTEGER UNIQUE,
        landlord_wallet TEXT NOT NULL,
        tenant_wallet TEXT NOT NULL,
        property_title TEXT NOT NULL,
        property_address TEXT NOT NULL,
        rent_amount_eth TEXT NOT NULL,
        deposit_amount_eth TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        terms_text TEXT NOT NULL,
        terms_hash TEXT NOT NULL,
        status TEXT DEFAULT 'PendingAcceptance'
      );
    `);

    // Insert user
    const insertUser = testDb.prepare(`
      INSERT INTO users (name, email, password_hash, role, wallet_address)
      VALUES (?, ?, ?, 'landlord', ?)
    `);
    const userRes = insertUser.run('Test Landlord', 'landlord@test.local', 'hash123', '0x1234567890123456789012345678901234567890');
    assert.ok(Number(userRes.lastInsertRowid) > 0);

    const user = testDb.prepare('SELECT * FROM users WHERE id = ?').get(Number(userRes.lastInsertRowid));
    assert.equal(user.name, 'Test Landlord');

    // Insert agreement
    const insertAg = testDb.prepare(`
      INSERT INTO agreements (
        landlord_wallet, tenant_wallet, property_title, property_address,
        rent_amount_eth, deposit_amount_eth, start_date, end_date,
        terms_text, terms_hash, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PendingAcceptance')
    `);

    const agRes = insertAg.run(
      '0x1234567890123456789012345678901234567890',
      '0x0987654321098765432109876543210987654321',
      'Apartment 101',
      '101 MG Road, Bangalore',
      '0.4',
      '0.8',
      '2026-11-01',
      '2027-11-01',
      'Standard terms',
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    );

    const agId = Number(agRes.lastInsertRowid);
    assert.ok(agId > 0);

    const ag = testDb.prepare('SELECT * FROM agreements WHERE id = ?').get(agId);
    assert.equal(ag.property_title, 'Apartment 101');
    assert.equal(ag.status, 'PendingAcceptance');
  });

  await t.test('3. Transaction Logging & State Sync', () => {
    const testDb = new DatabaseSync(':memory:');
    testDb.exec(`
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agreement_id INTEGER,
        tx_hash TEXT UNIQUE NOT NULL,
        tx_type TEXT NOT NULL,
        sender_wallet TEXT NOT NULL,
        amount_eth TEXT DEFAULT '0',
        status TEXT DEFAULT 'confirmed'
      );
    `);

    const txHash = '0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff';
    const insertTx = testDb.prepare(`
      INSERT INTO transactions (
        agreement_id, tx_hash, tx_type, sender_wallet, amount_eth, status
      ) VALUES (1, ?, 'DepositPaid', '0x0987654321098765432109876543210987654321', '0.8', 'confirmed')
    `);

    const result = insertTx.run(txHash);
    assert.ok(Number(result.lastInsertRowid) > 0);

    const tx = testDb.prepare('SELECT * FROM transactions WHERE tx_hash = ?').get(txHash);
    assert.equal(tx.tx_type, 'DepositPaid');
    assert.equal(tx.amount_eth, '0.8');
    assert.equal(tx.status, 'confirmed');
  });
});
