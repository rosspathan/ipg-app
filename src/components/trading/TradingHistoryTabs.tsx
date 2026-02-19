 import React, { useState, useMemo } from 'react';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { OpenOrdersTab } from './history/OpenOrdersTab';
 import { OrderHistoryTab } from './history/OrderHistoryTab';
 import { TradeHistoryFillsTab } from './history/TradeHistoryFillsTab';
 import { FundsLedgerTab } from './history/FundsLedgerTab';
 import { useTradeHistory, useOrderCancel } from '@/hooks/useTradeHistory';
 
 import { Loader2 } from 'lucide-react';
 
 interface TradingHistoryTabsProps {
   symbol?: string;
   onOrderDetails?: (orderId: string) => void;
   onTradeDetails?: (tradeId: string) => void;
 }
 
 export function TradingHistoryTabs({ 
   symbol, 
   onOrderDetails, 
   onTradeDetails 
 }: TradingHistoryTabsProps) {
   const [activeTab, setActiveTab] = useState('open');
   
   // Convert symbol format: "IPG-USDI" -> "IPG/USDI"
   const normalizedSymbol = useMemo(() => {
     if (!symbol) return undefined;
     return symbol.replace('-', '/');
   }, [symbol]);
 
   // Use pair-scoped trade history hook
   const { 
     fills, 
     orders, 
     openOrders,
     fundsMovements,
     isLoadingFills,
     isLoadingOrders,
     isLoadingOpenOrders,
     isLoadingFunds,
     stats,
     refresh
   } = useTradeHistory({ symbol: normalizedSymbol });
 
   const { cancelOrder, isCancelling } = useOrderCancel();
 
   const openCount = openOrders.length;
 
   return (
     <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-[32px] bg-transparent p-0 rounded-none border-b border-border/40">
          <TabsTrigger value="open" className="text-[11px] font-medium rounded-none h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground relative">
            Open
            {openCount > 0 && (
              <span className="ml-1 text-[9px] font-bold text-danger">
                {openCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-[11px] font-medium rounded-none h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground">Orders</TabsTrigger>
          <TabsTrigger value="trades" className="text-[11px] font-medium rounded-none h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground">Trades</TabsTrigger>
          <TabsTrigger value="funds" className="text-[11px] font-medium rounded-none h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground">Funds</TabsTrigger>
        </TabsList>
 
       <TabsContent value="open" className="mt-2">
         {isLoadingOpenOrders ? (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
           </div>
         ) : (
           <OpenOrdersTab 
             orders={openOrders}
             currentSymbol={normalizedSymbol}
             onCancel={cancelOrder}
             isCancelling={isCancelling}
             onDetails={onOrderDetails}
           />
         )}
       </TabsContent>
 
       <TabsContent value="orders" className="mt-2">
         {isLoadingOrders ? (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
           </div>
         ) : (
           <OrderHistoryTab 
             orders={orders}
             currentSymbol={normalizedSymbol}
             onDetails={onOrderDetails}
           />
         )}
       </TabsContent>
 
       <TabsContent value="trades" className="mt-2">
         {isLoadingFills ? (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
           </div>
         ) : (
           <TradeHistoryFillsTab 
             fills={fills}
             currentSymbol={normalizedSymbol}
             onDetails={onTradeDetails}
           />
         )}
       </TabsContent>
 
       <TabsContent value="funds" className="mt-2">
         {isLoadingFunds ? (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
           </div>
         ) : (
           <FundsLedgerTab 
             movements={fundsMovements}
           />
         )}
       </TabsContent>
     </Tabs>
   );
 }