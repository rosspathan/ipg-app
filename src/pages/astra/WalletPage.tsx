import * as React from "react"
import { Copy, ExternalLink, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { copyToClipboard } from "@/utils/clipboard"
import { SectionHeader } from "@/components/astra/SectionHeader"
import { BalanceCluster } from "@/components/astra/grid/BalanceCluster"
import { AstraCard } from "@/components/astra/AstraCard"
import { useNavigation } from "@/hooks/useNavigation"
import ipgLogo from "@/assets/ipg-logo.jpg"

// Mock wallet address
const MOCK_WALLET_ADDRESS = "0x742d35Cc6135C5C8C91b8f54534d7134E6faE9A2"

export function WalletPage() {
  const { navigate } = useNavigation()

  const handleCopyAddress = async () => {
    const success = await copyToClipboard(MOCK_WALLET_ADDRESS)
    
    if (success) {
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to copy address",
        variant: "destructive",
      })
    }
  }

  const handleViewOnExplorer = () => {
    const explorerUrl = `https://bscscan.com/address/${MOCK_WALLET_ADDRESS}`
    window.open(explorerUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="p-4 space-y-6" data-testid="page-wallet">
      {/* Header with IPG Logo */}
      <div className="flex items-center gap-3 mb-6">
        <img 
          src={ipgLogo} 
          alt="IPG I-SMART Logo" 
          className="w-10 h-10 object-contain rounded-lg"
        />
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Wallet</h1>
          <p className="text-sm text-muted-foreground">Manage your digital assets</p>
        </div>
      </div>

      {/* Wallet Address Panel */}
      <AstraCard variant="glass" data-testid="address-panel">
        <div className="p-6">
          <SectionHeader
            title="Wallet Address"
            subtitle="BSC Network"
            className="mb-4"
          />
          
          <div className="space-y-4">
            {/* Network Badge */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-warning rounded-full"></div>
              <span className="text-sm font-medium text-warning">Binance Smart Chain (BSC)</span>
            </div>
            
            {/* Address Display */}
            <div className="bg-background-secondary/50 border border-border-subtle rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-text-secondary">Your Wallet Address</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="h-8 px-2 text-accent hover:bg-accent/10"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              
              <p className="font-mono text-sm break-all text-text-primary">
                {MOCK_WALLET_ADDRESS}
              </p>
            </div>
            
            {/* Explorer Link */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewOnExplorer}
              className="w-full justify-center border-accent/30 text-accent hover:bg-accent/10"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on BSCScan
            </Button>
          </div>
        </div>
      </AstraCard>

      {/* Balance Cluster - Three BSK/Crypto Cards */}
      <BalanceCluster />

      {/* Quick Tips */}
      <AstraCard variant="elevated">
        <div className="p-6">
          <SectionHeader
            title="Wallet Tips"
            subtitle="Keep your assets safe"
            className="mb-4"
          />
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-accent/5 rounded-lg border border-accent/20">
              <Eye className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-accent">BSK Balance Types</h4>
                <p className="text-xs text-text-secondary mt-1">
                  Withdrawable BSK can be transferred or withdrawn. Holding BSK comes from rewards and cannot be withdrawn.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
              <ExternalLink className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-warning">Network Fees</h4>
                <p className="text-xs text-text-secondary mt-1">
                  All transactions on BSC require BNB for gas fees. Keep some BNB in your wallet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AstraCard>
    </div>
  )
}