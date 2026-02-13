 import React, { useState } from 'react';
 import { format } from 'date-fns';
 import { Copy, Check } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import BigNumber from 'bignumber.js';
 import type { Order } from '@/hooks/useTradeHistory';
 
 interface OrderHistoryTabProps {
   orders: Order[];
   currentSymbol?: string;
   onDetails?: (orderId: string) => void;
 }
 
 export function OrderHistoryTab({
   orders,
   currentSymbol,
   onDetails
 }: OrderHistoryTabProps) {
   const [filterStatus, setFilterStatus] = useState<string>('all');
   const [copiedId, setCopiedId] = useState<string | null>(null);
 
   const filteredOrders = orders.filter(o => {
     if (filterStatus !== 'all' && o.status !== filterStatus) return false;
     return true;
   });
 
   const copyOrderId = (id: string) => {
     navigator.clipboard.writeText(id);
     setCopiedId(id);
     setTimeout(() => setCopiedId(null), 2000);
   };
 
   const getStatusColor = (status: string) => {
     switch (status) {
       case 'filled': return 'text-emerald-400';
       case 'cancelled': return 'text-muted-foreground';
       case 'pending': case 'open': return 'text-amber-400';
       case 'partially_filled': return 'text-blue-400';
       case 'rejected': return 'text-rose-400';
       default: return 'text-foreground';
     }
   };
 
   const getStatusBg = (status: string) => {
     switch (status) {
       case 'filled': return 'bg-emerald-500/10';
       case 'cancelled': return 'bg-muted';
       case 'pending': case 'open': return 'bg-amber-500/10';
       case 'partially_filled': return 'bg-blue-500/10';
       case 'rejected': return 'bg-rose-500/10';
       default: return 'bg-muted';
     }
   };
 
  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-[32px] text-[11px] text-[#6B7280]">
        No order history{currentSymbol ? ` for ${currentSymbol}` : ''}
      </div>
    );
  }
 
   return (
     <div className="space-y-2">
       {/* Header with filter */}
       <div className="flex items-center justify-between pb-2 border-b border-border/30">
         <div className="text-xs text-muted-foreground">
           {currentSymbol && <span>Orders for <span className="font-medium text-foreground">{currentSymbol}</span></span>}
         </div>
         <div className="flex gap-1">
           {['all', 'filled', 'cancelled', 'pending'].map(status => (
             <button
               key={status}
               onClick={() => setFilterStatus(status)}
               className={cn(
                 "px-2 py-1 text-[10px] rounded capitalize transition-colors",
                 filterStatus === status 
                   ? "bg-primary text-primary-foreground" 
                   : "bg-muted text-muted-foreground hover:text-foreground"
               )}
             >
               {status === 'all' ? 'All' : status}
             </button>
           ))}
         </div>
       </div>
 
       {/* Mobile-friendly table */}
       <div className="space-y-1.5">
         {filteredOrders.map((order) => {
           const filledPercent = Number(order.amount) > 0 
             ? new BigNumber(order.filled_amount || 0).dividedBy(order.amount).times(100).toNumber()
             : 0;
           const avgPrice = order.average_price || order.price || 0;
           const [base, quote] = order.symbol.split('/');
           const total = new BigNumber(order.filled_amount || 0).times(avgPrice).toNumber();
 
           return (
             <div
               key={order.id}
               className={cn(
                 "rounded-lg border border-border p-3 transition-colors",
                 getStatusBg(order.status)
               )}
               onClick={() => onDetails?.(order.id)}
             >
               {/* Header */}
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <span className={cn(
                     "text-[11px] font-bold uppercase px-2 py-0.5 rounded",
                     order.side === 'buy' 
                       ? "bg-emerald-500/20 text-emerald-400" 
                       : "bg-rose-500/20 text-rose-400"
                   )}>
                     {order.side}
                   </span>
                   <span className="text-sm font-medium text-foreground">{order.symbol}</span>
                   <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground capitalize">
                     {order.order_type}
                   </span>
                 </div>
                 <span className={cn(
                   "text-[11px] font-semibold capitalize px-2 py-0.5 rounded",
                   getStatusColor(order.status),
                   getStatusBg(order.status)
                 )}>
                   {order.status.replace('_', ' ')}
                 </span>
               </div>
 
               {/* Data */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                 <div>
                   <div className="text-muted-foreground text-[10px]">Price</div>
                   <div className="font-mono text-foreground font-medium">
                     {order.price ? Number(order.price).toFixed(4) : 'Market'}
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Amount</div>
                   <div className="font-mono text-foreground">{Number(order.amount).toFixed(4)} {base}</div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Filled</div>
                   <div className="font-mono text-foreground">
                     {Number(order.filled_amount || 0).toFixed(4)} ({filledPercent.toFixed(0)}%)
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Avg Price</div>
                   <div className="font-mono text-foreground">
                     {avgPrice > 0 ? Number(avgPrice).toFixed(4) : '-'}
                   </div>
                 </div>
               </div>
 
               {/* Footer */}
               <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                 <span>{format(new Date(order.created_at), 'MMM d, HH:mm:ss')}</span>
                 <button 
                   onClick={(e) => { e.stopPropagation(); copyOrderId(order.id); }}
                   className="flex items-center gap-1 hover:text-foreground transition-colors"
                 >
                   {copiedId === order.id ? (
                     <><Check className="h-3 w-3" /> Copied</>
                   ) : (
                     <><Copy className="h-3 w-3" /> {order.id.slice(0, 8)}</>
                   )}
                 </button>
               </div>
             </div>
           );
         })}
       </div>
     </div>
   );
 }