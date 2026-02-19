import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { Copy, ExternalLink, QrCode, Eye, EyeOff, Wallet, ArrowLeftRight, Lock, Search, RefreshCw, ArrowRight, ChevronDown, ChevronUp, ChevronRight, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { QRCodeSVG } from "qrcode.react"
import { copyToClipboard } from "@/utils/clipboard"
import { useWalletBalances } from "@/hooks/useWalletBalances"
import { useBep20Balances } from "@/hooks/useBep20Balances"
import { useTradingBalances } from "@/hooks/useTradingBalances"
import { useNavigation } from "@/hooks/useNavigation"
import { useAuthUser } from "@/hooks/useAuthUser"
import { useWeb3 } from "@/contexts/Web3Context"
import { getStoredEvmAddress, getExplorerUrl, formatAddress } from "@/lib/wallet/evmAddress"
import { useUsernameBackfill } from "@/hooks/useUsernameBackfill"
import { useDisplayName } from "@/hooks/useDisplayName"
import { PendingDepositsCard } from "@/components/astra/PendingDepositsCard"
import { getStoredWallet } from "@/utils/walletStorage"
import { useWalletIntegrity } from "@/lib/wallet/useWalletIntegrity"
import { WalletIntegrityBanner } from "@/components/wallet/WalletIntegrityBanner"
import { useOnchainBalances } from "@/hooks/useOnchainBalances"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import AssetLogo from "@/components/AssetLogo"
import { formatCurrency } from "@/utils/formatters"
import { cn } from "@/lib/utils"
import { useTradingPairs } from "@/hooks/useTradingPairs"

// Compact Markets Preview for Wallet page
function MarketsPreview({ navigate }: { navigate: (path: string) => void }) {
  const { data: tradingPairs } = useTradingPairs()
  return (
    <div className="px-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-foreground/75">Markets</h2>
        <button onClick={() => navigate("/app/trade")} className="text-[12px] font-medium flex items-center gap-1 text-accent">
          View All <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="rounded-xl overflow-hidden bg-card/80 border border-border/50">
        {(tradingPairs || []).map((pair, i) => {
          const isUp = pair.change24h >= 0
          return (
            <div key={pair.id}>
              <button
                onClick={() => navigate(`/app/trade/${pair.symbol.replace('/', '_')}`)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-foreground">
                    {pair.baseAsset}<span className="text-muted-foreground">/{pair.quoteAsset}</span>
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Vol ${pair.volume24h >= 1000 ? `${(pair.volume24h / 1000).toFixed(1)}K` : pair.volume24h.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[13px] font-mono font-semibold tabular-nums text-foreground">
                    ${pair.price >= 1 ? pair.price.toFixed(2) : pair.price.toFixed(4)}
                  </p>
                  <div
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold min-w-[72px] justify-center",
                      isUp ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    )}
                  >
                    {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {isUp ? '+' : ''}{pair.change24h.toFixed(2)}%
                  </div>
                </div>
              </button>
              {i < (tradingPairs || []).length - 1 && (
                <div className="mx-4 h-px bg-border/30" />
              )}
            </div>
          )
        })}
        {(!tradingPairs || tradingPairs.length === 0) && (
          <div className="text-center py-8 text-[12px] text-muted-foreground">Loading markets...</div>
        )}
      </div>
    </div>
  )
}

export function WalletPage() {
  const { navigate } = useNavigation()
  const { user } = useAuthUser()
  const { wallet } = useWeb3()
  const displayName = useDisplayName()
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [showAddress, setShowAddress] = useState(true)
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem('ipg_hide_balance') === 'true')
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [integrityDismissed, setIntegrityDismissed] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [assetsExpanded, setAssetsExpanded] = useState(true)

  const walletIntegrity = useWalletIntegrity(user?.id || null)
  const { portfolio, loading: portfolioLoading } = useWalletBalances()
  const { balances: onchainBalances, isLoading: onchainLoading, refetch: refetchOnchain } = useOnchainBalances()
  const { data: tradingBalances, isLoading: tradingLoading } = useTradingBalances()

  const { balances: bep20Balances } = useBep20Balances()
  const onchainUsd = useMemo(() => {
    if (!bep20Balances || bep20Balances.length === 0) return 0
    return bep20Balances.reduce((total, bal) => total + (bal.onchainUsdValue || 0), 0)
  }, [bep20Balances])
  const activeTradingBalances = useMemo(() => 
    (tradingBalances || []).filter(b => b.balance > 0.000001), [tradingBalances])
  const tradingTotalUsd = useMemo(() => 
    activeTradingBalances.reduce((sum, b) => sum + (b.usd_value || 0), 0), [activeTradingBalances])

  const filteredAssets = useMemo(() => 
    onchainBalances
      .filter(a => a.symbol !== 'INR' && a.balance > 0)
      .filter(a => !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.symbol.toLowerCase().includes(searchTerm.toLowerCase())),
    [onchainBalances, searchTerm])

  useUsernameBackfill()

  useEffect(() => {
    const fetchWalletAddress = async () => {
      try {
        if (user?.id) {
          const addr = await getStoredEvmAddress(user.id)
          if (addr) { setWalletAddress(addr); return }
        }
        if (wallet?.address) { setWalletAddress(wallet.address); return }
        const userId = user?.id || null
        const localWallet = getStoredWallet(userId)
        if (localWallet?.address) { setWalletAddress(localWallet.address); return }
        try {
          const onboard = localStorage.getItem('ipg_onboarding_state')
          if (onboard) {
            const parsed = JSON.parse(onboard)
            if (parsed?.walletInfo?.address) setWalletAddress(parsed.walletInfo.address)
          }
        } catch {}
      } catch (error) {
        console.error('Error fetching wallet address:', error)
        if (wallet?.address) setWalletAddress(wallet.address)
      }
    }
    fetchWalletAddress()
    const handleAddressUpdate = () => fetchWalletAddress()
    window.addEventListener('evm:address:updated', handleAddressUpdate)
    return () => window.removeEventListener('evm:address:updated', handleAddressUpdate)
  }, [user?.id, wallet?.address])

  const handleCopyAddress = async () => {
    if (!walletAddress) {
      toast({ title: "No Wallet", description: "No wallet address found", variant: "destructive" })
      return
    }
    const success = await copyToClipboard(walletAddress)
    toast({
      title: success ? "Address Copied" : "Error",
      description: success ? "Wallet address copied to clipboard" : "Failed to copy address",
      variant: success ? "default" : "destructive",
    })
  }

  const totalUsd = (portfolio?.total_usd || 0) + onchainUsd

  return (
    <div className="space-y-6 pb-32 bg-background min-h-screen" data-testid="page-wallet">

      {/* Integrity Banner */}
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

      {/* ── 1. PORTFOLIO SUMMARY (On-Chain Balance) ── */}
      <div className="px-4 pt-4">
        <div className="p-5 rounded-xl space-y-4 bg-card/80 border border-accent/12 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">On-Chain Balance</p>
            <button
              onClick={() => {
                const next = !hideBalance
                setHideBalance(next)
                localStorage.setItem('ipg_hide_balance', String(next))
              }}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200",
                "bg-accent/10 hover:bg-accent/20 active:scale-90",
                "border border-accent/20 hover:border-accent/40",
                "shadow-[0_0_12px_hsl(var(--accent)/0.08)] hover:shadow-[0_0_16px_hsl(var(--accent)/0.15)]"
              )}
              aria-label={hideBalance ? "Show balance" : "Hide balance"}
            >
              {hideBalance
                ? <Eye className="h-3.5 w-3.5 text-accent" />
                : <EyeOff className="h-3.5 w-3.5 text-accent" />
              }
            </button>
          </div>
          
          <div className="relative">
            <p className="text-[28px] font-bold tabular-nums text-foreground font-heading">
              {portfolioLoading || onchainLoading ? '...' : hideBalance ? '••••••' : formatCurrency(portfolio?.total_usd || 0)}
            </p>
            <div className="absolute -inset-6 rounded-full opacity-[0.06] pointer-events-none bg-[radial-gradient(circle,hsl(var(--accent))_0%,transparent_70%)]" />
          </div>

          <div className="h-px bg-border/30" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md flex items-center justify-center bg-accent/12">
                  <Wallet className="h-3 w-3 text-accent" />
                </div>
                <span className="text-[12px] font-medium text-muted-foreground">Available</span>
              </div>
              <span className="text-[14px] font-bold tabular-nums text-accent">
                {hideBalance ? '••••••' : formatCurrency(portfolio?.available_usd || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md flex items-center justify-center bg-warning/12">
                  <Lock className="h-3 w-3 text-warning" />
                </div>
                <span className="text-[12px] font-medium text-muted-foreground">In Orders</span>
              </div>
              <span className="text-[14px] font-bold tabular-nums text-warning">
                {hideBalance ? '••••••' : formatCurrency(portfolio?.locked_usd || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. ACTION GRID ── */}
      <div className="px-4 grid grid-cols-4 gap-2">
        {[
          { label: "Deposit", icon: "↓", route: "/app/wallet/deposit" },
          { label: "Withdraw", icon: "↑", route: "/app/wallet/withdraw" },
          { label: "Swap", icon: "⇄", route: "/app/swap" },
          { label: "History", icon: "📋", route: "/app/home/history" },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.route)}
            className="flex flex-col items-center gap-2 py-4 rounded-xl transition-colors bg-card/80 border border-border/50"
          >
            <span className="text-lg">{a.icon}</span>
            <span className="text-[11px] font-semibold text-foreground">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── 3. HEADER / ADDRESS (Binance Smart Chain) ── */}
      <div className="px-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-warning" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-warning">
            Binance Smart Chain
          </span>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground">
          EVM Address (BEP20/ERC20)
        </p>

        <div className="w-full overflow-x-auto scrollbar-hide rounded-lg px-3 py-2.5 bg-muted/50 border border-border/50">
          <p className="font-mono text-[12px] whitespace-nowrap tabular-nums text-foreground" data-testid="wallet-evm-address">
            {showAddress ? (walletAddress || 'No wallet connected') : '••••••••••••••••••••••••••••••••••••••••'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleCopyAddress} className="p-2 rounded-lg bg-muted/50 border border-border/50">
            <Copy className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => setShowQrDialog(true)} disabled={!walletAddress} className="p-2 rounded-lg bg-muted/50 border border-border/50">
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => setShowAddress(!showAddress)} className="p-2 rounded-lg bg-muted/50 border border-border/50">
            {showAddress ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Explorer + On-chain links */}
        <div className="flex gap-2">
          <button
            onClick={() => window.open(getExplorerUrl(walletAddress, 'bsc'), '_blank')}
            disabled={!walletAddress}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-accent"
          >
            <ExternalLink className="h-3 w-3" /> BSCScan
          </button>
          <button
            onClick={() => navigate('/app/wallet/onchain')}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground"
          >
            <Wallet className="h-3 w-3" /> On-chain View
          </button>
        </div>

        {!walletAddress && (
          <div className="p-4 rounded-xl space-y-3 bg-warning/8 border border-warning/20">
            <p className="text-[13px] font-semibold text-warning">Wallet Setup Required</p>
            <p className="text-[11px] text-muted-foreground">Create or import a wallet to use this feature.</p>
            <button
              onClick={() => { localStorage.setItem('ipg_return_path', '/app/wallet'); navigate('/onboarding/wallet') }}
              className="w-full h-10 rounded-xl text-[13px] font-semibold bg-accent text-accent-foreground"
            >
              Set Up Wallet Now
            </button>
          </div>
        )}
      </div>

      {/* ── 4. ASSET LIST ── */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-foreground/75">On-Chain Assets</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => refetchOnchain()} className="p-2 rounded-lg relative z-10 bg-muted/50">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => setAssetsExpanded(!assetsExpanded)} className="p-2 rounded-lg relative z-10 bg-muted/50">
              {assetsExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {assetsExpanded && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[38px] pl-9 pr-3 rounded-lg text-[12px] outline-none bg-muted/50 border border-border/50 text-foreground"
              />
            </div>

            {onchainLoading ? (
              <div className="text-center py-8 text-[12px] text-muted-foreground">Loading...</div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-muted-foreground">
                {searchTerm ? "No assets found" : "No on-chain balances"}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden bg-card/80 border border-border/50">
                {filteredAssets.map((asset, i) => (
                  <div key={asset.symbol}>
                    <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30" style={{ height: '64px' }}>
                      <div className="flex items-center gap-3">
                        <AssetLogo symbol={asset.symbol} logoUrl={asset.logoUrl} size="sm" />
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">{asset.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-accent/8 text-accent border border-accent/15">
                              {asset.network || 'BSC'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-mono font-semibold tabular-nums text-foreground">
                          {asset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </p>
                        <p className="text-[10px] font-mono tabular-nums text-muted-foreground">
                          {asset.symbol}
                        </p>
                      </div>
                    </div>
                    {i < filteredAssets.length - 1 && (
                      <div className="mx-4 h-px bg-border/30" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 5. TRADING BALANCES ── */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-foreground/75">Trading Balances</h2>
            {tradingTotalUsd > 0 && (
              <p className="text-[11px] mt-0.5 text-muted-foreground">
                Total: <span className="font-semibold text-foreground">${tradingTotalUsd.toFixed(2)}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/app/wallet/transfer')}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold bg-accent/8 border border-accent/15 text-accent"
          >
            <ArrowLeftRight className="h-3 w-3" /> Transfer
          </button>
        </div>

        {tradingLoading ? (
          <div className="text-center py-6 text-[12px] text-muted-foreground">Loading...</div>
        ) : activeTradingBalances.length === 0 ? (
          <div className="text-center py-8 text-[12px] text-muted-foreground">
            No trading balances
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden bg-card/80 border border-border/50">
            {activeTradingBalances.map((asset, i) => (
              <div key={asset.symbol}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                    <span className="text-[13px] font-semibold text-foreground">{asset.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-mono font-semibold tabular-nums text-foreground">
                      {asset.available.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                    {asset.locked > 0.000001 && (
                      <p className="text-[10px] font-mono tabular-nums text-warning">
                        +{asset.locked.toFixed(4)} locked
                      </p>
                    )}
                  </div>
                </div>
                {i < activeTradingBalances.length - 1 && (
                  <div className="mx-4 h-px bg-border/30" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 6. USDI LOAN ── */}
      <div className="px-4">
        <button
          onClick={() => navigate("/app/wallet/loan")}
          className="w-full p-4 rounded-xl text-left space-y-3 group bg-card/80 border border-accent/12"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-accent/10">
                <Lock className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">USDI Loan</p>
                <p className="text-[10px] text-muted-foreground">Collateral-backed</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-[10px] font-semibold text-accent">Active</span>
            </div>
          </div>

          <div className="flex gap-2">
            {["200% Collateral", "2% Fee", "Unlock Anytime"].map((tag) => (
              <span key={tag} className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted/50 border border-border/50 text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <span className="text-[11px] text-muted-foreground">Lock BSK → Get USDI</span>
            <span className="text-[12px] font-semibold flex items-center gap-1 text-accent">
              Apply Now <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </button>
      </div>

      {/* ── MARKETS PREVIEW ── */}
      <MarketsPreview navigate={navigate} />

      {/* ── 7. PENDING DEPOSITS ── */}
      <PendingDepositsCard />

      {/* QR Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-center text-foreground">Wallet QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            {walletAddress && (
              <div className="bg-white p-5 rounded-2xl">
                <QRCodeSVG value={walletAddress} size={220} level="H" includeMargin />
              </div>
            )}
            <p className="text-[11px] text-center font-mono break-all px-6 text-muted-foreground">
              {walletAddress}
            </p>
            <button onClick={handleCopyAddress} className="h-10 px-6 rounded-xl text-[12px] font-semibold bg-muted/50 border border-border/50 text-foreground">
              <Copy className="inline h-3.5 w-3.5 mr-2" /> Copy Address
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
