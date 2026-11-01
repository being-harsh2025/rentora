import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const { ethers, network } = hre;
  console.log(`[Deploy] Deploying RentalAgreement to network: ${network.name} (Chain ID: ${network.config.chainId || 31337})...`);

  const [deployer] = await ethers.getSigners();
  console.log(`[Deploy] Deployer account: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`[Deploy] Account balance: ${ethers.formatEther(balance)} ETH`);

  const RentalAgreement = await ethers.getContractFactory("RentalAgreement");
  const rentalAgreement = await RentalAgreement.deploy();
  await rentalAgreement.waitForDeployment();

  const contractAddress = await rentalAgreement.getAddress();
  console.log(`[Deploy] RentalAgreement deployed successfully to: ${contractAddress}`);

  // Read ABI from compiled artifact
  const artifactPath = path.resolve(__dirname, "../artifacts/contracts/RentalAgreement.sol/RentalAgreement.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId || 31337,
    address: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  // Sync to frontend
  const frontendContractsDir = path.resolve(__dirname, "../../frontend/src/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(frontendContractsDir, "RentalAgreement.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log(`[Deploy] Exported contract deployment artifact to frontend: frontend/src/contracts/RentalAgreement.json`);

  // Sync to backend
  const backendContractsDir = path.resolve(__dirname, "../../backend/src/contracts");
  if (!fs.existsSync(backendContractsDir)) {
    fs.mkdirSync(backendContractsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(backendContractsDir, "RentalAgreement.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log(`[Deploy] Exported contract deployment artifact to backend: backend/src/contracts/RentalAgreement.json`);

  // Update frontend .env
  const frontendEnvPath = path.resolve(__dirname, "../../frontend/.env");
  const frontendEnvContent = `VITE_CONTRACT_ADDRESS=${contractAddress}
VITE_CHAIN_ID=${network.config.chainId || 31337}
VITE_RPC_URL=${network.name === "sepolia" ? (process.env.SEPOLIA_RPC_URL || "") : "http://127.0.0.1:8545"}
VITE_BLOCK_EXPLORER_URL=${network.name === "sepolia" ? "https://sepolia.etherscan.io" : "http://localhost:8545"}
VITE_API_URL=http://localhost:5000/api
`;
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log(`[Deploy] Updated frontend/.env with contract address: ${contractAddress}`);

  console.log(`[Deploy] Deployment finished successfully!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
