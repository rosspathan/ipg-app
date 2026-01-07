// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TradingEscrow
 * @notice Non-custodial escrow contract for trading platform
 * @dev Users deposit tokens here, and trades are settled atomically
 * 
 * Deployment Instructions:
 * 1. Deploy this contract to BSC mainnet using Remix or Hardhat
 * 2. Set the relayer address (your admin wallet)
 * 3. Store the contract address in escrow_contract_config table
 * 4. Users deposit tokens to trade
 */
contract TradingEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============
    
    // Mapping: user => token => deposited amount
    mapping(address => mapping(address => uint256)) public deposits;
    
    // Mapping: user => token => locked amount (for pending orders)
    mapping(address => mapping(address => uint256)) public locked;
    
    // Authorized relayer (backend wallet that can lock/settle)
    address public relayer;
    
    // Paused state for emergency
    bool public paused;
    
    // Supported tokens (optional whitelist)
    mapping(address => bool) public supportedTokens;
    bool public whitelistEnabled;
    
    // ============ Events ============
    
    event Deposit(address indexed user, address indexed token, uint256 amount, uint256 newBalance);
    event Withdraw(address indexed user, address indexed token, uint256 amount, uint256 newBalance);
    event Locked(address indexed user, address indexed token, uint256 amount);
    event Unlocked(address indexed user, address indexed token, uint256 amount);
    event TradeSettled(
        address indexed buyer,
        address indexed seller,
        address baseToken,
        address quoteToken,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes32 tradeId
    );
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event TokenWhitelisted(address indexed token, bool supported);
    event EmergencyWithdraw(address indexed user, address indexed token, uint256 amount);
    
    // ============ Modifiers ============
    
    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer can call");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier tokenSupported(address token) {
        require(!whitelistEnabled || supportedTokens[token], "Token not supported");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _relayer) Ownable(msg.sender) {
        require(_relayer != address(0), "Invalid relayer");
        relayer = _relayer;
        whitelistEnabled = false; // Allow all tokens by default
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Deposit tokens into the escrow
     * @param token The ERC20 token address to deposit
     * @param amount The amount to deposit
     */
    function deposit(address token, uint256 amount) 
        external 
        nonReentrant 
        notPaused 
        tokenSupported(token) 
    {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token");
        
        // Transfer tokens from user to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update deposit balance
        deposits[msg.sender][token] += amount;
        
        emit Deposit(msg.sender, token, amount, deposits[msg.sender][token]);
    }
    
    /**
     * @notice Withdraw available (unlocked) tokens from escrow
     * @param token The ERC20 token address to withdraw
     * @param amount The amount to withdraw
     */
    function withdraw(address token, uint256 amount) 
        external 
        nonReentrant 
        notPaused 
    {
        require(amount > 0, "Amount must be > 0");
        
        uint256 available = getAvailableBalance(msg.sender, token);
        require(available >= amount, "Insufficient available balance");
        
        // Update deposit balance
        deposits[msg.sender][token] -= amount;
        
        // Transfer tokens back to user
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, token, amount, deposits[msg.sender][token]);
    }
    
    // ============ Relayer Functions ============
    
    /**
     * @notice Lock tokens when a user places an order
     * @param user The user's address
     * @param token The token to lock
     * @param amount The amount to lock
     */
    function lockForOrder(address user, address token, uint256 amount) 
        external 
        onlyRelayer 
        notPaused 
    {
        require(getAvailableBalance(user, token) >= amount, "Insufficient available balance");
        
        locked[user][token] += amount;
        
        emit Locked(user, token, amount);
    }
    
    /**
     * @notice Unlock tokens when an order is cancelled
     * @param user The user's address
     * @param token The token to unlock
     * @param amount The amount to unlock
     */
    function unlockForOrder(address user, address token, uint256 amount) 
        external 
        onlyRelayer 
        notPaused 
    {
        require(locked[user][token] >= amount, "Insufficient locked balance");
        
        locked[user][token] -= amount;
        
        emit Unlocked(user, token, amount);
    }
    
    /**
     * @notice Atomically settle a trade between buyer and seller
     * @param buyer The buyer's address
     * @param seller The seller's address
     * @param baseToken The base token (what seller is selling)
     * @param quoteToken The quote token (what buyer is paying)
     * @param baseAmount Amount of base token to transfer
     * @param quoteAmount Amount of quote token to transfer
     * @param tradeId Unique trade identifier
     */
    function settleTrade(
        address buyer,
        address seller,
        address baseToken,
        address quoteToken,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes32 tradeId
    ) 
        external 
        onlyRelayer 
        nonReentrant 
        notPaused 
    {
        // Validate locked balances
        require(locked[seller][baseToken] >= baseAmount, "Seller insufficient locked base");
        require(locked[buyer][quoteToken] >= quoteAmount, "Buyer insufficient locked quote");
        
        // Reduce locked balances
        locked[seller][baseToken] -= baseAmount;
        locked[buyer][quoteToken] -= quoteAmount;
        
        // Transfer: seller loses base token, gains quote token
        deposits[seller][baseToken] -= baseAmount;
        deposits[seller][quoteToken] += quoteAmount;
        
        // Transfer: buyer gains base token, loses quote token
        deposits[buyer][baseToken] += baseAmount;
        deposits[buyer][quoteToken] -= quoteAmount;
        
        emit TradeSettled(buyer, seller, baseToken, quoteToken, baseAmount, quoteAmount, tradeId);
    }
    
    /**
     * @notice Batch settle multiple trades
     * @param buyers Array of buyer addresses
     * @param sellers Array of seller addresses
     * @param baseTokens Array of base tokens
     * @param quoteTokens Array of quote tokens
     * @param baseAmounts Array of base amounts
     * @param quoteAmounts Array of quote amounts
     * @param tradeIds Array of trade IDs
     */
    function batchSettleTrades(
        address[] calldata buyers,
        address[] calldata sellers,
        address[] calldata baseTokens,
        address[] calldata quoteTokens,
        uint256[] calldata baseAmounts,
        uint256[] calldata quoteAmounts,
        bytes32[] calldata tradeIds
    ) 
        external 
        onlyRelayer 
        nonReentrant 
        notPaused 
    {
        uint256 length = buyers.length;
        require(
            length == sellers.length &&
            length == baseTokens.length &&
            length == quoteTokens.length &&
            length == baseAmounts.length &&
            length == quoteAmounts.length &&
            length == tradeIds.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < length; i++) {
            _settleTrade(
                buyers[i],
                sellers[i],
                baseTokens[i],
                quoteTokens[i],
                baseAmounts[i],
                quoteAmounts[i],
                tradeIds[i]
            );
        }
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update the relayer address
     * @param newRelayer The new relayer address
     */
    function setRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "Invalid relayer");
        emit RelayerUpdated(relayer, newRelayer);
        relayer = newRelayer;
    }
    
    /**
     * @notice Pause/unpause the contract
     * @param _paused Whether to pause
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    /**
     * @notice Enable/disable token whitelist
     * @param enabled Whether whitelist is enabled
     */
    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
    }
    
    /**
     * @notice Add/remove token from whitelist
     * @param token The token address
     * @param supported Whether the token is supported
     */
    function setTokenSupported(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenWhitelisted(token, supported);
    }
    
    /**
     * @notice Emergency withdraw for a user (owner only, in case of issues)
     * @param user The user address
     * @param token The token to withdraw
     * @param amount The amount to withdraw
     */
    function emergencyWithdrawFor(address user, address token, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(deposits[user][token] >= amount, "Insufficient balance");
        
        // Clear any locks first
        if (locked[user][token] > 0) {
            uint256 lockToRemove = locked[user][token] > amount ? amount : locked[user][token];
            locked[user][token] -= lockToRemove;
        }
        
        deposits[user][token] -= amount;
        IERC20(token).safeTransfer(user, amount);
        
        emit EmergencyWithdraw(user, token, amount);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get user's deposited balance for a token
     * @param user The user address
     * @param token The token address
     * @return The deposited balance
     */
    function getDeposited(address user, address token) external view returns (uint256) {
        return deposits[user][token];
    }
    
    /**
     * @notice Get user's locked balance for a token
     * @param user The user address
     * @param token The token address
     * @return The locked balance
     */
    function getLocked(address user, address token) external view returns (uint256) {
        return locked[user][token];
    }
    
    /**
     * @notice Get user's available (unlocked) balance for a token
     * @param user The user address
     * @param token The token address
     * @return The available balance
     */
    function getAvailableBalance(address user, address token) public view returns (uint256) {
        return deposits[user][token] - locked[user][token];
    }
    
    /**
     * @notice Get all balance info for a user and token
     * @param user The user address
     * @param token The token address
     * @return deposited The total deposited
     * @return lockedAmount The locked amount
     * @return available The available amount
     */
    function getBalanceInfo(address user, address token) 
        external 
        view 
        returns (uint256 deposited, uint256 lockedAmount, uint256 available) 
    {
        deposited = deposits[user][token];
        lockedAmount = locked[user][token];
        available = deposited - lockedAmount;
    }
    
    // ============ Internal Functions ============
    
    function _settleTrade(
        address buyer,
        address seller,
        address baseToken,
        address quoteToken,
        uint256 baseAmount,
        uint256 quoteAmount,
        bytes32 tradeId
    ) internal {
        require(locked[seller][baseToken] >= baseAmount, "Seller insufficient locked base");
        require(locked[buyer][quoteToken] >= quoteAmount, "Buyer insufficient locked quote");
        
        locked[seller][baseToken] -= baseAmount;
        locked[buyer][quoteToken] -= quoteAmount;
        
        deposits[seller][baseToken] -= baseAmount;
        deposits[seller][quoteToken] += quoteAmount;
        
        deposits[buyer][baseToken] += baseAmount;
        deposits[buyer][quoteToken] -= quoteAmount;
        
        emit TradeSettled(buyer, seller, baseToken, quoteToken, baseAmount, quoteAmount, tradeId);
    }
}
