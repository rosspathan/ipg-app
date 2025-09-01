import { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useFX } from '@/hooks/useFX';
import { useCatalog } from '@/hooks/useCatalog';

export default function CurrencyPicker() {
  const { displayCurrency, updateDisplayCurrency, loading } = useFX();
  const { assetsList } = useCatalog();
  const [open, setOpen] = useState(false);

  const fiatCurrencies = [
    { symbol: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { symbol: 'INR', name: 'Indian Rupee', flag: '🇮🇳' }
  ];

  const cryptoCurrencies = assetsList
    .filter(asset => asset.is_active && asset.trading_enabled && asset.symbol !== 'INR')
    .map(asset => ({
      symbol: asset.symbol,
      name: asset.name,
      logo: asset.logo_url
    }));

  const handleCurrencyChange = async (currency: string) => {
    await updateDisplayCurrency(currency);
    setOpen(false);
  };

  const getCurrentCurrencyInfo = () => {
    const fiat = fiatCurrencies.find(c => c.symbol === displayCurrency);
    if (fiat) return { name: fiat.name, icon: fiat.flag };
    
    const crypto = cryptoCurrencies.find(c => c.symbol === displayCurrency);
    if (crypto) return { name: crypto.name, icon: crypto.logo };
    
    return { name: displayCurrency, icon: '💰' };
  };

  const currentCurrency = getCurrentCurrencyInfo();

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Globe className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{displayCurrency}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Display Currency</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-lg">{typeof currentCurrency.icon === 'string' ? currentCurrency.icon : '💰'}</span>
            <div>
              <div className="font-medium">{displayCurrency}</div>
              <div className="text-sm text-muted-foreground">{currentCurrency.name}</div>
            </div>
            <Badge variant="secondary" className="ml-auto">Current</Badge>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">Fiat Currencies</h4>
              <div className="space-y-2">
                {fiatCurrencies.map((currency) => (
                  <button
                    key={currency.symbol}
                    onClick={() => handleCurrencyChange(currency.symbol)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <span className="text-lg">{currency.flag}</span>
                    <div className="text-left">
                      <div className="font-medium">{currency.symbol}</div>
                      <div className="text-sm text-muted-foreground">{currency.name}</div>
                    </div>
                    {displayCurrency === currency.symbol && (
                      <Check className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Cryptocurrencies</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cryptoCurrencies.map((currency) => (
                  <button
                    key={currency.symbol}
                    onClick={() => handleCurrencyChange(currency.symbol)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs">
                      {currency.symbol.slice(0, 2)}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{currency.symbol}</div>
                      <div className="text-sm text-muted-foreground">{currency.name}</div>
                    </div>
                    {displayCurrency === currency.symbol && (
                      <Check className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}