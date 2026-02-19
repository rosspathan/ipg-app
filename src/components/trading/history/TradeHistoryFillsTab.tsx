 import React, { useState } from 'react';
 import { format } from 'date-fns';
 import { TrendingUp, TrendingDown, Copy, Check } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import BigNumber from 'bignumber.js';
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
   const [filterSide, setFilterSide] = useState<string>('all');
   const [copiedId, setCopiedId] = useState<string | null>(null);
 
   const filteredFills = fills.filter(f => {
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
      <div className="flex items-center justify-center h-[32px] text-[11px] text-muted-foreground">
        No trade history{currentSymbol ? ` for ${currentSymbol}` : ''}
      </div>
    );
  }
 
   return (
     <div className="space-y-2">
       {/* Summary stats */}
       <div className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg text-xs">
         <div className="flex items-center gap-4">
           <div>
             <span className="text-muted-foreground">Trades:</span>{' '}
             <span className="font-semibold text-foreground">{filteredFills.length}</span>
           </div>
           <div>
             <span className="text-muted-foreground">Volume:</span>{' '}
             <span className="font-mono font-semibold text-foreground">${totalVolume.toFixed(2)}</span>
           </div>
           <div>
             <span className="text-muted-foreground">Fees:</span>{' '}
             <span className="font-mono font-medium text-amber-400">${totalFees.toFixed(4)}</span>
           </div>
         </div>
       </div>
 
       {/* Side filter */}
       <div className="flex items-center justify-between pb-2 border-b border-border/30">
         <div className="text-xs text-muted-foreground">
           {currentSymbol && <span>Fills for <span className="font-medium text-foreground">{currentSymbol}</span></span>}
         </div>
         <div className="flex gap-1">
           {['all', 'buy', 'sell'].map(side => (
             <button
               key={side}
               onClick={() => setFilterSide(side)}
               className={cn(
                 "px-2 py-1 text-[10px] rounded capitalize transition-colors",
                 filterSide === side 
                   ? side === 'buy' ? "bg-emerald-500/20 text-emerald-400"
                     : side === 'sell' ? "bg-rose-500/20 text-rose-400"
                     : "bg-primary text-primary-foreground"
                   : "bg-muted text-muted-foreground hover:text-foreground"
               )}
             >
               {side === 'all' ? 'All' : side}
             </button>
           ))}
         </div>
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
               className={cn(
                 "rounded-lg border p-3 transition-colors",
                 fill.side === 'buy' 
                   ? "bg-emerald-500/5 border-emerald-500/20" 
                   : "bg-rose-500/5 border-rose-500/20"
               )}
               onClick={() => onDetails?.(fill.trade_id)}
             >
               {/* Header */}
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <div className={cn(
                     "p-1.5 rounded",
                     fill.side === 'buy' ? "bg-emerald-500/30" : "bg-rose-500/30"
                   )}>
                     {fill.side === 'buy' ? (
                       <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                     ) : (
                       <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                     )}
                   </div>
                   <span className={cn(
                     "text-[11px] font-bold uppercase",
                     fill.side === 'buy' ? "text-emerald-400" : "text-rose-400"
                   )}>
                     {fill.side}
                   </span>
                   <span className="text-sm font-semibold text-foreground">{fill.pair}</span>
                   <span className={cn(
                     "text-[10px] px-1.5 py-0.5 rounded capitalize",
                     fill.role === 'maker' 
                       ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                       : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                   )}>
                     {fill.role}
                   </span>
                 </div>
               </div>
 
               {/* Trade details - industry standard columns */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                 <div>
                   <div className="text-muted-foreground text-[10px]">Price ({quote})</div>
                   <div className="font-mono text-foreground font-semibold">
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
                   <div className="font-mono text-foreground font-semibold">
                     {calculatedTotal.toFixed(4)}
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Fee</div>
                   <div className="font-mono text-amber-400">
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