import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Copy, ExternalLink, QrCode, Eye, EyeOff, Wallet, ArrowLeftRight, Lock,
  Search, RefreshCw, ArrowRight, ChevronDown, ChevronUp, ChevronRight,
  TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Clock,
  BarChart2, Zap
} from "lucide-react"
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

// ── Section label component
function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-bold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </p>
  )
}

// ── Compact Markets Preview
function MarketsPreview({ navigate }: { navigate: (path: string) => void }) {
  const { data: tradingPairs } = useTradingPairs()
  return (
    <div className="px-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SectionLabel>Markets</SectionLabel>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Live
          </span>
        </div>
        <button
          onClick={() => navigate("/app/trade")}
          className="text-[12px] font-semibold flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
        >
          View All <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="glass-card overflow-hidden" style={{ borderRadius: '20px' }}>
        {(tradingPairs || []).map((pair, i) => {
          const isUp = pair.change24h >= 0
          return (
            <div key={pair.id}>
              <button
                onClick={() => navigate(`/app/trade/${pair.symbol.replace('/', '_')}`)}
                className="w-full flex items-center justify-between px-4 py-3.5 transition-all duration-150 hover:bg-accent/[0.04] active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center text-[11px] font-bold",
                    isUp ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  )}>
                    {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">
                      {pair.baseAsset}<span className="text-muted-foreground font-medium">/{pair.quoteAsset}</span>
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wide">
                      Vol ${pair.volume24h >= 1000 ? `${(pair.volume24h / 1000).toFixed(1)}K` : pair.volume24h.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[14px] font-mono font-bold tabular-nums text-foreground">
                    ${pair.price >= 1 ? pair.price.toFixed(2) : pair.price.toFixed(4)}
                  </p>
                  <div className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold min-w-[76px] justify-center border",
                    isUp
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-danger/10 text-danger border-danger/20"
                  )}>
                    {isUp ? '+' : ''}{pair.change24h.toFixed(2)}%
                  </div>
                </div>
              </button>
              {i < (tradingPairs || []).length - 1 && (
                <div className="mx-4 h-px bg-border/20" />
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
    <div className="space-y-5 pb-32 bg-background min-h-screen" data-testid="page-wallet">

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

      {/* ── 1. PORTFOLIO HERO CARD ── */}
      <div className="px-4 pt-4 animate-fade-in">
        <div className="relative overflow-hidden glass-card p-6" style={{ borderRadius: '24px' }}>
          {/* Ambient radial glow behind card */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full pointer-events-none opacity-60"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(186 100% 50% / 0.18), transparent 70%)' }}
          />
          {/* Top rim light gradient */}
          <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(186 100% 50% / 0.5), hsl(245 80% 68% / 0.3), transparent)' }}
          />

          <div className="relative z-10 space-y-5">
            {/* Label + Toggle */}
            <div className="flex items-center justify-between">
              <SectionLabel>On-Chain Balance</SectionLabel>
              <button
                onClick={() => {
                  const next = !hideBalance
                  setHideBalance(next)
                  localStorage.setItem('ipg_hide_balance', String(next))
                }}
                className="h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-200 bg-muted/40 hover:bg-muted/70 active:scale-90 border border-border/40"
                aria-label={hideBalance ? "Show balance" : "Hide balance"}
              >
                {hideBalance
                  ? <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </button>
            </div>

            {/* Balance Amount — gradient text */}
            <div>
              <p
                className={cn(
                  "balance-gradient-text text-[36px] font-extrabold tabular-nums font-heading leading-none transition-all duration-300",
                  hideBalance && "blur-sm select-none"
                )}
              >
                {portfolioLoading || onchainLoading ? '...' : hideBalance ? '••••••' : formatCurrency(portfolio?.total_usd || 0)}
              </p>
            </div>

            {/* Gradient divider */}
            <div className="h-px" style={{
              background: 'linear-gradient(90deg, hsl(186 100% 50% / 0.4), hsl(186 100% 50% / 0.1) 40%, hsl(245 80% 68% / 0.1) 60%, transparent)'
            }} />

            {/* Available & In Orders */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-accent/[0.06] border border-accent/15">
                <div className="h-7 w-7 rounded-xl flex items-center justify-center bg-accent/15 flex-shrink-0">
                  <Wallet className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Available</p>
                  <p className={cn("text-[14px] font-bold tabular-nums text-accent font-mono leading-tight", hideBalance && "blur-sm")}>
                    {hideBalance ? '••••' : formatCurrency(portfolio?.available_usd || 0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-warning/[0.06] border border-warning/15">
                <div className="h-7 w-7 rounded-xl flex items-center justify-center bg-warning/15 flex-shrink-0">
                  <Lock className="h-3.5 w-3.5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">In Orders</p>
                  <p className={cn("text-[14px] font-bold tabular-nums text-warning font-mono leading-tight", hideBalance && "blur-sm")}>
                    {hideBalance ? '••••' : formatCurrency(portfolio?.locked_usd || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. ACTION GRID ── */}
      <div className="px-4 animate-fade-in" style={{ animationDelay: '80ms' }}>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            {
              label: "Deposit",
              icon: ArrowDownCircle,
              route: "/app/wallet/deposit",
              iconColor: "text-success",
              bgColor: "bg-success/10",
              borderColor: "border-success/20",
              glowColor: "hover:shadow-[0_0_16px_hsl(154_67%_52%/0.2)]"
            },
            {
              label: "Withdraw",
              icon: ArrowUpCircle,
              route: "/app/wallet/withdraw",
              iconColor: "text-danger",
              bgColor: "bg-danger/10",
              borderColor: "border-danger/20",
              glowColor: "hover:shadow-[0_0_16px_hsl(0_70%_68%/0.2)]"
            },
            {
              label: "Swap",
              icon: ArrowLeftRight,
              route: "/app/swap",
              iconColor: "text-secondary",
              bgColor: "bg-secondary/10",
              borderColor: "border-secondary/20",
              glowColor: "hover:shadow-[0_0_16px_hsl(245_80%_68%/0.2)]"
            },
            {
              label: "History",
              icon: Clock,
              route: "/app/home/history",
              iconColor: "text-warning",
              bgColor: "bg-warning/10",
              borderColor: "border-warning/20",
              glowColor: "hover:shadow-[0_0_16px_hsl(35_85%_60%/0.2)]"
            },
          ].map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.label}
                onClick={() => navigate(a.route)}
                className={cn(
                  "glass-card flex flex-col items-center gap-2.5 py-4 px-2 transition-all duration-200 active:scale-[0.94] active:opacity-80 border",
                  a.borderColor,
                  a.glowColor
                )}
                style={{ borderRadius: '18px' }}
              >
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", a.bgColor)}>
                  <Icon className={cn("h-5 w-5", a.iconColor)} />
                </div>
                <span className="text-[11px] font-bold text-foreground/90 leading-tight">{a.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 3. BSC ADDRESS BLOCK ── */}
      <div className="px-4 space-y-3 animate-fade-in" style={{ animationDelay: '160ms' }}>
        {/* Chain identity header */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            <div className="absolute h-2 w-2 rounded-full bg-warning animate-ping opacity-60" />
          </div>
          <SectionLabel className="text-warning">Binance Smart Chain</SectionLabel>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/10 border border-warning/25 text-warning">
            BEP20
          </span>
        </div>

        {/* Address display */}
        <div className="glass-card p-0 overflow-hidden" style={{ borderRadius: '18px' }}>
          <div className="px-3 py-2.5 border-b border-border/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">EVM Address</p>
            <div className="overflow-x-auto scrollbar-hide">
              <p className="font-mono text-[12px] whitespace-nowrap tabular-nums text-accent" data-testid="wallet-evm-address">
                {showAddress ? (walletAddress || 'No wallet connected') : '••••••••••••••••••••••••••••••••••••••••'}
              </p>
            </div>
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-1 px-3 py-2">
            <button
              onClick={handleCopyAddress}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-semibold bg-accent/8 border border-accent/20 text-accent hover:bg-accent/15 transition-colors active:scale-95"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
            <button
              onClick={() => setShowQrDialog(true)}
              disabled={!walletAddress}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-semibold bg-muted/40 border border-border/40 text-muted-foreground hover:bg-muted/70 transition-colors active:scale-95 disabled:opacity-40"
            >
              <QrCode className="h-3 w-3" /> QR
            </button>
            <button
              onClick={() => setShowAddress(!showAddress)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-semibold bg-muted/40 border border-border/40 text-muted-foreground hover:bg-muted/70 transition-colors active:scale-95"
            >
              {showAddress ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showAddress ? 'Hide' : 'Show'}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => window.open(getExplorerUrl(walletAddress, 'bsc'), '_blank')}
              disabled={!walletAddress}
              className="flex items-center gap-1 h-8 px-2.5 rounded-xl text-[11px] font-semibold bg-muted/40 border border-border/40 text-muted-foreground hover:text-accent hover:border-accent/25 transition-colors active:scale-95 disabled:opacity-40"
            >
              <ExternalLink className="h-3 w-3" /> BSCScan
            </button>
          </div>
        </div>

        {!walletAddress && (
          <div className="p-4 rounded-2xl space-y-3 bg-warning/8 border border-warning/25">
            <p className="text-[13px] font-bold text-warning">Wallet Setup Required</p>
            <p className="text-[11px] text-muted-foreground">Create or import a wallet to use this feature.</p>
            <button
              onClick={() => { localStorage.setItem('ipg_return_path', '/app/wallet'); navigate('/onboarding/wallet') }}
              className="w-full h-10 rounded-xl text-[13px] font-bold bg-accent text-accent-foreground active:scale-[0.97] transition-transform"
            >
              Set Up Wallet Now
            </button>
          </div>
        )}
      </div>

      {/* Subtle divider */}
      <div className="px-4">
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--border) / 0.5), transparent)' }} />
      </div>

      {/* ── 4. ON-CHAIN ASSETS ── */}
      <div className="px-4 space-y-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between">
          <SectionLabel>On-Chain Assets</SectionLabel>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => refetchOnchain()}
              className="h-8 w-8 rounded-xl flex items-center justify-center bg-muted/40 border border-border/40 hover:bg-muted/70 transition-colors active:scale-90"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setAssetsExpanded(!assetsExpanded)}
              className="h-8 w-8 rounded-xl flex items-center justify-center bg-muted/40 border border-border/40 hover:bg-muted/70 transition-colors active:scale-90"
            >
              {assetsExpanded
                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              }
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
                className="w-full h-10 pl-9 pr-3 text-[12px] outline-none bg-muted/40 border border-border/40 text-foreground placeholder:text-muted-foreground focus:border-accent/30 focus:bg-muted/60 transition-colors"
                style={{ borderRadius: '14px' }}
              />
            </div>

            {onchainLoading ? (
              <div className="text-center py-8 text-[12px] text-muted-foreground">Loading...</div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-muted-foreground">
                {searchTerm ? "No assets found" : "No on-chain balances"}
              </div>
            ) : (
              <div className="glass-card overflow-hidden" style={{ borderRadius: '20px' }}>
                {filteredAssets.map((asset, i) => (
                  <div key={asset.symbol}>
                    <div
                      className="flex items-center justify-between px-4 py-3.5 transition-all duration-150 hover:bg-accent/[0.03] active:bg-accent/[0.06] group"
                      style={{ minHeight: '64px' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <AssetLogo symbol={asset.symbol} logoUrl={asset.logoUrl} size="sm" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-foreground">{asset.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-warning/10 text-warning border border-warning/20">
                              {asset.network || 'BSC'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-mono font-bold tabular-nums text-foreground">
                          {asset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </p>
                        <p className="text-[10px] font-mono tabular-nums text-muted-foreground tracking-wide">
                          {asset.symbol}
                        </p>
                      </div>
                    </div>
                    {i < filteredAssets.length - 1 && (
                      <div className="mx-4 h-px bg-border/20" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 5. TRADING BALANCES ── */}
      <div className="px-4 space-y-3 animate-fade-in" style={{ animationDelay: '240ms' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SectionLabel>Trading Balances</SectionLabel>
            <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-2">
            {tradingTotalUsd > 0 && (
              <span className="balance-gradient-text text-[12px] font-bold tabular-nums font-mono">
                ${tradingTotalUsd.toFixed(2)}
              </span>
            )}
            <button
              onClick={() => navigate('/app/wallet/transfer')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-bold bg-accent/10 border border-accent/25 text-accent hover:bg-accent/20 transition-colors active:scale-95"
            >
              <ArrowLeftRight className="h-3 w-3" /> Transfer
            </button>
          </div>
        </div>

        {tradingLoading ? (
          <div className="text-center py-6 text-[12px] text-muted-foreground">Loading...</div>
        ) : activeTradingBalances.length === 0 ? (
          <div className="text-center py-8 text-[12px] text-muted-foreground">No trading balances</div>
        ) : (
          <div className="glass-card overflow-hidden" style={{ borderRadius: '20px' }}>
            {activeTradingBalances.map((asset, i) => (
              <div key={asset.symbol}>
                <div className="flex items-center justify-between px-4 py-3.5 hover:bg-accent/[0.03] transition-all duration-150">
                  <div className="flex items-center gap-3">
                    <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                    <div>
                      <span className="text-[13px] font-bold text-foreground">{asset.symbol}</span>
                      {asset.usd_value && asset.usd_value > 0 && (
                        <p className="text-[10px] text-muted-foreground font-mono">${asset.usd_value.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-mono font-bold tabular-nums text-success">
                      {asset.available.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                    {asset.locked > 0.000001 && (
                      <p className="text-[10px] font-mono tabular-nums text-warning flex items-center gap-1 justify-end">
                        <Lock className="h-2.5 w-2.5" />
                        {asset.locked.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
                {i < activeTradingBalances.length - 1 && (
                  <div className="mx-4 h-px bg-border/20" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 6. USDI LOAN CARD ── */}
      <div className="px-4 animate-fade-in" style={{ animationDelay: '280ms' }}>
        <button
          onClick={() => navigate("/app/wallet/loan")}
          className="w-full text-left group relative overflow-hidden glass-card p-5 space-y-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] border border-accent/20"
          style={{ borderRadius: '22px' }}
        >
          {/* Top accent gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, hsl(186 100% 50% / 0.06), transparent)' }}
          />
          {/* Top rim */}
          <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(186 100% 50% / 0.4), transparent)' }}
          />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Animated pulse ring around lock icon */}
              <div className="relative h-10 w-10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-accent/10 animate-pulse" style={{ animationDuration: '3s' }} />
                <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-accent/15 border border-accent/25 relative">
                  <Lock className="h-4.5 w-4.5 text-accent" style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
              <div>
                <p className="text-[14px] font-bold text-foreground">USDI Loan</p>
                <p className="text-[11px] text-muted-foreground">Collateral-backed</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-bold text-accent">Active</span>
            </div>
          </div>

          <div className="relative z-10 flex gap-2 flex-wrap">
            {["200% Collateral", "2% Fee", "Unlock Anytime"].map((tag) => (
              <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-xl bg-muted/40 border border-border/30 text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>

          <div className="relative z-10 flex items-center justify-between pt-1 border-t border-border/20">
            <span className="text-[11px] text-muted-foreground">Lock BSK → Get USDI</span>
            <span className="text-[12px] font-bold flex items-center gap-1.5 text-accent group-hover:gap-2.5 transition-all duration-200">
              Apply Now <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>
      </div>

      {/* ── MARKETS PREVIEW ── */}
      <div className="animate-fade-in" style={{ animationDelay: '320ms' }}>
        <MarketsPreview navigate={navigate} />
      </div>

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
            <button
              onClick={handleCopyAddress}
              className="h-10 px-6 rounded-xl text-[12px] font-bold bg-muted/50 border border-border/50 text-foreground active:scale-95 transition-transform"
            >
              <Copy className="inline h-3.5 w-3.5 mr-2" /> Copy Address
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
