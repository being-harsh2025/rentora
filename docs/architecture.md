# System Architecture & Technical Specification

## Project: Smart Contract-Based Rental Agreement Platform (Rentora)
> **Smart Renting. Secure Agreements.**

---

## 1. Executive Summary & Architectural Overview

The **Rentora** platform is a decentralized web application engineered to replace ambiguous, trust-dependent, paper-based tenancy contracts with immutable, self-executing Ethereum smart contracts. It implements an architecture where:
- **Financial custody** (security deposits and rental installments) is strictly governed by smart contract code.
- **Contractual integrity** is mathematically validated using off-chain canonical serialization and on-chain deterministic Keccak-256 cryptographic hashing.
- **Off-chain metadata and user interactions** are indexed for performance and usability using a Node.js/Express backend paired with an ACID-compliant transactional datastore (SQLite/PostgreSQL).

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

## 2. On-Chain vs. Off-Chain Data Separation Architecture

Storing large text documents or sensitive personally identifiable information (PII) directly on the Ethereum blockchain is computationally prohibitive (gas costs exceed \$100+ per kilobyte) and violates privacy best practices (data on a public ledger is globally visible and permanent). 

To solve this, Rentora employs a hybrid on-chain/off-chain model:

| Data Element | Layer | Storage Medium | Rationale |
| :--- | :--- | :--- | :--- |
| **Escrow Deposit** | On-Chain | EVM Contract Balance | Trustless financial custody; impossible for landlord to withhold unilaterally. |
| **Rent Payments** | On-Chain | EVM Transactions | Immediate immutable forwarding to landlord; provable payment timestamp. |
| **Terms Hash** | On-Chain | `bytes32 termsHash` | Immutable fingerprint guaranteeing the document has not been altered. |
| **Agreement Status** | On-Chain | Solidity Enum | Authoritative source of state (Pending, Accepted, Active, Settled). |
| **Full Legal Clauses** | Off-Chain | Backend SQLite / File | Rich text, paragraph clauses, formatting preserved without gas fees. |
| **User Profile / Auth** | Off-Chain | Backend Database | Passwords (bcrypt), emails, notification preferences. |
| **Transaction Receipts** | Hybrid | Ethereum Blocks + DB | Fast querying and historical filtering in client dashboards. |

---

## 3. Cryptographic Terms Verification Flow

To guarantee that off-chain agreement documents have not been modified or fabricated after signing, the system generates a canonical representation of the lease terms:

1. **Canonical Formatting:**
   ```text
   LANDLORD:<address>|TENANT:<address>|PROPERTY:<address>|RENT_ETH:<wei>|DEPOSIT_ETH:<wei>|START:<iso_date>|END:<iso_date>|INTERVAL_DAYS:<days>|TERMS:<text>
   ```
2. **Hashing:** The serialized string is converted to UTF-8 bytes and hashed using `keccak256`:
   $$\text{TermsHash} = \text{keccak256}(\text{CanonicalPayload})$$
3. **On-Chain Recording:** During contract creation (`createAgreement`), the resulting 32-byte hash is permanently embedded in storage.
4. **Independent Verification:** At any point during or after the tenancy, either party can upload the text or query the verification page. The smart contract view function evaluates:
   ```solidity
   function verifyAgreementTerms(uint256 id, bytes32 computedHash) external view returns (bool);
   ```
   If a single character, date, or monetary value has been changed, the computed hash diverges completely, immediately flagging unauthorized alterations.

---

## 4. Smart Contract Security Architecture

### 4.1 Reentrancy Prevention
The smart contract inherits OpenZeppelin's audited `ReentrancyGuard.sol`. All functions performing external Ether transfers (`paySecurityDeposit`, `payRent`, `refundDepositFull`, `acceptDeduction`, `settleDispute`) are protected with the `nonReentrant` modifier.

### 4.2 Checks-Effects-Interactions Pattern
All state mutations (updating balances, changing agreement statuses, advancing billing timestamps) are executed **prior** to initiating external `.call{value: ...}("")` transfers. This ensures that even if a malicious contract attempts a recursive callback, the internal state reflects completed settlement.

### 4.3 Custom Errors
Solidity 0.8.24 custom errors (`InvalidAddress`, `SameLandlordAndTenant`, `IncorrectAmountSent`, `DeductionExceedsDeposit`, `AgreementNotExpired`, etc.) are used in place of verbose `require` strings, optimizing bytecode size and gas usage.

### 4.4 Granular Role-Based Access Control
- `onlyLandlord`: Restricts creation, deduction proposal, and full refund triggers to the designated landlord wallet.
- `onlyTenant`: Restricts digital lease acceptance, deposit escrow payment, rent payments, and deduction dispute triggers to the assigned tenant wallet.
- Outsiders are strictly rejected at the EVM opcode level.

---

## 5. Security Deposit Dispute Resolution Mechanism

Because smart contracts cannot independently inspect physical property damages, Rentora implements a transparent, bilateral dispute protocol:

1. **Inspection & Proposal:** Upon lease expiration, the landlord can propose a deduction amount ($\le \text{DepositHeld}$) accompanied by a descriptive reason string.
2. **Tenant Review Window:**
   - **Acceptance:** If the tenant approves, the contract automatically releases the agreed deduction to the landlord and immediately refunds the entire undisputed remainder to the tenant in the same atomic transaction.
   - **Dispute:** If the tenant disputes, the agreement enters the `Disputed` state.
3. **Mutual Settlement Execution:**
   - Either party can submit a compromise deduction amount agreed upon via offline mediation or inspection evidence.
   - The contract verifies the compromise does not exceed escrow and disperses funds accordingly.
   - If no deduction is proposed within the contractual grace period, the tenant can trigger release of their funds.

---

## 6. Web3 Authentication Architecture

Rentora supports dual authentication paradigms:
1. **Traditional Email/Password:** Hashed with bcrypt (10 rounds) and secured with signed JSON Web Tokens (JWT).
2. **Cryptographic Web3 Wallet Signature (ERC-191):**
   - The backend issues a time-bound challenge containing an entropy nonce:
     `"Welcome to Rentora! Nonce: <random_hex> Timestamp: <epoch>"`
   - The user signs this message inside MetaMask without paying any gas.
   - The backend recovers the public key using `ethers.verifyMessage` and issues a session JWT linked directly to the validated wallet address.
   - This ensures wallet authorization cannot be spoofed across accounts.

