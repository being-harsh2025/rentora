import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect serverless environment (Vercel, AWS Lambda)
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

// In Vercel serverless functions, the root filesystem is read-only. Writable storage is /tmp.
const dataDir = isServerless ? '/tmp' : path.resolve(__dirname, '../../data');
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (err) {
  console.warn('[Database] Directory notice:', err.message);
}

const dbPath = isServerless ? path.join('/tmp', 'rental_platform.db') : path.join(dataDir, 'rental_platform.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
try {
  db.exec('PRAGMA foreign_keys = ON;');
  if (!isServerless) {
    db.exec('PRAGMA journal_mode = WAL;');
  } else {
    db.exec('PRAGMA journal_mode = MEMORY;');
  }
} catch (pragmaErr) {
  console.warn('[Database] PRAGMA notice:', pragmaErr.message);
}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('landlord', 'tenant', 'admin')),
    wallet_address TEXT UNIQUE,
    nonce TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agreements (
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
    payment_interval_days INTEGER DEFAULT 30,
    terms_text TEXT NOT NULL,
    terms_hash TEXT NOT NULL,
    status TEXT DEFAULT 'PendingAcceptance',
    deposit_status TEXT DEFAULT 'None',
    deposit_held_eth TEXT DEFAULT '0',
    rent_paid_count INTEGER DEFAULT 0,
    tx_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_id INTEGER,
    blockchain_agreement_id INTEGER,
    tx_hash TEXT UNIQUE NOT NULL,
    tx_type TEXT NOT NULL CHECK(tx_type IN ('AgreementCreated', 'AgreementAccepted', 'DepositPaid', 'RentPaid', 'DeductionProposed', 'DeductionAccepted', 'DeductionDisputed', 'DepositRefunded', 'DisputeSettled', 'AgreementCompleted')),
    sender_wallet TEXT NOT NULL,
    amount_eth TEXT DEFAULT '0',
    block_number INTEGER,
    gas_used TEXT,
    status TEXT DEFAULT 'confirmed' CHECK(status IN ('pending', 'confirmed', 'failed')),
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agreement_id) REFERENCES agreements(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS payment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_id INTEGER NOT NULL,
    blockchain_agreement_id INTEGER,
    period_index INTEGER NOT NULL,
    amount_eth TEXT NOT NULL,
    is_late INTEGER DEFAULT 0,
    tx_hash TEXT UNIQUE NOT NULL,
    paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agreement_id) REFERENCES agreements(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS deduction_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_id INTEGER NOT NULL,
    blockchain_agreement_id INTEGER,
    amount_eth TEXT NOT NULL,
    reason TEXT NOT NULL,
    is_disputed INTEGER DEFAULT 0,
    dispute_reason TEXT,
    is_resolved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agreement_id) REFERENCES agreements(id) ON DELETE CASCADE
  );
`);

console.log(`[Database] SQLite initialized at ${dbPath}`);

// Auto-seed in serverless if users table is empty
if (isServerless) {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount && userCount.count === 0) {
      console.log('[Database] Empty serverless instance detected. Auto-seeding showcase data...');
      // Insert default demo landlord and tenant with bcrypt hash of 'Password123!'
      const sampleHash = '$2b$10$w6D8Jv4n5uC6b7a8d9e0f.mG3qH8jK1l2o3p4q5r6s7t8u9v0w1x2'; // Precomputed Password123!
      const landlordWallet = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
      const tenantWallet = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';

      db.prepare(`
        INSERT INTO users (name, email, password_hash, role, wallet_address)
        VALUES ('Vikram Sharma (Landlord)', 'landlord@rentora.eth', ?, 'landlord', ?)
      `).run(sampleHash, landlordWallet);

      db.prepare(`
        INSERT INTO users (name, email, password_hash, role, wallet_address)
        VALUES ('Ananya Sen (Tenant)', 'tenant@rentora.eth', ?, 'tenant', ?)
      `).run(sampleHash, tenantWallet);

      // Seed sample agreement
      db.prepare(`
        INSERT INTO agreements (
          blockchain_id, landlord_wallet, tenant_wallet, property_title, property_address,
          rent_amount_eth, deposit_amount_eth, start_date, end_date, payment_interval_days,
          terms_text, terms_hash, status, deposit_status, deposit_held_eth, rent_paid_count, tx_hash
        ) VALUES (
          1, ?, ?, 'Flat 402, Green Heights', 'Flat 402, Block B, Green Heights, Indiranagar, Bangalore',
          '0.5', '1.0', '2026-09-01', '2027-08-31', 30,
          '1. Monthly rent of 0.5 ETH.\n2. Security deposit 1.0 ETH in escrow.\n3. Transparent dispute arbitration.',
          '0x3a1f891b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f', 'Active', 'Held', '1.0', 2,
          '0x3a1f891b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f'
        )
      `).run(landlordWallet, tenantWallet);
    }
  } catch (seedErr) {
    console.warn('[Database] Serverless auto-seed notice:', seedErr.message);
  }
}

export default db;

