import * as React from "react"
import { TrendingUp, Zap, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AstraCard } from "@/components/astra/AstraCard"
import { SectionHeader } from "@/components/astra/SectionHeader"
import { ChartCard } from "@/components/astra/ChartCard"
import { KPIChip } from "@/components/astra/KPIChip"
import { cn } from "@/lib/utils"

// Mock trading data
const MOCK_TRADING_DATA = {
  pair: "BSK/INR",
  price: 12.45,
  change24h: 2.34,
  volume24h: 1250000,
  high24h: 12.67,
  low24h: 11.89,
  mode: "LIVE" as "LIVE" | "SIM",
}

const timeframes = [
  { id: "1h", label: "1H" },
  { id: "4h", label: "4H" },
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
]

export function TradingPage() {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState("1d")
  const [orderType, setOrderType] = React.useState<"buy" | "sell">("buy")
  const [amount, setAmount] = React.useState("")

  const isProfit = MOCK_TRADING_DATA.change24h > 0

  return (
    <div className="space-y-4 p-4" data-testid="page-trading">
      {/* Header with Pair Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 px-3">
            <TrendingUp className="h-4 w-4 mr-2" />
            {MOCK_TRADING_DATA.pair}
          </Button>
          
          {MOCK_TRADING_DATA.mode === "SIM" && (
            <KPIChip 
              variant="warning" 
              value="SIM" 
              label="Mode" 
              size="sm"
            />
          )}
        </div>

        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Price Info */}
      <div className="grid grid-cols-4 gap-2">
        <KPIChip
          variant={isProfit ? "success" : "danger"}
          value={`₹${MOCK_TRADING_DATA.price}`}
          size="sm"
        />
        <KPIChip
          variant={isProfit ? "success" : "danger"}
          value={`${isProfit ? "+" : ""}${MOCK_TRADING_DATA.change24h}%`}
          size="sm"
        />
        <KPIChip
          variant="default"
          value={`₹${(MOCK_TRADING_DATA.volume24h / 1000000).toFixed(1)}M`}
          label="Vol"
          size="sm"
        />
        <KPIChip
          variant="default"
          value={`₹${MOCK_TRADING_DATA.high24h}`}
          label="High"
          size="sm"
        />
      </div>

      {/* Timeframe Selector */}
      <div className="flex gap-1 bg-card-secondary/50 p-1 rounded-lg">
        {timeframes.map((tf) => (
          <Button
            key={tf.id}
            variant={selectedTimeframe === tf.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedTimeframe(tf.id)}
            className={cn(
              "flex-1 h-8 text-xs font-medium",
              selectedTimeframe === tf.id 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "hover:bg-background-secondary/50"
            )}
          >
            {tf.label}
          </Button>
        ))}
      </div>

      {/* Chart */}
        <ChartCard 
        title="Price Chart"
        data={[]}
        timeframe={selectedTimeframe as "1D" | "1H" | "1W" | "4H"}
        className="h-48"
      />

      {/* Order Ticket */}
      <AstraCard variant="elevated">
        <div className="p-4">
          <SectionHeader
            title="Quick Order"
            subtitle="Buy or sell BSK instantly"
            className="mb-4"
          />
          
          {/* Buy/Sell Tabs */}
          <div className="flex gap-1 bg-card-secondary/50 p-1 rounded-lg mb-4">
            <Button
              variant={orderType === "buy" ? "default" : "ghost"}
              size="sm"
              onClick={() => setOrderType("buy")}
              className={cn(
                "flex-1 h-8 text-xs font-medium",
                orderType === "buy" 
                  ? "bg-success text-success-foreground shadow-sm" 
                  : "hover:bg-background-secondary/50"
              )}
            >
              Buy
            </Button>
            <Button
              variant={orderType === "sell" ? "default" : "ghost"}
              size="sm"
              onClick={() => setOrderType("sell")}
              className={cn(
                "flex-1 h-8 text-xs font-medium",
                orderType === "sell" 
                  ? "bg-danger text-danger-foreground shadow-sm" 
                  : "hover:bg-background-secondary/50"
              )}
            >
              Sell
            </Button>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-secondary mb-2 block">
                Amount (INR)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background-secondary/50 border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {["25%", "50%", "75%", "100%"].map((percentage) => (
                <Button
                  key={percentage}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border-subtle hover:border-accent/50"
                  onClick={() => {
                    // Calculate percentage of available balance
                    const mockBalance = 10000
                    const percentValue = parseInt(percentage) / 100
                    setAmount((mockBalance * percentValue).toString())
                  }}
                >
                  {percentage}
                </Button>
              ))}
            </div>

            {/* Estimated Values */}
            {amount && (
              <div className="bg-background-secondary/30 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Est. BSK</span>
                  <span className="font-mono">
                    {(parseFloat(amount) / MOCK_TRADING_DATA.price).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Est. Fees</span>
                  <span className="font-mono">₹{(parseFloat(amount) * 0.001).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Place Order Button */}
            <Button
              className={cn(
                "w-full h-10",
                orderType === "buy" 
                  ? "bg-success hover:bg-success/90 text-success-foreground"
                  : "bg-danger hover:bg-danger/90 text-danger-foreground"
              )}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              <Zap className="h-4 w-4 mr-2" />
              {orderType === "buy" ? "Buy" : "Sell"} BSK
            </Button>
          </div>
        </div>
      </AstraCard>

      {/* Risk Disclaimer */}
      <div className="text-xs text-text-secondary bg-warning/5 border border-warning/20 rounded-lg p-3">
        <strong>Risk Warning:</strong> Trading involves substantial risk. Never trade more than you can afford to lose.
        {MOCK_TRADING_DATA.mode === "SIM" && " This is simulation mode - no real funds involved."}
      </div>
    </div>
  )
}