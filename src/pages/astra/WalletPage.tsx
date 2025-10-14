import * as React from "react"
import { useState, useEffect } from "react"
import { Copy, ExternalLink, QrCode, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { QRCodeSVG } from "qrcode.react"
import { copyToClipboard } from "@/utils/clipboard"
import { AppShellGlass } from "@/components/astra/AppShellGlass"
import { BalanceCluster } from "@/components/astra/BalanceCluster"
import { QuickActionsRibbon } from "@/components/astra/grid/QuickActionsRibbon"
import { useNavigation } from "@/hooks/useNavigation"
import BrandHeaderLogo from "@/components/brand/BrandHeaderLogo"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useWeb3 } from "@/contexts/Web3Context"
import { getStoredEvmAddress, ensureWalletAddressOnboarded, getExplorerUrl, formatAddress } from "@/lib/wallet/evmAddress"
import { useUsernameBackfill } from "@/hooks/useUsernameBackfill"
import { useDisplayName } from "@/hooks/useDisplayName"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp"

export function WalletPage() {
  const [showQuickSwitch, setShowQuickSwitch] = React.useState(false)
  const { navigate } = useNavigation()
  const { user } = useAuthUser()
  const { wallet } = useWeb3()
  const displayName = useDisplayName()
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [showAddress, setShowAddress] = useState(true)
  const [showQrDialog, setShowQrDialog] = useState(false)

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
          const addr = await getStoredEvmAddress(user.id);
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
        try {
          const local = localStorage.getItem('cryptoflow_wallet');
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed?.address) setWalletAddress(parsed.address);
            return;
          }
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
      id: "send", 
      label: "Send", 
      icon: React.createElement('span', { className: "text-lg" }, "→"),
      variant: "default" as const,
      onPress: () => navigate("/app/wallet/send")
    },
    { 
      id: "swap", 
      label: "Swap", 
      icon: React.createElement('span', { className: "text-lg" }, "⇄"),
      variant: "default" as const,
      onPress: () => navigate("/app/swap")
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
    <>
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/40 -mx-4 -mt-4 mb-6">
        {topBar}
      </div>

      {/* Main Content */}
      <div className="space-y-6" data-testid="page-wallet" data-version="usr-wallet-link-v3">
        {/* Address Panel with Network Badge */}
        <div 
          className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 transition-all duration-220"
          data-testid="address-panel"
        >
          {/* Network Pill */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-warning tracking-wide">BINANCE SMART CHAIN</span>
          </div>

          {/* Address Display */}
          <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Your EVM Address (BEP20/ERC20)</p>
                <div className="flex items-center gap-1">
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
              <div className="pt-3">
                <Button
                  onClick={async () => {
                    try {
                      const addr = await ensureWalletAddressOnboarded();
                      setWalletAddress(addr);
                      toast({ title: 'Wallet Created', description: 'Your EVM address is ready' });
                    } catch (e) {
                      toast({ title: 'Wallet setup required', description: 'Please complete wallet onboarding', variant: 'destructive' });
                    }
                  }}
                >
                  Create Wallet
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Ribbon */}
        <QuickActionsRibbon actions={quickActions} />

        {/* Balance Cluster with Crypto Assets Grid */}
        <BalanceCluster />
      </div>

      {/* Quick Switch Radial Menu */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={(action) => {
          switch (action) {
            case "deposit":
              navigate("/app/wallet/deposit")
              break
            case "convert":
              navigate("/app/swap")
              break
            case "trade":
              navigate("/app/trade")
              break
            case "programs":
              navigate("/app/programs")
              break
          }
        }}
      />
      {/* WhatsApp Support - Fixed above footer */}
      <SupportLinkWhatsApp variant="fab" className="fixed bottom-24 right-5 z-[60]" />

      {/* Sticky Footer Navigation */}
      <DockNav onNavigate={(path) => navigate(path)} onCenterPress={() => setShowQuickSwitch(true)} />

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
    </>
  )
}
