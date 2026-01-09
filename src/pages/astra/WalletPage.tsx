import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { Copy, ExternalLink, QrCode, Eye, EyeOff, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { QRCodeSVG } from "qrcode.react"
import { copyToClipboard } from "@/utils/clipboard"
import { AppShellGlass } from "@/components/astra/AppShellGlass"
import { BalanceCluster } from "@/components/astra/grid/BalanceCluster"
import { useWalletBalances } from "@/hooks/useWalletBalances"
import { useBep20Balances } from "@/hooks/useBep20Balances"
import { QuickActionsRibbon } from "@/components/astra/grid/QuickActionsRibbon"
import { useNavigation } from "@/hooks/useNavigation"
import BrandHeaderLogo from "@/components/brand/BrandHeaderLogo"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useWeb3 } from "@/contexts/Web3Context"
import { getStoredEvmAddress, ensureWalletAddressOnboarded, getExplorerUrl, formatAddress } from "@/lib/wallet/evmAddress"
import { useUsernameBackfill } from "@/hooks/useUsernameBackfill"
import { useDisplayName } from "@/hooks/useDisplayName"
import { PendingDepositsCard } from "@/components/astra/PendingDepositsCard"
import { NetworkBadge } from "@/components/wallet/NetworkBadge"
import { PortfolioSummaryCard } from "@/components/wallet/PortfolioSummaryCard"
import { getStoredWallet } from "@/utils/walletStorage"
import { useWalletIntegrity } from "@/lib/wallet/useWalletIntegrity"
import { WalletIntegrityBanner } from "@/components/wallet/WalletIntegrityBanner"

