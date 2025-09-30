import * as React from "react"
import { useState } from "react"
import { Copy, ExternalLink, QrCode, Eye, EyeOff, ArrowDownUp, ArrowUpRight, ArrowLeftRight, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { copyToClipboard } from "@/utils/clipboard"
import { useNavigation } from "@/hooks/useNavigation"
import { DockNav } from "@/components/navigation/DockNav"
import { QuickSwitch } from "@/components/astra/QuickSwitch"
import { BalanceCluster } from "@/components/astra/grid/BalanceCluster"
import QRCode from "qrcode"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const MOCK_WALLET_ADDRESS = "0x742d35Cc6135C5C8C91b8f54534d7134E6faE9A2"

export function WalletPageRebuilt() {
  const { navigate } = useNavigation()
  const [showAddress, setShowAddress] = useState(false)
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [qrLoading, setQrLoading] = useState(false)

  const handleCopyAddress = async () => {
    const success = await copyToClipboard(MOCK_WALLET_ADDRESS)
    toast({
      title: success ? "Address Copied" : "Error",
      description: success ? "Wallet address copied to clipboard" : "Failed to copy address",
      variant: success ? "default" : "destructive",
    })
  }

  const openQR = async () => {
    try {
      setQrLoading(true)
      setShowQR(true)
      const dataUrl = await QRCode.toDataURL(MOCK_WALLET_ADDRESS, {
        width: 512,
        margin: 1,
        color: { dark: "#000000", light: "#FFFFFF" }
      })
      setQrDataUrl(dataUrl)
    } catch (e) {
      console.error("QR generation failed", e)
      toast({ title: "QR Error", description: "Could not generate QR code", variant: "destructive" })
    } finally {
      setQrLoading(false)
    }
  }

  const shortcuts = [
    { 
      id: "deposit", 
      label: "Deposit", 
      icon: <ArrowDownUp className="h-6 w-6" />, 
      color: "bg-success/20 text-success border border-success/30",
      onPress: () => navigate("/app-legacy/wallet/deposit")
    },
    { 
      id: "withdraw", 
      label: "Withdraw", 
      icon: <ArrowUpRight className="h-6 w-6" />, 
      color: "bg-warning/20 text-warning border border-warning/30",
      onPress: () => navigate("/app-legacy/wallet/withdraw")
    },
    { 
      id: "swap", 
      label: "Swap", 
      icon: <ArrowLeftRight className="h-6 w-6" />, 
      color: "bg-accent/20 text-accent border border-accent/30",
      onPress: () => navigate("/app-legacy/swap")
    },
    { 
      id: "send", 
      label: "Send", 
      icon: <Send className="h-6 w-6" />, 
      color: "bg-primary/20 text-primary border border-primary/30",
      onPress: () => navigate("/app-legacy/wallet/send")
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
    <div className="min-h-screen bg-background pb-32" data-testid="page-wallet">
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

            {/* Action Buttons - Larger, more visible */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={handleCopyAddress}
                className="flex flex-col items-center gap-2 h-20 border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 transition-all duration-[120ms]"
                disabled={!showAddress}
              >
                <Copy className="h-5 w-5" />
                <span className="text-xs font-semibold font-heading">Copy</span>
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={openQR}
                className="flex flex-col items-center gap-2 h-20 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-[120ms]"
              >
                <QrCode className="h-5 w-5" />
                <span className="text-xs font-semibold font-heading">QR Code</span>
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => window.open(`https://bscscan.com/address/${MOCK_WALLET_ADDRESS}`, '_blank')}
                className="flex flex-col items-center gap-2 h-20 border-warning/30 text-warning hover:bg-warning/10 hover:border-warning/50 transition-all duration-[120ms]"
              >
                <ExternalLink className="h-5 w-5" />
                <span className="text-xs font-semibold font-heading">Explorer</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Shortcuts - Redesigned for mobile with proper touch targets */}
        <div className="px-4 space-y-3">
          <h2 className="font-heading text-lg font-bold text-foreground">Quick Actions</h2>
          
          <div className="grid grid-cols-2 gap-3">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                onClick={shortcut.onPress}
                className={`
                  relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl
                  bg-card/50 border border-border/40
                  hover:bg-card hover:border-primary/30 hover:scale-[1.02]
                  active:scale-95
                  transition-all duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]
                  min-h-[120px]
                `}
              >
                {/* Icon container with gradient background */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${shortcut.color}`}>
                  {React.cloneElement(shortcut.icon as React.ReactElement, { className: "h-7 w-7" })}
                </div>
                
                {/* Label */}
                <span className="text-sm font-bold text-foreground font-heading">
                  {shortcut.label}
                </span>

                {/* Subtle glow on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-[220ms] pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.1), transparent 70%)'
                  }}
                />
              </button>
            ))}
          </div>
        </div>

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

      {/* QR Modal */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-[380px] bg-card/90 backdrop-blur-xl border border-border/40">
          <DialogHeader>
            <DialogTitle className="font-heading">Receive via QR</DialogTitle>
            <DialogDescription className="text-xs">Scan this code to receive assets to your BSC address</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {qrLoading ? (
              <div className="w-56 h-56 rounded-xl bg-border/40 animate-pulse" />
            ) : (
              <img src={qrDataUrl} alt="Wallet Address QR Code" className="w-56 h-56 rounded-xl bg-background p-2" />
            )}
            <p className="font-mono text-xs break-all text-center text-muted-foreground">{MOCK_WALLET_ADDRESS}</p>
            <Button size="sm" variant="secondary" onClick={handleCopyAddress}>Copy Address</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
