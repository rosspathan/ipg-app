import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Calculator, TrendingUp, TrendingDown, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TradingViewWidget from "@/components/TradingViewWidget";

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

  const tradingPairs = [
    { pair: "BTC/USDT", symbol: "BINANCE:BTCUSDT", futures: "BINANCE:BTCUSDTPERP" },
    { pair: "ETH/USDT", symbol: "BINANCE:ETHUSDT", futures: "BINANCE:ETHUSDTPERP" },
    { pair: "BNB/USDT", symbol: "BINANCE:BNBUSDT", futures: "BINANCE:BNBUSDTPERP" },
    { pair: "ADA/USDT", symbol: "BINANCE:ADAUSDT", futures: "BINANCE:ADAUSDTPERP" },
    { pair: "SOL/USDT", symbol: "BINANCE:SOLUSDT", futures: "BINANCE:SOLUSDTPERP" },
  ];

  const currentPair = tradingPairs.find(p => p.pair === selectedPair) || tradingPairs[0];
  const currentSymbol = tradingType === 'spot' ? currentPair.symbol : currentPair.futures;

  // Mock market data
  const marketData = {
    price: "43,250.00",
    change24h: "+2.45%",
    high24h: "44,100.00",
    low24h: "42,800.00",
    volume24h: "1,234.56M",
    isPositive: true
  };

  // Mock order book data
  const orderBook = {
    bids: [
      { price: "43,245.50", amount: "0.125", total: "5,405.69" },
      { price: "43,240.25", amount: "0.456", total: "19,717.55" },
      { price: "43,235.00", amount: "0.789", total: "34,116.42" },
      { price: "43,230.75", amount: "0.234", total: "10,115.96" },
      { price: "43,225.50", amount: "0.567", total: "24,508.86" },
    ],
    asks: [
      { price: "43,250.50", amount: "0.235", total: "10,163.87" },
      { price: "43,255.75", amount: "0.678", total: "29,327.40" },
      { price: "43,260.00", amount: "0.345", total: "14,924.70" },
      { price: "43,265.25", amount: "0.567", total: "24,511.46" },
      { price: "43,270.50", amount: "0.123", total: "5,322.27" },
    ]
  };

  const handlePlaceOrder = () => {
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

    const orderPrice = orderType === 'market' ? parseFloat(marketData.price.replace(',', '')) : parseFloat(price);
    const totalValue = parseFloat(amount) * orderPrice;
    const fee = totalValue * 0.001; // 0.1% fee

    navigate("/order-confirmation", {
      state: {
        orderDetails: {
          pair: selectedPair,
          type: orderSide,
          orderMethod: orderType,
          tradingType,
          amount: amount,
          price: orderPrice.toLocaleString(),
          total: totalValue.toLocaleString(),
          fee: fee.toFixed(2),
          leverage: tradingType === 'futures' ? leverage : undefined,
        }
      }
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
              {tradingPairs.map(pair => (
                <SelectItem key={pair.pair} value={pair.pair}>
                  {pair.pair}
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
                symbol={currentSymbol}
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
                  {orderBook.asks.slice().reverse().map((ask, index) => (
                    <div key={index} className="flex justify-between text-xs px-3 py-1 hover:bg-red-500/10">
                      <span className="text-red-500">{ask.price}</span>
                      <span>{ask.amount}</span>
                      <span className="text-muted-foreground">{ask.total}</span>
                    </div>
                  ))}
                </div>
                
                {/* Current Price */}
                <div className="flex justify-center py-2 border-y border-border">
                  <span className={`font-medium ${marketData.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {marketData.price}
                  </span>
                </div>
                
                {/* Bids */}
                <div className="space-y-1 max-h-32 overflow-hidden">
                  {orderBook.bids.map((bid, index) => (
                    <div key={index} className="flex justify-between text-xs px-3 py-1 hover:bg-green-500/10">
                      <span className="text-green-500">{bid.price}</span>
                      <span>{bid.amount}</span>
                      <span className="text-muted-foreground">{bid.total}</span>
                    </div>
                  ))}
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
                        ? (parseFloat(amount) * parseFloat(marketData.price.replace(',', ''))).toLocaleString()
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
    </div>
  );
};

export default TradingScreen;