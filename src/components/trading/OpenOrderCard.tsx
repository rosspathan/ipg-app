import React from 'react';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface OpenOrderCardProps {
  order: {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    order_type: string;
    price: number;
    amount: number;
    filled_amount: number;
    created_at: string;
    status: string;
  };
  index: number;
  onCancel: (orderId: string) => void;
}

export const OpenOrderCard: React.FC<OpenOrderCardProps> = ({ order, index, onCancel }) => {
  const filledPercent = order.amount > 0 
    ? Math.round((order.filled_amount / order.amount) * 100) 
    : 0;
  
  const [base, quote] = order.symbol.split('/');
  const isBuy = order.side === 'buy';

  return (
    <div className="bg-[#1e1e2d] border border-gray-700 rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">
            #{index + 1}
          </span>
          <span className="font-medium text-white">{order.symbol}</span>
          <Share2 className="h-3.5 w-3.5 text-gray-500" />
        </div>
        <button
          onClick={() => onCancel(order.id)}
          className="text-red-400 hover:text-red-300 text-xs font-medium"
        >
          Cancel
        </button>
      </div>

      {/* Type and Time */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs px-2 py-0.5 rounded",
          isBuy 
            ? "bg-emerald-500/20 text-emerald-400" 
            : "bg-amber-500/20 text-amber-400"
        )}>
          {order.order_type}/{order.side}
        </span>
        <span className="text-xs text-gray-400">
          {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm:ss')}
        </span>
      </div>

      {/* Filled Progress */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs px-2 py-0.5 rounded",
          filledPercent > 0 ? "bg-amber-500/20 text-amber-400" : "bg-gray-700 text-gray-400"
        )}>
          {filledPercent}%
        </span>
        <div className="text-right">
          <div className="text-xs text-gray-400">Filled / Amount</div>
          <div className="text-sm font-mono text-white">
            {order.filled_amount.toFixed(2)} / {order.amount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-700">
        <span className="text-xs text-gray-400">Price</span>
        <span className="font-mono text-white">{order.price?.toFixed(4) || 'Market'}</span>
      </div>
    </div>
  );
};
