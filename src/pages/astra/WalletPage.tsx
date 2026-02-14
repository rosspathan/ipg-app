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

// Shared inline style constants
const surface = 'hsla(220, 25%, 11%, 0.8)'
const surfaceLight = 'hsla(220, 25%, 14%, 0.6)'
const borderSubtle = '1px solid hsla(0, 0%, 100%, 0.05)'
const borderTeal = '1px solid hsla(160, 50%, 50%, 0.12)'
const teal = '#16F2C6'
const textPrimary = 'hsl(0, 0%, 92%)'
const textSecondary = 'hsl(0, 0%, 50%)'
const textTertiary = 'hsl(0, 0%, 40%)'

// Compact Markets Preview for Wallet page
function MarketsPreview({ navigate }: { navigate: (path: string) => void }) {
  const { data: tradingPairs } = useTradingPairs()
  return (
    <div className="px-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold" style={{ color: 'hsl(0, 0%, 75%)' }}>Markets</h2>
        <button onClick={() => navigate("/app/trade")} className="text-[12px] font-medium flex items-center gap-1" style={{ color: teal }}>
          View All <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: surface, border: borderSubtle }}>
        {(tradingPairs || []).map((pair, i) => {
          const isUp = pair.change24h >= 0
          return (
            <div key={pair.id}>
              <button
                onClick={() => navigate(`/app/trade/${pair.symbol.replace('/', '_')}`)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]"
              >
                <div className="text-left">
                  <p className="text-[13px] font-semibold" style={{ color: textPrimary }}>
                    {pair.baseAsset}<span style={{ color: textTertiary }}>/{pair.quoteAsset}</span>
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: textTertiary }}>
                    Vol ${pair.volume24h >= 1000 ? `${(pair.volume24h / 1000).toFixed(1)}K` : pair.volume24h.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[13px] font-mono font-semibold tabular-nums" style={{ color: textPrimary }}>
                    ${pair.price >= 1 ? pair.price.toFixed(2) : pair.price.toFixed(4)}
                  </p>
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold min-w-[72px] justify-center"
                    style={{
                      background: isUp ? 'hsla(154, 67%, 52%, 0.1)' : 'hsla(0, 70%, 68%, 0.1)',
                      color: isUp ? 'hsl(154, 67%, 52%)' : 'hsl(0, 70%, 68%)',
                    }}
                  >
                    {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {isUp ? '+' : ''}{pair.change24h.toFixed(2)}%
                  </div>
                </div>
              </button>
              {i < (tradingPairs || []).length - 1 && (
                <div className="mx-4 h-px" style={{ background: 'hsla(0, 0%, 100%, 0.04)' }} />
              )}
            </div>
          )
        })}
        {(!tradingPairs || tradingPairs.length === 0) && (
          <div className="text-center py-8 text-[12px]" style={{ color: textTertiary }}>Loading markets...</div>
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
    <div className="space-y-6 pb-32" data-testid="page-wallet" style={{ background: '#0B1020', minHeight: '100vh' }}>

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
        <div className="p-5 rounded-xl space-y-4" style={{ background: surface, border: borderTeal }}>
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: textSecondary }}>On-Chain Balance</p>
          
          <div className="relative">
            <p className="text-[28px] font-bold tabular-nums" style={{ color: textPrimary, fontFamily: "'Space Grotesk', sans-serif" }}>
              {portfolioLoading || onchainLoading ? '...' : formatCurrency(portfolio?.total_usd || 0)}
            </p>
            <div className="absolute -inset-6 rounded-full opacity-[0.06] pointer-events-none" style={{ background: `radial-gradient(circle, ${teal} 0%, transparent 70%)` }} />
          </div>

          <div className="h-px" style={{ background: 'hsla(0, 0%, 100%, 0.06)' }} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: 'hsla(160, 60%, 50%, 0.12)' }}>
                  <Wallet className="h-3 w-3" style={{ color: teal }} />
                </div>
                <span className="text-[12px] font-medium" style={{ color: textSecondary }}>Available</span>
              </div>
              <span className="text-[14px] font-bold tabular-nums" style={{ color: teal }}>
                {formatCurrency(portfolio?.available_usd || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: 'hsla(35, 80%, 50%, 0.12)' }}>
                  <Lock className="h-3 w-3" style={{ color: '#F7A53B' }} />
                </div>
                <span className="text-[12px] font-medium" style={{ color: textSecondary }}>In Orders</span>
              </div>
              <span className="text-[14px] font-bold tabular-nums" style={{ color: '#F7A53B' }}>
                {formatCurrency(portfolio?.locked_usd || 0)}
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
          { label: "History", icon: "📋", route: "/app/wallet/history" },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.route)}
            className="flex flex-col items-center gap-2 py-4 rounded-xl transition-colors"
            style={{ background: surface, border: borderSubtle }}
          >
            <span className="text-lg">{a.icon}</span>
            <span className="text-[11px] font-semibold" style={{ color: textPrimary }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── 3. HEADER / ADDRESS (Binance Smart Chain) ── */}
      <div className="px-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#F7A53B' }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#F7A53B' }}>
            Binance Smart Chain
          </span>
        </div>
        <p className="text-[11px] font-medium" style={{ color: textSecondary }}>
          EVM Address (BEP20/ERC20)
        </p>

        <div
          className="w-full overflow-x-auto scrollbar-hide rounded-lg px-3 py-2.5"
          style={{ background: surfaceLight, border: borderSubtle }}
        >
          <p className="font-mono text-[12px] whitespace-nowrap tabular-nums" style={{ color: textPrimary }} data-testid="wallet-evm-address">
            {showAddress ? (walletAddress || 'No wallet connected') : '••••••••••••••••••••••••••••••••••••••••'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleCopyAddress} className="p-2 rounded-lg" style={{ background: surfaceLight, border: borderSubtle }}>
            <Copy className="h-4 w-4" style={{ color: textSecondary }} />
          </button>
          <button onClick={() => setShowQrDialog(true)} disabled={!walletAddress} className="p-2 rounded-lg" style={{ background: surfaceLight, border: borderSubtle }}>
            <QrCode className="h-4 w-4" style={{ color: textSecondary }} />
          </button>
          <button onClick={() => setShowAddress(!showAddress)} className="p-2 rounded-lg" style={{ background: surfaceLight, border: borderSubtle }}>
            {showAddress ? <EyeOff className="h-4 w-4" style={{ color: textSecondary }} /> : <Eye className="h-4 w-4" style={{ color: textSecondary }} />}
          </button>
        </div>

        {/* Explorer + On-chain links */}
        <div className="flex gap-2">
          <button
            onClick={() => window.open(getExplorerUrl(walletAddress, 'bsc'), '_blank')}
            disabled={!walletAddress}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: surfaceLight, border: borderSubtle, color: teal }}
          >
            <ExternalLink className="h-3 w-3" /> BSCScan
          </button>
          <button
            onClick={() => navigate('/app/wallet/onchain')}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: surfaceLight, border: borderSubtle, color: textSecondary }}
          >
            <Wallet className="h-3 w-3" /> On-chain View
          </button>
        </div>

        {!walletAddress && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: 'hsla(35, 80%, 50%, 0.08)', border: '1px solid hsla(35, 80%, 50%, 0.2)' }}>
            <p className="text-[13px] font-semibold" style={{ color: '#F7A53B' }}>Wallet Setup Required</p>
            <p className="text-[11px]" style={{ color: 'hsl(0, 0%, 60%)' }}>Create or import a wallet to use this feature.</p>
            <button
              onClick={() => { localStorage.setItem('ipg_return_path', '/app/wallet'); navigate('/onboarding/wallet') }}
              className="w-full h-10 rounded-xl text-[13px] font-semibold" style={{ background: teal, color: '#0B1020' }}
            >
              Set Up Wallet Now
            </button>
          </div>
        )}
      </div>

      {/* ── 4. ASSET LIST ── */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold" style={{ color: 'hsl(0, 0%, 75%)' }}>On-Chain Assets</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => refetchOnchain()} className="p-1.5 rounded-lg" style={{ background: surfaceLight }}>
              <RefreshCw className="h-3 w-3" style={{ color: textSecondary }} />
            </button>
            <button onClick={() => setAssetsExpanded(!assetsExpanded)} className="p-1.5 rounded-lg" style={{ background: surfaceLight }}>
              {assetsExpanded ? <ChevronUp className="h-3 w-3" style={{ color: textSecondary }} /> : <ChevronDown className="h-3 w-3" style={{ color: textSecondary }} />}
            </button>
          </div>
        </div>

        {assetsExpanded && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: textTertiary }} />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[38px] pl-9 pr-3 rounded-lg text-[12px] outline-none"
                style={{ background: surfaceLight, border: borderSubtle, color: textPrimary }}
              />
            </div>

            {onchainLoading ? (
              <div className="text-center py-8 text-[12px]" style={{ color: textTertiary }}>Loading...</div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8 text-[12px]" style={{ color: textTertiary }}>
                {searchTerm ? "No assets found" : "No on-chain balances"}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: surface, border: borderSubtle }}>
                {filteredAssets.map((asset, i) => (
                  <div key={asset.symbol}>
                    <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]" style={{ height: '64px' }}>
                      <div className="flex items-center gap-3">
                        <AssetLogo symbol={asset.symbol} logoUrl={asset.logoUrl} size="sm" />
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: textPrimary }}>{asset.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'hsla(160, 50%, 50%, 0.08)', color: teal, border: '1px solid hsla(160, 50%, 50%, 0.15)' }}>
                              {asset.network || 'BSC'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-mono font-semibold tabular-nums" style={{ color: textPrimary }}>
                          {asset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </p>
                        <p className="text-[10px] font-mono tabular-nums" style={{ color: textTertiary }}>
                          {asset.symbol}
                        </p>
                      </div>
                    </div>
                    {i < filteredAssets.length - 1 && (
                      <div className="mx-4 h-px" style={{ background: 'hsla(0, 0%, 100%, 0.04)' }} />
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
            <h2 className="text-[14px] font-semibold" style={{ color: 'hsl(0, 0%, 75%)' }}>Trading Balances</h2>
            {tradingTotalUsd > 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: textSecondary }}>
                Total: <span className="font-semibold" style={{ color: textPrimary }}>${tradingTotalUsd.toFixed(2)}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/app/wallet/transfer')}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold"
            style={{ background: 'hsla(160, 50%, 50%, 0.08)', border: '1px solid hsla(160, 50%, 50%, 0.15)', color: teal }}
          >
            <ArrowLeftRight className="h-3 w-3" /> Transfer
          </button>
        </div>

        {tradingLoading ? (
          <div className="text-center py-6 text-[12px]" style={{ color: textTertiary }}>Loading...</div>
        ) : activeTradingBalances.length === 0 ? (
          <div className="text-center py-8 text-[12px]" style={{ color: textTertiary }}>
            No trading balances
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: surface, border: borderSubtle }}>
            {activeTradingBalances.map((asset, i) => (
              <div key={asset.symbol}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                    <span className="text-[13px] font-semibold" style={{ color: textPrimary }}>{asset.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-mono font-semibold tabular-nums" style={{ color: textPrimary }}>
                      {asset.available.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                    {asset.locked > 0.000001 && (
                      <p className="text-[10px] font-mono tabular-nums" style={{ color: '#F7A53B' }}>
                        +{asset.locked.toFixed(4)} locked
                      </p>
                    )}
                  </div>
                </div>
                {i < activeTradingBalances.length - 1 && (
                  <div className="mx-4 h-px" style={{ background: 'hsla(0, 0%, 100%, 0.04)' }} />
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
          className="w-full p-4 rounded-xl text-left space-y-3 group"
          style={{
            background: 'hsla(220, 25%, 11%, 0.8)',
            border: '1px solid hsla(160, 50%, 50%, 0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'hsla(160, 50%, 50%, 0.1)' }}>
                <Lock className="h-4 w-4" style={{ color: teal }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: textPrimary }}>USDI Loan</p>
                <p className="text-[10px]" style={{ color: textTertiary }}>Collateral-backed</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: teal }} />
              <span className="text-[10px] font-semibold" style={{ color: teal }}>Active</span>
            </div>
          </div>

          <div className="flex gap-2">
            {["200% Collateral", "2% Fee", "Unlock Anytime"].map((tag) => (
              <span key={tag} className="text-[10px] font-medium px-2 py-1 rounded-full" style={{ background: 'hsla(0, 0%, 100%, 0.04)', border: borderSubtle, color: textSecondary }}>
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid hsla(0, 0%, 100%, 0.04)' }}>
            <span className="text-[11px]" style={{ color: textTertiary }}>Lock BSK → Get USDI</span>
            <span className="text-[12px] font-semibold flex items-center gap-1" style={{ color: teal }}>
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
        <DialogContent className="sm:max-w-md" style={{ background: '#121826', border: borderSubtle }}>
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: textPrimary }}>Wallet QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            {walletAddress && (
              <div className="bg-white p-5 rounded-2xl">
                <QRCodeSVG value={walletAddress} size={220} level="H" includeMargin />
              </div>
            )}
            <p className="text-[11px] text-center font-mono break-all px-6" style={{ color: textSecondary }}>
              {walletAddress}
            </p>
            <button onClick={handleCopyAddress} className="h-10 px-6 rounded-xl text-[12px] font-semibold" style={{ background: surfaceLight, border: borderSubtle, color: textPrimary }}>
              <Copy className="inline h-3.5 w-3.5 mr-2" /> Copy Address
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
