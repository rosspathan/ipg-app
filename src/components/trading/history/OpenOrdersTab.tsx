 import React from 'react';
 import { format } from 'date-fns';
 import { X, ChevronRight } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 import BigNumber from 'bignumber.js';
 import type { Order } from '@/hooks/useTradeHistory';
 
 interface OpenOrdersTabProps {
   orders: Order[];
   currentSymbol?: string;
   onCancel: (orderId: string) => Promise<any>;
   isCancelling: boolean;
   onDetails?: (orderId: string) => void;
 }
 
 export function OpenOrdersTab({
   orders,
   currentSymbol,
   onCancel,
   isCancelling,
   onDetails
 }: OpenOrdersTabProps) {
   const [cancellingId, setCancellingId] = React.useState<string | null>(null);
 
   const handleCancel = async (orderId: string) => {
     setCancellingId(orderId);
     try {
       await onCancel(orderId);
     } finally {
       setCancellingId(null);
     }
   };

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-[40px] text-[11px] text-muted-foreground/40 font-medium">
        No open orders{currentSymbol ? ` for ${currentSymbol}` : ''}
      </div>
    );
  }
 
   return (
     <div className="space-y-2">
       {currentSymbol && (
         <div className="text-[10px] text-muted-foreground/50 pb-1.5 border-b border-[hsl(230,20%,12%)]/30 font-medium">
           Showing orders for <span className="font-semibold text-foreground/70">{currentSymbol}</span>
         </div>
       )}

       <div className="space-y-2">
         {orders.map((order) => {
           const filledPercent = Number(order.amount) > 0 
             ? new BigNumber(order.filled_amount || 0).dividedBy(order.amount).times(100).toNumber()
             : 0;
           const remaining = new BigNumber(order.amount).minus(order.filled_amount || 0).toNumber();
           const [base, quote] = order.symbol.split('/');

           return (
             <div
               key={order.id}
               className="bg-[hsl(230,30%,8%)] rounded-xl border border-[hsl(230,20%,16%)]/30 p-3 transition-colors"
             >
               {/* Header row */}
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <span className={cn(
                     "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md",
                     order.side === 'buy' 
                       ? "bg-success/12 text-success" 
                       : "bg-danger/12 text-danger"
                   )}>
                     {order.side}
                   </span>
                   <span className="text-[13px] font-bold text-foreground">{order.symbol}</span>
                   <span className="text-[9px] px-1.5 py-0.5 bg-[hsl(230,20%,12%)] rounded-md text-muted-foreground/60 font-semibold capitalize">
                     {order.order_type}
                   </span>
                 </div>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => handleCancel(order.id)}
                   disabled={isCancelling && cancellingId === order.id}
                   className="h-7 px-2 text-[10px] font-bold hover:bg-danger/10 hover:text-danger text-muted-foreground/50 rounded-lg"
                 >
                   {isCancelling && cancellingId === order.id ? (
                     <span className="text-[10px]">...</span>
                   ) : (
                     <>
                       <X className="h-3 w-3 mr-1" />
                       Cancel
                     </>
                   )}
                 </Button>
               </div>
 
               {/* Data grid */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                 <div>
                   <div className="text-muted-foreground/40 text-[9px] font-semibold uppercase">Price</div>
                   <div className="font-mono text-foreground/80 font-bold text-[12px] tabular-nums">
                     {order.price ? `${Number(order.price).toFixed(4)}` : 'Market'}
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground/40 text-[9px] font-semibold uppercase">Amount</div>
                   <div className="font-mono text-foreground/70 text-[11px] tabular-nums">{Number(order.amount).toFixed(4)}</div>
                 </div>
                 <div>
                   <div className="text-muted-foreground/40 text-[9px] font-semibold uppercase">Filled</div>
                   <div className={cn(
                     "font-mono text-[11px] tabular-nums font-semibold",
                     filledPercent > 0 ? "text-warning" : "text-muted-foreground/40"
                   )}>
                     {filledPercent.toFixed(1)}%
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground/40 text-[9px] font-semibold uppercase">Remaining</div>
                   <div className="font-mono text-foreground/60 text-[11px] tabular-nums">{remaining.toFixed(4)}</div>
                 </div>
               </div>

               {/* Locked amount */}
               {order.locked_amount && Number(order.locked_amount) > 0 && (
                 <div className="mt-2 px-2.5 py-1.5 bg-[hsl(230,20%,10%)] rounded-lg text-[10px] flex items-center justify-between">
                   <span className="text-muted-foreground/50 font-medium">Locked</span>
                   <span className="font-mono font-bold text-warning tabular-nums">
                     {Number(order.locked_amount).toFixed(4)} {order.locked_asset_symbol || quote}
                   </span>
                 </div>
               )}

               {/* Progress bar */}
               <div className="mt-2 h-1 bg-[hsl(230,20%,10%)] rounded-full overflow-hidden">
                 <div 
                   className={cn(
                     "h-full rounded-full transition-all",
                     order.side === 'buy' ? "bg-success/60" : "bg-danger/60"
                   )}
                   style={{ width: `${filledPercent}%` }}
                 />
               </div>

               {/* Footer */}
               <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground/40">
                 <span className="font-medium">{format(new Date(order.created_at), 'MMM d, HH:mm:ss')}</span>
                 {onDetails && (
                   <button 
                     onClick={() => onDetails(order.id)}
                     className="flex items-center gap-0.5 hover:text-foreground/60 transition-colors font-semibold"
                   >
                     Details <ChevronRight className="h-3 w-3" />
                   </button>
                 )}
               </div>
             </div>
           );
         })}
       </div>
     </div>
   );
 }
