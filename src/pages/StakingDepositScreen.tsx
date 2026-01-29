import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BacklinkBar } from '@/components/programs-pro/BacklinkBar';
import { 
  Wallet, 
  Copy, 
  Check, 
  ArrowDown,
  Info,
  RefreshCw,
  ExternalLink,
  QrCode,
  Loader2,
  AlertTriangle,
  ArrowDownToLine
} from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { useCryptoStakingAccount } from '@/hooks/useCryptoStakingAccount';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useOnchainBalances } from '@/hooks/useOnchainBalances';
import { useWeb3 } from '@/contexts/Web3Context';
import { useEncryptedWalletBackup } from '@/hooks/useEncryptedWalletBackup';
import { getStoredWallet, setWalletStorageUserId, storeWallet } from '@/utils/walletStorage';
import PinEntryDialog from '@/components/profile/PinEntryDialog';
import { ethers } from 'ethers';
import { SuccessAnimation } from '@/components/wallet/SuccessAnimation';
import { motion } from 'framer-motion';
import AssetLogo from '@/components/AssetLogo';

const BSC_RPC_URL = 'https://bsc-dataseed1.binance.org/';

// ERC20 ABI for transfer
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// IPG contract address
const IPG_CONTRACT = '0x7437d96D2dca13525B4A6021865d41997deE1F09';

