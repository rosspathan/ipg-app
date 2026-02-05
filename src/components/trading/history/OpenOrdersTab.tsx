 import React, { useState } from 'react';
 import { format } from 'date-fns';
 import { X, Filter, ChevronRight, Copy, Check } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 import BigNumber from 'bignumber.js';
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
   remaining_amount?: number;
   created_at: string;
   locked_amount?: number;
   locked_asset_symbol?: string;
 }
 
 interface OpenOrdersTabProps {
   orders: Order[];
   allOrders: Order[];
   currentSymbol?: string;
   onCancel: (orderId: string) => Promise<any>;
   isCancelling: boolean;
   onDetails?: (orderId: string) => void;
 }
 
 export function OpenOrdersTab({
   orders,
   allOrders,
   currentSymbol,
   onCancel,
   isCancelling,
   onDetails
 }: OpenOrdersTabProps) {
   const [filterSymbol, setFilterSymbol] = useState<string>(currentSymbol || 'all');
   const [cancellingId, setCancellingId] = useState<string | null>(null);
 
   const uniqueSymbols = [...new Set(allOrders.map(o => o.symbol))];
 
   const filteredOrders = filterSymbol === 'all' 
     ? allOrders 
     : allOrders.filter(o => o.symbol === filterSymbol);
 
   const handleCancel = async (orderId: string) => {
     setCancellingId(orderId);
     try {
       await onCancel(orderId);
     } finally {
       setCancellingId(null);
     }
   };
 
   if (allOrders.length === 0) {
     return (
       <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
         <div className="text-sm">No open orders</div>
         <div className="text-xs mt-1">Place an order to see it here</div>
       </div>
     );
   }
 
   return (
     <div className="space-y-2">
       {/* Filter */}
       {uniqueSymbols.length > 1 && (
         <div className="flex items-center gap-2 pb-2 border-b border-border/50">
           <Filter className="h-3.5 w-3.5 text-muted-foreground" />
           <Select value={filterSymbol} onValueChange={setFilterSymbol}>
             <SelectTrigger className="w-[130px] h-7 text-xs">
               <SelectValue placeholder="Filter" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All ({allOrders.length})</SelectItem>
               {uniqueSymbols.map(symbol => (
                 <SelectItem key={symbol} value={symbol}>
                   {symbol} ({allOrders.filter(o => o.symbol === symbol).length})
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
       )}
 
       {/* Orders list */}
       <div className="space-y-1.5">
         {filteredOrders.map((order) => {
           const filledPercent = order.amount > 0 
             ? new BigNumber(order.filled_amount).dividedBy(order.amount).times(100).toNumber()
             : 0;
           const remaining = new BigNumber(order.amount).minus(order.filled_amount).toNumber();
           const [base, quote] = order.symbol.split('/');
 
           return (
             <div
               key={order.id}
               className="bg-muted/30 rounded-lg border border-border/50 p-3 hover:bg-muted/50 transition-colors"
             >
               {/* Header row */}
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <span className={cn(
                     "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                     order.side === 'buy' 
                       ? "bg-emerald-500/20 text-emerald-400" 
                       : "bg-rose-500/20 text-rose-400"
                   )}>
                     {order.side}
                   </span>
                   <span className="text-xs font-semibold text-foreground">{order.symbol}</span>
                   <span className="text-[10px] text-muted-foreground capitalize">{order.order_type}</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleCancel(order.id)}
                     disabled={isCancelling && cancellingId === order.id}
                     className="h-6 w-6 p-0 hover:bg-rose-500/20 hover:text-rose-400"
                   >
                     <X className="h-3.5 w-3.5" />
                   </Button>
                 </div>
               </div>
 
               {/* Data grid */}
               <div className="grid grid-cols-4 gap-2 text-xs">
                 <div>
                   <div className="text-muted-foreground text-[10px]">Price</div>
                   <div className="font-mono text-foreground">
                     {order.price ? `$${Number(order.price).toFixed(4)}` : 'Market'}
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Amount</div>
                   <div className="font-mono text-foreground">{Number(order.amount).toFixed(4)}</div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Filled</div>
                   <div className="font-mono text-foreground">{filledPercent.toFixed(1)}%</div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Remaining</div>
                   <div className="font-mono text-foreground">{remaining.toFixed(4)}</div>
                 </div>
               </div>
 
               {/* Progress bar */}
               <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
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