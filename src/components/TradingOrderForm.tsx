import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calculator, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderFormProps {
  selectedPair: string;
  tradingType: 'spot' | 'futures';
  livePrice: number;
  balances: any;
  feePreview: { maker_fee: number; taker_fee: number; fee_asset: string };
  onPlaceOrder: (orderData: any) => Promise<any>;
}

const TradingOrderForm: React.FC<OrderFormProps> = ({
  selectedPair,
  tradingType,
  livePrice,
  balances,
  feePreview,
  onPlaceOrder
}) => {
  const { toast } = useToast();
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState('1');

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

    const result = await onPlaceOrder({
      symbol: selectedPair,
      side: orderSide,
      type: orderType as 'market' | 'limit' | 'stop_limit',
      quantity: parseFloat(amount),
      price: orderType !== 'market' ? parseFloat(price) : undefined,
      time_in_force: 'GTC'
    });

    // Clear form if successful
    if (result?.success) {
      setAmount('');
      setPrice('');
    }
  };

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="w-4 h-4" />
          Place Order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Buy/Sell Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={orderSide === 'buy' ? 'default' : 'outline'}
            onClick={() => setOrderSide('buy')}
            className={`${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'}`}
            size="sm"
          >
            Buy
          </Button>
          <Button
            variant={orderSide === 'sell' ? 'default' : 'outline'}
            onClick={() => setOrderSide('sell')}
            className={`${orderSide === 'sell' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white'}`}
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

        {/* Balance Display */}
        <div className="text-xs p-2 bg-muted/50 rounded">
          <div className="flex justify-between">
            <span>Available:</span>
            <span>
              {orderSide === 'buy' ? '1,000.00 USDT' : '0.1000 BTC'}
            </span>
          </div>
          <div className="text-muted-foreground text-xs mt-1">
            Mock balances - real balances after migration
          </div>
        </div>

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

        {/* Total and Fee Preview */}
        {amount && (
          <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
            <div className="flex justify-between">
              <span>Est. Total:</span>
              <span>
                {orderType === 'market' 
                  ? (parseFloat(amount) * (livePrice || 0)).toLocaleString()
                  : price ? (parseFloat(amount) * parseFloat(price)).toLocaleString() : '0'
                } USDT
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Est. Fee:</span>
              <span>{feePreview.taker_fee.toFixed(4)} {feePreview.fee_asset}</span>
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
  );
};

export default TradingOrderForm;