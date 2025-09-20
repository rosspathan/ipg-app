import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Calculator, TrendingUp, TrendingDown, Target, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TradingViewWidget from "@/components/TradingViewWidget";
import OrderHistory from "@/components/OrderHistory";
import { useCatalog } from "@/hooks/useCatalog";
import { useTrading } from "@/hooks/useTrading";
import AssetLogo from "@/components/AssetLogo";

const TradingScreen = () => {
  const navigate = useNavigate();
  const { pair } = useParams<{ pair: string }>();
  const { toast } = useToast();
  const marketPair = pair?.replace('-', '/') || 'BTC/USDT';
  
  // Trading state
  const [tradingType, setTradingType] = useState<'spot' | 'futures'>('spot');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [leverage, setLeverage] = useState("1");
  const [selectedPair, setSelectedPair] = useState(marketPair);

  const { pairsList, pairsBySymbol, status } = useCatalog();
  // Simplified for now - will use full trading system after migration
  const livePrice = market.price || 0;
  
  const currentPair = pairsBySymbol[selectedPair] || pairsList[0];
  const tradingViewSymbol = currentPair?.tradingview_symbol || 'BINANCE:BTCUSDT';
  const futuresSymbol = tradingViewSymbol.replace('USDT', 'USDTPERP');
  

// Live market data via Binance WebSocket
const [market, setMarket] = useState({
  price: 0,
  changePercent: 0,
  high24h: 0,
  low24h: 0,
  volume24h: 0,
});

useEffect(() => {
  const wsSymbol = selectedPair.replace('/', '').toLowerCase();
  const url = tradingType === 'futures'
    ? `wss://fstream.binance.com/ws/${wsSymbol}@ticker`
    : `wss://stream.binance.com:9443/ws/${wsSymbol}@ticker`;

  const ws = new WebSocket(url);
  ws.onmessage = (event) => {
    try {
      const d = JSON.parse(event.data);
      setMarket({
        price: parseFloat(d.c), // last price
        changePercent: parseFloat(d.P), // change percent
        high24h: parseFloat(d.h),
        low24h: parseFloat(d.l),
        volume24h: parseFloat(d.v ?? d.V ?? 0),
      });
    } catch (err) {
      console.error('Ticker parse error', err);
    }
  };

  return () => ws.close();
}, [selectedPair, tradingType]);

// Formatted display values
const marketData = {
  price: market.price ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(market.price) : '--',
  change24h: Number.isFinite(market.changePercent) ? `${market.changePercent >= 0 ? '+' : ''}${market.changePercent.toFixed(2)}%` : '--',
  high24h: market.high24h ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(market.high24h) : '--',
  low24h: market.low24h ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(market.low24h) : '--',
  volume24h: market.volume24h ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(market.volume24h) : '--',
  isPositive: market.changePercent >= 0,
};

const livePrice = market.price || 0;

// Live order book via Binance depth stream
const [orderBook, setOrderBook] = useState<{ bids: [number, number][]; asks: [number, number][] }>({
  bids: [],
  asks: [],
});

useEffect(() => {
  const wsSymbol = selectedPair.replace('/', '').toLowerCase();
  const url = tradingType === 'futures'
    ? `wss://fstream.binance.com/ws/${wsSymbol}@depth20@100ms`
    : `wss://stream.binance.com:9443/ws/${wsSymbol}@depth20@100ms`;

  const ws = new WebSocket(url);
  ws.onmessage = (event) => {
    try {
      const d = JSON.parse(event.data);
      const bids: [number, number][] = (d.b || d.bids || []).map((x: any) => [
        parseFloat(x[0] ?? x.p ?? x.price),
        parseFloat(x[1] ?? x.q ?? x.qty),
      ]).filter(([p, q]) => Number.isFinite(p) && Number.isFinite(q));
      const asks: [number, number][] = (d.a || d.asks || []).map((x: any) => [
        parseFloat(x[0] ?? x.p ?? x.price),
        parseFloat(x[1] ?? x.q ?? x.qty),
      ]).filter(([p, q]) => Number.isFinite(p) && Number.isFinite(q));

      setOrderBook({
        bids: bids.sort((a, b) => b[0] - a[0]).slice(0, 20),
        asks: asks.sort((a, b) => a[0] - b[0]).slice(0, 20),
      });
    } catch (e) {
      console.error('Depth parse error', e);
    }
  };

  return () => ws.close();
}, [selectedPair, tradingType]);

  const handlePlaceOrder = async () => {
    if (!amount) {
      toast({
        title: "Invalid Amount", 
        description: "Please enter an amount",
        variant: "destructive",
      });
      return;
    }

    if (orderType !== 'market' && !price) {
      toast({
        title: "Invalid Price",
        description: "Please enter a price for limit orders", 
        variant: "destructive",
      });
      return;
    }

    const orderPrice = orderType === 'market' ? livePrice : parseFloat(price);
    const totalValue = parseFloat(amount) * orderPrice;
    const fee = totalValue * 0.001; // 0.1% fee

    toast({
      title: "Order Placed",
      description: `${orderSide.toUpperCase()} order simulation - full trading engine available after migration approval`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <Select value={selectedPair} onValueChange={setSelectedPair}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pairsList.map(pair => (
                <SelectItem key={pair.pair} value={pair.pair}>
                  <div className="flex items-center gap-2">
                    <AssetLogo symbol={pair.base_symbol} logoUrl={pair.base_logo} size="sm" />
                    <AssetLogo symbol={pair.quote_symbol} logoUrl={pair.quote_logo} size="sm" />
                    {pair.pair}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <div className="text-lg font-bold">
              {marketData.price}
            </div>
            <div className={`flex items-center text-sm ${marketData.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {marketData.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {marketData.change24h}
            </div>
          </div>
        </div>

        <Tabs value={tradingType} onValueChange={(v) => setTradingType(v as 'spot' | 'futures')}>
          <TabsList>
            <TabsTrigger value="spot">Spot Trading</TabsTrigger>
            <TabsTrigger value="futures">Futures Trading</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Market Stats */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">24h High: </span>
            <span className="font-medium">{marketData.high24h}</span>
          </div>
          <div>
            <span className="text-muted-foreground">24h Low: </span>
            <span className="font-medium">{marketData.low24h}</span>
          </div>
          <div>
            <span className="text-muted-foreground">24h Volume: </span>
            <span className="font-medium">{marketData.volume24h}</span>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Chart Area */}
        <div className="flex-1 p-4">
          <Card className="bg-gradient-card shadow-card border-0 h-[600px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                {tradingType === 'spot' ? 'Spot Trading' : 'Futures Trading'} - {selectedPair}
                {tradingType === 'futures' && (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    Perpetual
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[500px]">
              <TradingViewWidget 
                symbol={tradingType === 'spot' ? tradingViewSymbol : futuresSymbol}
                widgetType="advanced-chart"
                height={500}
                colorTheme="dark"
              />
            </CardContent>
          </Card>
        </div>

        {/* Trading Panel */}
        <div className="w-80 p-4 space-y-4">
          {/* Order Book */}
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order Book</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {/* Asks */}
                <div className="space-y-1 max-h-32 overflow-hidden">
                  {orderBook.asks.slice(0, 10).map(([price, qty], index) => {
                    const total = price * qty;
                    return (
                      <div key={index} className="flex justify-between text-xs px-3 py-1 hover:bg-red-500/10">
                        <span className="text-red-500">{price.toFixed(2)}</span>
                        <span>{qty.toFixed(3)}</span>
                        <span className="text-muted-foreground">{total.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Current Price */}
                <div className="flex justify-center py-2 border-y border-border">
                  <span className={`font-medium ${marketData.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {marketData.price}
                  </span>
                </div>
                
                {/* Bids */}
                <div className="space-y-1 max-h-32 overflow-hidden">
                  {orderBook.bids.slice(0, 10).map(([price, qty], index) => {
                    const total = price * qty;
                    return (
                      <div key={index} className="flex justify-between text-xs px-3 py-1 hover:bg-green-500/10">
                        <span className="text-green-500">{price.toFixed(2)}</span>
                        <span>{qty.toFixed(3)}</span>
                        <span className="text-muted-foreground">{total.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trading Form */}
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Place Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={orderSide === 'buy' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('buy')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  Buy
                </Button>
                <Button
                  variant={orderSide === 'sell' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('sell')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  Sell
                </Button>
              </div>

              {/* Order Type */}
              <div className="grid grid-cols-3 gap-1">
                {['market', 'limit', 'stop'].map((type) => (
                  <Button
                    key={type}
                    variant={orderType === type ? 'default' : 'outline'}
                    onClick={() => setOrderType(type as 'market' | 'limit' | 'stop')}
                    size="sm"
                    className="text-xs"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>

              {/* Leverage (Futures only) */}
              {tradingType === 'futures' && (
                <div className="space-y-2">
                  <Label className="text-xs">Leverage</Label>
                  <Select value={leverage} onValueChange={setLeverage}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['1', '2', '5', '10', '20', '50', '100'].map(lev => (
                        <SelectItem key={lev} value={lev}>{lev}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Price (for limit orders) */}
              {orderType !== 'market' && (
                <div className="space-y-2">
                  <Label className="text-xs">Price (USDT)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-xs">Amount ({selectedPair.split('/')[0]})</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Total */}
              {amount && (
                <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>
                      {orderType === 'market' 
                        ? (parseFloat(amount) * livePrice).toLocaleString()
                        : price ? (parseFloat(amount) * parseFloat(price)).toLocaleString() : '0'
                      } USDT
                    </span>
                  </div>
                </div>
              )}

              <Button 
                onClick={handlePlaceOrder}
                className={`w-full ${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                disabled={!amount || (orderType !== 'market' && !price)}
              >
                {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedPair.split('/')[0]}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Order History Section */}
      <div className="p-4">
        <OrderHistory />
      </div>
    </div>
  );
};

export default TradingScreen;