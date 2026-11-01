import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("RentalAgreement Smart Contract Comprehensive Test Suite", function () {
  let rentalAgreement;
  let owner, landlord, tenant, outsider, mediator;
  let rentAmount, securityDeposit, paymentInterval;
  let startTimestamp, endTimestamp, termsHash;

  beforeEach(async function () {
    [owner, landlord, tenant, outsider, mediator] = await ethers.getSigners();

    const RentalAgreementFactory = await ethers.getContractFactory("RentalAgreement");
    rentalAgreement = await RentalAgreementFactory.deploy();
    await rentalAgreement.waitForDeployment();

    rentAmount = ethers.parseEther("0.5"); // 0.5 ETH monthly rent
    securityDeposit = ethers.parseEther("1.0"); // 1.0 ETH deposit
    paymentInterval = 30 * 24 * 60 * 60; // 30 days in seconds

    const latestBlock = await ethers.provider.getBlock("latest");
    startTimestamp = latestBlock.timestamp + 60; // starts in 1 minute
    endTimestamp = startTimestamp + (365 * 24 * 60 * 60); // 1 year duration
    termsHash = ethers.keccak256(ethers.toUtf8Bytes("LEGAL_TERMS_V1_FLAT_402_GREEN_HEIGHTS"));
  });

  describe("1. Agreement Creation & Input Validations", function () {
    it("Should successfully create a new agreement with valid parameters", async function () {
      const tx = await rentalAgreement.connect(landlord).createAgreement(
        tenant.address,
        "Flat 402, Green Heights, Bangalore",
        rentAmount,
        securityDeposit,
        startTimestamp,
        endTimestamp,
        paymentInterval,
        termsHash
      );

      const receipt = await tx.wait();
      expect(await rentalAgreement.totalAgreements()).to.equal(1);

      const ag = await rentalAgreement.getAgreement(1);
      expect(ag.id).to.equal(1);
      expect(ag.landlord).to.equal(landlord.address);
      expect(ag.tenant).to.equal(tenant.address);
      expect(ag.rentAmount).to.equal(rentAmount);
      expect(ag.securityDeposit).to.equal(securityDeposit);
      expect(ag.propertyAddress).to.equal("Flat 402, Green Heights, Bangalore");
      expect(ag.termsHash).to.equal(termsHash);
      expect(ag.status).to.equal(0); // PendingAcceptance
      expect(ag.depositStatus).to.equal(0); // None
    });

    it("Should emit AgreementCreated event with proper arguments", async function () {
      await expect(
        rentalAgreement.connect(landlord).createAgreement(
          tenant.address,
          "Flat 402, Green Heights, Bangalore",
          rentAmount,
          securityDeposit,
          startTimestamp,
          endTimestamp,
          paymentInterval,
          termsHash
        )
      )
        .to.emit(rentalAgreement, "AgreementCreated")
        .withArgs(
          1,
          landlord.address,
          tenant.address,
          rentAmount,
          securityDeposit,
          termsHash,
          "Flat 402, Green Heights, Bangalore"
        );
    });

    it("Should reject agreement creation if tenant address is address(0)", async function () {
      await expect(
        rentalAgreement.connect(landlord).createAgreement(
          ethers.ZeroAddress,
          "Flat 402",
          rentAmount,
          securityDeposit,
          startTimestamp,
          endTimestamp,
          paymentInterval,
          termsHash
        )
      ).to.be.revertedWithCustomError(rentalAgreement, "InvalidAddress");
    });

    it("Should reject agreement creation if landlord and tenant are identical", async function () {
      await expect(
        rentalAgreement.connect(landlord).createAgreement(
          landlord.address,
          "Flat 402",
          rentAmount,
          securityDeposit,
          startTimestamp,
          endTimestamp,
          paymentInterval,
          termsHash
        )
      ).to.be.revertedWithCustomError(rentalAgreement, "SameLandlordAndTenant");
    });

    it("Should reject agreement creation if rent or deposit is zero", async function () {
      await expect(
        rentalAgreement.connect(landlord).createAgreement(
          tenant.address,
          "Flat 402",
          0,
          securityDeposit,
          startTimestamp,
          endTimestamp,
          paymentInterval,
          termsHash
        )
      ).to.be.revertedWithCustomError(rentalAgreement, "InvalidAmount");

      await expect(
        rentalAgreement.connect(landlord).createAgreement(
          tenant.address,
          "Flat 402",
          rentAmount,
          0,
          startTimestamp,
          endTimestamp,
          paymentInterval,
          termsHash
        )
      ).to.be.revertedWithCustomError(rentalAgreement, "InvalidAmount");
    });

    it("Should reject agreement creation if end timestamp is before or equal to start timestamp", async function () {
      await expect(
        rentalAgreement.connect(landlord).createAgreement(
          tenant.address,
          "Flat 402",
          rentAmount,
          securityDeposit,
          endTimestamp,
          startTimestamp, // invalid: end before start
          paymentInterval,
          termsHash
        )
      ).to.be.revertedWithCustomError(rentalAgreement, "InvalidDates");
    });

    it("Should reject agreement creation if terms hash is empty bytes32(0)", async function () {
      await expect(
        rentalAgreement.connect(landlord).createAgreement(
          tenant.address,
          "Flat 402",
          rentAmount,
          securityDeposit,
          startTimestamp,
          endTimestamp,
          paymentInterval,
          ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(rentalAgreement, "EmptyTermsHash");
    });
  });

  describe("2. Agreement Acceptance & Security Deposit Escrow", function () {
    beforeEach(async function () {
      await rentalAgreement.connect(landlord).createAgreement(
        tenant.address,
        "Flat 402, Green Heights",
        rentAmount,
        securityDeposit,
        startTimestamp,
        endTimestamp,
        paymentInterval,
        termsHash
      );
    });

    it("Should permit assigned tenant to accept agreement", async function () {
      await expect(rentalAgreement.connect(tenant).acceptAgreement(1))
        .to.emit(rentalAgreement, "AgreementAccepted");

      const ag = await rentalAgreement.getAgreement(1);
      expect(ag.status).to.equal(1); // Accepted
    });

    it("Should reject acceptance by an unauthorized outsider or landlord", async function () {
      await expect(
        rentalAgreement.connect(outsider).acceptAgreement(1)
      ).to.be.revertedWithCustomError(rentalAgreement, "UnauthorizedCaller");

      await expect(
        rentalAgreement.connect(landlord).acceptAgreement(1)
      ).to.be.revertedWithCustomError(rentalAgreement, "UnauthorizedCaller");
    });

    it("Should reject duplicate acceptance after already accepted", async function () {
      await rentalAgreement.connect(tenant).acceptAgreement(1);
      await expect(
        rentalAgreement.connect(tenant).acceptAgreement(1)
      ).to.be.revertedWithCustomError(rentalAgreement, "InvalidAgreementStatus");
    });

    it("Should reject security deposit payment before acceptance", async function () {
      await expect(
        rentalAgreement.connect(tenant).paySecurityDeposit(1, { value: securityDeposit })
      ).to.be.revertedWithCustomError(rentalAgreement, "InvalidAgreementStatus");
    });

    it("Should successfully escrow security deposit and activate agreement", async function () {
      await rentalAgreement.connect(tenant).acceptAgreement(1);

      const contractBalanceBefore = await ethers.provider.getBalance(await rentalAgreement.getAddress());
      expect(contractBalanceBefore).to.equal(0);

      await expect(
        rentalAgreement.connect(tenant).paySecurityDeposit(1, { value: securityDeposit })
      )
        .to.emit(rentalAgreement, "DepositPaid")
        .withArgs(1, tenant.address, securityDeposit, (val) => val > 0);

      const ag = await rentalAgreement.getAgreement(1);
      expect(ag.status).to.equal(2); // Active
      expect(ag.depositStatus).to.equal(1); // Held
      expect(ag.depositHeld).to.equal(securityDeposit);

      const contractBalanceAfter = await ethers.provider.getBalance(await rentalAgreement.getAddress());
      expect(contractBalanceAfter).to.equal(securityDeposit);
    });

    it("Should reject deposit if value sent does not match exact securityDeposit amount", async function () {
      await rentalAgreement.connect(tenant).acceptAgreement(1);

      await expect(
        rentalAgreement.connect(tenant).paySecurityDeposit(1, { value: ethers.parseEther("0.8") })
      ).to.be.revertedWithCustomError(rentalAgreement, "IncorrectAmountSent");
    });

    it("Should reject duplicate deposit payment once held in escrow", async function () {
      await rentalAgreement.connect(tenant).acceptAgreement(1);
      await rentalAgreement.connect(tenant).paySecurityDeposit(1, { value: securityDeposit });

      await expect(
        rentalAgreement.connect(tenant).paySecurityDeposit(1, { value: securityDeposit })
      ).to.be.revertedWithCustomError(rentalAgreement, "InvalidAgreementStatus");
    });
  });

  describe("3. Monthly Rent Payments & Period Tracking", function () {
    beforeEach(async function () {
      await rentalAgreement.connect(landlord).createAgreement(
        tenant.address,
        "Flat 402, Green Heights",
        rentAmount,
        securityDeposit,
        startTimestamp,
        endTimestamp,
        paymentInterval,
        termsHash
      );
      await rentalAgreement.connect(tenant).acceptAgreement(1);
      await rentalAgreement.connect(tenant).paySecurityDeposit(1, { value: securityDeposit });
    });

    it("Should allow tenant to pay monthly rent and transfer funds directly to landlord", async function () {
      const landlordBalanceBefore = await ethers.provider.getBalance(landlord.address);

      await expect(
        rentalAgreement.connect(tenant).payRent(1, { value: rentAmount })
      )
        .to.emit(rentalAgreement, "RentPaid")
        .withArgs(1, tenant.address, rentAmount, 1, false, (val) => val > 0);

      const landlordBalanceAfter = await ethers.provider.getBalance(landlord.address);
      expect(landlordBalanceAfter - landlordBalanceBefore).to.equal(rentAmount);

      const ag = await rentalAgreement.getAgreement(1);
      expect(ag.rentPaidCount).to.equal(1);
      expect(ag.totalRentPaid).to.equal(rentAmount);

      const history = await rentalAgreement.getPaymentHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0].periodIndex).to.equal(1);
      expect(history[0].amount).to.equal(rentAmount);
      expect(history[0].isLate).to.equal(false);
    });

    it("Should reject rent payment with incorrect amount", async function () {
      await expect(
        rentalAgreement.connect(tenant).payRent(1, { value: ethers.parseEther("0.4") })
      ).to.be.revertedWithCustomError(rentalAgreement, "IncorrectAmountSent");
    });

    it("Should reject rent payment by unauthorized outsider", async function () {
      await expect(
        rentalAgreement.connect(outsider).payRent(1, { value: rentAmount })
      ).to.be.revertedWithCustomError(rentalAgreement, "UnauthorizedCaller");
    });

    it("Should detect late rent payment after due date", async function () {
      // Advance time by 45 days (past the 30-day first period)
      await ethers.provider.send("evm_increaseTime", [45 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await expect(
        rentalAgreement.connect(tenant).payRent(1, { value: rentAmount })
      )
        .to.emit(rentalAgreement, "RentPaid")
        .withArgs(1, tenant.address, rentAmount, 1, true, (val) => val > 0);

      const history = await rentalAgreement.getPaymentHistory(1);
      expect(history[0].isLate).to.equal(true);
    });

    it("Should allow paying multiple subsequent billing periods sequentially", async function () {
      // Pay Period 1
      await rentalAgreement.connect(tenant).payRent(1, { value: rentAmount });

      // Advance time by 25 days (within 7 days of next due date)
      await ethers.provider.send("evm_increaseTime", [25 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      // Pay Period 2
      await rentalAgreement.connect(tenant).payRent(1, { value: rentAmount });

      const ag = await rentalAgreement.getAgreement(1);
      expect(ag.rentPaidCount).to.equal(2);
      expect(ag.totalRentPaid).to.equal(ethers.parseEther("1.0"));
    });
  });

  describe("4. Security Deposit Settlement: Deduction, Dispute & Full Refund", function () {
    beforeEach(async function () {
      await rentalAgreement.connect(landlord).createAgreement(
        tenant.address,
        "Flat 402, Green Heights",
        rentAmount,
        securityDeposit,
        startTimestamp,
        endTimestamp,
        paymentInterval,
        termsHash
      );
      await rentalAgreement.connect(tenant).acceptAgreement(1);
      await rentalAgreement.connect(tenant).paySecurityDeposit(1, { value: securityDeposit });
    });

    it("Should allow landlord to issue full deposit refund without deduction", async function () {
      const tenantBalanceBefore = await ethers.provider.getBalance(tenant.address);

      await expect(rentalAgreement.connect(landlord).refundDepositFull(1))
        .to.emit(rentalAgreement, "DepositRefunded")
        .withArgs(1, securityDeposit, 0, (val) => val > 0);

      const ag = await rentalAgreement.getAgreement(1);
      expect(ag.depositHeld).to.equal(0);
      expect(ag.depositStatus).to.equal(4); // Settled

      const tenantBalanceAfter = await ethers.provider.getBalance(tenant.address);
      expect(tenantBalanceAfter - tenantBalanceBefore).to.equal(securityDeposit);
    });

    it("Should allow landlord to propose deduction, and tenant to accept", async function () {
      const deductionAmount = ethers.parseEther("0.3"); // 0.3 ETH deduction for damage
      const reason = "Water leak ceiling repair";

      await expect(
        rentalAgreement.connect(landlord).proposeDeduction(1, deductionAmount, reason)
      )
        .to.emit(rentalAgreement, "DeductionProposed")
        .withArgs(1, deductionAmount, reason, (val) => val > 0);

      const prop = await rentalAgreement.getDeductionProposal(1);
      expect(prop.amount).to.equal(deductionAmount);
      expect(prop.reason).to.equal(reason);

      const landlordBalBefore = await ethers.provider.getBalance(landlord.address);
      const tenantBalBefore = await ethers.provider.getBalance(tenant.address);

      const tx = await rentalAgreement.connect(tenant).acceptDeduction(1);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const landlordBalAfter = await ethers.provider.getBalance(landlord.address);
      const tenantBalAfter = await ethers.provider.getBalance(tenant.address);

      expect(landlordBalAfter - landlordBalBefore).to.equal(deductionAmount);
      expect(tenantBalAfter + gasCost - tenantBalBefore).to.equal(securityDeposit - deductionAmount);

      const ag = await rentalAgreement.getAgreement(1);
      expect(ag.depositHeld).to.equal(0);
      expect(ag.depositStatus).to.equal(4); // Settled
    });

    it("Should reject deduction proposal exceeding total deposit held", async function () {
      const excessiveAmount = ethers.parseEther("1.5"); // greater than 1.0 ETH deposit
      await expect(
        rentalAgreement.connect(landlord).proposeDeduction(1, excessiveAmount, "Wall repair")
      ).to.be.revertedWithCustomError(rentalAgreement, "DeductionExceedsDeposit");
    });

    it("Should allow tenant to dispute deduction and resolve via mutual settlement", async function () {
      const deductionAmount = ethers.parseEther("0.4");
      await rentalAgreement.connect(landlord).proposeDeduction(1, deductionAmount, "Kitchen cabinets");

      await expect(
        rentalAgreement.connect(tenant).disputeDeduction(1, "Pre-existing wear and tear documented on check-in")
      )
        .to.emit(rentalAgreement, "DeductionDisputed")
        .withArgs(1, "Pre-existing wear and tear documented on check-in", (val) => val > 0);

      const ag = await rentalAgreement.getAgreement(1);
      expect(ag.depositStatus).to.equal(3); // Disputed

      // Mutually agreed compromise: 0.15 ETH deduction
      const agreedDeduction = ethers.parseEther("0.15");
      await expect(
        rentalAgreement.connect(tenant).settleDispute(1, agreedDeduction)
      )
        .to.emit(rentalAgreement, "DisputeSettled")
        .withArgs(1, securityDeposit - agreedDeduction, agreedDeduction, (val) => val > 0);

      const settledAg = await rentalAgreement.getAgreement(1);
      expect(settledAg.depositStatus).to.equal(4); // Settled
      expect(settledAg.depositHeld).to.equal(0);
    });
  });

  describe("5. Agreement Completion & Integrity Verification", function () {
    beforeEach(async function () {
      await rentalAgreement.connect(landlord).createAgreement(
        tenant.address,
        "Flat 402, Green Heights",
        rentAmount,
        securityDeposit,
        startTimestamp,
        endTimestamp,
        paymentInterval,
        termsHash
      );
      await rentalAgreement.connect(tenant).acceptAgreement(1);
      await rentalAgreement.connect(tenant).paySecurityDeposit(1, { value: securityDeposit });
    });

    it("Should reject early completion before lease end unless deposit is settled", async function () {
      await expect(
        rentalAgreement.connect(landlord).completeAgreement(1)
      ).to.be.revertedWithCustomError(rentalAgreement, "AgreementNotExpired");
    });

    it("Should allow completion once deposit is settled", async function () {
      await rentalAgreement.connect(landlord).refundDepositFull(1);

      await expect(rentalAgreement.connect(landlord).completeAgreement(1))
        .to.emit(rentalAgreement, "AgreementCompleted")
        .withArgs(1, (val) => val > 0);

      const ag = await rentalAgreement.getAgreement(1);
      expect(ag.status).to.equal(3); // Completed
    });

    it("Should cryptographically verify agreement terms hash against original content", async function () {
      const matchingHash = termsHash;
      const alteredHash = ethers.keccak256(ethers.toUtf8Bytes("TAMPERED_TERMS_CONTENT"));

      expect(await rentalAgreement.verifyAgreementTerms(1, matchingHash)).to.equal(true);
      expect(await rentalAgreement.verifyAgreementTerms(1, alteredHash)).to.equal(false);
    });

    it("Should return landlord and tenant indexed agreement IDs", async function () {
      const landlordAgs = await rentalAgreement.getLandlordAgreements(landlord.address);
      const tenantAgs = await rentalAgreement.getTenantAgreements(tenant.address);

      expect(landlordAgs.length).to.equal(1);
      expect(landlordAgs[0]).to.equal(1);
      expect(tenantAgs.length).to.equal(1);
      expect(tenantAgs[0]).to.equal(1);
    });
  });
});
