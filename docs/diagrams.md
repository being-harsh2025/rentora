# Rentora System Architecture & Engineering Diagrams
> **Smart Renting. Secure Agreements.**

All diagrams below are rendered in editable, standard Mermaid format.

---

## 1. System Architecture Diagram

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (React 18 + Vite + TypeScript)"]
        UI["Web Interface (Tailwind CSS)"]
        WContext["Wallet Provider (MetaMask + Ethers.js v6)"]
        AContext["Auth Context (JWT + Web3 Signer)"]
        D1["Landlord Dashboard"]
        D2["Tenant Dashboard"]
        VPage["Cryptographic Verifier Tool"]
    end

    subgraph BackendLayer ["Backend API Tier (Node.js + Express)"]
        AuthSvc["Auth Service (JWT / Ethers Verify)"]
        AgSvc["Agreement Service & Hash Generator"]
        TxSync["Blockchain Transaction Indexer"]
        REST["REST API Endpoints (/api/...)"]
    end

    subgraph DatabaseLayer ["Off-Chain Storage Tier"]
        SQLite[("ACID Relational Database (SQLite / Postgres)")]
        UsersTbl["Users & Wallets"]
        AgreementsTbl["Agreements & Terms Text"]
        TransactionsTbl["Confirmed Transactions"]
    end

    subgraph BlockchainLayer ["Ethereum Blockchain Tier (Sepolia / Hardhat)"]
        Contract["RentalAgreement.sol"]
        Factory["Agreement Creation & Registry"]
        Escrow["Escrow Vault (Deposit Balance)"]
        Payments["Rent Payment Forwarder"]
        Dispute["Deduction & Dispute Logic"]
        Verifier["On-Chain Terms Hash Verification"]
    end

    UI --> WContext
    UI --> AContext
    WContext -->|JSON-RPC Transactions| Contract
    UI -->|HTTP Requests| REST
    REST --> AuthSvc
    REST --> AgSvc
    REST --> TxSync
    AuthSvc --> SQLite
    AgSvc --> SQLite
    TxSync --> SQLite
    Contract -->|Event Logs: AgreementCreated, RentPaid, etc.| TxSync
```

---

## 2. Use Case Diagram

```mermaid
graph LR
    subgraph Actors
        L(("Landlord Wallet"))
        T(("Tenant Wallet"))
        E(("External Verifier / Auditor"))
    end

    subgraph LandlordUseCases ["Landlord Operations"]
        UC1["Create Rental Agreement"]
        UC2["Specify Rent, Deposit & Due Interval"]
        UC3["Define Legal Clauses"]
        UC4["Publish to Smart Contract"]
        UC5["Monitor Incoming Rent Payments"]
        UC6["Propose Security Deposit Deduction"]
        UC7["Issue Full Deposit Refund"]
        UC8["Mark Agreement Completed"]
    end

    subgraph TenantUseCases ["Tenant Operations"]
        UC9["Review Agreement Terms"]
        UC10["Sign / Accept Agreement On-Chain"]
        UC11["Pay Security Deposit to Escrow"]
        UC12["Pay Monthly Rent Installments"]
        UC13["Accept Proposed Deduction"]
        UC14["Dispute Damage Deduction"]
        UC15["Execute Mutual Compromise Settlement"]
    end

    subgraph PublicUseCases ["Public / Verifier Operations"]
        UC16["Verify Agreement Terms Hash Against Blockchain"]
        UC17["Inspect Transaction on Etherscan"]
    end

    L --> UC1
    L --> UC2
    L --> UC3
    L --> UC4
    L --> UC5
    L --> UC6
    L --> UC7
    L --> UC8

    T --> UC9
    T --> UC10
    T --> UC11
    T --> UC12
    T --> UC13
    T --> UC14
    T --> UC15

    E --> UC16
    E --> UC17
    L --> UC16
    T --> UC16
```

---

## 3. Data Flow Diagram (DFD Level 0 & Level 1)

### Level 0 Context Diagram
```mermaid
flowchart TD
    Landlord["Landlord"] -->|1. Agreement Parameters & Clauses| Rentora["Rentora Decentralized Platform"]
    Rentora -->|2. Terms Hash & Contract Transaction| Blockchain["Ethereum Sepolia Blockchain"]
    Blockchain -->|3. On-Chain Agreement Created Event| Rentora
    Tenant["Tenant"] -->|4. Review & Digital Acceptance| Rentora
    Tenant -->|5. Deposit & Rent Payment TXs| Blockchain
    Blockchain -->|6. Direct ETH Transfer| Landlord
    Rentora -->|7. Verification Status & Explorer Links| Verifier["Public Verifier / Auditor"]
```

### Level 1 Data Flow Diagram
```mermaid
flowchart TD
    subgraph Processes
        P1["1.0 Terms Canonicalization & Hashing"]
        P2["2.0 Smart Contract Deployment Execution"]
        P3["3.0 Escrow Deposit Lock"]
        P4["4.0 Rent Invoicing & Direct Forwarding"]
        P5["5.0 Escrow Settlement & Refund"]
    end

    subgraph DataStores
        DS1[("Off-Chain Database")]
        DS2[("Ethereum State Trie")]
    end

    LandlordInput["Landlord Form Input"] --> P1
    P1 -->|Store Clauses & Hash| DS1
    P1 -->|Send Params & Hash| P2
    P2 -->|State: PendingAcceptance| DS2

    TenantWallet["Tenant Signer"] -->|Accept Agreement TX| P3
    P3 -->|ETH Deposit Sent| DS2
    DS2 -->|State: Active, Deposit: Held| DS1

    TenantWallet -->|Rent Payment ETH| P4
    P4 -->|Forward Rent ETH| LandlordWallet["Landlord Address"]
    P4 -->|Increment Period & Record TX| DS2

    LandlordInput -->|Propose Deduction| P5
    TenantWallet -->|Accept / Dispute| P5
    P5 -->|Disburse Escrow ETH| DS2
    DS2 -->|Deposit: Settled, State: Completed| DS1
