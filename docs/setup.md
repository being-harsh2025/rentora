# Installation, Setup & Deployment Guide

## Project: Smart Contract-Based Rental Agreement Platform (RentChain)

---

## 1. Prerequisites

Before installing the application, ensure the following developer tools are installed on your workstation:
1. **Node.js:** v18.0.0 or higher (Tested and certified on Node.js v24.22.1).
2. **npm:** v9.0.0 or higher (Installed with Node.js).
3. **MetaMask Browser Extension:** Installed in Chrome, Brave, Edge, or Firefox.
4. **Git:** For repository cloning.

---

## 2. Quickstart: 2-Minute Local Demonstration

The project includes an all-in-one root orchestrator and an embedded zero-configuration database (Node native SQLite).

### Step 1: Install Dependencies
Run the installation in each directory:
```bash
# In project root
npm install

# In blockchain directory
cd blockchain && npm install && cd ..

# In backend directory
cd backend && npm install && cd ..

# In frontend directory
cd frontend && npm install && cd ..
```

### Step 2: Compile Smart Contracts
```bash
npm run compile
```

### Step 3: Run Full Test Suite
```bash
npm test
```
*Expected Output: 27 Hardhat tests passing + 4 Backend tests passing.*

### Step 4: Deploy Contract Locally & Start Full-Stack App
```bash
# Deploy to local network
npm run deploy:local

# Start backend (port 5000) and frontend (port 5173) concurrently
npm run dev
```

Visit the application in your browser at:
👉 **http://localhost:5173**

---

## 3. Running a Standalone Hardhat Localhost Node

To test live MetaMask transactions with zero gas cost using Hardhat's local ledger:

1. Open a new terminal window and run:
   ```bash
   cd blockchain
   npx hardhat node
   ```
2. Hardhat will launch a local JSON-RPC server on `http://127.0.0.1:8545` and provide 20 funded test accounts with 10,000 ETH each.
3. In a second terminal, deploy the contract to this node:
   ```bash
   cd blockchain
   npx hardhat run scripts/deploy.js --network localhost
   ```
   *The script automatically updates `frontend/src/contracts/RentalAgreement.json` and `frontend/.env` with the deployed address.*

4. **Import Test Accounts into MetaMask:**
   - In MetaMask, click **Add Account or Hardware Wallet** -> **Import Account**.
   - Paste the private key of Account #0 (Landlord):
     `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - Paste the private key of Account #1 (Tenant):
     `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

5. **Add Hardhat Network in MetaMask:**
   - Network Name: `Hardhat Localhost`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

---

## 4. Ethereum Sepolia Testnet Deployment Guide

To demonstrate the application on a live public blockchain:

### Step 1: Acquire Sepolia Test ETH
Obtain free Sepolia test ETH from any of the official faucets:
- Google Cloud Web3 Faucet: `https://cloud.google.com/application/web3/faucet/ethereum/sepolia`
- Alchemy Sepolia Faucet: `https://sepoliafaucet.com`
- Infura Sepolia Faucet: `https://www.infura.io/faucet/sepolia`

### Step 2: Configure Environment Variables
Inside `blockchain/.env`:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=YOUR_TESTNET_WALLET_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```
*(Never commit private keys containing real funds. Use a dedicated development wallet).*

### Step 3: Deploy to Sepolia
```bash
npm run deploy:sepolia
```
*The script outputs the live contract address and writes it to `frontend/.env`.*

### Step 4: Verify Contract on Sepolia Etherscan (Optional)
```bash
cd blockchain
npx hardhat verify --network sepolia <DEPLOYED_CONTRACT_ADDRESS>
```

---

## 5. Troubleshooting & Evaluation Tips

1. **MetaMask Nonce Desync on Localhost:**
   If you restart `npx hardhat node`, previous transaction nonces in MetaMask may conflict.
   - Fix: In MetaMask, go to **Settings** -> **Advanced** -> **Clear activity tab data**.
2. **Wrong Network Warning:**
   If your MetaMask is connected to Ethereum Mainnet or Polygon, the top navigation banner displays an orange alert. Simply click the **Sepolia** or **Localhost** button to trigger automatic network switching.
3. **Switching Between Landlord and Tenant:**
   For rapid grading by professors or evaluators without having to disconnect wallets, click the **Landlord** or **Tenant** pill in the top navigation bar or visit `/profile`.
