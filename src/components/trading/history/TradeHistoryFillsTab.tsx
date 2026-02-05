 import React, { useState } from 'react';
 import { format } from 'date-fns';
 import { Filter, ChevronRight, TrendingUp, TrendingDown, Copy, Check } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import BigNumber from 'bignumber.js';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import type { TradeFill } from '@/hooks/useTradeHistory';
 
 // Configure BigNumber
 BigNumber.config({ DECIMAL_PLACES: 8, ROUNDING_MODE: BigNumber.ROUND_DOWN });
 
 interface TradeHistoryFillsTabProps {
   fills: TradeFill[];
   currentSymbol?: string;
   onDetails?: (tradeId: string) => void;
 }
 
 export function TradeHistoryFillsTab({
   fills,
   currentSymbol,
   onDetails
 }: TradeHistoryFillsTabProps) {
   const [filterSymbol, setFilterSymbol] = useState<string>(currentSymbol || 'all');
   const [filterSide, setFilterSide] = useState<string>('all');
   const [copiedId, setCopiedId] = useState<string | null>(null);
 
   const uniqueSymbols = [...new Set(fills.map(f => f.pair))];
 
   const filteredFills = fills.filter(f => {
     if (filterSymbol !== 'all' && f.pair !== filterSymbol) return false;
     if (filterSide !== 'all' && f.side !== filterSide) return false;
     return true;
   });
 
   const copyId = (id: string) => {
     navigator.clipboard.writeText(id);
     setCopiedId(id);
     setTimeout(() => setCopiedId(null), 2000);
   };
 
   // Calculate totals
   const totalVolume = filteredFills.reduce((sum, f) => 
     new BigNumber(sum).plus(f.total).toNumber(), 0
   );
   const totalFees = filteredFills.reduce((sum, f) => 
     new BigNumber(sum).plus(f.fee).toNumber(), 0
   );
 
   if (fills.length === 0) {
     return (
       <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
         <div className="text-sm">No trade history</div>
         <div className="text-xs mt-1">Your executed trades will appear here</div>
       </div>
     );
   }
 
   return (
     <div className="space-y-2">
       {/* Summary stats */}
       <div className="flex items-center gap-4 px-2 py-1.5 bg-muted/30 rounded-lg text-xs">
         <div>
           <span className="text-muted-foreground">Trades:</span>{' '}
           <span className="font-medium text-foreground">{filteredFills.length}</span>
         </div>
         <div>
           <span className="text-muted-foreground">Volume:</span>{' '}
           <span className="font-mono font-medium text-foreground">${totalVolume.toFixed(2)}</span>
         </div>
         <div>
           <span className="text-muted-foreground">Fees:</span>{' '}
           <span className="font-mono font-medium text-foreground">${totalFees.toFixed(4)}</span>
         </div>
       </div>
 
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
         <Select value={filterSide} onValueChange={setFilterSide}>
           <SelectTrigger className="w-[80px] h-7 text-xs">
             <SelectValue placeholder="Side" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All</SelectItem>
             <SelectItem value="buy">Buy</SelectItem>
             <SelectItem value="sell">Sell</SelectItem>
           </SelectContent>
         </Select>
       </div>
 
       {/* Trades list - Exchange-standard layout */}
       <div className="space-y-1.5">
         {filteredFills.map((fill) => {
           const [base, quote] = fill.pair.split('/');
           // Recalculate total for precision
           const calculatedTotal = new BigNumber(fill.price).times(fill.amount).toNumber();
 
           return (
             <div
               key={`${fill.trade_id}-${fill.side}`}
               className="bg-muted/30 rounded-lg border border-border/50 p-3"
               onClick={() => onDetails?.(fill.trade_id)}
             >
               {/* Header */}
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <div className={cn(
                     "p-1 rounded",
                     fill.side === 'buy' ? "bg-emerald-500/20" : "bg-rose-500/20"
                   )}>
                     {fill.side === 'buy' ? (
                       <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                     ) : (
                       <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                     )}
                   </div>
                   <span className={cn(
                     "text-[10px] font-bold uppercase",
                     fill.side === 'buy' ? "text-emerald-400" : "text-rose-400"
                   )}>
                     {fill.side}
                   </span>
                   <span className="text-xs font-medium text-foreground">{fill.pair}</span>
                   <span className={cn(
                     "text-[10px] px-1.5 py-0.5 rounded capitalize",
                     fill.role === 'maker' ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                   )}>
                     {fill.role}
                   </span>
                 </div>
               </div>
 
               {/* Trade details - industry standard columns */}
               <div className="grid grid-cols-4 gap-2 text-xs">
                 <div>
                   <div className="text-muted-foreground text-[10px]">Price ({quote})</div>
                   <div className="font-mono text-foreground font-medium">
                     {Number(fill.price).toFixed(6)}
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Qty ({base})</div>
                   <div className="font-mono text-foreground">
                     {Number(fill.amount).toFixed(6)}
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Total ({quote})</div>
                   <div className="font-mono text-foreground font-medium">
                     {calculatedTotal.toFixed(4)}
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Fee</div>
                   <div className="font-mono text-amber-400 text-[11px]">
                     {Number(fill.fee).toFixed(6)} {fill.fee_asset}
                   </div>
                 </div>
               </div>
 
               {/* Footer */}
               <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                 <span>{format(new Date(fill.executed_at), 'MMM d, HH:mm:ss')}</span>
                 <button 
                   onClick={(e) => { e.stopPropagation(); copyId(fill.trade_id); }}
                   className="flex items-center gap-1 hover:text-foreground transition-colors"
                 >
                   {copiedId === fill.trade_id ? (
                     <><Check className="h-3 w-3" /> Copied</>
                   ) : (
                     <><Copy className="h-3 w-3" /> {fill.trade_id.slice(0, 8)}</>
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