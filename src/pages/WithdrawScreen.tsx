import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, ScanLine, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { QRScanner } from "@/components/scanner/QRScanner";
import { useOnchainBalances } from "@/hooks/useOnchainBalances";
import { supabase } from "@/integrations/supabase/client";
import { validateCryptoAddress } from "@/lib/validation/cryptoAddressValidator";
import { useWithdrawalFees } from "@/hooks/useWithdrawalFees";
import { useWeb3 } from "@/contexts/Web3Context";
import { transferBNB, transferERC20, transferViaMetaMask } from "@/lib/wallet/onchainTransfer";
import { useOpenOrdersCheck } from "@/hooks/useOpenOrdersCheck";
import { getStoredWallet, setWalletStorageUserId, storeWallet } from "@/utils/walletStorage";
import { useEncryptedWalletBackup } from "@/hooks/useEncryptedWalletBackup";
import PinEntryDialog from "@/components/profile/PinEntryDialog";
import {
  resolveAuthenticatedSigner,
  describeSignerFailure,
  logSignerAudit,
  newSignerReferenceId,
} from "@/lib/wallet/signerResolver";

const MIN_WITHDRAWAL_BALANCE = 0.0001;

const WithdrawScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Check for pre-selected asset / debug flags from URL params
  const searchParams = new URLSearchParams(location.search);
  const preSelectedAsset = searchParams.get("asset");
  const debugClicks = searchParams.get("debugClicks") === "1";

  // Get user's wallet from Web3 context (may be MetaMask wallet with no privateKey)
  const { wallet, refreshWallet } = useWeb3();
  const { checkBackupExists, retrieveBackup } = useEncryptedWalletBackup();

  // Ensure wallet is loaded from storage on mount (handles post-import scenario)
  useEffect(() => {
    refreshWallet();
  }, []);

  // Debug: Log what element is actually receiving taps/clicks (domain vs preview)
  useEffect(() => {
    if (!debugClicks) return;

    const handler = (e: PointerEvent) => {
      const stack = document
        .elementsFromPoint(e.clientX, e.clientY)
        .slice(0, 6)
        .map((el) => {
          const he = el as HTMLElement;
          const s = window.getComputedStyle(he);
          return {
            tag: he.tagName.toLowerCase(),
            id: he.id || undefined,
            className: String((he as any).className || "") || undefined,
            pointerEvents: s.pointerEvents,
            position: s.position,
            zIndex: s.zIndex,
          };
        });

      console.log("[DEBUG_TAP]", {
        x: e.clientX,
        y: e.clientY,
        target: String((e.target as any)?.tagName || ""),
        stack,
      });
    };

    window.addEventListener("pointerdown", handler, true);
    return () => window.removeEventListener("pointerdown", handler, true);
  }, [debugClicks]);

  const [selectedAsset, setSelectedAsset] = useState(preSelectedAsset || "");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gasCheckError, setGasCheckError] = useState<string | null>(null);
  const [isCheckingGas, setIsCheckingGas] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [isPreparingSigner, setIsPreparingSigner] = useState(false);


  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    error?: string;
  }>({ isValid: false });

  // Fetch REAL on-chain balances (not database balances)
  const { balances: onchainBalances, isLoading, error, refetch: refetchBalances } = useOnchainBalances();

  // Get dynamic withdrawal fees
  const { fees: withdrawalFees, loading: feesLoading } = useWithdrawalFees(selectedAsset, selectedNetwork);

  // Check for open orders locking assets
  const { data: openOrdersData } = useOpenOrdersCheck(selectedAsset);

  // Transform on-chain balances into the format needed for the UI
  const assets = onchainBalances
    .filter(asset => 
      asset.balance >= MIN_WITHDRAWAL_BALANCE
    )
    .map(asset => ({
      symbol: asset.symbol,
      name: asset.name,
      balance: asset.balance.toString(),
      available: asset.balance,
      locked: 0,
      logo_url: asset.logoUrl,
      contractAddress: asset.contractAddress,
      decimals: asset.decimals,
      networks: [asset.network || 'BEP20'],
    }));

  // Set initial selected asset when balances load
  useEffect(() => {
    if (assets.length > 0) {
      // If pre-selected asset exists in URL, use it
      if (preSelectedAsset) {
        const preSelected = assets.find(a => a.symbol === preSelectedAsset)
        if (preSelected) {
          setSelectedAsset(preSelected.symbol)
          setSelectedNetwork(preSelected.networks[0])
          return
        }
      }
      
      // Otherwise use first asset
      if (!selectedAsset) {
        setSelectedAsset(assets[0].symbol);
        setSelectedNetwork(assets[0].networks[0]);
      }
    }
  }, [assets, selectedAsset, preSelectedAsset]);

  // Validate address whenever it changes
  useEffect(() => {
    if (!address || !selectedNetwork) {
      setAddressValidation({ isValid: false });
      return;
    }

    const validation = validateCryptoAddress(address, selectedNetwork);
    setAddressValidation({
      isValid: validation.isValid,
      error: validation.error
    });
  }, [address, selectedNetwork]);

  const currentAsset = assets.find(a => a.symbol === selectedAsset);
  const netAmount = amount && withdrawalFees 
    ? (parseFloat(amount) - withdrawalFees.totalFee).toFixed(8) 
    : "0";

  const handleWithdraw = () => {
    if (!address || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!addressValidation.isValid) {
      toast({
        title: "Invalid Address",
        description: addressValidation.error || "Please enter a valid wallet address",
        variant: "destructive"
      });
      return;
    }

    const amountNum = parseFloat(amount);
    const availableBalance = currentAsset?.available || 0;
    
    if (availableBalance === 0) {
      toast({
        title: "No Balance",
        description: `You have 0 ${selectedAsset}. Please deposit first.`,
        variant: "destructive"
      });
      return;
    }
    
    if (amountNum > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${availableBalance} ${selectedAsset} available`,
        variant: "destructive"
      });
      return;
    }

    // Check gas before showing confirmation
    setIsCheckingGas(true);
    setGasCheckError(null);
    
    try {
      const bnbBalance = onchainBalances.find(b => b.symbol === 'BNB')?.balance || 0;
      const MIN_GAS_BNB = 0.0005; // ~$0.30 worth of BNB for gas
      
      // For BNB withdrawals, ensure enough remains for gas
      if (selectedAsset === 'BNB') {
        const remainingBnb = bnbBalance - amountNum;
        if (remainingBnb < 0) {
          setGasCheckError(`Insufficient BNB balance. You have ${bnbBalance.toFixed(6)} BNB.`);
          setIsCheckingGas(false);
          return;
        }
      } else {
        // For token withdrawals, need BNB for gas
        if (bnbBalance < MIN_GAS_BNB) {
          setGasCheckError(`Insufficient BNB for gas fees. You need at least ${MIN_GAS_BNB} BNB but have ${bnbBalance.toFixed(6)} BNB. Please deposit BNB first.`);
          setIsCheckingGas(false);
          return;
        }
      }
    } catch (e) {
      console.warn('[WithdrawScreen] Gas check warning:', e);
      // Don't block - let the transaction attempt and fail with a clearer error
    } finally {
      setIsCheckingGas(false);
    }

    setShowConfirmation(true);
  };

  type SigningMethod =
    | { type: "privateKey"; privateKey: string; signerAddress: string; displayedAddress: string }
    | { type: "metamask" };

  const executeWithdraw = async (signer: SigningMethod) => {
    setIsProcessing(true);
    const referenceId = newSignerReferenceId("WD");
    let userId: string | null = null;
    let displayedAddressForAudit: string | null = null;
    let signerAddressForAudit: string | null = null;
    try {
      const asset = assets.find((a) => a.symbol === selectedAsset);
      if (!asset) throw new Error("Asset not found");

      const netAmountValue = (
        parseFloat(amount) - (withdrawalFees?.totalFee || 0)
      ).toString();

      if (Number(netAmountValue) <= 0) {
        throw new Error("Amount after fee must be greater than 0");
      }

      // === SIGNER ↔ DISPLAYED-WALLET INTEGRITY (final on-broadcast verification) ===
      // For "privateKey" signing the equality has already been enforced by
      // resolveAuthenticatedSigner() — re-verify here as a defense-in-depth check
      // in case the wallet record changed between resolution and broadcast.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("user_id", user.id)
          .maybeSingle();
        const displayedWallet = (profile?.wallet_address || "").toLowerCase();
        displayedAddressForAudit = displayedWallet || null;

        let derivedSignerAddress: string | null = null;
        if (signer.type === "privateKey") {
          try {
            derivedSignerAddress = new ethers.Wallet(signer.privateKey).address.toLowerCase();
          } catch {
            throw new Error(
              "Invalid signing key. Please re-import your wallet under Profile → Security."
            );
          }
        } else if (
          signer.type === "metamask" &&
          typeof window !== "undefined" &&
          window.ethereum
        ) {
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const s = await provider.getSigner();
            derivedSignerAddress = (await s.getAddress()).toLowerCase();
          } catch {
            // Will be re-checked inside transferViaMetaMask; continue.
          }
        }
        signerAddressForAudit = derivedSignerAddress;

        if (
          displayedWallet &&
          derivedSignerAddress &&
          displayedWallet !== derivedSignerAddress
        ) {
          await logSignerAudit({
            referenceId,
            userId: user.id,
            displayedAddress: displayedWallet,
            signerAddress: derivedSignerAddress,
            outcome: "signer_mismatch",
            assetSymbol: selectedAsset,
            network: selectedNetwork,
            amountRequested: parseFloat(amount),
            errorReason: "Pre-broadcast equality check failed",
            metadata: { source: signer.type },
          });
          throw new Error(
            `Wallet mismatch detected. The wallet used to sign does not match your displayed wallet address.\n\n` +
              `Displayed: ${displayedWallet.slice(0, 8)}…${displayedWallet.slice(-4)}\n` +
              `Signer:    ${derivedSignerAddress.slice(0, 8)}…${derivedSignerAddress.slice(-4)}\n\n` +
              `Please reconnect or re-import your wallet under Profile → Security.\n` +
              `Reference ID: ${referenceId}`
          );
        }
      }

      const result =
        signer.type === "metamask"
          ? await transferViaMetaMask(
              selectedAsset === "BNB"
                ? null
                : asset.contractAddress
                  ? asset.contractAddress
                  : (() => {
                      throw new Error("Token contract address not found");
                    })(),
              address,
              netAmountValue,
              asset.decimals
            )
          : selectedAsset === "BNB"
            ? await transferBNB(signer.privateKey, address, netAmountValue)
            : asset.contractAddress
              ? await transferERC20(
                  signer.privateKey,
                  asset.contractAddress,
                  address,
                  netAmountValue,
                  asset.decimals
                )
              : (() => {
                  throw new Error("Token contract address not found");
                })();

      if (result.signerAddress) signerAddressForAudit = result.signerAddress.toLowerCase();

      if (!result.success) {
        const reason = (result.error || "").toLowerCase();
        const outcome: Parameters<typeof logSignerAudit>[0]["outcome"] = reason.includes(
          "live balance is lower"
        )
          ? "insufficient_balance"
          : reason.includes("gas")
            ? "insufficient_gas"
            : reason.includes("signing key does not match") || reason.includes("mismatch")
              ? "signer_mismatch"
              : "broadcast_failed";

        if (userId) {
          await logSignerAudit({
            referenceId,
            userId,
            displayedAddress: displayedAddressForAudit,
            signerAddress: signerAddressForAudit,
            outcome,
            assetSymbol: selectedAsset,
            network: selectedNetwork,
            amountRequested: parseFloat(amount),
            signerLiveBalance: result.liveBalance ? Number(result.liveBalance) : null,
            errorReason: result.error || "Unknown broadcast failure",
          });
        }
        throw new Error(result.error || "Transaction failed");
      }

      // Record successful withdrawal in database for history
      if (user) {
        await supabase.from("escrow_withdrawals").insert({
          user_id: user.id,
          asset_symbol: selectedAsset,
          amount: parseFloat(amount),
          to_address: address,
          tx_hash: result.txHash,
          status: "completed",
          processed_at: new Date().toISOString(),
        });
      }

      if (userId) {
        await logSignerAudit({
          referenceId,
          userId,
          displayedAddress: displayedAddressForAudit,
          signerAddress: signerAddressForAudit,
          outcome: "success",
          assetSymbol: selectedAsset,
          network: selectedNetwork,
          amountRequested: parseFloat(amount),
          txHash: result.txHash ?? null,
        });
      }

      toast({
        title: "Withdrawal Successful",
        description: `${netAmountValue} ${selectedAsset} sent to ${address.slice(0, 8)}...${address.slice(-6)}`,
      });

      refetchBalances();
      navigate("/app/wallet");
    } catch (error: any) {
      console.error("[WithdrawScreen] Withdrawal error:", error);

      let errorTitle = "Withdrawal Failed";
      let errorDescription = error.message || "Failed to process withdrawal";

      const errMsg = (error.message || "").toLowerCase();
      if (errMsg.includes("wallet mismatch detected") || errMsg.includes("wallet signer mismatch") || errMsg.includes("signing key does not match")) {
        errorTitle = "Wallet Mismatch Detected";
      } else if (errMsg.includes("live balance is lower") || errMsg.includes("token contract reported insufficient")) {
        errorTitle = "Live Balance Too Low";
      } else if (errMsg.includes("bnb gas balance is insufficient") || errMsg.includes("insufficient bnb")) {
        errorTitle = "Insufficient BNB for Gas";
      } else if (errMsg.includes("insufficient funds") || errMsg.includes("insufficient balance")) {
        errorTitle = "Insufficient BNB for Gas";
        errorDescription =
          "You need BNB in your wallet to pay for transaction fees. Please deposit some BNB first.";
      } else if (errMsg.includes("token contract configuration error")) {
        errorTitle = "Token Configuration Error";
      } else if (errMsg.includes("nonce") || errMsg.includes("replacement")) {
        errorTitle = "Transaction Pending";
        errorDescription =
          "A previous transaction is still pending. Please wait a moment and try again.";
      } else if (errMsg.includes("rejected") || errMsg.includes("denied")) {
        errorTitle = "Transaction Rejected";
        errorDescription = "The transaction was cancelled.";
      } else if (errMsg.includes("timeout") || errMsg.includes("network")) {
        errorTitle = "Network Error";
        errorDescription =
          "Could not connect to BSC network. Please check your connection and try again.";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 9000,
      });
      setShowConfirmation(false);
    } finally {
      setIsProcessing(false);
    }
  };


  const unlockFromBackupAndWithdraw = async (pin: string): Promise<boolean> => {
    // Decrypt from server backup and sign immediately
    const phrase = await retrieveBackup(pin);
    if (!phrase) return false;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
    const derivedWallet = ethers.Wallet.fromPhrase(normalized);

    // Safety: ensure this backup belongs to this account's registered wallet
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profile?.wallet_address &&
      derivedWallet.address.toLowerCase() !== profile.wallet_address.toLowerCase()
    ) {
      toast({
        title: "Wallet Mismatch",
        description:
          "This PIN unlocked a recovery phrase that doesn't match your wallet address. Please re-import your correct wallet.",
        variant: "destructive",
        duration: 8000,
      });
      return false;
    }

    // Persist phrase locally so internal signing works smoothly going forward
    setWalletStorageUserId(user.id);
    storeWallet(
      {
        address: profile?.wallet_address || derivedWallet.address,
        seedPhrase: normalized,
        privateKey: "", // do not store private key; derive when needed
        network: "mainnet",
        balance: "0",
      },
      user.id
    );
    await refreshWallet();

    await executeWithdraw({
      type: "privateKey",
      privateKey: derivedWallet.privateKey,
      signerAddress: derivedWallet.address.toLowerCase(),
      displayedAddress: (profile?.wallet_address || derivedWallet.address).toLowerCase(),
    });
    return true;
  };

  const confirmWithdraw = async () => {
    if (isProcessing || isPreparingSigner) return;

    if (debugClicks) {
      console.log("[WithdrawScreen] Sign & Send tapped", { ts: Date.now() });
      toast({
        title: "Tapped Sign & Send",
        description: "Handler triggered (debugClicks=1)",
        duration: 2000,
      });
    }

    setIsPreparingSigner(true);
    try {
      // Try refreshing wallet first in case it was imported after context loaded
      await refreshWallet();

      // === Centralized signer resolution with strict address-equality check ===
      const resolution = await resolveAuthenticatedSigner(wallet, {
        assetSymbol: selectedAsset,
        network: selectedNetwork,
        amountRequested: parseFloat(amount),
      });

      if (resolution.ok === true) {
        await executeWithdraw({
          type: "privateKey",
          privateKey: resolution.signer.privateKey,
          signerAddress: resolution.signer.signerAddress,
          displayedAddress: resolution.signer.displayedAddress,
        });
        return;
      }

      const failure = resolution.failure;

      // Strict mismatch — never broadcast, ever.
      if (failure.kind === "mismatch") {
        toast({
          title: "Wallet Mismatch Detected",
          description: describeSignerFailure(failure),
          variant: "destructive",
          duration: 12000,
        });
        return;
      }

      // For "no_local_key": MetaMask signing or PIN-unlock from encrypted backup.
      const isMetaMaskWallet = !!wallet && !wallet.privateKey && !wallet.seedPhrase;
      if (
        failure.kind === "no_local_key" &&
        isMetaMaskWallet &&
        typeof window !== "undefined" &&
        typeof window.ethereum !== "undefined"
      ) {
        await executeWithdraw({ type: "metamask" });
        return;
      }

      if (failure.kind === "no_local_key") {
        const backupStatus = await checkBackupExists();
        if (backupStatus.exists) {
          setShowPinDialog(true);
          return;
        }
      }

      toast({
        title:
          failure.kind === "no_displayed_wallet"
            ? "Wallet Not Set Up"
            : "Cannot Sign Internally",
        description: describeSignerFailure(failure),
        variant: "destructive",
        duration: 9000,
      });
    } finally {
      setIsPreparingSigner(false);
    }
  };

  if (showConfirmation) {
    return (
      <div className="min-h-full bg-background px-6 py-8 with-bottom-nav">
        <div className="max-w-sm mx-auto w-full space-y-6">
          <div className="text-center space-y-4">
            <Shield className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Confirm Withdrawal</h1>
            <p className="text-muted-foreground">Please confirm your withdrawal details</p>
          </div>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Asset</span>
                <span className="font-medium">{selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">{selectedNetwork}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To Address</span>
                <span className="font-medium font-mono text-sm">{address.slice(0, 8)}...{address.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{amount} {selectedAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Fee</span>
                <span className="font-medium">{withdrawalFees?.totalFee.toFixed(8)} {selectedAsset}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Net Amount</span>
                <span className="font-semibold">{netAmount} {selectedAsset}</span>
              </div>
              
              {/* Show BNB gas balance for token withdrawals */}
              {selectedAsset !== 'BNB' && (
                <div className="flex justify-between text-xs pt-2 border-t border-dashed">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    BNB for Gas
                  </span>
                  <span className={`font-medium ${
                    (onchainBalances.find(b => b.symbol === 'BNB')?.balance || 0) < 0.0005 
                      ? 'text-destructive' 
                      : 'text-green-500'
                  }`}>
                    {(onchainBalances.find(b => b.symbol === 'BNB')?.balance || 0).toFixed(6)} BNB
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gas Error Alert */}
          {gasCheckError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{gasCheckError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 pb-8">
            <Button
              type="button"
              onClick={confirmWithdraw}
              onPointerDown={(e) => {
                if (!debugClicks) return;
                console.log("[WithdrawScreen] pointerdown Sign & Send", {
                  ts: Date.now(),
                  target: (e.target as HTMLElement)?.tagName,
                });
              }}
              className="w-full min-h-[56px] touch-manipulation"
              size="lg"
              disabled={isProcessing || isCheckingGas || isPreparingSigner}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Transaction...
                </>
              ) : isCheckingGas ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking Gas...
                </>
              ) : isPreparingSigner ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing...
                </>
              ) : (
                "Sign & Send"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfirmation(false);
                setGasCheckError(null);
              }}
              className="w-full min-h-[56px] touch-manipulation"
              size="lg"
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>

          <PinEntryDialog
            open={showPinDialog}
            onOpenChange={setShowPinDialog}
            onSubmit={unlockFromBackupAndWithdraw}
            title="Enter PIN to sign"
            description="Enter your 6-digit PIN to unlock your wallet backup and sign this withdrawal."
          />

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background px-6 py-8 with-bottom-nav">
      <div className="max-w-sm mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/wallet")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Withdraw</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/app/history/withdrawals")}
          >
            History
          </Button>
        </div>

        {/* Tabs for Crypto and INR */}
        <Tabs defaultValue="crypto" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
            <TabsTrigger value="inr">INR (Bank/UPI)</TabsTrigger>
          </TabsList>

          <TabsContent value="crypto" className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <Card className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-8 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <p className="text-muted-foreground">Loading balances...</p>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-6">
                  <p className="text-destructive">Failed to load balances. Please try again.</p>
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {!isLoading && !error && assets.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Withdrawal Assets Available</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  No crypto assets are currently enabled for withdrawal. Please contact support to enable crypto withdrawals.
                </p>
              </div>
            )}

            {/* Withdrawal Form - Only show if assets available */}
            {!isLoading && !error && assets.length > 0 && (
              <>
                {/* Open Orders Warning */}
                {openOrdersData?.hasOpenOrders && openOrdersData.totalLockedByAsset[selectedAsset] > 0 && (
                  <Alert className="bg-warning/10 border-warning/30">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning-foreground">
                      <strong>Funds Locked in Orders:</strong> You have {openOrdersData.openOrdersCount} open order(s) 
                      locking {openOrdersData.totalLockedByAsset[selectedAsset]?.toFixed(4)} {selectedAsset}. 
                      Cancel orders to unlock funds for withdrawal.
                    </AlertDescription>
                  </Alert>
                )}

        {/* Asset Selection */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Select Asset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Asset
              </label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      {asset.symbol} - Balance: {asset.balance}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Network
              </label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentAsset?.networks.map((network) => (
                    <SelectItem key={network} value={network}>
                      {network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Details */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Withdrawal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Recipient Address
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter recipient address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`font-mono flex-1 ${
                    address && !addressValidation.isValid 
                      ? 'border-destructive focus-visible:ring-destructive' 
                      : address && addressValidation.isValid 
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : ''
                  }`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowScanner(true)}
                  className="shrink-0"
                  aria-label="Scan QR Code"
                >
                  <ScanLine className="h-5 w-5" />
                </Button>
              </div>
              {address && addressValidation.error && (
                <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                  <XCircle className="w-3 h-3" />
                  {addressValidation.error}
                </div>
              )}
              {address && addressValidation.isValid && (
                <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Valid {selectedNetwork} address
                </div>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Amount
              </label>
              <div className="flex space-x-2">
                <Input
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  step="any"
                />
                <Button 
                  variant="outline" 
                  onClick={() => setAmount(currentAsset?.balance || "")}
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available: {currentAsset?.balance} {selectedAsset}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Fee Breakdown */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">Fee Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {feesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Calculating fees...</span>
              </div>
            ) : withdrawalFees ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="font-medium">{withdrawalFees.networkFee} {selectedAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="font-medium">{withdrawalFees.platformFee} {selectedAsset}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold">Total Fee</span>
                  <span className="font-semibold">{withdrawalFees.totalFee.toFixed(8)} {selectedAsset}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold text-primary">Net Amount</span>
                  <span className="font-semibold text-primary">
                    {amount && (parseFloat(amount) - withdrawalFees.totalFee).toFixed(8)} {selectedAsset}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  ⏱️ Estimated Time: {withdrawalFees.estimatedTime}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select asset and network to see fees</p>
            )}
          </CardContent>
        </Card>

        <Button 
          onClick={handleWithdraw} 
          className="w-full" 
          size="lg"
          disabled={!addressValidation.isValid || !amount || parseFloat(amount) <= 0}
        >
          Withdraw
        </Button>
              </>
            )}
              </TabsContent>

              <TabsContent value="inr">
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">INR Withdrawals</h3>
                  <p className="text-muted-foreground mb-4">
                    Withdraw your funds directly to your Indian bank account or UPI.
                  </p>
                  <Button 
                    onClick={() => navigate('/app-legacy/withdraw/inr')}
                    className="w-full"
                  >
                    Start INR Withdrawal
                  </Button>
                </div>
              </TabsContent>
        </Tabs>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(scannedAddress) => {
          setAddress(scannedAddress);
          toast({
            title: "Address Scanned",
            description: "Wallet address has been populated",
          });
        }}
      />
    </div>
  );
};

export default WithdrawScreen;