export default function StakingDepositScreen() {
  const { navigate } = useNavigation();
  const { user } = useSession();
  const { depositAddress, availableBalance, stakingFee, isLoading, refetchAccount } = useCryptoStakingAccount();
  const { toast } = useToast();
  const { balances: onchainBalances, isLoading: onchainLoading, refetch: refetchOnchain } = useOnchainBalances();
  const { wallet, refreshWallet } = useWeb3();
  const { checkBackupExists, retrieveBackup } = useEncryptedWalletBackup();
  
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isCheckingDeposit, setIsCheckingDeposit] = useState(false);
  const [userWalletAddress, setUserWalletAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  
  const pendingTransferRef = useRef<{ amount: number } | null>(null);

  // Get IPG on-chain balance
  const ipgOnchainBalance = onchainBalances.find(b => b.symbol === 'IPG')?.balance || 0;
  const bnbBalance = onchainBalances.find(b => b.symbol === 'BNB')?.balance || 0;
  const hasEnoughGas = bnbBalance > 0.001;

  // Fetch user's wallet address from profiles
  useEffect(() => {
    const fetchWallet = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('bsc_wallet_address, wallet_address')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserWalletAddress(data.bsc_wallet_address || data.wallet_address || null);
      }
    };
    
    fetchWallet();
    refreshWallet();
  }, [user?.id]);

  const copyToClipboard = async () => {
    if (!depositAddress) return;
    
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Deposit address copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  // Resolve private key from all storage locations
  const resolvePrivateKey = async (): Promise<string | null> => {
    const deriveFromSeed = (seedPhrase: string): string | null => {
      try {
        return ethers.Wallet.fromPhrase(seedPhrase.trim()).privateKey;
      } catch {
        return null;
      }
    };

    if (wallet?.privateKey && wallet.privateKey.length > 0) {
      return wallet.privateKey;
    }

    if (wallet?.seedPhrase) {
      const derived = deriveFromSeed(wallet.seedPhrase);
      if (derived) return derived;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const stored = getStoredWallet(authUser.id);
        if (stored?.privateKey) return stored.privateKey;
        if (stored?.seedPhrase) {
          const derived = deriveFromSeed(stored.seedPhrase);
          if (derived) return derived;
        }
      }
    } catch (e) {
      console.warn("Failed to get user for wallet lookup", e);
    }

    const storedAnyScope = getStoredWallet();
    if (storedAnyScope?.privateKey) return storedAnyScope.privateKey;
    if (storedAnyScope?.seedPhrase) {
      const derived = deriveFromSeed(storedAnyScope.seedPhrase);
      if (derived) return derived;
    }

    try {
      const raw = localStorage.getItem("ipg_wallet_data");
      if (raw) {
        const parsed = JSON.parse(atob(raw));
        if (parsed?.privateKey) return parsed.privateKey;
        if (parsed?.seedPhrase || parsed?.mnemonic) {
          const seed = (parsed.seedPhrase || parsed.mnemonic) as string;
          return deriveFromSeed(seed);
        }
      }
    } catch {
      // ignore
    }

    return null;
  };

  // Execute the actual transfer
  const executeTransfer = async (privateKey: string, amountNum: number) => {
    if (!depositAddress) throw new Error("Deposit address not configured");
    
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const walletInstance = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(IPG_CONTRACT, ERC20_ABI, walletInstance);
    
    // IPG has 18 decimals
    const amountInUnits = ethers.parseUnits(amountNum.toString(), 18);
    
    console.log('[StakingDeposit] Sending', amountNum, 'IPG to', depositAddress);
    
    const tx = await contract.transfer(depositAddress, amountInUnits);
    console.log('[StakingDeposit] TX sent:', tx.hash);
    setTxHash(tx.hash);
    
    const receipt = await tx.wait();
    
    if (receipt?.status !== 1) {
      throw new Error('Transaction failed on-chain');
    }
    
    return tx.hash;
  };

  // Unlock from encrypted backup and complete transfer
  const unlockFromBackupAndTransfer = async (pin: string): Promise<boolean> => {
    const phrase = await retrieveBackup(pin);
    if (!phrase) return false;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return false;

    const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
    const derivedWallet = ethers.Wallet.fromPhrase(normalized);

    // Safety check
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (
      profile?.wallet_address &&
      derivedWallet.address.toLowerCase() !== profile.wallet_address.toLowerCase()
    ) {
      toast({
        title: "Wallet Mismatch",
        description: "This PIN unlocked a recovery phrase that doesn't match your wallet address.",
        variant: "destructive",
      });
      return false;
    }

    // Store for future use
    setWalletStorageUserId(authUser.id);
    storeWallet(
      {
        address: profile?.wallet_address || derivedWallet.address,
        seedPhrase: normalized,
        privateKey: "",
        network: "mainnet",
        balance: "0",
      },
      authUser.id
    );
    await refreshWallet();

    // Execute the pending transfer
    if (pendingTransferRef.current) {
      try {
        await executeTransfer(derivedWallet.privateKey, pendingTransferRef.current.amount);
        setShowSuccess(true);
        refetchOnchain();
        refetchAccount();
      } catch (error: any) {
        toast({
          title: "Transfer Failed",
          description: error.message || "Failed to transfer IPG",
          variant: "destructive",
        });
      }
      pendingTransferRef.current = null;
    }
    
    return true;
  };

  // Handle transfer button click
  const handleTransfer = async () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter an amount", variant: "destructive" });
      return;
    }
    
    if (amountNum > ipgOnchainBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${ipgOnchainBalance.toFixed(4)} IPG available`,
        variant: "destructive"
      });
      return;
    }
    
    if (!hasEnoughGas) {
      toast({
        title: "Insufficient BNB",
        description: "You need BNB for gas fees",
        variant: "destructive"
      });
      return;
    }
    
    setIsTransferring(true);
    setTxHash(null);
    
    try {
      await refreshWallet();
      const privateKey = await resolvePrivateKey();
      
      if (privateKey) {
        await executeTransfer(privateKey, amountNum);
        setShowSuccess(true);
        refetchOnchain();
        refetchAccount();
        return;
      }
      
      // Check for encrypted backup
      const backupStatus = await checkBackupExists();
      if (backupStatus.exists) {
        pendingTransferRef.current = { amount: amountNum };
        setShowPinDialog(true);
        return;
      }
      
      toast({
        title: "Cannot Sign Transaction",
        description: "Your wallet key isn't available. Please re-import your wallet in Profile → Security.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer IPG",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const checkForDeposit = async () => {
    setIsCheckingDeposit(true);
    try {
      const { data, error } = await supabase.functions.invoke('staking-deposit-monitor', {
        body: { user_id: user?.id }
      });
      
      if (error) throw error;
      
      refetchAccount();
      
      if (data?.deposited) {
        toast({
          title: "Deposit Found!",
          description: `${data.amount} IPG has been credited to your staking account.`,
        });
      } else {
        toast({
          title: "No New Deposits",
          description: "No new deposits detected. Deposits may take a few minutes.",
        });
      }
    } catch (error: any) {
      console.error('Error checking deposits:', error);
      toast({
        title: "Check Failed",
        description: error.message || "Could not check for deposits",
        variant: "destructive",
      });
    } finally {
      setIsCheckingDeposit(false);
    }
  };

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <SuccessAnimation
            title="Transfer Sent!"
            subtitle="Your staking balance will update after confirmation"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-card shadow-lg border border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">{amount} IPG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destination</span>
                  <span className="font-medium text-foreground">Staking Account</span>
                </div>
                {txHash && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Transaction</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      onClick={() => window.open(`https://bscscan.com/tx/${txHash}`, '_blank')}
                    >
                      View on BSCScan <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
          >
            <Button onClick={() => navigate("/app/staking")} className="w-full" size="lg">
              Back to Staking
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSuccess(false);
                setAmount("");
                setTxHash(null);
              }} 
              className="w-full" 
              size="lg"
            >
              Make Another Transfer
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isLoading || onchainLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!depositAddress) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="px-4 py-6 space-y-6">
          <BacklinkBar programName="Fund Staking" parentRoute="/app/staking" />
          
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-6 text-center">
              <Info className="h-12 w-12 text-warning mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Deposits Not Available</h3>
              <p className="text-sm text-muted-foreground">
                Staking deposits are not configured yet. Please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 py-6 space-y-6">
        <BacklinkBar programName="Fund Staking Account" parentRoute="/app/staking" />

        {/* Current Balance Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staking Account Balance</p>
                <p className="text-xl font-bold text-foreground">{availableBalance.toFixed(4)} IPG</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transfer from Wallet Card */}
        <Card className="shadow-lg border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-primary" />
              Transfer to Staking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* On-chain IPG Balance */}
            <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AssetLogo symbol="IPG" size="sm" />
                <div>
                  <p className="text-sm font-medium text-foreground">Your Wallet IPG</p>
                  <p className="text-xs text-muted-foreground">Available to transfer</p>
                </div>
              </div>
              <p className="text-lg font-bold text-foreground">{ipgOnchainBalance.toFixed(4)}</p>
            </div>
            
            {/* Amount Input */}
            <div className="space-y-2">
              <Label>Amount to Transfer</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-20 text-lg"
                  step="any"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs"
                  onClick={() => setAmount(ipgOnchainBalance.toString())}
                  disabled={ipgOnchainBalance <= 0}
                >
                  MAX
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Wallet Balance: {ipgOnchainBalance.toFixed(6)} IPG
              </p>
            </div>

            {/* Gas Warning */}
            {!hasEnoughGas && (
              <Alert className="bg-amber-500/10 border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-xs text-amber-400">
                  Low BNB balance ({bnbBalance.toFixed(4)} BNB). You need BNB for gas fees.
                </AlertDescription>
              </Alert>
            )}

            {/* Transfer Status */}
            {txHash && !showSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Confirming on BSC...</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 ml-auto text-xs"
                  onClick={() => window.open(`https://bscscan.com/tx/${txHash}`, '_blank')}
                >
                  View TX <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleTransfer}
          disabled={
            isTransferring ||
            !amount ||
            parseFloat(amount) <= 0 ||
            parseFloat(amount) > ipgOnchainBalance ||
            !hasEnoughGas ||
            ipgOnchainBalance <= 0
          }
        >
          {isTransferring ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Transferring...
            </>
          ) : (
            <>
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              Transfer {amount ? `${amount} IPG` : ''} to Staking
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="px-4 text-xs text-muted-foreground">OR send externally</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* External Deposit Address Card (collapsed by default) */}
        <Card className="border-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <ArrowDown className="h-4 w-4" />
              Deposit from External Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">BEP-20 / BSC</Badge>
                <span className="text-xs">IPG Token Only</span>
              </Label>
              <div className="flex gap-2">
                <Input 
                  value={depositAddress} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* QR Code Toggle */}
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={() => setShowQR(!showQR)}
            >
              <QrCode className="h-4 w-4 mr-2" />
              {showQR ? 'Hide QR Code' : 'Show QR Code'}
            </Button>

            {showQR && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG 
                  value={depositAddress} 
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
            )}

            <a
              href={`https://bscscan.com/address/${depositAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View on BscScan <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        {/* Check for Deposits */}
        <Button
          onClick={checkForDeposit}
          disabled={isCheckingDeposit}
          className="w-full"
          variant="outline"
          size="sm"
        >
          {isCheckingDeposit ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check for New Deposits
            </>
          )}
        </Button>

        {/* Important Notes */}
        <Card className="border-muted/30 bg-muted/5">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">Important:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Only <strong>IPG tokens</strong> on <strong>BSC network</strong></li>
              <li>• A {stakingFee}% fee is applied when you stake (not on deposit)</li>
              <li>• Minimum stake amount depends on the plan you choose</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      
      {/* PIN Dialog */}
      <PinEntryDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSubmit={async (pin) => {
          const success = await unlockFromBackupAndTransfer(pin);
          return success;
        }}
        title="Enter PIN"
        description="Enter your 6-digit PIN to sign this transaction."
      />
    </div>
  );
}
