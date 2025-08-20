import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TradingScreen = () => {
  const navigate = useNavigate();
  const { pair } = useParams<{ pair: string }>();
  const { toast } = useToast();
  const marketPair = pair?.replace('-', '/') || 'BTC/USDT';
  
  // Simple Buy/Sell state
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState("");
  const [fiatAmount, setFiatAmount] = useState("");
  
  // Pro Terminal state
  const [proOrderType, setProOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [proPrice, setProPrice] = useState("");
  const [proAmount, setProAmount] = useState("");
  const [proTotal, setProTotal] = useState("");

  const currentPrice = 43250.00;
  const estimatedFee = 0.1; // 0.1%

  const handleSimpleOrder = () => {
    if (!amount) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount",
        variant: "destructive",
      });
      return;
    }

    // Navigate to PIN confirmation
    navigate("/order-confirmation", {
      state: {
        orderDetails: {
          pair: marketPair,
          type: orderType,
          orderMethod: 'market',
          amount: amount,
          price: currentPrice.toLocaleString(),
          total: (parseFloat(amount) * currentPrice).toLocaleString(),
          fee: ((parseFloat(amount) * currentPrice * estimatedFee) / 100).toFixed(2),
        }
      }
    });
  };

  const handleProOrder = (side: 'buy' | 'sell') => {
    if (!proAmount || (proOrderType === 'limit' && !proPrice)) {
      toast({
        title: "Invalid Order",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const orderPrice = proOrderType === 'market' ? currentPrice : parseFloat(proPrice);
    
    navigate("/order-confirmation", {
      state: {
        orderDetails: {
          pair: marketPair,
          type: side,
          orderMethod: proOrderType,
          amount: proAmount,
          price: orderPrice.toLocaleString(),
          total: (parseFloat(proAmount) * orderPrice).toLocaleString(),
          fee: ((parseFloat(proAmount) * orderPrice * estimatedFee) / 100).toFixed(2),
        }
      }
    });
  };

  const calculateTotal = () => {
    if (proAmount && proPrice) {
      const total = parseFloat(proAmount) * parseFloat(proPrice);
      setProTotal(total.toFixed(2));
    }
  };

  const openOrders = [
    { pair: "BTC/USDT", type: "Limit Buy", price: "42,800", amount: "0.1", status: "Open" },
    { pair: "ETH/USDT", type: "Limit Sell", price: "2,700", amount: "0.5", status: "Partial" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Trade {marketPair}</h1>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Current Price</p>
        <p className="text-2xl font-bold text-foreground">{currentPrice.toLocaleString()}</p>
      </div>

      <Tabs defaultValue="simple" className="flex-1">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="simple">Simple</TabsTrigger>
          <TabsTrigger value="pro">Pro Terminal</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-6">
          <div className="flex space-x-2 mb-4">
            <Button 
              variant={orderType === 'buy' ? 'default' : 'outline'}
              onClick={() => setOrderType('buy')}
              className="flex-1"
            >
              Buy
            </Button>
            <Button 
              variant={orderType === 'sell' ? 'default' : 'outline'}
              onClick={() => setOrderType('sell')}
              className="flex-1"
            >
              Sell
            </Button>
          </div>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle>
                {orderType === 'buy' ? 'Buy' : 'Sell'} {marketPair.split('/')[0]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Amount ({marketPair.split('/')[0]})</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setFiatAmount((parseFloat(e.target.value || "0") * currentPrice).toFixed(2));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Estimated Value ({marketPair.split('/')[1]})</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={fiatAmount}
                  onChange={(e) => {
                    setFiatAmount(e.target.value);
                    setAmount((parseFloat(e.target.value || "0") / currentPrice).toFixed(6));
                  }}
                />
              </div>

              {amount && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Estimated Fee:</span>
                    <span>{((parseFloat(fiatAmount || "0") * estimatedFee) / 100).toFixed(2)} {marketPair.split('/')[1]}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total:</span>
                    <span>{fiatAmount} {marketPair.split('/')[1]}</span>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSimpleOrder}
                className="w-full"
                size="lg"
                disabled={!amount}
              >
                {orderType === 'buy' ? 'Buy' : 'Sell'} {marketPair.split('/')[0]}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pro" className="space-y-6">
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="orders">Place Order</TabsTrigger>
              <TabsTrigger value="open">Open Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              <div className="flex space-x-2">
                {['market', 'limit', 'stop'].map((type) => (
                  <Button
                    key={type}
                    variant={proOrderType === type ? 'default' : 'outline'}
                    onClick={() => setProOrderType(type as 'market' | 'limit' | 'stop')}
                    size="sm"
                    className="flex-1"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>

              <Card className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-4 space-y-4">
                  {proOrderType !== 'market' && (
                    <div className="space-y-2">
                      <Label>Price ({marketPair.split('/')[1]})</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={proPrice}
                        onChange={(e) => setProPrice(e.target.value)}
                        onBlur={calculateTotal}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Amount ({marketPair.split('/')[0]})</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={proAmount}
                      onChange={(e) => setProAmount(e.target.value)}
                      onBlur={calculateTotal}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Total ({marketPair.split('/')[1]})</Label>
                      <Button variant="ghost" size="icon" onClick={calculateTotal}>
                        <Calculator className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={proTotal}
                      onChange={(e) => setProTotal(e.target.value)}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Estimated Fee: {estimatedFee}% ({((parseFloat(proTotal || "0") * estimatedFee) / 100).toFixed(2)} {marketPair.split('/')[1]})
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="default"
                      onClick={() => handleProOrder('buy')}
                      disabled={!proAmount || (proOrderType === 'limit' && !proPrice)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Buy
                    </Button>
                    <Button 
                      variant="default"
                      onClick={() => handleProOrder('sell')}
                      disabled={!proAmount || (proOrderType === 'limit' && !proPrice)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Sell
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="open" className="space-y-4">
              <Card className="bg-gradient-card shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-base">Open Orders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {openOrders.map((order, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{order.pair}</p>
                        <p className="text-xs text-muted-foreground">{order.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{order.price}</p>
                        <p className="text-xs text-muted-foreground">{order.amount}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${
                          order.status === 'Open' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingScreen;