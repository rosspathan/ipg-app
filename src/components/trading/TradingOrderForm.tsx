import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import AmountSlider from './AmountSlider';
import TradingHaltedBanner from './TradingHaltedBanner';
import { useTradingEngineStatus } from '@/hooks/useTradingEngineStatus';
import { Zap, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface TradingOrderFormProps {
  selectedPair: string;
  orderSide: 'buy' | 'sell';
  onOrderSideChange: (side: 'buy' | 'sell') => void;
  orderType: 'market' | 'limit';
  onOrderTypeChange: (type: 'market' | 'limit') => void;
  currentPrice: number;
  availableBalance: {
    buy: number;
    sell: number;
  };
  onPlaceOrder: (orderData: {
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    amount: number;
    price?: number;
  }) => void;
  isLoading: boolean;
}

const TradingOrderForm: React.FC<TradingOrderFormProps> = ({
  selectedPair,
  orderSide,
  onOrderSideChange,
  orderType,
  onOrderTypeChange,
  currentPrice,
  availableBalance,
  onPlaceOrder,
  isLoading
}) => {
  const [price, setPrice] = useState('');
  const [selectedPercentage, setSelectedPercentage] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  
  const { data: engineStatus } = useTradingEngineStatus();
  const isHalted = engineStatus?.isHalted ?? false;

  const [baseAsset, quoteAsset] = selectedPair.split('/');
  const currentBalance = orderSide === 'buy' ? availableBalance.buy : availableBalance.sell;
  const balanceCurrency = orderSide === 'buy' ? quoteAsset : baseAsset;
  
  const calculatedAmount = (currentBalance * selectedPercentage) / 100;
  const finalAmount = customAmount ? parseFloat(customAmount) : calculatedAmount;
  
  const estimatedTotal = orderType === 'market' 
    ? finalAmount * currentPrice
    : price ? finalAmount * parseFloat(price) : 0;

  const estimatedFee = estimatedTotal * 0.005; // 0.5% fee

  useEffect(() => {
    if (orderType === 'limit' && !price) {
      setPrice(currentPrice.toString());
    }
  }, [orderType, currentPrice, price]);

  const handlePlaceOrder = () => {
    if (!finalAmount || (orderType === 'limit' && !price)) return;
    
    onPlaceOrder({
      side: orderSide,
      type: orderType,
      amount: finalAmount,
      price: orderType === 'limit' ? parseFloat(price) : undefined
    });
  };

  const isValidOrder = finalAmount > 0 && 
    finalAmount <= currentBalance && 
    (orderType === 'market' || (orderType === 'limit' && parseFloat(price) > 0));

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          Place Order
          <div className="flex items-center gap-2">
            {isHalted && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Halted
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {selectedPair}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trading Halted Banner */}
        <TradingHaltedBanner
          circuitBreakerActive={engineStatus?.circuitBreakerActive ?? false}
          autoMatchingEnabled={engineStatus?.autoMatchingEnabled ?? true}
        />
        {/* Buy/Sell Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={orderSide === 'buy' ? 'default' : 'outline'}
            onClick={() => onOrderSideChange('buy')}
            className={`transition-all duration-200 ${
              orderSide === 'buy' 
                ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25' 
                : 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Buy
          </Button>
          <Button
            variant={orderSide === 'sell' ? 'default' : 'outline'}
            onClick={() => onOrderSideChange('sell')}
            className={`transition-all duration-200 ${
              orderSide === 'sell' 
                ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/25' 
                : 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white'
            }`}
          >
            <TrendingDown className="w-4 h-4 mr-1" />
            Sell
          </Button>
        </div>

        {/* Order Type */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={orderType === 'market' ? 'default' : 'outline'}
            onClick={() => onOrderTypeChange('market')}
            size="sm"
            className="transition-all duration-200"
          >
            <Zap className="w-3 h-3 mr-1" />
            Market
          </Button>
          <Button
            variant={orderType === 'limit' ? 'default' : 'outline'}
            onClick={() => onOrderTypeChange('limit')}
            size="sm"
            className="transition-all duration-200"
          >
            <DollarSign className="w-3 h-3 mr-1" />
            Limit
          </Button>
        </div>

        {/* Price Input (for limit orders) */}
        {orderType === 'limit' && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Price ({quoteAsset})</Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pr-16"
                step="0.01"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {quoteAsset}
              </div>
            </div>
          </div>
        )}

        {/* Amount Slider */}
        <AmountSlider
          availableBalance={currentBalance}
          selectedPercentage={selectedPercentage}
          onPercentageChange={setSelectedPercentage}
          currency={balanceCurrency}
          orderSide={orderSide}
        />

        {/* Custom Amount Input */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            Custom Amount ({balanceCurrency})
          </Label>
          <Input
            type="number"
            placeholder={`Enter custom amount in ${balanceCurrency}`}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="text-sm"
            step={orderSide === 'buy' ? '0.01' : '0.000001'}
          />
        </div>

        {/* Order Summary */}
        {finalAmount > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">
                {finalAmount.toFixed(orderSide === 'buy' ? 2 : 6)} {balanceCurrency}
              </span>
            </div>
            
            {orderType === 'limit' && price && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium">
                  {parseFloat(price).toLocaleString()} {quoteAsset}
                </span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Est. Total:</span>
              <span className="font-medium">
                {estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {quoteAsset}
              </span>
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Est. Fee (0.5%):</span>
              <span>{estimatedFee.toFixed(4)} {quoteAsset}</span>
            </div>
          </div>
        )}

        {/* Place Order Button */}
        <Button 
          className={`w-full h-12 font-semibold transition-all duration-200 ${
            isHalted 
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : orderSide === 'buy' 
                ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25' 
                : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/25'
          } ${isValidOrder && !isHalted ? 'animate-pulse' : ''}`}
          disabled={!isValidOrder || isLoading || isHalted}
          onClick={handlePlaceOrder}
        >
          {isHalted ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Trading Halted
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Placing Order...
            </div>
          ) : (
            `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${baseAsset}`
          )}
        </Button>

        {/* Balance warning */}
        {finalAmount > currentBalance && (
          <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">
            Insufficient balance. Available: {currentBalance.toFixed(orderSide === 'buy' ? 2 : 6)} {balanceCurrency}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradingOrderForm;