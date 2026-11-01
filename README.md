# Rentora: Smart Contract-Based Rental Agreement Platform
> **Smart Renting. Secure Agreements.**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Network-Sepolia%20%7C%20Hardhat-3c3c3d?logo=ethereum)](https://sepolia.etherscan.io/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22-yellow?logo=hardhat)](https://hardhat.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-31%2F31%20Passing-brightgreen)]()

Rentora is a decentralized rental agreement management platform built on the Ethereum blockchain. It replaces ambiguous, paper-based leases with self-executing Solidity smart contracts featuring **smart contract deposit escrow**, **deterministic Keccak-256 agreement terms hashing**, **automated monthly rent forwarding**, and **transparent deposit dispute resolution**.

---

## 🌟 Key Features

- **Smart Contract Escrow Vault:** Security deposits are locked autonomously inside `RentalAgreement.sol`. Landlords cannot unilaterally withhold or misappropriate funds.
- **Deterministic Keccak-256 Terms Hashing:** Off-chain legal clauses, financial values, and dates are serialized and hashed into an immutable 32-byte fingerprint stored permanently on-chain.
- **Automated Rent Invoicing:** Tenants pay monthly rent through the contract with automatic timeliness checking (on-time vs late payment tracking) and immediate direct transfer to the landlord.
- **Transparent Deduction & Dispute Protocol:** Landlords must propose specific damage deductions with reasons; tenants can accept or formally dispute, initiating a mutual compromise settlement flow on-chain.
- **Stand-Alone Terms Verifier Tool:** Any party or auditor can paste agreement clauses to mathematically verify if the document matches the original on-chain cryptographic hash.
- **Dual Web3 Authentication:** Traditional credentials or one-click cryptographic challenge signature verification (ERC-191) using MetaMask.
- **Zero-Friction Local Database:** Uses Node.js native embedded SQLite with automatic database initialization and demonstration seeding.

---

## 🏗️ System Architecture

```
+---------------------------------------------------------------------------------------+
|                                     CLIENT TIER                                       |
|  React 18 (Vite + TypeScript) + Tailwind CSS + Lucide Icons + Ethers.js v6            |
|  - Landlord Dashboard  - Tenant Dashboard  - Lease Generator  - Terms Verifier       |
+-------------------------------------------+-------------------------------------------+
                     |                                              |
      [JSON-RPC via MetaMask]                       [RESTful API / JSON]
                     |                                              |
                     v                                              v
+------------------------------------+      +-------------------------------------------+
|          BLOCKCHAIN TIER           |      |               BACKEND TIER                |
|  Ethereum Sepolia / Hardhat 31337  |      |  Node.js (v24) + Express.js API Gateway   |
|                                    |      |  - Authentication (JWT + Web3 Signatures) |
|  RentalAgreement.sol:              |      |  - Agreement Canonical Serializer         |
|  * ReentrancyGuard                 |      |  - Cryptographic Keccak-256 Engine        |
|  * Agreement Factory & Lifecycle   |      |  - Transaction Indexer & Event Listener   |
|  * Escrow Vault (Deposit Lock)     |      +---------------------+---------------------+
|  * Direct Rent Forwarding          |                            |
|  * Deduction & Dispute Resolution  |                    [Database Engine]
|  * On-Chain Terms Verifier         |                            v
+------------------------------------+      +-------------------------------------------+
                                            |               STORAGE TIER                |
                                            |  ACID Transactional SQLite / PostgreSQL   |
                                            |  - Users & Wallet Associations            |
                                            |  - Off-Chain Legal Clauses & Documents    |
                                            |  - Synced Blockchain Transaction Receipts |
                                            +-------------------------------------------+
```

---

## 📁 Project Structure

```
├── blockchain/
│   ├── contracts/
│   │   └── RentalAgreement.sol       # Core Solidity 0.8.24 Smart Contract
│   ├── test/
│   │   └── RentalAgreement.test.js   # 27 Exhaustive Chai/Mocha tests
│   ├── scripts/
│   │   └── deploy.js                 # Deployment script (exports ABIs to front/back)
│   ├── hardhat.config.js             # Hardhat 2 configuration with viaIR optimizer
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, Footer, NetworkWarning, TransactionModal
│   │   ├── context/                  # WalletContext (MetaMask) & AuthContext
│   │   ├── pages/                    # 11 Full-Featured Application Pages
│   │   ├── services/                 # Backend REST and Blockchain API connectors
│   │   ├── contracts/                # Deployed ABI and contract artifacts
│   │   └── utils/                    # Formatters and currency helpers
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/                   # Native SQLite schema & demonstrative seed
│   │   ├── controllers/              # Auth, Agreement, and Transaction controllers
│   │   ├── middleware/               # JWT & role-based access control
│   │   ├── routes/                   # REST API routes
│   │   └── server.js                 # Express server on port 5000
│   ├── test/
│   │   └── api.test.js               # Automated backend test suite
│   └── package.json
│
├── docs/
│   ├── architecture.md               # Technical architecture & security patterns
│   ├── diagrams.md                   # 6 Editable Mermaid diagrams
│   ├── test-cases.md                 # Complete testing matrix and outputs
│   ├── setup.md                      # Comprehensive setup & Sepolia deployment guide
│   └── project-report.md             # Formal academic college evaluation report
│
├── package.json                      # Master workspace orchestrator
├── DEVELOPMENT_PROGRESS.md           # Continuous development phase tracker
└── README.md
```

---

## ⚡ Quickstart Guide (2 Minutes)

### 1. Install Dependencies
```bash
# In project root
npm install

# In submodules
cd blockchain && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Run All Automated Tests
```bash
npm test
```
*Executes both the 27 smart contract tests and 4 backend tests (31 passing).*

### 3. Deploy Contract & Start Full-Stack Application
```bash
# 1. Compile & deploy to local network
npm run deploy:local

# 2. Start full-stack services concurrently
npm run dev
```

Visit the application in your browser:
- **Frontend Web UI:** `http://localhost:5173`
- **Backend REST API:** `http://localhost:5000/api`

---

## 🦊 MetaMask Configuration

To interact with live smart contract transactions locally:
1. Open MetaMask -> **Add Network** -> **Add a network manually**:
   - **Network Name:** `Hardhat Localhost`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
2. Import Hardhat Test Accounts:
   - **Landlord Account:** `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - **Tenant Account:** `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

To run on Ethereum Sepolia, switch your MetaMask network to **Sepolia** and fund your wallet using [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [Alchemy Sepolia Faucet](https://sepoliafaucet.com).

---

## 🧪 Test Results Summary

```text
  RentalAgreement Smart Contract Comprehensive Test Suite
    1. Agreement Creation & Input Validations (7 passing)
    2. Agreement Acceptance & Security Deposit Escrow (7 passing)
    3. Monthly Rent Payments & Period Tracking (5 passing)
    4. Security Deposit Settlement: Deduction, Dispute & Full Refund (4 passing)
    5. Agreement Completion & Integrity Verification (4 passing)

  27 passing (3s)

  Backend Module Test Suite
    1. Deterministic Keccak-256 Agreement Hash Computation (passed)
    2. Isolated SQLite Schema & CRUD Integrity (passed)
    3. Transaction Logging & State Sync (passed)

  4 passing (11ms)

  Total: 31 tests passed, 0 failures.
```

---

## 📄 Academic Project Documentation

Detailed academic documentation is available inside the `/docs` directory:
- [System Architecture & Security Model](docs/architecture.md)
- [System & UML Diagrams (Mermaid)](docs/diagrams.md)
- [Test Cases & Verification Matrix](docs/test-cases.md)
- [Installation & Deployment Guide](docs/setup.md)
- [Complete Academic Project Report](docs/project-report.md)

---

## ⚖️ License & Disclaimer

This project is licensed under the MIT License. Developed for academic demonstration and collegiate evaluation purposes. All smart contracts use testnet Sepolia ETH and do not replace statutory local tenancy laws.