```

---

## 4. Smart Contract Workflow & State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> PendingAcceptance : Landlord creates agreement (createAgreement)

    PendingAcceptance --> Accepted : Tenant calls acceptAgreement()
    PendingAcceptance --> Terminated : Cancelled before acceptance

    Accepted --> Active : Tenant pays exact deposit into escrow (paySecurityDeposit)

    state Active {
        [*] --> RentCycle
        RentCycle --> RentCycle : Tenant calls payRent() (Period N)
    }

    Active --> ProposedDeduction : Landlord proposes deduction (proposeDeduction)
    Active --> Settled : Landlord issues 100% full refund (refundDepositFull)

    ProposedDeduction --> Settled : Tenant accepts deduction (acceptDeduction)
    ProposedDeduction --> Disputed : Tenant disputes deduction (disputeDeduction)

    Disputed --> Settled : Mutual compromise signed (settleDispute)

    Settled --> Completed : Lease term expired & deposit settled (completeAgreement)
    Completed --> [*]
```

---

## 5. Database Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ AGREEMENTS : creates_as_landlord
    USERS ||--o{ AGREEMENTS : assigned_as_tenant
    AGREEMENTS ||--o{ TRANSACTIONS : logs
    AGREEMENTS ||--o{ PAYMENT_RECORDS : tracks
    AGREEMENTS ||--o{ DEDUCTION_PROPOSALS : contains

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string role
        string wallet_address UK
        string nonce
        datetime created_at
    }

    AGREEMENTS {
        int id PK
        int blockchain_id UK
        string landlord_wallet
        string tenant_wallet
        string property_title
        string property_address
        string rent_amount_eth
        string deposit_amount_eth
        string start_date
        string end_date
        int payment_interval_days
        string terms_text
        string terms_hash
        string status
        string deposit_status
        string deposit_held_eth
        int rent_paid_count
        string tx_hash
        datetime created_at
        datetime updated_at
    }

    TRANSACTIONS {
        int id PK
        int agreement_id FK
        int blockchain_agreement_id
        string tx_hash UK
        string tx_type
        string sender_wallet
        string amount_eth
        int block_number
        string gas_used
        string status
        json metadata
        datetime created_at
    }

    PAYMENT_RECORDS {
        int id PK
        int agreement_id FK
        int blockchain_agreement_id
        int period_index
        string amount_eth
        int is_late
        string tx_hash UK
        datetime paid_at
    }

    DEDUCTION_PROPOSALS {
        int id PK
        int agreement_id FK
        int blockchain_agreement_id
        string amount_eth
        string reason
        int is_disputed
        string dispute_reason
        int is_resolved
        datetime created_at
    }
```

---

## 6. End-to-End Blockchain Transaction Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Landlord as Landlord (MetaMask)
    participant UI as Rentora Web UI
    participant Backend as Backend Gateway & DB
    actor Tenant as Tenant (MetaMask)
    participant Contract as RentalAgreement.sol

    Note over Landlord, Contract: Phase 1: Agreement Creation
    Landlord->>UI: Fill lease terms, tenant address, rent & deposit
    UI->>Backend: POST /api/agreements (Generate canonical string & hash)
    Backend-->>UI: { termsHash: "0xabc...", agreementDraft }
    Landlord->>Contract: createAgreement(tenant, property, rent, deposit, start, end, hash)
    Contract-->>UI: Transaction receipt (AgreementCreated event)
    UI->>Backend: POST /api/agreements/sync (Save on-chain ID & txHash)

    Note over Tenant, Contract: Phase 2: Tenant Acceptance & Escrow Deposit
    Tenant->>UI: Opens Tenant Dashboard -> Reviews Terms
    Tenant->>Contract: acceptAgreement(agreementId)
    Contract-->>Tenant: AgreementAccepted event
    Tenant->>Contract: paySecurityDeposit(agreementId) with msg.value = 1.0 ETH
    Contract-->>Contract: Lock 1.0 ETH in Escrow Vault
    Contract-->>Tenant: DepositPaid event (Status -> Active)

    Note over Tenant, Landlord: Phase 3: Monthly Rent Payment
    Tenant->>Contract: payRent(agreementId) with msg.value = 0.5 ETH
    Contract->>Contract: Verify period, check timeliness, update rentPaidCount
    Contract->>Landlord: Forward 0.5 ETH directly via .call{value: 0.5 ETH}("")
    Contract-->>Tenant: RentPaid event (period: 1, isLate: false)

    Note over Landlord, Tenant: Phase 4: Deposit Settlement & Completion
    Landlord->>Contract: proposeDeduction(agreementId, 0.2 ETH, "Wall repairs")
    Contract-->>Tenant: DeductionProposed event
    alt Tenant Approves
        Tenant->>Contract: acceptDeduction(agreementId)
        Contract->>Landlord: Transfer 0.2 ETH
        Contract->>Tenant: Refund remaining 0.8 ETH
        Contract-->>UI: DepositRefunded event (depositStatus -> Settled)
    else Tenant Disputes
        Tenant->>Contract: disputeDeduction(agreementId, "Pre-existing condition")
        Contract-->>UI: DeductionDisputed event
        Tenant->>Contract: settleDispute(agreementId, 0.1 ETH agreed)
        Contract->>Landlord: Transfer 0.1 ETH
        Contract->>Tenant: Refund remaining 0.9 ETH
    end
    Landlord->>Contract: completeAgreement(agreementId)
    Contract-->>UI: AgreementCompleted event
```

