import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface OrdersListProps {
  orders: Order[];
  onCancel?: (orderId: string) => void;
  showCancelButton?: boolean;
}

export const OrdersList = ({ orders, onCancel, showCancelButton = true }: OrdersListProps) => {
  if (!orders || orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No orders yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
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
                order.status === 'cancelled' && "text-muted-foreground"
              )}>
                {order.status}
              </span>
            </div>
            
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(order.created_at), 'MMM d, h:mm a')}
            </div>
          </div>

          {showCancelButton && order.status === 'pending' && onCancel && (
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
  );
};
