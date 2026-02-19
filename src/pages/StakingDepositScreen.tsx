import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BacklinkBar } from '@/components/programs-pro/BacklinkBar';
import {
  ArrowDownToLine, ArrowUpFromLine, ExternalLink,
  Loader2, AlertTriangle, Wallet, Coins, Shield, Info, ArrowLeftRight
} from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { useCryptoStakingAccount } from '@/hooks/useCryptoStakingAccount';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useOnchainBalances } from '@/hooks/useOnchainBalances';
import { useWeb3 } from '@/contexts/Web3Context';
import { useEncryptedWalletBackup } from '@/hooks/useEncryptedWalletBackup';
import { getStoredWallet, setWalletStorageUserId, storeWallet } from '@/utils/walletStorage';
import PinEntryDialog from '@/components/profile/PinEntryDialog';
import { ethers } from 'ethers';
import { SuccessAnimation } from '@/components/wallet/SuccessAnimation';
import { motion, AnimatePresence } from 'framer-motion';
import AssetLogo from '@/components/AssetLogo';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  STAKING_TOKEN_CONTRACT,
  STAKING_TOKEN_SYMBOL,
  STAKING_TOKEN_DECIMALS,
  assertIPGContract,
} from '@/constants/stakingToken';

const BSC_RPC_URL = 'https://bsc-dataseed1.binance.org/';
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// ⛔ DO NOT change this. Staking is EXCLUSIVELY locked to IPG.
// The contract is imported from src/constants/stakingToken.ts which
// contains a runtime guard (assertIPGContract) to block any non-IPG transfer.
const IPG_CONTRACT = STAKING_TOKEN_CONTRACT;

type Direction = 'deposit' | 'withdraw';