export function WalletPage() {
  const { navigate } = useNavigation()
  const { user } = useAuthUser()
  const { wallet } = useWeb3()
  const displayName = useDisplayName()
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [showAddress, setShowAddress] = useState(true)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [integrityDismissed, setIntegrityDismissed] = useState(false)
  
  // Check wallet integrity
  const walletIntegrity = useWalletIntegrity(user?.id || null)
  
  // Fetch real portfolio data (in-app balances)
  const { portfolio, loading: portfolioLoading } = useWalletBalances()
  
  // Fetch on-chain balances
  const { balances: onchainBalances, isLoading: onchainLoading } = useBep20Balances()
  
  // Calculate total on-chain USD value
  const onchainUsd = useMemo(() => {
    if (!onchainBalances || onchainBalances.length === 0) return 0
    return onchainBalances.reduce((total, bal) => total + (bal.onchainUsdValue || 0), 0)
  }, [onchainBalances])

  useUsernameBackfill(); // Backfill username if missing

  React.useEffect(() => {
    console.info('CLEAN_SLATE_APPLIED');
  }, []);

  // Fetch wallet address from profiles table
  useEffect(() => {
    const fetchWalletAddress = async () => {
      try {
        // If authenticated, prefer stored profile address
        if (user?.id) {
          let addr = await getStoredEvmAddress(user.id);
          
          // If no wallet found, user needs to complete onboarding
          if (!addr) {
            console.warn('[WALLET_PAGE] No wallet found for user');
          }
          
          if (addr) {
            setWalletAddress(addr);
            console.info('USR_WALLET_LINK_V3', { user: user.id, address: addr.slice(0, 8) + '...' });
            return;
          }
        }
        // Fallbacks for pre-auth/onboarding
        if (wallet?.address) {
          setWalletAddress(wallet.address);
          return;
        }
        
        // Try user-scoped local storage
        const userId = user?.id || null;
        const localWallet = getStoredWallet(userId);
        if (localWallet?.address) {
          setWalletAddress(localWallet.address);
          return;
        }
        
        // Legacy fallback for onboarding state
        try {
          const onboard = localStorage.getItem('ipg_onboarding_state');
          if (onboard) {
            const parsed = JSON.parse(onboard);
            const addr = parsed?.walletInfo?.address;
            if (addr) setWalletAddress(addr);
          }
        } catch {}
      } catch (error) {
        console.error('Error fetching wallet address:', error);
        if (wallet?.address) setWalletAddress(wallet.address);
      }
    };

    fetchWalletAddress();

    // Listen for EVM address updates
    const handleAddressUpdate = () => {
      fetchWalletAddress();
    };
    window.addEventListener('evm:address:updated', handleAddressUpdate);
    
    return () => {
      window.removeEventListener('evm:address:updated', handleAddressUpdate);
    };
  }, [user?.id, wallet?.address]);

  const handleCopyAddress = async () => {
    if (!walletAddress) {
      toast({
        title: "No Wallet",
        description: "No wallet address found",
        variant: "destructive",
      })
      return;
    }
    
    const success = await copyToClipboard(walletAddress)
    toast({
      title: success ? "Address Copied" : "Error",
      description: success ? "Wallet address copied to clipboard" : "Failed to copy address",
      variant: success ? "default" : "destructive",
    })
  }

  // Debug: wallet page context
  React.useEffect(() => {
    console.info('[WALLET_PAGE_RENDER]', {
      displayName,
      walletAddress: walletAddress ? walletAddress.slice(0, 6) + '...' : null,
      route: '/app/wallet',
    });
  }, [displayName, walletAddress]);

  const quickActions = [
    { 
      id: "deposit", 
      label: "Deposit", 
      icon: React.createElement('span', { className: "text-lg" }, "↓"),
      variant: "primary" as const,
      onPress: () => navigate("/app/wallet/deposit")
    },
    { 
      id: "withdraw", 
      label: "Withdraw", 
      icon: React.createElement('span', { className: "text-lg" }, "↑"),
      variant: "default" as const,
      onPress: () => navigate("/app/wallet/withdraw")
    },
    { 
      id: "swap", 
      label: "Swap", 
      icon: React.createElement('span', { className: "text-lg" }, "⇄"),
      variant: "default" as const,
      onPress: () => navigate("/app/swap")
    },
    { 
      id: "history", 
      label: "History", 
      icon: React.createElement('span', { className: "text-lg" }, "📋"),
      variant: "default" as const,
      onPress: () => navigate("/app/wallet/history")
    }
  ]

  const topBar = (
    <div className="flex items-center justify-between p-4">
      <BrandHeaderLogo size="medium" />
      <div className="text-center flex-1">
        <h1 className="font-bold text-lg text-foreground font-heading">{displayName}'s Wallet</h1>
        <p className="text-xs text-muted-foreground">Manage assets securely</p>
      </div>
      <div className="w-8" />
    </div>
  )

  return (
    <div className="space-y-6" data-testid="page-wallet" data-version="usr-wallet-link-v3">
        {/* Wallet Integrity Warning Banner */}
        {walletIntegrity.hasMismatch && !integrityDismissed && walletIntegrity.mismatchType && (
          <WalletIntegrityBanner
            mismatchType={walletIntegrity.mismatchType}
            profileWallet={walletIntegrity.profileWallet}
            backupWallet={walletIntegrity.backupWallet}
            bscWallet={walletIntegrity.bscWallet}
            onDismiss={walletIntegrity.mismatchType === 'profile_vs_bsc' ? () => setIntegrityDismissed(true) : undefined}
            onFixed={() => walletIntegrity.refetch()}
          />
        )}

        {/* Address Panel with Network Badge */}
        <div 
          className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 transition-all duration-220"
          data-testid="address-panel"
        >
          {/* Network Badge */}
          <NetworkBadge network="BINANCE SMART CHAIN" className="mb-4" />

          {/* Address Display */}
          <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Your EVM Address (BEP20/ERC20)</p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/app/wallet/onchain')}
                    className="h-7 px-2 text-xs"
                  >
                    <Wallet className="h-3.5 w-3.5 mr-1" />
                    On-chain
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddress(!showAddress)}
                    className="h-7 px-2"
                  >
                    {showAddress ? (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/40 backdrop-blur-sm rounded-xl p-3 border border-border/40">
                <p className="font-mono text-xs break-all text-foreground/90 leading-relaxed" data-testid="wallet-evm-address">
                  {showAddress ? (walletAddress || 'NO wallet connected') : '••••••••••••••••••••••••••••••••••'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="flex flex-col items-center gap-1 h-auto py-2 bg-background/60 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                  data-testid="wallet-copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Copy</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQrDialog(true)}
                  className="flex flex-col items-center gap-1 h-auto py-2 bg-background/60 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                  disabled={!walletAddress}
                  data-testid="wallet-qr"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">QR</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getExplorerUrl(walletAddress, 'bsc'), '_blank')}
                  className="flex flex-col items-center gap-1 h-auto py-2 bg-background/60 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                  disabled={!walletAddress}
                  data-testid="wallet-explorer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">BSC</span>
                </Button>
              </div>
            {!walletAddress && (
              <div className="pt-3 space-y-3">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm text-warning-foreground font-medium mb-2">
                    Wallet Setup Required
                  </p>
                  <p className="text-xs text-warning-foreground/80">
                    You need to create or import a wallet to use this feature. This is a one-time setup that creates your secure cryptocurrency wallet.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    localStorage.setItem('ipg_return_path', '/app/wallet');
                    navigate('/onboarding/wallet');
                  }}
                  className="w-full"
                  size="lg"
                >
                  Set Up Wallet Now
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Ribbon */}
        <QuickActionsRibbon actions={quickActions} />

        {/* Pending Deposits */}
        <PendingDepositsCard />

        {/* Portfolio Summary - Enhanced */}
        <PortfolioSummaryCard
          totalUsd={portfolio?.total_usd || 0}
          availableUsd={portfolio?.available_usd || 0}
          lockedUsd={portfolio?.locked_usd || 0}
          onchainUsd={onchainUsd}
          change24h={portfolio?.change_24h_percent || 0}
          loading={portfolioLoading || onchainLoading}
        />

      {/* Balance Cluster with Crypto Assets Grid */}
      <BalanceCluster />

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wallet QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {walletAddress && (
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={walletAddress}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center font-mono break-all px-4">
              {walletAddress}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
