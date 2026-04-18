import { ethers } from 'ethers';

const BSC_RPC_URL = 'https://bsc-dataseed1.binance.org/';

// Minimal ERC20 ABI for transfer + balance
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
  /** Address that actually signed/sent the tx (so callers can detect signer mismatch). */
  signerAddress?: string;
  /** Live on-chain balance at time of pre-flight check (for diagnostics). */
  liveBalance?: string;
}

/**
 * Format a raw balance (BigInt + decimals) into a human-readable string.
 */
function fmtUnits(raw: bigint, decimals: number): string {
  try {
    return ethers.formatUnits(raw, decimals);
  } catch {
    return raw.toString();
  }
}

/**
 * Transfer native BNB on BSC.
 * Performs a pre-flight balance + gas check using the SAME signer that will broadcast,
 * so callers cannot get a false "exceeds balance" error from a wallet-mismatch.
 */
export async function transferBNB(
  privateKey: string,
  toAddress: string,
  amount: string
): Promise<TransferResult> {
  let signerAddress: string | undefined;
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    signerAddress = wallet.address;

    const value = ethers.parseEther(amount);
    const liveBalance = await provider.getBalance(wallet.address);

    // Estimate gas to know how much BNB we need on top of the value
    let gasCost = 0n;
    try {
      const gasLimit = await provider.estimateGas({
        to: toAddress,
        value,
        from: wallet.address,
      });
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? 5_000_000_000n; // 5 gwei fallback
      gasCost = gasLimit * gasPrice;
    } catch (gasErr) {
      console.warn('[onchainTransfer] BNB gas estimate failed, using conservative buffer:', gasErr);
      gasCost = 21_000n * 5_000_000_000n; // ~0.000105 BNB
    }

    if (liveBalance < value + gasCost) {
      return {
        success: false,
        signerAddress,
        liveBalance: fmtUnits(liveBalance, 18),
        error: `Insufficient BNB on signer wallet ${wallet.address.slice(0, 8)}…${wallet.address.slice(-4)}. Live balance: ${fmtUnits(liveBalance, 18)} BNB, need ${ethers.formatEther(value + gasCost)} BNB (amount + gas).`,
      };
    }

    const tx = await wallet.sendTransaction({ to: toAddress, value });
    console.log('[onchainTransfer] BNB tx sent:', tx.hash, 'from', wallet.address);
    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      return { success: true, txHash: tx.hash, signerAddress };
    }
    return { success: false, error: 'Transaction failed on-chain', signerAddress };
  } catch (error: any) {
    console.error('[onchainTransfer] BNB transfer error:', error);
    return {
      success: false,
      signerAddress,
      error: error?.shortMessage || error?.message || 'Failed to transfer BNB',
    };
  }
}

/**
 * Transfer ERC20/BEP20 token on BSC.
 * Performs a pre-flight balance check on the SAME signer address that will broadcast,
 * so the caller never gets a generic "transfer amount exceeds balance" when the real
 * cause is a wallet/signer mismatch (UI shows balance for address A, signer is address B).
 */
