import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"
import { TrendingUp, BarChart3, Wallet, Shield } from "lucide-react"

export default function TradingPageNew() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Crypto Trading</h1>
          <p className="text-muted-foreground">Trade cryptocurrencies with low fees</p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="mb-2">Coming Soon</Badge>
              <h3 className="text-xl font-bold">Trading Platform Launching Soon</h3>
              <p className="text-muted-foreground">
                Professional trading platform with advanced tools
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
                Advanced Charts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Professional trading charts with technical indicators and drawing tools
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="w-5 h-5 text-primary" />
                Low Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Competitive trading fees starting from 0.1% per transaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                Secure Trading
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Bank-grade security with cold storage and insurance protection
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
                Multiple Pairs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Trade popular crypto pairs including BTC, ETH, BSK, and more
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Supported Pairs Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Supported Trading Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['BTC/USDT', 'ETH/USDT', 'BSK/USDT', 'BNB/USDT'].map((pair) => (
                <div key={pair} className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="font-medium">{pair}</div>
                  <div className="text-xs text-muted-foreground mt-1">Coming Soon</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Get notified when trading goes live
              </p>
              <Button size="lg" disabled>
                Join Waitlist
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
