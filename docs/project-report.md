# Final Academic Project Report

<p align="center">
  <img src="logo.png" alt="Rentora Logo" width="320" />
</p>

# Project Title: Smart Contract-Based Rental Agreement Platform (Rentora)
> **Smart Renting. Secure Agreements.**

**Department of Computer Science & Engineering**  
**Academic Year:** 2026–2027  
**Project Category:** Blockchain & Decentralized Applications (Web3)  
**Smart Contract Standard:** Solidity 0.8.24 on Ethereum (Sepolia Testnet / Hardhat Local)  

---

## Abstract

Traditional residential and commercial rental management systems rely heavily on bilateral trust, manual paperwork, and discretionary escrow holding by landlords. Disagreements frequently emerge regarding the non-refund of security deposits, disputed property damages, rent arrears, and altered lease clauses. 

This project designs, implements, and evaluates **Rentora**, an end-to-end decentralized rental agreement management platform leveraging Ethereum smart contracts, deterministic cryptographic hashing, and modern Web3 frontend architecture. Rentora enforces automated financial custody of security deposits within a decentralized smart contract vault, preventing unilateral fund expropriation. Monthly rental payments are routed directly with verifiable block timestamps and late-payment tracking. Agreement terms are hashed into immutable 32-byte Keccak-256 fingerprints stored permanently on-chain, enabling zero-trust cryptographic verification of off-chain digital leases. 

The complete platform was developed using Solidity 0.8.24, Hardhat, Ethers.js v6, React 18 with TypeScript and Tailwind CSS, and a Node.js/Express backend with an ACID-compliant relational datastore. A comprehensive test suite comprising 31 automated tests (27 on-chain smart contract tests and 4 backend tests) demonstrated 100% pass rates across reentrancy protection, access control, deposit escrow settlement, and late payment detection.

---

## 1. Introduction and Problem Definition

### 1.1 Background
The global rental housing economy represents a multi-trillion-dollar sector. In traditional property rental workflows, a tenant and landlord draft a physical tenancy agreement. The tenant pays a security deposit—often equivalent to 2 to 10 months of rent—which is transferred directly into the landlord's private personal bank account. 

### 1.2 The Problem Statement
1. **Unilateral Custody of Deposits:** Because the landlord holds the physical funds, tenants frequently face unjustified delays, arbitrary deductions for ordinary wear-and-tear, or total forfeiture upon lease termination.
2. **Ambiguous Payment Records:** Rental payments conducted via cash or disparate UPI/bank transfers often lead to accounting conflicts regarding whether a specific calendar month was paid on time.
3. **Document Tamperability:** Standard paper agreements or unstamped PDF documents can be selectively modified, retroactively altered, or misplaced.
4. **Lack of Standardized Dispute Recourse:** Minor deposit disputes (\$200–\$2,000) are economically impractical to litigate through traditional civil courts, leaving tenants without effective protection.

### 1.3 Main Objectives
- Design and deploy an audited Solidity smart contract (`RentalAgreement.sol`) that autonomously locks security deposits in escrow.
- Implement monthly rental installment tracking with period detection and late payment indicators.
- Construct a deterministic cryptographic hashing mechanism to bind off-chain documents to on-chain proofs.
- Create a transparent deduction and dispute resolution mechanism enabling mutual compromise settlement directly on-chain.
- Deliver a fintech-grade web application tailored for both Landlords and Tenants with live MetaMask wallet integration.

---

## 2. Literature Review & Existing System Analysis

### 2.1 Analysis of Existing Systems
| Parameter | Traditional Paper Agreements | Centralized Rental Portals (NoBroker, MagicBricks) | Rentora Smart Contract Platform |
| :--- | :--- | :--- | :--- |
| **Deposit Custody** | Landlord's personal bank account | Landlord's account or proprietary platform | Decentralized Ethereum smart contract escrow |
| **Document Integrity** | Vulnerable to physical damage or forgery | Centralized database; subject to administrator modification | 32-byte Keccak-256 hash verified permanently on-chain |
| **Payment Enforcement** | Manual bank transfer / cash | Centralized payment gateway fee (1-3%) | Direct peer-to-peer ETH transfer with zero platform cut |
| **Damage Deductions** | Dictated unilaterally by landlord | Informal customer support mediation | On-chain proposal, tenant dispute & mutual settlement |
| **Transparency** | Low | Medium (centralized trust) | High (publicly verifiable on Sepolia Etherscan) |

