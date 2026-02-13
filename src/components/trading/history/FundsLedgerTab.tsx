import React, { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Filter, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import BigNumber from 'bignumber.js';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import type { FundsMovement } from '@/hooks/useTradeHistory';
 
 interface FundsLedgerTabProps {
   movements: FundsMovement[];
 }
 
 export function FundsLedgerTab({ movements }: FundsLedgerTabProps) {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('all');
   const [filterAsset, setFilterAsset] = useState<string>('all');
 
   const uniqueTypes = [...new Set(movements.map(m => m.entry_type))];
   const uniqueAssets = [...new Set(movements.map(m => m.asset_symbol))];
 
   const filteredMovements = movements.filter(m => {
     if (filterType !== 'all' && m.entry_type !== filterType) return false;
     if (filterAsset !== 'all' && m.asset_symbol !== filterAsset) return false;
     return true;
   });
 
   const formatEntryType = (type: string) => {
     return type
       .replace(/_/g, ' ')
       .replace(/\b\w/g, l => l.toUpperCase());
   };
 
   const getTypeIcon = (delta: number) => {
     if (delta > 0) {
       return <ArrowDownRight className="h-4 w-4 text-emerald-400" />;
     }
     return <ArrowUpRight className="h-4 w-4 text-rose-400" />;
   };
 
   if (movements.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <div className="text-sm">No fund movements</div>
          <div className="text-xs mt-1">Trading activity will appear here</div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate('/app/wallet/transfer')}
          >
            <ArrowLeftRight className="h-4 w-4 mr-1.5" />
            Deposit Funds
          </Button>
        </div>
      );
   }
 
   return (
     <div className="space-y-2">
       {/* Filters */}
       <div className="flex items-center gap-2 pb-2 border-b border-border/50 overflow-x-auto">
         <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
         {uniqueTypes.length > 1 && (
           <Select value={filterType} onValueChange={setFilterType}>
             <SelectTrigger className="w-[100px] h-7 text-xs">
               <SelectValue placeholder="Type" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Types</SelectItem>
               {uniqueTypes.map(type => (
                 <SelectItem key={type} value={type} className="text-xs">
                   {formatEntryType(type)}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         )}
         {uniqueAssets.length > 1 && (
           <Select value={filterAsset} onValueChange={setFilterAsset}>
             <SelectTrigger className="w-[80px] h-7 text-xs">
               <SelectValue placeholder="Asset" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All</SelectItem>
               {uniqueAssets.map(asset => (
                 <SelectItem key={asset} value={asset}>{asset}</SelectItem>
               ))}
             </SelectContent>
           </Select>
         )}
       </div>
 
       {/* Movements list */}
       <div className="space-y-1.5">
         {filteredMovements.map((movement) => {
           const netChange = new BigNumber(movement.delta_available).plus(movement.delta_locked).toNumber();
           const isPositive = netChange > 0;
 
           return (
             <div
               key={movement.id}
               className="bg-muted/30 rounded-lg border border-border/50 p-3"
             >
               {/* Header */}
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <div className={cn(
                     "p-1.5 rounded-full",
                     isPositive ? "bg-emerald-500/20" : "bg-rose-500/20"
                   )}>
                     {getTypeIcon(netChange)}
                   </div>
                   <div>
                     <div className="text-xs font-medium text-foreground">
                       {formatEntryType(movement.entry_type)}
                     </div>
                     <div className="text-[10px] text-muted-foreground">
                       {movement.reference_type}
                     </div>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className={cn(
                     "font-mono text-sm font-medium",
                     isPositive ? "text-emerald-400" : "text-rose-400"
                   )}>
                     {isPositive ? '+' : ''}{netChange.toFixed(6)} {movement.asset_symbol}
                   </div>
                 </div>
               </div>
 
               {/* Details */}
               <div className="grid grid-cols-2 gap-2 text-xs">
                 <div>
                   <div className="text-muted-foreground text-[10px]">Available Δ</div>
                   <div className={cn(
                     "font-mono",
                     Number(movement.delta_available) > 0 ? "text-emerald-400" : 
                     Number(movement.delta_available) < 0 ? "text-rose-400" : "text-muted-foreground"
                   )}>
                     {Number(movement.delta_available) > 0 ? '+' : ''}{Number(movement.delta_available).toFixed(6)}
                   </div>
                 </div>
                 <div>
                   <div className="text-muted-foreground text-[10px]">Locked Δ</div>
                   <div className={cn(
                     "font-mono",
                     Number(movement.delta_locked) > 0 ? "text-amber-400" : 
                     Number(movement.delta_locked) < 0 ? "text-blue-400" : "text-muted-foreground"
                   )}>
                     {Number(movement.delta_locked) > 0 ? '+' : ''}{Number(movement.delta_locked).toFixed(6)}
                   </div>
                 </div>
               </div>
 
               {/* Notes */}
               {movement.notes && (
                 <div className="mt-2 text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
                   {movement.notes}
                 </div>
               )}
 
               {/* Footer */}
               <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                 <span>{format(new Date(movement.created_at), 'MMM d, HH:mm:ss')}</span>
                 {movement.reference_id && (
                   <span className="font-mono">{movement.reference_id.slice(0, 8)}...</span>
                 )}
               </div>
             </div>
           );
         })}
       </div>
     </div>
   );
 }