import * as React from "react"
import { useState } from "react"
import { Copy, ExternalLink, QrCode, Eye, EyeOff, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { copyToClipboard } from "@/utils/clipboard"
import { useNavigation } from "@/hooks/useNavigation"
import { AppHeaderSticky } from "@/components/navigation/AppHeaderSticky"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { BalanceCluster } from "@/components/astra/grid/BalanceCluster"
import { CardLane } from "@/components/astra/CardLane"

const MOCK_WALLET_ADDRESS = "0x742d35Cc6135C5C8C91b8f54534d7134E6faE9A2"

export function WalletPageRebuilt() {
  const { navigate } = useNavigation()
  const [showAddress, setShowAddress] = useState(false)
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)

  const handleCopyAddress = async () => {
    const success = await copyToClipboard(MOCK_WALLET_ADDRESS)
    toast({
      title: success ? "Address Copied" : "Error",
      description: success ? "Wallet address copied to clipboard" : "Failed to copy address",
      variant: success ? "default" : "destructive",
    })
  }

  const shortcuts = [
    { 
      id: "deposit", 
      label: "Deposit", 
      icon: <Plus className="h-5 w-5" />, 
      color: "bg-success/10 text-success",
      onPress: () => navigate("/app/deposit")
    },
    { 
      id: "withdraw", 
      label: "Withdraw", 
      icon: <ExternalLink className="h-5 w-5" />, 
      color: "bg-warning/10 text-warning",
      onPress: () => navigate("/app/withdraw")
    },
    { 
      id: "swap", 
      label: "Swap", 
      icon: <Copy className="h-5 w-5" />, 
      color: "bg-accent/10 text-accent",
      onPress: () => navigate("/app/swap")
    },
    { 
      id: "send", 
      label: "Send", 
      icon: <ExternalLink className="h-5 w-5" />, 
      color: "bg-primary/10 text-primary",
      onPress: () => navigate("/app/send")
    }
  ]

  const handleQuickSwitchAction = (action: string) => {
    switch (action) {
      case "deposit": navigate("/app/deposit"); break
      case "convert": navigate("/app/swap"); break
      case "trade": navigate("/app/trade"); break
      case "programs": navigate("/app/programs"); break
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24" data-testid="page-wallet">
      {/* Header */}
      <AppHeaderSticky
        title="My Wallet"
        subtitle="Manage assets securely"
        onProfileClick={() => navigate("/app/profile")}
        onNotificationsClick={() => navigate("/app/notifications")}
      />

      {/* Main Content */}
      <div className="space-y-6 pt-4">
        {/* Address Panel */}
        <div 
          className="mx-4 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 transition-all duration-[220ms]"
          data-testid="address-panel"
        >
          {/* Network Pill */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
            <span className="text-xs font-bold text-warning tracking-wide font-heading">BINANCE SMART CHAIN</span>
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
              <p className="font-mono text-sm break-all text-foreground tabular-nums">
                {showAddress ? MOCK_WALLET_ADDRESS : "••••••••••••••••••••••••••••••••••••••••"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAddress}
                className="border-accent/30 text-accent hover:bg-accent/10"
                disabled={!showAddress}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-accent/30 text-accent hover:bg-accent/10"
              >
                <QrCode className="h-3 w-3 mr-1" />
                QR
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://bscscan.com/address/${MOCK_WALLET_ADDRESS}`, '_blank')}
                className="border-accent/30 text-accent hover:bg-accent/10"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Scan
              </Button>
            </div>
          </div>
        </div>

        {/* Shortcuts Lane */}
        <CardLane title="Shortcuts" enableParallax={false}>
          {shortcuts.map((shortcut) => (
            <div key={shortcut.id} className="w-28">
              <button
                onClick={shortcut.onPress}
                className="w-full h-28 rounded-2xl bg-card/50 border border-border/40 hover:bg-card hover:border-primary/30 hover:scale-105 transition-all duration-[120ms] flex flex-col items-center justify-center gap-3"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${shortcut.color}`}>
                  {shortcut.icon}
                </div>
                <span className="text-xs font-semibold text-foreground font-heading">{shortcut.label}</span>
              </button>
            </div>
          ))}
        </CardLane>

        {/* Balance Cluster (strict order: Withdrawable → Holding → Crypto grid) */}
        <div className="px-4">
          <BalanceCluster />
        </div>
      </div>

      {/* Bottom Navigation */}
      <DockNav
        onNavigate={navigate}
        onCenterPress={() => setShowQuickSwitch(true)}
      />

      {/* Quick Switch */}
      <QuickSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        onAction={handleQuickSwitchAction}
      />
    </div>
  )
}
