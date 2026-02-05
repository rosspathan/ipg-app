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
       <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
         <div className="text-sm">No open orders</div>
         <div className="text-xs mt-1">
           {currentSymbol ? `No pending orders for ${currentSymbol}` : 'Place an order to see it here'}
         </div>
       </div>
     );
   }
 
   return (
     <div className="space-y-2">
       {/* Pair indicator */}
       {currentSymbol && (
         <div className="text-xs text-muted-foreground pb-1 border-b border-border/30">
           Showing orders for <span className="font-medium text-foreground">{currentSymbol}</span>
         </div>
       )}
 
       {/* Orders list */}
       <div className="space-y-1.5">
         {orders.map((order) => {
           const filledPercent = Number(order.amount) > 0 
             ? new BigNumber(order.filled_amount || 0).dividedBy(order.amount).times(100).toNumber()
             : 0;
           const remaining = new BigNumber(order.amount).minus(order.filled_amount || 0).toNumber();
           const [base, quote] = order.symbol.split('/');
 
           return (
             <div
               key={order.id}
               className="bg-card rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
             >
               {/* Header row */}
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
                   <span className="text-sm font-semibold text-foreground">{order.symbol}</span>
                   <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground capitalize">
                     {order.order_type}
                   </span>
                 </div>
                 <div className="flex items-center gap-1">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleCancel(order.id)}
                     disabled={isCancelling && cancellingId === order.id}
                     className="h-7 px-2 text-xs hover:bg-rose-500/20 hover:text-rose-400 text-muted-foreground"
                   >
                     {isCancelling && cancellingId === order.id ? (
                       <span className="text-[10px]">...</span>
                     ) : (
                       <>
                         <X className="h-3.5 w-3.5 mr-1" />
                         Cancel
                       </>
                     )}
                   </Button>
                 </div>
               </div>
 
               {/* Data grid - improved layout */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                 <div>
                   <div className="text-muted-foreground text-[10px]">Price</div>
                   <div className="font-mono text-foreground font-medium">
                     {order.price ? `$${Number(order.price).toFixed(4)}` : 'Market'}
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Amount ({base})</div>
                   <div className="font-mono text-foreground">{Number(order.amount).toFixed(4)} {base}</div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Filled</div>
                   <div className={cn(
                     "font-mono",
                     filledPercent > 0 ? "text-amber-400" : "text-muted-foreground"
                   )}>
                     {filledPercent.toFixed(1)}%
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Remaining</div>
                   <div className="font-mono text-foreground">{remaining.toFixed(4)} {base}</div>
                 </div>
               </div>
 
               {/* Locked amount indicator */}
               {order.locked_amount && Number(order.locked_amount) > 0 && (
                 <div className="mt-2 px-2 py-1.5 bg-muted/50 rounded text-xs flex items-center justify-between">
                   <span className="text-muted-foreground">Locked:</span>
                   <span className="font-mono font-medium text-amber-400">
                     {Number(order.locked_amount).toFixed(4)} {order.locked_asset_symbol || quote}
                   </span>
                 </div>
               )}
 
               {/* Progress bar */}
               <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                 <div 
                   className={cn(
                     "h-full rounded-full transition-all",
                     order.side === 'buy' ? "bg-emerald-500" : "bg-rose-500"
                   )}
                   style={{ width: `${filledPercent}%` }}
                 />
               </div>
 
               {/* Footer */}
               <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                 <span>{format(new Date(order.created_at), 'MMM d, HH:mm:ss')}</span>
                 {onDetails && (
                   <button 
                     onClick={() => onDetails(order.id)}
                     className="flex items-center gap-0.5 hover:text-foreground transition-colors"
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