### 2.2 Why Blockchain is the Ideal Solution
Blockchain provides three essential properties unattainable in centralized systems:
1. **Immutability:** Once an agreement is mined into a block, neither party nor platform administrators can alter historical terms, payment timestamps, or deposit statuses.
2. **Autonomous Escrow:** Code governs financial custody. Neither the tenant nor the landlord can withdraw escrowed funds without satisfying the state machine conditions.
3. **Cryptographic Proof of Authenticity:** Keccak-256 hashing allows instantaneous mathematical verification of legal clauses without exposing private personal information on a public ledger.

---

## 3. System Architecture & Requirements Analysis

### 3.1 Functional Requirements (FR)
- **FR-1 (Agreement Creation):** Landlords can define tenant address, property description, rent in ETH, deposit in ETH, start/end dates, payment frequency, and custom terms clauses.
- **FR-2 (Terms Hashing):** The system must generate a canonical serialization of all parameters and compute a deterministic Keccak-256 hash prior to on-chain submission.
- **FR-3 (Digital Acceptance):** Only the assigned tenant wallet address can accept the contract.
- **FR-4 (Escrow Deposit):** The smart contract must hold the exact deposit amount in escrow and transition state from `Accepted` to `Active`.
- **FR-5 (Direct Rent Forwarding):** The tenant can submit rent installments. The contract records timeliness, advances the billing cycle, and transfers 100% of the funds directly to the landlord.
- **FR-6 (Deduction & Dispute Flow):** Landlords can propose deductions $\le \text{DepositHeld}$. Tenants can accept (triggering split disbursement) or dispute (triggering mutual settlement).
- **FR-7 (Direct Full Refund):** Landlords can return 100% of the deposit directly to the tenant with one transaction.
- **FR-8 (Cryptographic Verification):** A public tool must allow any third party to paste terms and verify against the on-chain hash.

### 3.2 Non-Functional Requirements (NFR)
- **Security & Reentrancy:** Zero vulnerability to recursive Ether transfer reentrancy.
- **Gas Efficiency:** Solidity 0.8.24 optimizer enabled (200 runs) with `viaIR: true` and custom errors.
- **Fault Tolerance & Responsive States:** The client interface must explicitly report MetaMask connection state, network switching warnings, pending transaction hashes, and smart contract revert messages.
- **Zero-Friction Local Execution:** Relational database operational with zero external server dependencies using Node.js native SQLite.

---

## 4. Smart Contract Design & Implementation

### 4.1 State Machine Design
The lifecycle of an agreement is governed by two orthogonal enums:
```solidity
enum AgreementStatus { PendingAcceptance, Accepted, Active, Completed, Terminated }
enum DepositStatus { None, Held, ProposedDeduction, Disputed, Settled }
```

### 4.2 Security Protections
1. **ReentrancyGuard:** Inherited from OpenZeppelin. Functions `paySecurityDeposit`, `payRent`, `refundDepositFull`, `acceptDeduction`, and `settleDispute` enforce `nonReentrant`.
2. **Checks-Effects-Interactions:**
   ```solidity
   // 1. Checks
   if (ag.status != AgreementStatus.Active) revert InvalidAgreementStatus();
   if (msg.value != ag.rentAmount) revert IncorrectAmountSent();
   
   // 2. Effects
   ag.rentPaidCount++;
   ag.totalRentPaid += msg.value;
   ag.nextRentDueTimestamp += ag.paymentInterval;

   // 3. Interactions
   (bool sent, ) = ag.landlord.call{value: msg.value}("");
   if (!sent) revert EtherTransferFailed();
   ```
3. **Role Enforcement:** Custom modifiers `onlyLandlord` and `onlyTenant` validate `msg.sender` against stored immutable addresses.

---

## 5. Verification, Testing & Empirical Results

The complete codebase was evaluated through an automated test suite executing under Hardhat and Node.js.

