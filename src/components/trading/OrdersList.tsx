import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { X, Filter, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  order_type: string;
  amount: number;
  price?: number;
  status: string;
  filled_amount: number;
  remaining_amount: number;
  created_at: string;
  locked_amount?: number;
  locked_asset_symbol?: string;
}

interface OrdersListProps {
  orders: Order[];
  onCancel?: (orderId: string) => void;
  showCancelButton?: boolean;
  currentSymbol?: string;
  showAllOrdersOption?: boolean;
}

export const OrdersList = ({ 
  orders, 
  onCancel, 
  showCancelButton = true,
  currentSymbol,
  showAllOrdersOption = true
}: OrdersListProps) => {
  const [filterSymbol, setFilterSymbol] = useState<string>(currentSymbol || 'all');

  // Get unique symbols from orders
  const uniqueSymbols = [...new Set(orders.map(o => o.symbol))];

  // Filter orders based on selected symbol
  const filteredOrders = filterSymbol === 'all' 
    ? orders 
    : orders.filter(o => o.symbol === filterSymbol);

  if (!orders || orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No orders yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter by pair - only show if there are multiple pairs and option is enabled */}
      {showAllOrdersOption && uniqueSymbols.length > 0 && (
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterSymbol} onValueChange={setFilterSymbol}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filter pair" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pairs ({orders.length})</SelectItem>
              {uniqueSymbols.map(symbol => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol} ({orders.filter(o => o.symbol === symbol).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterSymbol !== 'all' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={() => setFilterSymbol('all')}
            >
              Show All
            </Button>
          )}
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          No orders for {filterSymbol}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-xs font-bold uppercase px-2 py-0.5 rounded",
                    order.side === 'buy' 
                      ? "bg-emerald-500/20 text-emerald-500" 
                      : "bg-rose-500/20 text-rose-500"
                  )}>
                    {order.side}
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {order.symbol}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {order.order_type}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    Qty: <span className="text-foreground font-mono">{order.amount}</span>
                  </span>
                  {order.price && (
                    <span className="text-muted-foreground">
                      @ <span className="text-foreground font-mono">${order.price}</span>
                    </span>
                  )}
                  <span className={cn(
                    "font-medium capitalize",
                    order.status === 'filled' && "text-success",
                    order.status === 'pending' && "text-warning",
                    order.status === 'partially_filled' && "text-warning",
                    order.status === 'cancelled' && "text-muted-foreground"
                  )}>
                    {order.status === 'partially_filled' ? 'Partial' : order.status}
                  </span>
                </div>

                {/* Show locked amount if available */}
                {order.locked_amount && order.locked_amount > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Locked: <span className="font-mono text-warning">{order.locked_amount} {order.locked_asset_symbol}</span>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(order.created_at), 'MMM d, h:mm a')}
                </div>
              </div>

              {showCancelButton && (order.status === 'pending' || order.status === 'partially_filled') && onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(order.id)}
                  className="h-8 w-8 p-0 hover:bg-rose-500/20 hover:text-rose-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