export async function transferERC20(
  privateKey: string,
  tokenAddress: string,
  toAddress: string,
  amount: string,
  decimals: number = 18
): Promise<TransferResult> {
  let signerAddress: string | undefined;
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    signerAddress = wallet.address;

    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // Convert amount to proper units
    const amountInUnits = ethers.parseUnits(amount, decimals);

    // === PRE-FLIGHT 1: token balance on the SIGNER address ===
    let liveTokenBalance: bigint;
    try {
      liveTokenBalance = await contract.balanceOf(wallet.address);
    } catch (balErr) {
      console.error('[onchainTransfer] balanceOf failed:', balErr);
      return {
        success: false,
        signerAddress,
        error: 'Could not read live token balance. RPC error — please retry in a few seconds.',
      };
    }

    if (liveTokenBalance < amountInUnits) {
      return {
        success: false,
        signerAddress,
        liveBalance: fmtUnits(liveTokenBalance, decimals),
        error: `Live balance is lower than the entered amount. Signer wallet ${wallet.address.slice(0, 8)}…${wallet.address.slice(-4)} holds ${fmtUnits(liveTokenBalance, decimals)} of this token, you tried to send ${amount}. If your app shows a different balance, your signing key does not match your displayed wallet — please re-import the correct wallet under Profile → Security.`,
      };
    }

    // === PRE-FLIGHT 2: BNB on the SIGNER address for gas ===
    const bnbBalance = await provider.getBalance(wallet.address);
    let gasCost: bigint;
    try {
      const gasLimit = await contract.transfer.estimateGas(toAddress, amountInUnits);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? 5_000_000_000n;
      gasCost = gasLimit * gasPrice;
    } catch (gasErr) {
      console.warn('[onchainTransfer] ERC20 gas estimate failed, using conservative buffer:', gasErr);
      gasCost = 80_000n * 5_000_000_000n; // ~0.0004 BNB
    }

    if (bnbBalance < gasCost) {
      return {
        success: false,
        signerAddress,
        liveBalance: fmtUnits(liveTokenBalance, decimals),
        error: `BNB gas balance is insufficient on signer wallet ${wallet.address.slice(0, 8)}…${wallet.address.slice(-4)}. You have ${ethers.formatEther(bnbBalance)} BNB but need ~${ethers.formatEther(gasCost)} BNB for gas.`,
      };
    }

    // === BROADCAST ===
    const tx = await contract.transfer(toAddress, amountInUnits);
    console.log('[onchainTransfer] ERC20 tx sent:', tx.hash, 'from', wallet.address, 'token', tokenAddress);

    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      return {
        success: true,
        txHash: tx.hash,
        signerAddress,
        liveBalance: fmtUnits(liveTokenBalance, decimals),
      };
    }
    return { success: false, error: 'Transaction failed on-chain', signerAddress };
  } catch (error: any) {
    console.error('[onchainTransfer] ERC20 transfer error:', error);

    const msg = (error?.shortMessage || error?.message || '').toLowerCase();

    if (msg.includes('insufficient funds')) {
      return {
        success: false,
        signerAddress,
        error: `BNB gas balance is insufficient on signer wallet ${signerAddress ? signerAddress.slice(0, 8) + '…' + signerAddress.slice(-4) : 'unknown'}. Please deposit a small amount of BNB to cover gas.`,
      };
    }
    if (msg.includes('transfer amount exceeds balance')) {
      // This *should* be unreachable thanks to pre-flight, but keep a clear message just in case.
      return {
        success: false,
        signerAddress,
        error: `Token contract reported insufficient balance on signer wallet ${signerAddress ? signerAddress.slice(0, 8) + '…' + signerAddress.slice(-4) : 'unknown'}. Your signing key may not match your displayed wallet — please re-import the correct wallet under Profile → Security.`,
      };
    }
    if (msg.includes('unconfigured_name') || msg.includes('ens name')) {
      return {
        success: false,
        signerAddress,
        error: 'Token contract configuration error: contract address is empty. Please contact support.',
      };
    }

    return {
      success: false,
      signerAddress,
      error: error?.shortMessage || error?.message || 'Failed to transfer token',
    };
  }
}

/**
 * Transfer via MetaMask (when no internal private key is available).
 * Pre-flight balance check still uses the actual MetaMask signer's address.
 */
export async function transferViaMetaMask(
  tokenAddress: string | null, // null for native BNB
  toAddress: string,
  amount: string,
  decimals: number = 18
): Promise<TransferResult> {
  let signerAddress: string | undefined;
  try {
    if (typeof window.ethereum === 'undefined') {
      return { success: false, error: 'MetaMask is not installed' };
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    signerAddress = await signer.getAddress();

    let tx: ethers.TransactionResponse;

    if (!tokenAddress) {
      const value = ethers.parseEther(amount);
      const liveBalance = await provider.getBalance(signerAddress);
      if (liveBalance < value) {
        return {
          success: false,
          signerAddress,
          liveBalance: fmtUnits(liveBalance, 18),
          error: `Live BNB balance is lower than the entered amount on MetaMask wallet ${signerAddress.slice(0, 8)}…${signerAddress.slice(-4)}.`,
        };
      }
      tx = await signer.sendTransaction({ to: toAddress, value });
    } else {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const amountInUnits = ethers.parseUnits(amount, decimals);

      const liveTokenBalance: bigint = await contract.balanceOf(signerAddress);
      if (liveTokenBalance < amountInUnits) {
        return {
          success: false,
          signerAddress,
          liveBalance: fmtUnits(liveTokenBalance, decimals),
          error: `Live token balance on MetaMask wallet ${signerAddress.slice(0, 8)}…${signerAddress.slice(-4)} is ${fmtUnits(liveTokenBalance, decimals)}, lower than ${amount}.`,
        };
      }
      tx = await contract.transfer(toAddress, amountInUnits);
    }

    console.log('[onchainTransfer] MetaMask tx sent:', tx.hash, 'from', signerAddress);
    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      return { success: true, txHash: tx.hash, signerAddress };
    }
    return { success: false, error: 'Transaction failed on-chain', signerAddress };
  } catch (error: any) {
    console.error('[onchainTransfer] MetaMask transfer error:', error);

    if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
      return { success: false, signerAddress, error: 'Transaction rejected by user' };
    }

    return {
      success: false,
      signerAddress,
      error: error?.shortMessage || error?.message || 'Failed to transfer via MetaMask',
    };
  }
}