### 5.1 Test Suite Breakdown
| Component | Framework | Tests Executed | Tests Passed | Failure Count | Pass Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Smart Contract** | Hardhat / Chai / Mocha | 27 | 27 | 0 | **100%** |
| **Backend REST API** | Node.js Test Runner | 4 | 4 | 0 | **100%** |
| **Total** | Integrated | 31 | 31 | 0 | **100%** |

### 5.2 Key Verified Test Scenarios
- **Access Control:** Unauthorized wallets attempting to accept leases, pay rent, or propose deductions were systematically reverted with `UnauthorizedCaller()`.
- **Late Payment Audit:** Advancing the EVM clock past the 30-day interval correctly flagged `isLate = true` in both the event logs and storage arrays.
- **Deposit Overdraw Prevention:** Landlords attempting to propose deductions exceeding the escrow balance were reverted with `DeductionExceedsDeposit()`.
- **Integrity Proof:** Tampering with a single character in the terms text caused `verifyAgreementTerms` to return `false`.

---

## 6. User Journeys & Frontend Implementation

The frontend is structured into dedicated role-specific perspectives:

1. **Landlord Journey:**
   - Connects MetaMask -> Views portfolio stats (Total Leases, Rent Collected, Escrow Held).
   - Navigates to `/agreements/new` -> Enters tenant address, property description, and financial parameters.
   - Views real-time Keccak-256 terms hash -> Clicks **Publish Agreement to Blockchain**.
   - Approves transaction in MetaMask -> Receives confirmed transaction hash linked to Sepolia Etherscan.
2. **Tenant Journey:**
   - Connects MetaMask -> Sees pending agreement alert on Tenant Dashboard.
   - Reviews terms -> Clicks **Sign & Accept Agreement** (executes `acceptAgreement`).
   - Clicks **Deposit to Escrow** -> Deposits required ETH into the contract vault.
   - Accesses `/agreements/:id?tab=payment` to pay monthly rent installments as billing cycles mature.
3. **Dispute & Refund Journey:**
   - At lease conclusion, landlord can issue a 100% full refund with a single click, or propose a deduction for repairs.
   - If tenant disputes, both parties can utilize the **Mutual Settlement** tool to agree upon a compromise deduction, disbursing remaining funds instantly.

---

## 7. Educational Scope & Real-World Limitations

While Rentora represents an advanced decentralized architecture, this project explicitly documents its boundary conditions:
1. **Testnet Economics:** Operates on Ethereum Sepolia using test ETH. It does not handle real fiat currency (INR/USD) without an authorized off-ramp oracle.
2. **Legal Enforceability:** Smart contracts enforce mathematical execution of fund transfers; however, traditional legal tenancy enforceability remains subject to regional statutory property acts (e.g. state Rent Control Acts).
3. **Physical Damage Verification:** Solidity smart contracts execute deterministically on-chain and cannot independently verify physical property conditions without trusted decentralized oracle networks (e.g., Chainlink or Kleros decentralized jurors).

---

## 8. Future Scope

1. **ERC-4337 Account Abstraction:** Implementing smart contract wallets with social recovery and gas sponsorship, enabling tenants to pay rent via UPI/credit cards without holding native test ETH.
2. **Decentralized Arbitration via Kleros:** Integrating decentralized subjective oracle arbitration where independent staked jurors evaluate photos of property damages in disputed claims.
3. **Stablecoin Integration (ERC-20 USDC/USDT):** Eliminating ETH price volatility risk by accepting pegged stablecoins for monthly rent while retaining native escrow security.
4. **IoT Smart Lock Integration:** Automatically issuing cryptographic digital keycards to tenants upon confirmed security deposit escrow, and revoking access upon lease conclusion.

---

## 9. Conclusion

The Rentora platform successfully demonstrates the application of blockchain technology to residential rental agreements. By replacing arbitrary landlord custody with autonomous smart contract escrow, validating agreement integrity through deterministic Keccak-256 hashing, and providing transparent payment records, the platform eliminates core friction points in modern tenancy management. The resulting solution provides a secure, fully functional, and academically rigorous implementation suitable for collegiate evaluation and real-world Web3 exploration.

