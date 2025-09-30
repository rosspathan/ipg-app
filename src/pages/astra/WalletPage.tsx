import * as React from "react"
import { Copy, ExternalLink, QrCode, Eye, EyeOff, ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { copyToClipboard } from "@/utils/clipboard"
import { AppShellGlass } from "@/components/astra/AppShellGlass"
import { BalanceCluster } from "@/components/astra/BalanceCluster"
import { QuickActionsRibbon } from "@/components/astra/grid/QuickActionsRibbon"
import { useNavigation } from "@/hooks/useNavigation"
import BrandHeaderLogo from "@/components/brand/BrandHeaderLogo"

const MOCK_WALLET_ADDRESS = "0x742d35Cc6135C5C8C91b8f54534d7134E6faE9A2"

export function WalletPage() {
  const { navigate } = useNavigation()
  const [showAddress, setShowAddress] = React.useState(false)

  const handleCopyAddress = async () => {
    const success = await copyToClipboard(MOCK_WALLET_ADDRESS)
    toast({
      title: success ? "Address Copied" : "Error",
      description: success ? "Wallet address copied to clipboard" : "Failed to copy address",
      variant: success ? "default" : "destructive",
    })
  }

  const quickActions = [
    { 
      id: "deposit", 
      label: "Deposit", 
      icon: <Plus className="h-4 w-4" />, 
      variant: "primary" as const,
      onPress: () => navigate("/app-legacy/wallet/deposit")
    },
    { 
      id: "withdraw", 
      label: "Withdraw", 
      icon: <Copy className="h-4 w-4" />, 
      variant: "default" as const,
      onPress: () => navigate("/app-legacy/wallet/withdraw")
    },
    { 
      id: "send", 
      label: "Send", 
      icon: <ExternalLink className="h-4 w-4" />, 
      variant: "default" as const,
      onPress: () => navigate("/app-legacy/wallet/send")
    },
    { 
      id: "swap", 
      label: "Swap", 
      icon: <ChevronDown className="h-4 w-4" />, 
      variant: "default" as const,
      onPress: () => navigate("/app-legacy/swap")
    }
  ]

  const topBar = (
    <div className="flex items-center justify-between p-4">
      <BrandHeaderLogo size="medium" />
      <div className="text-center flex-1">
        <h1 className="font-bold text-lg text-foreground font-heading">My Wallet</h1>
        <p className="text-xs text-muted-foreground">Manage assets securely</p>
      </div>
      <div className="w-8" />
    </div>
  )

  return (
    <AppShellGlass topBar={topBar} data-testid="page-wallet">
      <div className="space-y-6 pb-24">
        {/* Address Panel with Network Badge */}
        <div 
          className="mx-4 mt-4 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 transition-all duration-220"
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
              <span className="text-sm text-muted-foreground">Your Wallet Address</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddress(!showAddress)}
                className="h-6 px-2 text-xs"
              >
                {showAddress ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>

            <div className="bg-background/50 rounded-xl p-4 border border-border/30">
              <p className="font-mono text-sm break-all text-foreground">
                {showAddress ? MOCK_WALLET_ADDRESS : "••••••••••••••••••••••••••••••••••••••••"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAddress}
                className="flex-1 border-accent/30 text-accent hover:bg-accent/10"
                disabled={!showAddress}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-accent/30 text-accent hover:bg-accent/10"
              >
                <QrCode className="h-3 w-3 mr-1" />
                QR
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://bscscan.com/address/${MOCK_WALLET_ADDRESS}`, '_blank')}
                className="flex-1 border-accent/30 text-accent hover:bg-accent/10"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Explorer
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions Ribbon */}
        <div className="px-4">
          <QuickActionsRibbon actions={quickActions} />
        </div>

        {/* Balance Cluster with Crypto Assets Grid */}
        <div className="px-4">
          <BalanceCluster />
        </div>
      </div>
    </AppShellGlass>
  )
}