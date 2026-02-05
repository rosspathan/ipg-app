 import React from 'react';
 import { format } from 'date-fns';
 import { Copy, Check, X, TrendingUp, TrendingDown } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import BigNumber from 'bignumber.js';
 import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetTitle,
 } from '@/components/ui/sheet';
 import { Button } from '@/components/ui/button';
 import { Separator } from '@/components/ui/separator';
 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 
 interface OrderDetailsDrawerProps {
   orderId: string | null;
   onClose: () => void;
 }
 
 interface OrderDetail {
   id: string;
   symbol: string;
   side: string;
   order_type: string;
   amount: number;
   price: number | null;
   status: string;
   filled_amount: number;
   remaining_amount: number;
   average_price: number | null;
   fees_paid: number;
   fee_asset: string | null;
   created_at: string;
   filled_at: string | null;
   cancelled_at: string | null;
 }
 
 interface TradeExecution {
   id: string;
   price: number;
   quantity: number;
   total_value: number;
   trade_time: string;
   buyer_fee: number;
   seller_fee: number;
 }
 
 export function OrderDetailsDrawer({ orderId, onClose }: OrderDetailsDrawerProps) {
   const [order, setOrder] = useState<OrderDetail | null>(null);
   const [executions, setExecutions] = useState<TradeExecution[]>([]);
   const [loading, setLoading] = useState(false);
   const [copiedId, setCopiedId] = useState(false);
 
   useEffect(() => {
     if (!orderId) {
       setOrder(null);
       setExecutions([]);
       return;
     }
 
     const fetchDetails = async () => {
       setLoading(true);
       
       // Fetch order details
       const { data: orderData, error: orderError } = await supabase
         .from('orders')
         .select('*')
         .eq('id', orderId)
         .maybeSingle();
 
       if (orderError) {
         console.error('Error fetching order:', orderError);
         setLoading(false);
         return;
       }
 
       setOrder(orderData);
 
       // Fetch related trade executions
       const { data: tradesData, error: tradesError } = await supabase
         .from('trades')
         .select('*')
         .or(`buy_order_id.eq.${orderId},sell_order_id.eq.${orderId}`)
         .order('trade_time', { ascending: false });
 
       if (!tradesError && tradesData) {
         setExecutions(tradesData);
       }
 
       setLoading(false);
     };
 
     fetchDetails();
   }, [orderId]);
 
   const copyOrderId = () => {
     if (orderId) {
       navigator.clipboard.writeText(orderId);
       setCopiedId(true);
       setTimeout(() => setCopiedId(false), 2000);
     }
   };
 
   const getStatusColor = (status: string) => {
     switch (status) {
       case 'filled': return 'text-emerald-400 bg-emerald-500/20';
       case 'cancelled': return 'text-muted-foreground bg-muted';
       case 'pending': case 'open': return 'text-amber-400 bg-amber-500/20';
       case 'partially_filled': return 'text-blue-400 bg-blue-500/20';
       case 'rejected': return 'text-rose-400 bg-rose-500/20';
       default: return 'text-foreground bg-muted';
     }
   };
 
   if (!order && !loading) {
     return (
       <Sheet open={!!orderId} onOpenChange={() => onClose()}>
         <SheetContent side="bottom" className="h-[50vh]">
           <div className="flex items-center justify-center h-full text-muted-foreground">
             Order not found
           </div>
         </SheetContent>
       </Sheet>
     );
   }
 
   const filledPercent = order && order.amount > 0 
     ? new BigNumber(order.filled_amount).dividedBy(order.amount).times(100).toNumber()
     : 0;
 
   const [base, quote] = order?.symbol?.split('/') || ['', ''];
 
   return (
     <Sheet open={!!orderId} onOpenChange={() => onClose()}>
       <SheetContent side="bottom" className="h-[80vh] overflow-auto">
         <SheetHeader className="pb-4">
           <SheetTitle className="flex items-center justify-between">
             <span>Order Details</span>
             <Button variant="ghost" size="sm" onClick={onClose}>
               <X className="h-4 w-4" />
             </Button>
           </SheetTitle>
         </SheetHeader>
 
         {loading ? (
           <div className="flex items-center justify-center py-12">
             <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
           </div>
         ) : order && (
           <div className="space-y-4">
             {/* Order header */}
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className={cn(
                   "p-2 rounded-lg",
                   order.side === 'buy' ? "bg-emerald-500/20" : "bg-rose-500/20"
                 )}>
                   {order.side === 'buy' ? (
                     <TrendingUp className="h-5 w-5 text-emerald-400" />
                   ) : (
                     <TrendingDown className="h-5 w-5 text-rose-400" />
                   )}
                 </div>
                 <div>
                   <div className="flex items-center gap-2">
                     <span className={cn(
                       "text-sm font-bold uppercase",
                       order.side === 'buy' ? "text-emerald-400" : "text-rose-400"
                     )}>
                       {order.side}
                     </span>
                     <span className="font-semibold text-foreground">{order.symbol}</span>
                   </div>
                   <div className="text-xs text-muted-foreground capitalize">{order.order_type} Order</div>
                 </div>
               </div>
               <span className={cn(
                 "px-2 py-1 rounded text-xs font-medium capitalize",
                 getStatusColor(order.status)
               )}>
                 {order.status.replace('_', ' ')}
               </span>
             </div>
 
             <Separator />
 
             {/* Order ID */}
             <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
               <div>
                 <div className="text-xs text-muted-foreground">Order ID</div>
                 <div className="font-mono text-sm text-foreground">{order.id}</div>
               </div>
               <Button variant="ghost" size="sm" onClick={copyOrderId}>
                 {copiedId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
               </Button>
             </div>
 
             {/* Order details grid */}
             <div className="grid grid-cols-2 gap-3">
               <div className="bg-muted/30 rounded-lg p-3">
                 <div className="text-xs text-muted-foreground">Price</div>
                 <div className="font-mono text-foreground">
                   {order.price ? `${Number(order.price).toFixed(6)} ${quote}` : 'Market'}
                 </div>
               </div>
               <div className="bg-muted/30 rounded-lg p-3">
                 <div className="text-xs text-muted-foreground">Amount</div>
                 <div className="font-mono text-foreground">
                   {Number(order.amount).toFixed(6)} {base}
                 </div>
               </div>
               <div className="bg-muted/30 rounded-lg p-3">
                 <div className="text-xs text-muted-foreground">Filled</div>
                 <div className="font-mono text-foreground">
                   {Number(order.filled_amount).toFixed(6)} ({filledPercent.toFixed(1)}%)
                 </div>
               </div>
               <div className="bg-muted/30 rounded-lg p-3">
                 <div className="text-xs text-muted-foreground">Avg. Fill Price</div>
                 <div className="font-mono text-foreground">
                   {order.average_price ? `${Number(order.average_price).toFixed(6)} ${quote}` : '-'}
                 </div>
               </div>
               <div className="bg-muted/30 rounded-lg p-3">
                 <div className="text-xs text-muted-foreground">Fees Paid</div>
                 <div className="font-mono text-amber-400">
                   {Number(order.fees_paid || 0).toFixed(6)} {order.fee_asset || quote}
                 </div>
               </div>
               <div className="bg-muted/30 rounded-lg p-3">
                 <div className="text-xs text-muted-foreground">Remaining</div>
                 <div className="font-mono text-foreground">
                   {Number(order.remaining_amount || 0).toFixed(6)} {base}
                 </div>
               </div>
             </div>
 
             {/* Timestamps */}
             <div className="space-y-2">
               <div className="flex justify-between text-xs">
                 <span className="text-muted-foreground">Created</span>
                 <span className="text-foreground">{format(new Date(order.created_at), 'MMM d, yyyy HH:mm:ss')}</span>
               </div>
               {order.filled_at && (
                 <div className="flex justify-between text-xs">
                   <span className="text-muted-foreground">Filled</span>
                   <span className="text-emerald-400">{format(new Date(order.filled_at), 'MMM d, yyyy HH:mm:ss')}</span>
                 </div>
               )}
               {order.cancelled_at && (
                 <div className="flex justify-between text-xs">
                   <span className="text-muted-foreground">Cancelled</span>
                   <span className="text-muted-foreground">{format(new Date(order.cancelled_at), 'MMM d, yyyy HH:mm:ss')}</span>
                 </div>
               )}
             </div>
 
             {/* Executions list */}
             {executions.length > 0 && (
               <>
                 <Separator />
                 <div>
                   <h4 className="text-sm font-medium mb-3">Executions ({executions.length})</h4>
                   <div className="space-y-2">
                     {executions.map((exec) => (
                       <div 
                         key={exec.id} 
                         className="bg-muted/30 rounded-lg p-3 grid grid-cols-3 gap-2 text-xs"
                       >
                         <div>
                           <div className="text-muted-foreground">Price</div>
                           <div className="font-mono text-foreground">{Number(exec.price).toFixed(6)}</div>
                         </div>
                         <div>
                           <div className="text-muted-foreground">Qty</div>
                           <div className="font-mono text-foreground">{Number(exec.quantity).toFixed(6)}</div>
                         </div>
                         <div>
                           <div className="text-muted-foreground">Total</div>
                           <div className="font-mono text-foreground">{Number(exec.total_value).toFixed(4)}</div>
                         </div>
                         <div className="col-span-3 text-[10px] text-muted-foreground">
                           {format(new Date(exec.trade_time), 'MMM d, HH:mm:ss')}
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </>
             )}
           </div>
         )}
       </SheetContent>
     </Sheet>
   );
 }