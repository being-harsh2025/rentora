// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RentalAgreement
 * @dev Comprehensive, transparent, tamper-resistant smart contract for residential/commercial rentals.
 * Features:
 *  - Deterministic agreement terms hash verification
 *  - Escrow-held security deposits
 *  - Automated rent payments with period tracking and late payment detection
 *  - Landlord deduction proposal with tenant dispute and settlement flow
 *  - Mutual resolution & transparent fund disbursement
 *  - Robust access control and Reentrancy protection
 */
contract RentalAgreement is ReentrancyGuard {
    // Custom Errors for gas efficiency and explicit debugging
    error InvalidAddress();
    error SameLandlordAndTenant();
    error InvalidAmount();
    error InvalidDates();
    error EmptyTermsHash();
    error AgreementNotFound();
    error UnauthorizedCaller();
    error InvalidAgreementStatus();
    error InvalidDepositStatus();
    error IncorrectAmountSent();
    error AgreementNotExpired();
    error DeductionExceedsDeposit();
    error EtherTransferFailed();
    error DuplicatePaymentForPeriod();
    error AgreementTermOver();
    error DeductionNotPending();
    error NoDepositToSettle();

    enum AgreementStatus {
        PendingAcceptance, // Created by landlord, awaiting tenant acceptance
        Accepted,          // Accepted by tenant, awaiting security deposit
        Active,            // Security deposit in escrow, lease active
        Completed,         // Lease period finished & deposit settled
        Terminated         // Terminated early (e.g. mutual agreement)
    }

    enum DepositStatus {
        None,              // Deposit not paid yet
        Held,              // In escrow contract
        ProposedDeduction, // Landlord proposed deduction
        Disputed,          // Tenant disputed deduction
        Settled            // Refund/deduction paid out
    }

    struct Agreement {
        uint256 id;
        address payable landlord;
        address payable tenant;
        string propertyAddress;
        uint256 rentAmount;            // Rent per period in wei
        uint256 securityDeposit;       // Deposit in wei
        uint256 startTimestamp;        // Lease start
        uint256 endTimestamp;          // Lease end
        uint256 paymentInterval;       // Billing cycle in seconds (e.g. 30 days)
        bytes32 termsHash;             // Deterministic hash of agreement terms
        AgreementStatus status;
        DepositStatus depositStatus;
        uint256 depositHeld;           // Escrow amount held currently
        uint256 rentPaidCount;         // Number of rent installments paid
        uint256 nextRentDueTimestamp;  // Timestamp when next rent is due
        uint256 totalRentPaid;         // Total wei paid in rent
        uint256 creationTimestamp;
        uint256 acceptanceTimestamp;
    }

    struct PaymentRecord {
        uint256 paymentIndex;
        uint256 amount;
        uint256 timestamp;
        uint256 periodIndex;
        bool isLate;
    }

    struct DeductionProposal {
        uint256 amount;
        string reason;
        uint256 proposedTimestamp;
        bool isDisputed;
        string disputeReason;
        bool isResolved;
    }

    // Storage
    uint256 private _nextAgreementId = 1;
    mapping(uint256 => Agreement) public agreements;
    mapping(uint256 => PaymentRecord[]) private _paymentHistory;
    mapping(uint256 => DeductionProposal) public deductionProposals;

    // Index mappings for dashboards
    mapping(address => uint256[]) private _landlordAgreements;
    mapping(address => uint256[]) private _tenantAgreements;

    // Events
    event AgreementCreated(
        uint256 indexed agreementId,
        address indexed landlord,
        address indexed tenant,
        uint256 rentAmount,
        uint256 securityDeposit,
        bytes32 termsHash,
        string propertyAddress
    );

    event AgreementAccepted(
        uint256 indexed agreementId,
        address indexed tenant,
        uint256 timestamp
    );

    event DepositPaid(
        uint256 indexed agreementId,
        address indexed tenant,
        uint256 amount,
        uint256 timestamp
    );

    event RentPaid(
        uint256 indexed agreementId,
        address indexed tenant,
        uint256 amount,
        uint256 periodIndex,
        bool isLate,
        uint256 timestamp
    );

    event DeductionProposed(
        uint256 indexed agreementId,
        uint256 amount,
        string reason,
        uint256 timestamp
    );

    event DeductionAccepted(
        uint256 indexed agreementId,
        uint256 amount,
        uint256 timestamp
    );

    event DeductionDisputed(
        uint256 indexed agreementId,
        string disputeReason,
        uint256 timestamp
    );

    event DepositRefunded(
        uint256 indexed agreementId,
        uint256 tenantRefund,
        uint256 landlordDeduction,
        uint256 timestamp
    );

    event DisputeSettled(
        uint256 indexed agreementId,
        uint256 tenantRefund,
        uint256 landlordDeduction,
        uint256 timestamp
    );

    event AgreementCompleted(
        uint256 indexed agreementId,
        uint256 timestamp
    );

    // Modifiers
    modifier onlyLandlord(uint256 agreementId) {
        if (agreements[agreementId].landlord != msg.sender) {
            revert UnauthorizedCaller();
        }
        _;
    }

    modifier onlyTenant(uint256 agreementId) {
        if (agreements[agreementId].tenant != msg.sender) {
            revert UnauthorizedCaller();
        }
        _;
    }

    modifier agreementExists(uint256 agreementId) {
        if (agreements[agreementId].id == 0) {
            revert AgreementNotFound();
        }
        _;
    }

    /**
     * @notice Create a new rental agreement
     * @param tenant Address of the designated tenant
     * @param propertyAddress Property physical address or identifier
     * @param rentAmount Rent in wei per billing cycle
     * @param securityDeposit Security deposit in wei
     * @param startTimestamp Lease start epoch timestamp
     * @param endTimestamp Lease end epoch timestamp
     * @param paymentInterval Interval between rent payments (e.g. 30 days = 2592000)
     * @param termsHash Keccak256 hash of legal rental agreement terms
     * @return agreementId The unique identifier of the created agreement
     */
    function createAgreement(
        address payable tenant,
        string calldata propertyAddress,
        uint256 rentAmount,
        uint256 securityDeposit,
        uint256 startTimestamp,
        uint256 endTimestamp,
        uint256 paymentInterval,
        bytes32 termsHash
    ) external returns (uint256 agreementId) {
        if (tenant == address(0)) revert InvalidAddress();
        if (tenant == msg.sender) revert SameLandlordAndTenant();
        if (rentAmount == 0 || securityDeposit == 0) revert InvalidAmount();
        if (startTimestamp >= endTimestamp) revert InvalidDates();
        if (paymentInterval == 0) revert InvalidAmount();
        if (termsHash == bytes32(0)) revert EmptyTermsHash();

        agreementId = _nextAgreementId++;

        Agreement storage ag = agreements[agreementId];
        ag.id = agreementId;
        ag.landlord = payable(msg.sender);
        ag.tenant = tenant;
        ag.propertyAddress = propertyAddress;
        ag.rentAmount = rentAmount;
        ag.securityDeposit = securityDeposit;
        ag.startTimestamp = startTimestamp;
        ag.endTimestamp = endTimestamp;
        ag.paymentInterval = paymentInterval;
        ag.termsHash = termsHash;
        ag.status = AgreementStatus.PendingAcceptance;
        ag.depositStatus = DepositStatus.None;
        ag.nextRentDueTimestamp = startTimestamp;
        ag.creationTimestamp = block.timestamp;

        _landlordAgreements[msg.sender].push(agreementId);
        _tenantAgreements[tenant].push(agreementId);

        emit AgreementCreated(
            agreementId,
            msg.sender,
            tenant,
            rentAmount,
            securityDeposit,
            termsHash,
            propertyAddress
        );
    }

    /**
     * @notice Accept agreement by tenant
     * @param agreementId Identifier of the agreement
     */
    function acceptAgreement(uint256 agreementId) 
        external 
        agreementExists(agreementId) 
        onlyTenant(agreementId) 
    {
        Agreement storage ag = agreements[agreementId];
        if (ag.status != AgreementStatus.PendingAcceptance) {
            revert InvalidAgreementStatus();
        }

        ag.status = AgreementStatus.Accepted;
        ag.acceptanceTimestamp = block.timestamp;

        emit AgreementAccepted(agreementId, msg.sender, block.timestamp);
    }

    /**
     * @notice Deposit security funds into smart contract escrow
     * @param agreementId Identifier of the agreement
     */
    function paySecurityDeposit(uint256 agreementId) 
        external 
        payable 
        nonReentrant 
        agreementExists(agreementId) 
        onlyTenant(agreementId) 
    {
        Agreement storage ag = agreements[agreementId];
        if (ag.status != AgreementStatus.Accepted) {
            revert InvalidAgreementStatus();
        }
        if (ag.depositStatus != DepositStatus.None) {
            revert InvalidDepositStatus();
        }
        if (msg.value != ag.securityDeposit) {
            revert IncorrectAmountSent();
        }

        ag.depositHeld = msg.value;
        ag.depositStatus = DepositStatus.Held;
        ag.status = AgreementStatus.Active;

        emit DepositPaid(agreementId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Pay monthly rent installment
     * @param agreementId Identifier of the agreement
     */
    function payRent(uint256 agreementId) 
        external 
        payable 
        nonReentrant 
        agreementExists(agreementId) 
        onlyTenant(agreementId) 
    {
        Agreement storage ag = agreements[agreementId];
        if (ag.status != AgreementStatus.Active) {
            revert InvalidAgreementStatus();
        }
        if (msg.value != ag.rentAmount) {
            revert IncorrectAmountSent();
        }

        // Prevent paying beyond lease term
        if (ag.nextRentDueTimestamp >= ag.endTimestamp) {
            revert AgreementTermOver();
        }

        // Prevent premature duplicate payments: allowed up to 7 days before due date
        if (block.timestamp + 7 days < ag.nextRentDueTimestamp) {
            revert DuplicatePaymentForPeriod();
        }

        bool isLate = block.timestamp > ag.nextRentDueTimestamp;
        uint256 currentPeriod = ag.rentPaidCount + 1;

        // Effects before interactions
        ag.rentPaidCount = currentPeriod;
        ag.totalRentPaid += msg.value;
        ag.nextRentDueTimestamp += ag.paymentInterval;

        _paymentHistory[agreementId].push(PaymentRecord({
            paymentIndex: currentPeriod,
            amount: msg.value,
            timestamp: block.timestamp,
            periodIndex: currentPeriod,
            isLate: isLate
        }));

        emit RentPaid(
            agreementId,
            msg.sender,
            msg.value,
            currentPeriod,
            isLate,
            block.timestamp
        );

        // Interaction: Send rent to landlord
        (bool sent, ) = ag.landlord.call{value: msg.value}("");
        if (!sent) revert EtherTransferFailed();
    }

    /**
     * @notice Landlord proposes a deduction from the security deposit
     * @param agreementId Identifier of the agreement
     * @param amount Deduction amount in wei
     * @param reason Description of property damage or arrears
     */
    function proposeDeduction(
        uint256 agreementId,
        uint256 amount,
        string calldata reason
    ) 
        external 
        agreementExists(agreementId) 
        onlyLandlord(agreementId) 
    {
        Agreement storage ag = agreements[agreementId];
        if (ag.status != AgreementStatus.Active && ag.status != AgreementStatus.Completed) {
            revert InvalidAgreementStatus();
        }
        if (ag.depositStatus != DepositStatus.Held) {
            revert InvalidDepositStatus();
        }
        if (amount == 0 || amount > ag.depositHeld) {
            revert DeductionExceedsDeposit();
        }

        ag.depositStatus = DepositStatus.ProposedDeduction;
        deductionProposals[agreementId] = DeductionProposal({
            amount: amount,
            reason: reason,
            proposedTimestamp: block.timestamp,
            isDisputed: false,
            disputeReason: "",
            isResolved: false
        });

        emit DeductionProposed(agreementId, amount, reason, block.timestamp);
    }

    /**
     * @notice Tenant accepts proposed deduction; settles remaining deposit
     * @param agreementId Identifier of the agreement
     */
    function acceptDeduction(uint256 agreementId) 
        external 
        nonReentrant 
        agreementExists(agreementId) 
        onlyTenant(agreementId) 
    {
        Agreement storage ag = agreements[agreementId];
        if (ag.depositStatus != DepositStatus.ProposedDeduction) {
            revert DeductionNotPending();
        }

        DeductionProposal storage prop = deductionProposals[agreementId];
        uint256 deductionAmount = prop.amount;
        uint256 refundAmount = ag.depositHeld - deductionAmount;

        // Effects
        ag.depositHeld = 0;
        ag.depositStatus = DepositStatus.Settled;
        prop.isResolved = true;

        emit DeductionAccepted(agreementId, deductionAmount, block.timestamp);
        emit DepositRefunded(agreementId, refundAmount, deductionAmount, block.timestamp);

        // Interactions
        if (deductionAmount > 0) {
            (bool sentLandlord, ) = ag.landlord.call{value: deductionAmount}("");
            if (!sentLandlord) revert EtherTransferFailed();
        }

        if (refundAmount > 0) {
            (bool sentTenant, ) = ag.tenant.call{value: refundAmount}("");
            if (!sentTenant) revert EtherTransferFailed();
        }
    }

    /**
     * @notice Tenant disputes proposed deduction
     * @param agreementId Identifier of the agreement
     * @param disputeReason Reason for dispute
     */
    function disputeDeduction(uint256 agreementId, string calldata disputeReason) 
        external 
        agreementExists(agreementId) 
        onlyTenant(agreementId) 
    {
        Agreement storage ag = agreements[agreementId];
        if (ag.depositStatus != DepositStatus.ProposedDeduction) {
            revert DeductionNotPending();
        }

        DeductionProposal storage prop = deductionProposals[agreementId];
        prop.isDisputed = true;
        prop.disputeReason = disputeReason;
        ag.depositStatus = DepositStatus.Disputed;

        emit DeductionDisputed(agreementId, disputeReason, block.timestamp);
    }

    /**
     * @notice Mutually settle a disputed deposit
     * @param agreementId Identifier of the agreement
     * @param agreedDeduction Amount agreed to be deducted to landlord
     */
    function settleDispute(uint256 agreementId, uint256 agreedDeduction)
        external 
        nonReentrant 
        agreementExists(agreementId) 
    {
        Agreement storage ag = agreements[agreementId];
        // Only landlord or tenant can initiate settlement
        if (msg.sender != ag.landlord && msg.sender != ag.tenant) {
            revert UnauthorizedCaller();
        }
        if (ag.depositStatus != DepositStatus.Disputed) {
            revert InvalidDepositStatus();
        }
        if (agreedDeduction > ag.depositHeld) {
            revert DeductionExceedsDeposit();
        }

        uint256 refundAmount = ag.depositHeld - agreedDeduction;

        // Effects
        ag.depositHeld = 0;
        ag.depositStatus = DepositStatus.Settled;
        deductionProposals[agreementId].isResolved = true;

        emit DisputeSettled(agreementId, refundAmount, agreedDeduction, block.timestamp);
        emit DepositRefunded(agreementId, refundAmount, agreedDeduction, block.timestamp);

        // Interactions
        if (agreedDeduction > 0) {
            (bool sentL, ) = ag.landlord.call{value: agreedDeduction}("");
            if (!sentL) revert EtherTransferFailed();
        }
        if (refundAmount > 0) {
            (bool sentT, ) = ag.tenant.call{value: refundAmount}("");
            if (!sentT) revert EtherTransferFailed();
        }
    }

    /**
     * @notice Landlord issues full deposit refund without deductions
     * @param agreementId Identifier of the agreement
     */
    function refundDepositFull(uint256 agreementId) 
        external 
        nonReentrant 
        agreementExists(agreementId) 
        onlyLandlord(agreementId) 
    {
        Agreement storage ag = agreements[agreementId];
        if (ag.depositStatus != DepositStatus.Held) {
            revert InvalidDepositStatus();
        }
        if (ag.depositHeld == 0) {
            revert NoDepositToSettle();
        }

        uint256 refundAmount = ag.depositHeld;

        // Effects
        ag.depositHeld = 0;
        ag.depositStatus = DepositStatus.Settled;

        emit DepositRefunded(agreementId, refundAmount, 0, block.timestamp);

        // Interaction
        (bool sent, ) = ag.tenant.call{value: refundAmount}("");
        if (!sent) revert EtherTransferFailed();
    }

    /**
     * @notice Mark agreement as completed
     * @dev Lease period must be reached or deposit settled
     * @param agreementId Identifier of the agreement
     */
    function completeAgreement(uint256 agreementId) 
        external 
        agreementExists(agreementId) 
    {
        Agreement storage ag = agreements[agreementId];
        if (msg.sender != ag.landlord && msg.sender != ag.tenant) {
            revert UnauthorizedCaller();
        }
        if (ag.status != AgreementStatus.Active) {
            revert InvalidAgreementStatus();
        }
        if (block.timestamp < ag.endTimestamp && ag.depositStatus != DepositStatus.Settled) {
            revert AgreementNotExpired();
        }

        ag.status = AgreementStatus.Completed;

        emit AgreementCompleted(agreementId, block.timestamp);
    }

    // View Functions

    /**
     * @notice Get core agreement details
     */
    function getAgreement(uint256 agreementId) 
        external 
        view 
        agreementExists(agreementId) 
        returns (Agreement memory) 
    {
        return agreements[agreementId];
    }

    /**
     * @notice Get payment history for an agreement
     */
    function getPaymentHistory(uint256 agreementId) 
        external 
        view 
        agreementExists(agreementId) 
        returns (PaymentRecord[] memory) 
    {
        return _paymentHistory[agreementId];
    }

    /**
     * @notice Get deduction proposal for an agreement
     */
    function getDeductionProposal(uint256 agreementId) 
        external 
        view 
        agreementExists(agreementId) 
        returns (DeductionProposal memory) 
    {
        return deductionProposals[agreementId];
    }

    /**
     * @notice Get all agreement IDs created by a landlord
     */
    function getLandlordAgreements(address landlord) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return _landlordAgreements[landlord];
    }

    /**
     * @notice Get all agreement IDs assigned to a tenant
     */
    function getTenantAgreements(address tenant) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return _tenantAgreements[tenant];
    }

    /**
     * @notice Cryptographically verify if agreement terms match on-chain hash
     * @param agreementId Identifier of the agreement
     * @param computedHash SHA-256 or Keccak-256 hash computed off-chain
     * @return isValid True if match
     */
    function verifyAgreementTerms(uint256 agreementId, bytes32 computedHash) 
        external 
        view 
        agreementExists(agreementId) 
        returns (bool isValid) 
    {
        return agreements[agreementId].termsHash == computedHash;
    }

    /**
     * @notice Get agreement count
     */
    function totalAgreements() external view returns (uint256) {
        return _nextAgreementId - 1;
    }
}
