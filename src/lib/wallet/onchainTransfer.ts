import { ethers } from 'ethers';

const BSC_RPC_URL = 'https://bsc-dataseed1.binance.org/';

// Minimal ERC20 ABI for transfer
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Transfer native BNB on BSC
 */
export async function transferBNB(
  privateKey: string,
  toAddress: string,
  amount: string
): Promise<TransferResult> {
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount),
    });

    console.log('[onchainTransfer] BNB tx sent:', tx.hash);
    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      return { success: true, txHash: tx.hash };
    } else {
      return { success: false, error: 'Transaction failed on-chain' };
    }
  } catch (error: any) {
    console.error('[onchainTransfer] BNB transfer error:', error);
    return { success: false, error: error.message || 'Failed to transfer BNB' };
  }
}

/**
 * Transfer ERC20/BEP20 token on BSC
 */
export async function transferERC20(
  privateKey: string,
  tokenAddress: string,
  toAddress: string,
  amount: string,
  decimals: number = 18
): Promise<TransferResult> {
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // Convert amount to proper units
    const amountInUnits = ethers.parseUnits(amount, decimals);

    const tx = await contract.transfer(toAddress, amountInUnits);
    console.log('[onchainTransfer] ERC20 tx sent:', tx.hash);

    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      return { success: true, txHash: tx.hash };
    } else {
      return { success: false, error: 'Transaction failed on-chain' };
    }
  } catch (error: any) {
    console.error('[onchainTransfer] ERC20 transfer error:', error);
    
    // Parse common error messages
    if (error.message?.includes('insufficient funds')) {
      return { success: false, error: 'Insufficient BNB for gas fees' };
    }
    if (error.message?.includes('transfer amount exceeds balance')) {
      return { success: false, error: 'Insufficient token balance' };
    }
    
    return { success: false, error: error.message || 'Failed to transfer token' };
  }
}

/**
 * Transfer via MetaMask (when no private key available)
 */
export async function transferViaMetaMask(
  tokenAddress: string | null, // null for native BNB
  toAddress: string,
  amount: string,
  decimals: number = 18
): Promise<TransferResult> {
  try {
    if (typeof window.ethereum === 'undefined') {
      return { success: false, error: 'MetaMask is not installed' };
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    let tx: ethers.TransactionResponse;

    if (!tokenAddress) {
      // Native BNB transfer
      tx = await signer.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amount),
      });
    } else {
      // ERC20 transfer
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const amountInUnits = ethers.parseUnits(amount, decimals);
      tx = await contract.transfer(toAddress, amountInUnits);
    }

    console.log('[onchainTransfer] MetaMask tx sent:', tx.hash);
    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      return { success: true, txHash: tx.hash };
    } else {
      return { success: false, error: 'Transaction failed on-chain' };
    }
  } catch (error: any) {
    console.error('[onchainTransfer] MetaMask transfer error:', error);
    
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
      return { success: false, error: 'Transaction rejected by user' };
    }
    
    return { success: false, error: error.message || 'Failed to transfer via MetaMask' };
  }
}
