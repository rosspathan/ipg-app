import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

const TradingScreen = () => {
  const navigate = useNavigate();
  const { pair } = useParams<{ pair: string }>();
  const [selectedPair, setSelectedPair] = useState(pair?.replace('-', '/') || 'BTC/USDT');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');

  // Mock data
  const tradingPairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT'];
  const mockPrice = 43250.50;
  const mockChange = 2.45;
  
  const mockOrderBook = {
    asks: [
      { price: 43255.50, quantity: 0.125, total: 5406.94 },
      { price: 43260.00, quantity: 0.087, total: 3763.62 },
      { price: 43265.25, quantity: 0.205, total: 8864.38 },
    ],
    bids: [
      { price: 43245.75, quantity: 0.098, total: 4238.08 },
      { price: 43240.00, quantity: 0.156, total: 6745.44 },
      { price: 43235.50, quantity: 0.234, total: 10117.11 },
    ]
  };

  const mockTrades = [
    { price: 43250.50, quantity: 0.025, side: 'buy', time: '14:32:15' },
    { price: 43248.75, quantity: 0.087, side: 'sell', time: '14:32:12' },
    { price: 43252.00, quantity: 0.045, side: 'buy', time: '14:32:08' },
  ];

  const mockOpenOrders = [
    { id: '1', pair: 'BTC/USDT', side: 'buy', type: 'limit', amount: '0.025', price: '43000.00', status: 'open' },
    { id: '2', pair: 'ETH/USDT', side: 'sell', type: 'limit', amount: '0.5', price: '2650.00', status: 'open' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Spot Trading</h1>
        </div>
      </div>

      {/* Market Selector */}
      <div className="p-4 border-b border-border">
        <Select value={selectedPair} onValueChange={setSelectedPair}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tradingPairs.map((pair) => (
              <SelectItem key={pair} value={pair}>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{pair}</span>
                  <div className="text-right ml-4">
                    <div className="text-sm font-semibold">
                      {pair === selectedPair ? mockPrice.toLocaleString() : (Math.random() * 1000).toFixed(2)}
                    </div>
                    <div className={`text-xs ${mockChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {mockChange > 0 ? '+' : ''}{mockChange}%
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Price Display */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">${mockPrice.toLocaleString()}</span>
            <div className={`flex items-center gap-1 ${mockChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {mockChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-medium">{mockChange > 0 ? '+' : ''}{mockChange}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="p-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-48 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Price Chart</p>
                <p className="text-xs text-muted-foreground/70">TradingView integration coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Book & Recent Trades */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Order Book */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order Book</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Asks */}
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-1 border-b">
                  <span>Price (USDT)</span>
                  <span className="text-right">Amount (BTC)</span>
                  <span className="text-right">Total</span>
                </div>
                {mockOrderBook.asks.map((ask, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 text-xs text-red-500">
                    <span>{ask.price.toLocaleString()}</span>
                    <span className="text-right">{ask.quantity}</span>
                    <span className="text-right">{ask.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Current Price */}
              <div className="py-2 text-center border-y border-border">
                <span className="text-lg font-bold">${mockPrice.toLocaleString()}</span>
              </div>

              {/* Bids */}
              <div className="space-y-1">
                {mockOrderBook.bids.map((bid, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 text-xs text-green-500">
                    <span>{bid.price.toLocaleString()}</span>
                    <span className="text-right">{bid.quantity}</span>
                    <span className="text-right">{bid.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-1 border-b">
                  <span>Price</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Time</span>
                </div>
                {mockTrades.map((trade, i) => (
                  <div key={i} className={`grid grid-cols-3 gap-2 text-xs ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                    <span>{trade.price.toLocaleString()}</span>
                    <span className="text-right">{trade.quantity}</span>
                    <span className="text-right text-muted-foreground">{trade.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Place Order Form */}
      <div className="p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Place Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Buy/Sell Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={orderSide === 'buy' ? 'default' : 'outline'}
                onClick={() => setOrderSide('buy')}
                className={orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'}
              >
                Buy
              </Button>
              <Button
                variant={orderSide === 'sell' ? 'default' : 'outline'}
                onClick={() => setOrderSide('sell')}
                className={orderSide === 'sell' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white'}
              >
                Sell
              </Button>
            </div>

            {/* Order Type */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={orderType === 'market' ? 'default' : 'outline'}
                onClick={() => setOrderType('market')}
                size="sm"
              >
                Market
              </Button>
              <Button
                variant={orderType === 'limit' ? 'default' : 'outline'}
                onClick={() => setOrderType('limit')}
                size="sm"
              >
                Limit
              </Button>
            </div>

            {/* Price (for limit orders) */}
            {orderType === 'limit' && (
              <div className="space-y-2">
                <Label className="text-xs">Price (USDT)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-xs">Amount (BTC)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Balance Display */}
            <div className="text-xs p-2 bg-muted/50 rounded">
              <div className="flex justify-between">
                <span>Available:</span>
                <span>{orderSide === 'buy' ? '1,000.00 USDT' : '0.1000 BTC'}</span>
              </div>
            </div>

            {/* Total and Fee Preview */}
            {amount && (
              <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                <div className="flex justify-between">
                  <span>Est. Total:</span>
                  <span>
                    {orderType === 'market' 
                      ? (parseFloat(amount) * mockPrice).toLocaleString()
                      : price ? (parseFloat(amount) * parseFloat(price)).toLocaleString() : '0'
                    } USDT
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Est. Fee:</span>
                  <span>0.1% (0.0001 USDT)</span>
                </div>
              </div>
            )}

            <Button 
              className={`w-full ${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              disabled={!amount || (orderType === 'limit' && !price)}
            >
              {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedPair.split('/')[0]}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Open Orders & Trade History */}
      <div className="p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Open Orders & Trade History</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="open" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="open">Open Orders</TabsTrigger>
                <TabsTrigger value="history">Trade History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="open" className="space-y-2 mt-4">
                {mockOpenOrders.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground pb-1 border-b">
                      <span>Pair</span>
                      <span>Side</span>
                      <span>Amount</span>
                      <span>Price</span>
                      <span>Action</span>
                    </div>
                    {mockOpenOrders.map((order) => (
                      <div key={order.id} className="grid grid-cols-5 gap-2 text-xs items-center">
                        <span>{order.pair}</span>
                        <span className={order.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                          {order.side.toUpperCase()}
                        </span>
                        <span>{order.amount}</span>
                        <span>${order.price}</span>
                        <Button size="sm" variant="outline" className="h-6 text-xs">
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No open orders</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No trade history</p>
                  <p className="text-xs mt-1">Your completed trades will appear here</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TradingScreen;