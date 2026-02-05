 import React, { useState } from 'react';
 import { format } from 'date-fns';
 import { Filter, ChevronRight, Copy, Check } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import BigNumber from 'bignumber.js';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
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
   const [filterSymbol, setFilterSymbol] = useState<string>(currentSymbol || 'all');
   const [filterStatus, setFilterStatus] = useState<string>('all');
   const [copiedId, setCopiedId] = useState<string | null>(null);
 
   const uniqueSymbols = [...new Set(orders.map(o => o.symbol))];
   const statuses = ['all', 'filled', 'cancelled', 'pending', 'partially_filled'];
 
   const filteredOrders = orders.filter(o => {
     if (filterSymbol !== 'all' && o.symbol !== filterSymbol) return false;
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
 
   if (orders.length === 0) {
     return (
       <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
         <div className="text-sm">No order history</div>
         <div className="text-xs mt-1">Your orders will appear here</div>
       </div>
     );
   }
 
   return (
     <div className="space-y-2">
       {/* Filters */}
       <div className="flex items-center gap-2 pb-2 border-b border-border/50 overflow-x-auto">
         <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
         {uniqueSymbols.length > 1 && (
           <Select value={filterSymbol} onValueChange={setFilterSymbol}>
             <SelectTrigger className="w-[100px] h-7 text-xs">
               <SelectValue placeholder="Pair" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Pairs</SelectItem>
               {uniqueSymbols.map(symbol => (
                 <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
               ))}
             </SelectContent>
           </Select>
         )}
         <Select value={filterStatus} onValueChange={setFilterStatus}>
           <SelectTrigger className="w-[100px] h-7 text-xs">
             <SelectValue placeholder="Status" />
           </SelectTrigger>
           <SelectContent>
             {statuses.map(s => (
               <SelectItem key={s} value={s} className="capitalize">
                 {s === 'all' ? 'All Status' : s.replace('_', ' ')}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>
 
       {/* Mobile-friendly table */}
       <div className="space-y-1.5">
         {filteredOrders.map((order) => {
           const filledPercent = order.amount > 0 
             ? new BigNumber(order.filled_amount).dividedBy(order.amount).times(100).toNumber()
             : 0;
           const avgPrice = order.average_price || order.price || 0;
           const [base, quote] = order.symbol.split('/');
           const total = new BigNumber(order.filled_amount).times(avgPrice).toNumber();
 
           return (
             <div
               key={order.id}
               className="bg-muted/30 rounded-lg border border-border/50 p-3"
               onClick={() => onDetails?.(order.id)}
             >
               {/* Header */}
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
                   <span className="text-xs font-medium text-foreground">{order.symbol}</span>
                   <span className="text-[10px] text-muted-foreground capitalize">{order.order_type}</span>
                 </div>
                 <span className={cn("text-[10px] font-medium capitalize", getStatusColor(order.status))}>
                   {order.status.replace('_', ' ')}
                 </span>
               </div>
 
               {/* Data */}
               <div className="grid grid-cols-4 gap-2 text-xs">
                 <div>
                   <div className="text-muted-foreground text-[10px]">Price</div>
                   <div className="font-mono text-foreground">
                     {order.price ? Number(order.price).toFixed(4) : 'Market'}
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Amount</div>
                   <div className="font-mono text-foreground">{Number(order.amount).toFixed(4)}</div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Filled</div>
                   <div className="font-mono text-foreground">
                     {Number(order.filled_amount).toFixed(4)} ({filledPercent.toFixed(0)}%)
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