export default function StakingDepositScreen() {
  const { navigate } = useNavigation();
  const { user } = useSession();
  const { depositAddress, availableBalance, stakingFee, unstakingFee, isLoading, refetchAccount } = useCryptoStakingAccount();
  const { toast } = useToast();
  const { balances: onchainBalances, isLoading: onchainLoading, refetch: refetchOnchain } = useOnchainBalances();
  const { wallet, refreshWallet } = useWeb3();
  const { checkBackupExists, retrieveBackup } = useEncryptedWalletBackup();

  const [direction, setDirection] = useState<Direction>('deposit');
  const [amount, setAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [successType, setSuccessType] = useState<Direction>('deposit');

  const pendingTransferRef = useRef<{ amount: number } | null>(null);

  const ipgOnchainBalance = onchainBalances.find(b => b.symbol === 'IPG')?.balance || 0;
  const bnbBalance = onchainBalances.find(b => b.symbol === 'BNB')?.balance || 0;
  const hasEnoughGas = bnbBalance > 0.001;

  const numericAmount = parseFloat(amount) || 0;

  // Deposit validation
  const isDepositValid = numericAmount >= 0.01 && numericAmount <= 20 && numericAmount <= ipgOnchainBalance;
  const showMinError = direction === 'deposit' && amount !== '' && numericAmount > 0 && numericAmount < 0.01;
  const showMaxError = direction === 'deposit' && amount !== '' && numericAmount > 20;
  const showBalError = direction === 'deposit' && amount !== '' && numericAmount > ipgOnchainBalance && numericAmount <= 20;

  // Withdraw validation
  const withdrawFee = numericAmount * ((unstakingFee || 0.5) / 100);
  const withdrawNet = numericAmount - withdrawFee;
  const isWithdrawValid = numericAmount >= 0.01 && numericAmount <= 20 && numericAmount <= availableBalance;

  useEffect(() => {
    refreshWallet();
  }, [user?.id]);

  // Reset amount when switching direction
  useEffect(() => {
    setAmount('');
    setTxHash(null);
  }, [direction]);

  // ─── Poll staking-deposit-monitor after on-chain transfer ───
  const pollForDeposit = async (maxAttempts = 8, delayMs = 15000) => {
    console.log('[StakingDeposit] Starting deposit monitor polling...');
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[StakingDeposit] Poll attempt ${attempt}/${maxAttempts}`);
      try {
        const { data, error } = await supabase.functions.invoke('staking-deposit-monitor', {
          body: { user_id: user?.id }
        });
        console.log('[StakingDeposit] Monitor response:', data, error);
        if (!error && data?.deposited) {
          console.log('[StakingDeposit] Deposit credited! Amount:', data.amount);
          refetchAccount();
          return true;
        }
      } catch (e) {
        console.warn('[StakingDeposit] Poll error:', e);
      }
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    // Final refetch regardless
    refetchAccount();
    return false;
  };

  // ─── Private key resolution ───
  const resolvePrivateKey = async (): Promise<string | null> => {
    const deriveFromSeed = (seedPhrase: string): string | null => {
      try { return ethers.Wallet.fromPhrase(seedPhrase.trim()).privateKey; } catch { return null; }
    };
    if (wallet?.privateKey && wallet.privateKey.length > 0) return wallet.privateKey;
    if (wallet?.seedPhrase) {
      const derived = deriveFromSeed(wallet.seedPhrase);
      if (derived) return derived;
    }
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const stored = getStoredWallet(authUser.id);
        if (stored?.privateKey) return stored.privateKey;
        if (stored?.seedPhrase) { const d = deriveFromSeed(stored.seedPhrase); if (d) return d; }
      }
    } catch {}
    const storedAny = getStoredWallet();
    if (storedAny?.privateKey) return storedAny.privateKey;
    if (storedAny?.seedPhrase) { const d = deriveFromSeed(storedAny.seedPhrase); if (d) return d; }
    try {
      const raw = localStorage.getItem("ipg_wallet_data");
      if (raw) {
        const parsed = JSON.parse(atob(raw));
        if (parsed?.privateKey) return parsed.privateKey;
        if (parsed?.seedPhrase || parsed?.mnemonic) return deriveFromSeed((parsed.seedPhrase || parsed.mnemonic) as string);
      }
    } catch {}
    return null;
  };

  // ─── Execute on-chain transfer ───
  // ⛔ SECURITY: Only IPG (STAKING_TOKEN_CONTRACT) is ever transferred here.
  // assertIPGContract() will throw immediately if the contract deviates from IPG.
  const executeTransfer = async (privateKey: string, amountNum: number) => {
    if (!depositAddress) throw new Error("Deposit address not configured");

    // Runtime guard — blocks any non-IPG contract from being used
    assertIPGContract(IPG_CONTRACT);

    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const walletInstance = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(IPG_CONTRACT, ERC20_ABI, walletInstance);
    const amountInUnits = ethers.parseUnits(amountNum.toString(), STAKING_TOKEN_DECIMALS);
    const tx = await contract.transfer(depositAddress, amountInUnits);
    setTxHash(tx.hash);
    const receipt = await tx.wait();
    if (receipt?.status !== 1) throw new Error('Transaction failed on-chain');
    return tx.hash;
  };

  // ─── PIN unlock + transfer ───
  const unlockFromBackupAndTransfer = async (pin: string): Promise<boolean> => {
    const phrase = await retrieveBackup(pin);
    if (!phrase) return false;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return false;
    const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
    const derivedWallet = ethers.Wallet.fromPhrase(normalized);
    const { data: profile } = await supabase.from("profiles").select("wallet_address").eq("user_id", authUser.id).maybeSingle();
    if (profile?.wallet_address && derivedWallet.address.toLowerCase() !== profile.wallet_address.toLowerCase()) {
      toast({ title: "Wallet Mismatch", description: "PIN unlocked a key that doesn't match your wallet address.", variant: "destructive" });
      return false;
    }
    setWalletStorageUserId(authUser.id);
    storeWallet({ address: profile?.wallet_address || derivedWallet.address, seedPhrase: normalized, privateKey: "", network: "mainnet", balance: "0" }, authUser.id);
    await refreshWallet();
    if (pendingTransferRef.current) {
      try {
        await executeTransfer(derivedWallet.privateKey, pendingTransferRef.current.amount);
        setSuccessType('deposit');
        setShowSuccess(true);
        refetchOnchain();
        // Poll monitor to credit staking balance after on-chain confirmation
        pollForDeposit();
      } catch (error: any) {
        toast({ title: "Transfer Failed", description: error.message, variant: "destructive" });
      }
      pendingTransferRef.current = null;
    }
    return true;
  };

  // ─── Handle deposit ───
  const handleDeposit = async () => {
    if (!isDepositValid) return;
    if (!hasEnoughGas) {
      toast({ title: "Insufficient BNB", description: "You need BNB for gas fees on BSC.", variant: "destructive" });
      return;
    }
    setIsTransferring(true);
    setTxHash(null);
    try {
      await refreshWallet();
      const privateKey = await resolvePrivateKey();
      if (privateKey) {
        await executeTransfer(privateKey, numericAmount);
        setSuccessType('deposit');
        setShowSuccess(true);
        refetchOnchain();
        // Poll monitor to credit staking balance after on-chain confirmation
        pollForDeposit();
        return;
      }
      const backupStatus = await checkBackupExists();
      if (backupStatus.exists) {
        pendingTransferRef.current = { amount: numericAmount };
        setShowPinDialog(true);
        return;
      }
      toast({ title: "Cannot Sign Transaction", description: "Wallet key not available. Re-import your wallet in Profile → Security.", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Transfer Failed", description: error.message || "Failed to transfer IPG", variant: "destructive" });
    } finally {
      setIsTransferring(false);
    }
  };

  // ─── Handle withdraw ───
  const handleWithdraw = async () => {
    setShowWithdrawConfirm(false);
    setIsTransferring(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-staking-withdrawal', {
        body: { amount: numericAmount }
      });
      if (error) throw error;
      setSuccessType('withdraw');
      setShowSuccess(true);
      refetchAccount();
    } catch (error: any) {
      toast({ title: "Withdrawal Failed", description: error.message || "Could not process withdrawal", variant: "destructive" });
    } finally {
      setIsTransferring(false);
    }
  };

  // ─── Success Screen ───
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background px-5 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <SuccessAnimation
            title={successType === 'deposit' ? "Transfer Sent!" : "Withdrawal Submitted!"}
            subtitle={successType === 'deposit'
              ? "Your staking balance will update after confirmation"
              : `${withdrawNet.toFixed(4)} IPG will be sent to your wallet shortly`}
          />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transaction Details</p>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-semibold text-foreground">{successType === 'deposit' ? 'Deposit to Staking' : 'Withdraw to Wallet'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-foreground">{amount} IPG</span>
                </div>
                {successType === 'withdraw' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fee ({unstakingFee}%)</span>
                      <span className="text-destructive">-{withdrawFee.toFixed(4)} IPG</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border/30 pt-2">
                      <span className="text-muted-foreground">You Receive</span>
                      <span className="font-bold text-foreground">{withdrawNet.toFixed(4)} IPG</span>
                    </div>
                  </>
                )}
                {txHash && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-border/30">
                    <span className="text-muted-foreground">TX Hash</span>
                    <button
                      onClick={() => window.open(`https://bscscan.com/tx/${txHash}`, '_blank')}
                      className="flex items-center gap-1 text-accent text-xs font-medium"
                    >
                      View on BSCScan <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="space-y-2.5">
            <Button onClick={() => navigate("/app/staking")} className="w-full h-12 rounded-xl text-sm font-semibold">
              Back to Staking
            </Button>
            <Button variant="outline" onClick={() => { setShowSuccess(false); setAmount(""); setTxHash(null); }} className="w-full h-12 rounded-xl text-sm border-border/50">
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
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 pt-5 pb-24 space-y-4">
        <BacklinkBar programName="Staking Transfer" parentRoute="/app/staking" />

        {/* ─── Balance Cards ─── */}
        <div className="grid grid-cols-2 gap-3">
          {/* On-Chain */}
          <div className={cn(
            "rounded-2xl p-4 bg-card border space-y-3 transition-all",
            direction === 'deposit' ? "border-primary/40 ring-1 ring-primary/20" : "border-border/40"
          )}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/15">
                <Wallet className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">On-Chain</p>
                <p className="text-[9px] text-muted-foreground">Wallet</p>
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground tabular-nums">{ipgOnchainBalance.toFixed(4)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">IPG available</p>
            </div>
            {bnbBalance > 0 && (
              <div className={cn(
                "flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg",
                hasEnoughGas ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", hasEnoughGas ? "bg-success" : "bg-warning")} />
                {bnbBalance.toFixed(4)} BNB gas
              </div>
            )}
          </div>

          {/* Staking */}
          <div className={cn(
            "rounded-2xl p-4 bg-card border space-y-3 transition-all",
            direction === 'withdraw' ? "border-accent/40 ring-1 ring-accent/20" : "border-border/40"
          )}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent/15">
                <Coins className="w-3.5 h-3.5 text-accent" />
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Staking</p>
                <p className="text-[9px] text-muted-foreground">Account</p>
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground tabular-nums">{Number(availableBalance).toFixed(4)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">IPG available</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg bg-muted/30 text-muted-foreground">
              <Shield className="w-3 h-3" />
              {stakingFee}% stake fee
            </div>
          </div>
        </div>

        {/* ─── Direction Toggle ─── */}
        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => setDirection('deposit')}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
              direction === 'deposit'
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Deposit
          </button>
          <button
            onClick={() => setDirection('withdraw')}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
              direction === 'withdraw'
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Withdraw
          </button>
        </div>

        {/* ─── Transfer Form ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={direction}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl border border-border/40 bg-card p-4 space-y-4"
          >
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center",
                direction === 'deposit' ? "bg-accent/15" : "bg-primary/15"
              )}>
                {direction === 'deposit'
                  ? <ArrowDownToLine className="w-3.5 h-3.5 text-accent" />
                  : <ArrowUpFromLine className="w-3.5 h-3.5 text-primary" />
                }
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {direction === 'deposit' ? 'Transfer to Staking' : 'Withdraw to Wallet'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {direction === 'deposit' ? 'On-Chain → Staking Account' : 'Staking Account → On-Chain'}
                </p>
              </div>
            </div>

            {/* Source Balance Row */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/25 border border-border/20">
              <div className="flex items-center gap-2.5">
                <AssetLogo symbol="IPG" size="sm" />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {direction === 'deposit' ? 'Your Wallet IPG' : 'Staking Balance'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Available to transfer</p>
                </div>
              </div>
              <p className="text-base font-bold text-foreground tabular-nums">
                {direction === 'deposit' ? ipgOnchainBalance.toFixed(4) : Number(availableBalance).toFixed(4)}
              </p>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground/80">Amount</p>
                <p className="text-[11px] text-muted-foreground">
                {direction === 'deposit' ? 'Min 0.01 · Max 20 IPG' : `Min 0.01 · Max 20 IPG · ${unstakingFee || 0.5}% fee`}
                </p>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn(
                    "h-13 text-lg font-semibold pr-24 rounded-xl border-border/50 bg-background/50 focus:border-accent",
                    (showMinError || showMaxError || showBalError) && "border-destructive/60"
                  )}
                  step={direction === 'deposit' ? '0.01' : '0.0001'}
                  min={0.01}
                  max={direction === 'deposit' ? 20 : Math.min(20, availableBalance)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">IPG</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-semibold text-accent hover:bg-accent/10 rounded-lg"
                    onClick={() => {
                      if (direction === 'deposit') {
                        setAmount(String(Math.min(ipgOnchainBalance, 20).toFixed(4)));
                      } else {
                        setAmount(String(availableBalance.toFixed(4)));
                      }
                    }}
                    disabled={direction === 'deposit' ? ipgOnchainBalance <= 0 : availableBalance <= 0}
                  >
                    MAX
                  </Button>
                </div>
              </div>
              {showMinError && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Minimum transfer is 0.01 IPG</p>}
              {showMaxError && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Maximum transfer is 20 IPG per transaction</p>}
              {showBalError && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Insufficient on-chain balance</p>}
              {direction === 'withdraw' && numericAmount > 20 && (
                <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Maximum withdrawal is 20 IPG per transaction</p>
              )}
              {direction === 'withdraw' && numericAmount > 0 && numericAmount <= 20 && numericAmount > availableBalance && (
                <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Insufficient staking balance</p>
              )}
            </div>

            {/* Withdraw fee breakdown */}
            {direction === 'withdraw' && numericAmount > 0 && (
              <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 border border-border/20">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Withdrawal amount</span>
                  <span className="text-foreground font-medium">{numericAmount.toFixed(4)} IPG</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Fee ({unstakingFee || 0.5}%)</span>
                  <span className="text-destructive">-{withdrawFee.toFixed(4)} IPG</span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-border/20">
                  <span className="font-semibold text-foreground">You receive</span>
                  <span className="font-bold text-foreground">{withdrawNet.toFixed(4)} IPG</span>
                </div>
              </div>
            )}

            {/* Gas Warning (deposit only) */}
            {direction === 'deposit' && !hasEnoughGas && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/8 border border-warning/20">
                <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-warning">Low BNB Balance</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    You have {bnbBalance.toFixed(4)} BNB. You need BNB to pay gas fees on BSC.
                  </p>
                </div>
              </div>
            )}

            {/* TX Confirming */}
            {txHash && !showSuccess && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-accent/8 border border-accent/20">
                <Loader2 className="h-4 w-4 animate-spin text-accent flex-shrink-0" />
                <span className="text-sm text-accent flex-1">Confirming on BSC…</span>
                <button
                  onClick={() => window.open(`https://bscscan.com/tx/${txHash}`, '_blank')}
                  className="flex items-center gap-1 text-[11px] text-accent/70"
                >
                  View TX <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ─── Action Button ─── */}
        <Button
          className="w-full h-13 text-sm font-semibold rounded-xl gap-2"
          onClick={direction === 'deposit' ? handleDeposit : () => setShowWithdrawConfirm(true)}
          disabled={
            isTransferring ||
            !amount ||
            (direction === 'deposit' && (!isDepositValid || !hasEnoughGas || ipgOnchainBalance <= 0)) ||
            (direction === 'withdraw' && !isWithdrawValid)
          }
        >
          {isTransferring ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
          ) : direction === 'deposit' ? (
            <><ArrowDownToLine className="w-4 h-4" />Transfer {numericAmount > 0 ? `${numericAmount} ` : ''}IPG to Staking</>
          ) : (
            <><ArrowUpFromLine className="w-4 h-4" />Withdraw {numericAmount > 0 ? `${withdrawNet.toFixed(4)} ` : ''}IPG to Wallet</>
          )}
        </Button>

        {/* ─── Info Notes ─── */}
        <div className="rounded-xl border border-border/20 bg-muted/20 px-4 py-3.5 space-y-2">
          <p className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Important
          </p>
          <ul className="text-[11px] text-muted-foreground space-y-1.5">
            {direction === 'deposit' ? (
              <>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />Only <strong className="text-foreground/70">IPG tokens</strong> on <strong className="text-foreground/70">BSC network</strong></li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />A {stakingFee}% fee is applied when you stake (not on deposit)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />Transfer limits: min 0.01 IPG · max 20 IPG per transaction</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />You need BNB in your wallet for BSC gas fees</li>
              </>
            ) : (
              <>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />Transfer limits: min 0.01 IPG · max 20 IPG per transaction</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />A {unstakingFee || 0.5}% fee is deducted from all withdrawals</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />IPG will be sent to your registered wallet on BSC</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />Withdrawals are processed within a few minutes</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* PIN Dialog */}
      <PinEntryDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSubmit={async (pin) => { const success = await unlockFromBackupAndTransfer(pin); return success; }}
        title="Enter PIN"
        description="Enter your 6-digit PIN to sign this transaction."
      />

      {/* Withdraw Confirm Dialog */}
      <AlertDialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Withdrawal</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">You are about to withdraw from your staking account:</p>
                <div className="bg-muted rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span>{numericAmount.toFixed(4)} IPG</span>
                  </div>
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Fee ({unstakingFee || 0.5}%)</span>
                    <span>-{withdrawFee.toFixed(4)} IPG</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-semibold">
                    <span>You Receive</span>
                    <span className="text-foreground">{withdrawNet.toFixed(4)} IPG</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw}>Confirm Withdrawal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
