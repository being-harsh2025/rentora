import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'rental_platform.db');
const db = new DatabaseSync(dbPath);

// Initialize schema with WAL journal mode for high concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

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

export default db;

