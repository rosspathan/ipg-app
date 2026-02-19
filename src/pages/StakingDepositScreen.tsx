import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BacklinkBar } from '@/components/programs-pro/BacklinkBar';
import { 
  ArrowDownToLine, Copy, Check, ExternalLink, QrCode,
  Loader2, AlertTriangle, Wallet, Coins, RefreshCw,
  ArrowDown, Shield, Info
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
import { cn } from '@/lib/utils';

const BSC_RPC_URL = 'https://bsc-dataseed1.binance.org/';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

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
  const [showExternal, setShowExternal] = useState(false);
  
  const pendingTransferRef = useRef<{ amount: number } | null>(null);

  const ipgOnchainBalance = onchainBalances.find(b => b.symbol === 'IPG')?.balance || 0;
  const bnbBalance = onchainBalances.find(b => b.symbol === 'BNB')?.balance || 0;
  const hasEnoughGas = bnbBalance > 0.001;

  const numericAmount = parseFloat(amount) || 0;
  const isAmountValid = numericAmount >= 0.01 && numericAmount <= 20 && numericAmount <= ipgOnchainBalance;

  useEffect(() => {
    const fetchWallet = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('bsc_wallet_address, wallet_address')
        .eq('user_id', user.id)
        .single();
      if (data) setUserWalletAddress(data.bsc_wallet_address || data.wallet_address || null);
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
      toast({ title: "Copied", description: "Deposit address copied to clipboard" });
    } catch {
      toast({ title: "Copy Failed", description: "Please copy manually", variant: "destructive" });
    }
  };

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
    const storedAnyScope = getStoredWallet();
    if (storedAnyScope?.privateKey) return storedAnyScope.privateKey;
    if (storedAnyScope?.seedPhrase) { const d = deriveFromSeed(storedAnyScope.seedPhrase); if (d) return d; }
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

  const executeTransfer = async (privateKey: string, amountNum: number) => {
    if (!depositAddress) throw new Error("Deposit address not configured");
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    const walletInstance = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(IPG_CONTRACT, ERC20_ABI, walletInstance);
    const amountInUnits = ethers.parseUnits(amountNum.toString(), 18);
    const tx = await contract.transfer(depositAddress, amountInUnits);
    setTxHash(tx.hash);
    const receipt = await tx.wait();
    if (receipt?.status !== 1) throw new Error('Transaction failed on-chain');
    return tx.hash;
  };

  const unlockFromBackupAndTransfer = async (pin: string): Promise<boolean> => {
    const phrase = await retrieveBackup(pin);
    if (!phrase) return false;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return false;
    const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
    const derivedWallet = ethers.Wallet.fromPhrase(normalized);
    const { data: profile } = await supabase.from("profiles").select("wallet_address").eq("user_id", authUser.id).maybeSingle();
    if (profile?.wallet_address && derivedWallet.address.toLowerCase() !== profile.wallet_address.toLowerCase()) {
      toast({ title: "Wallet Mismatch", description: "This PIN unlocked a recovery phrase that doesn't match your wallet address.", variant: "destructive" });
      return false;
    }
    setWalletStorageUserId(authUser.id);
    storeWallet({ address: profile?.wallet_address || derivedWallet.address, seedPhrase: normalized, privateKey: "", network: "mainnet", balance: "0" }, authUser.id);
    await refreshWallet();
    if (pendingTransferRef.current) {
      try {
        await executeTransfer(derivedWallet.privateKey, pendingTransferRef.current.amount);
        setShowSuccess(true);
        refetchOnchain();
        refetchAccount();
      } catch (error: any) {
        toast({ title: "Transfer Failed", description: error.message || "Failed to transfer IPG", variant: "destructive" });
      }
      pendingTransferRef.current = null;
    }
    return true;
  };

  const handleTransfer = async () => {
    if (!isAmountValid) return;
    if (!hasEnoughGas) {
      toast({ title: "Insufficient BNB", description: "You need BNB for gas fees", variant: "destructive" });
      return;
    }
    setIsTransferring(true);
    setTxHash(null);
    try {
      await refreshWallet();
      const privateKey = await resolvePrivateKey();
      if (privateKey) {
        await executeTransfer(privateKey, numericAmount);
        setShowSuccess(true);
        refetchOnchain();
        refetchAccount();
        return;
      }
      const backupStatus = await checkBackupExists();
      if (backupStatus.exists) {
        pendingTransferRef.current = { amount: numericAmount };
        setShowPinDialog(true);
        return;
      }
      toast({ title: "Cannot Sign Transaction", description: "Your wallet key isn't available. Please re-import your wallet in Profile → Security.", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Transfer Failed", description: error.message || "Failed to transfer IPG", variant: "destructive" });
    } finally {
      setIsTransferring(false);
    }
  };

  const checkForDeposit = async () => {
    setIsCheckingDeposit(true);
    try {
      const { data, error } = await supabase.functions.invoke('staking-deposit-monitor', { body: { user_id: user?.id } });
      if (error) throw error;
      refetchAccount();
      if (data?.deposited) {
        toast({ title: "Deposit Found!", description: `${data.amount} IPG has been credited to your staking account.` });
      } else {
        toast({ title: "No New Deposits", description: "No new deposits detected. Deposits may take a few minutes." });
      }
    } catch (error: any) {
      toast({ title: "Check Failed", description: error.message || "Could not check for deposits", variant: "destructive" });
    } finally {
      setIsCheckingDeposit(false);
    }
  };

  // ─── Success Screen ───
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background px-5 py-8">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <SuccessAnimation title="Transfer Sent!" subtitle="Your staking balance will update after confirmation" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transaction Details</p>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-foreground">{amount} IPG</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium text-foreground">On-Chain Wallet</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium text-foreground">Staking Account</span>
                </div>
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

  if (!depositAddress) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="px-4 py-5 space-y-5">
          <BacklinkBar programName="Fund Staking" parentRoute="/app/staking" />
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 text-center">
            <Info className="h-10 w-10 text-warning mx-auto mb-3" />
            <h3 className="font-semibold text-base mb-1.5">Deposits Not Available</h3>
            <p className="text-sm text-muted-foreground">Staking deposits are not configured yet. Please contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  const amountNum = parseFloat(amount);
  const showMinError = amount !== '' && amountNum > 0 && amountNum < 0.01;
  const showMaxError = amount !== '' && amountNum > 20;
  const showBalError = amount !== '' && amountNum > ipgOnchainBalance && amountNum <= 20;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 pt-5 pb-24 space-y-4">
        <BacklinkBar programName="Fund Staking Account" parentRoute="/app/staking" />

        {/* ─── Balance Comparison ─── */}
        <div className="grid grid-cols-2 gap-3">
          {/* On-Chain */}
          <div className="rounded-2xl p-4 bg-card border border-border/40 space-y-3">
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
              <p className="text-xl font-bold text-foreground tabular-nums">
                {ipgOnchainBalance.toFixed(4)}
              </p>
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
          <div className="rounded-2xl p-4 bg-card border border-accent/20 space-y-3">
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
              <p className="text-xl font-bold text-foreground tabular-nums">
                {Number(availableBalance).toFixed(4)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">IPG ready to stake</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg bg-muted/30 text-muted-foreground">
              <Shield className="w-3 h-3" />
              {stakingFee}% stake fee
            </div>
          </div>
        </div>

        {/* ─── Transfer Arrow ─── */}
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-4 bg-border/50" />
            <div className="w-8 h-8 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-sm">
              <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="w-px h-4 bg-border/50" />
          </div>
        </div>

        {/* ─── Transfer Form ─── */}
        <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent/15">
              <ArrowDownToLine className="w-3.5 h-3.5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Transfer to Staking</p>
              <p className="text-[11px] text-muted-foreground">On-Chain → Staking Account</p>
            </div>
          </div>

          {/* Source Balance Row */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/25 border border-border/20">
            <div className="flex items-center gap-2.5">
              <AssetLogo symbol="IPG" size="sm" />
              <div>
                <p className="text-xs font-medium text-foreground">Your Wallet IPG</p>
                <p className="text-[10px] text-muted-foreground">Available to transfer</p>
              </div>
            </div>
            <p className="text-base font-bold text-foreground tabular-nums">{ipgOnchainBalance.toFixed(4)}</p>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground/80">Amount</p>
              <p className="text-[11px] text-muted-foreground">Min 0.01 · Max 20 IPG</p>
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
                step="0.01"
                min={0.01}
                max={20}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">IPG</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-semibold text-accent hover:bg-accent/10 rounded-lg"
                  onClick={() => setAmount(String(Math.min(ipgOnchainBalance, 20).toFixed(4)))}
                  disabled={ipgOnchainBalance <= 0}
                >
                  MAX
                </Button>
              </div>
            </div>
            {showMinError && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Minimum transfer is 0.01 IPG</p>}
            {showMaxError && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Maximum transfer is 20 IPG per transaction</p>}
            {showBalError && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Insufficient on-chain balance</p>}
          </div>

          {/* Gas Warning */}
          {!hasEnoughGas && (
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
        </div>

        {/* ─── Transfer Button ─── */}
        <Button
          className="w-full h-13 text-sm font-semibold rounded-xl gap-2"
          onClick={handleTransfer}
          disabled={isTransferring || !amount || !isAmountValid || !hasEnoughGas || ipgOnchainBalance <= 0}
        >
          {isTransferring ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Transferring…</>
          ) : (
            <><ArrowDownToLine className="w-4 h-4" />
            Transfer {amountNum > 0 ? `${amountNum} ` : ''}IPG to Staking</>
          )}
        </Button>

        {/* ─── OR Divider ─── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-xs text-muted-foreground">OR send externally</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        {/* ─── External Deposit (Collapsible) ─── */}
        <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
          <button
            onClick={() => setShowExternal(!showExternal)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-muted-foreground hover:text-foreground/75 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ArrowDown className="w-4 h-4" />
              <span className="font-medium">Deposit from External Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-muted rounded-full px-2 py-0.5">BEP-20 / BSC</span>
              <span className="text-[10px] text-muted-foreground">{showExternal ? '▲' : '▼'}</span>
            </div>
          </button>

          {showExternal && (
            <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
              <p className="text-[11px] text-muted-foreground">IPG Token Only — Send to this address:</p>

              {/* Address Row */}
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30">
                  <p className="font-mono text-xs text-foreground/80 truncate">{depositAddress}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="h-10 w-10 rounded-xl border-border/40 flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {/* QR Code */}
              <Button
                variant="outline"
                className="w-full h-9 text-xs rounded-xl border-border/40 gap-2"
                onClick={() => setShowQR(!showQR)}
              >
                <QrCode className="h-3.5 w-3.5" />
                {showQR ? 'Hide QR Code' : 'Show QR Code'}
              </Button>

              {showQR && (
                <div className="flex justify-center p-4 bg-white rounded-xl">
                  <QRCodeSVG value={depositAddress} size={160} level="H" includeMargin />
                </div>
              )}

              <div className="flex items-center justify-between">
                <a
                  href={`https://bscscan.com/address/${depositAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  View on BscScan <ExternalLink className="h-3 w-3" />
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkForDeposit}
                  disabled={isCheckingDeposit}
                  className="h-7 text-xs gap-1.5 text-muted-foreground"
                >
                  {isCheckingDeposit ? (
                    <><RefreshCw className="h-3 w-3 animate-spin" /> Checking…</>
                  ) : (
                    <><RefreshCw className="h-3 w-3" /> Check deposits</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Important Notes ─── */}
        <div className="rounded-xl border border-border/20 bg-muted/20 px-4 py-3.5 space-y-2">
          <p className="text-xs font-semibold text-foreground/80">Important</p>
          <ul className="text-[11px] text-muted-foreground space-y-1.5">
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />Only <strong className="text-foreground/70">IPG tokens</strong> on <strong className="text-foreground/70">BSC network</strong></li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />A {stakingFee}% fee is applied when you stake (not on deposit)</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />Transfer limits: min 0.01 IPG · max 20 IPG per transaction</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />You need BNB in your wallet for BSC gas fees</li>
          </ul>
        </div>
      </div>

      <PinEntryDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSubmit={async (pin) => { const success = await unlockFromBackupAndTransfer(pin); return success; }}
        title="Enter PIN"
        description="Enter your 6-digit PIN to sign this transaction."
      />
    </div>
  );
}
