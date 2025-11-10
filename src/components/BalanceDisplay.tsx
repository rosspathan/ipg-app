import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWalletBalances } from "@/hooks/useWalletBalances";

interface BalanceDisplayProps {
  onAddFunds: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  onAddFunds,
  className,
  style
}) => {
  const { portfolio, loading } = useWalletBalances();
  const [showBalance, setShowBalance] = useState(true);
  const [currency, setCurrency] = useState("USD");
  const [animatedBalance, setAnimatedBalance] = useState(0);

  const balance = portfolio?.total_usd || 0;
  const change24h = portfolio?.change_24h_percent || 0;

  const formatBalance = (amount: number) => {
    // Handle crypto currencies separately as they're not valid ISO currency codes
    const cryptoCurrencies = ['BTC', 'USDT', 'ETH', 'BNB'];
    
    if (cryptoCurrencies.includes(currency)) {
      return `${amount.toFixed(4)} ${currency}`;
    }
    
    // Use currency formatter for fiat currencies
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    
    return formatted;
  };

  const getChangeColor = () => {
    if (change24h > 0) return "text-success";
    if (change24h < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const getChangeIcon = () => {
    if (change24h > 0) return <TrendingUp className="h-4 w-4" />;
    if (change24h < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  if (loading) {
    return (
      <GlassCard variant="accent" className={cn("overflow-hidden", className)} style={style}>
        <CardContent className="p-6">
          <div className="h-24 bg-muted/30 rounded"></div>
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard 
      variant="accent"
      className={cn("overflow-hidden", className)}
      style={style}
    >
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-lg font-medium text-foreground/90">
            Total Portfolio
          </GlassCardTitle>
          <div className="flex items-center gap-2">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-20 h-8 bg-background/20 border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="BTC">BTC</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="INR">INR</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className="h-8 w-8 p-0 hover:bg-background/20"
            >
              {showBalance ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </GlassCardHeader>
      
      <GlassCardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-4xl font-bold bg-gradient-neon bg-clip-text text-transparent">
              {showBalance ? formatBalance(balance) : "••••••"}
            </div>
            <div className={cn("flex items-center gap-1 text-sm", getChangeColor())}>
              {getChangeIcon()}
              <span>
                {showBalance 
                  ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` 
                  : "•••"
                } 24h
              </span>
            </div>
          </div>

          <Button
            onClick={onAddFunds}
            className={cn(
              "ripple bg-gradient-primary border border-primary/30",
              "text-primary-foreground font-medium px-6"
            )}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Funds
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
          <Badge variant="secondary" className="bg-background/20 text-foreground/70">
            Available: {showBalance ? formatBalance(portfolio?.available_usd || 0) : "•••"}
          </Badge>
          <Badge variant="secondary" className="bg-background/20 text-foreground/70">
            In Orders: {showBalance ? formatBalance(portfolio?.locked_usd || 0) : "•••"}
          </Badge>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};

export default BalanceDisplay;