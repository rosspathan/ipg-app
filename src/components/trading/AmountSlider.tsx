import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface AmountSliderProps {
  availableBalance: number;
  selectedPercentage: number;
  onPercentageChange: (percentage: number) => void;
  currency: string;
  orderSide: 'buy' | 'sell';
}

const AmountSlider: React.FC<AmountSliderProps> = ({
  availableBalance,
  selectedPercentage,
  onPercentageChange,
  currency,
  orderSide
}) => {
  const percentageOptions = [10, 25, 50, 75, 100];

  const selectedAmount = (availableBalance * selectedPercentage) / 100;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Amount Selection</span>
        <span className="text-sm text-muted-foreground">
          {selectedPercentage}% of available
        </span>
      </div>
      
      {/* Visual Balance Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            orderSide === 'buy' ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ width: `${selectedPercentage}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      </div>

      {/* Slider */}
      <div className="px-2">
        <Slider
          value={[selectedPercentage]}
          onValueChange={([value]) => onPercentageChange(value)}
          max={100}
          min={0}
          step={1}
          className="w-full"
        />
      </div>

      {/* Quick percentage buttons */}
      <div className="grid grid-cols-5 gap-2">
        {percentageOptions.map((percentage) => (
          <Button
            key={percentage}
            variant={selectedPercentage === percentage ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPercentageChange(percentage)}
            className={`text-xs transition-all duration-200 ${
              selectedPercentage === percentage
                ? orderSide === 'buy' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
                : ''
            }`}
          >
            {percentage}%
          </Button>
        ))}
      </div>

      {/* Amount display */}
      <div className="p-3 bg-muted/50 rounded-lg border">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Selected Amount:</span>
          <span className="text-sm font-semibold">
            {selectedAmount.toFixed(orderSide === 'buy' ? 2 : 6)} {currency}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-muted-foreground">Available:</span>
          <span className="text-xs">
            {availableBalance.toFixed(orderSide === 'buy' ? 2 : 6)} {currency}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AmountSlider;