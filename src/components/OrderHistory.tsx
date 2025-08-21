import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useOrderHistory } from '@/hooks/useOrderHistory';
import { RefreshCw, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const OrderHistory: React.FC = () => {
  const { orders, trades, loading, cancelOrder, refetch } = useOrderHistory();
  const [cancelling, setCancelling] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
      case 'partially_filled':
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'partially_filled':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getSideColor = (side: string) => {
    return side === 'buy' ? 'text-green-600' : 'text-red-600';
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancelling(orderId);
    await cancelOrder(orderId);
    setCancelling(null);
  };

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return 'Market';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading order history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Order History</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Open Orders</TabsTrigger>
            <TabsTrigger value="history">Order History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="orders" className="space-y-3 mt-4">
            {orders.filter(order => order.status === 'pending' || order.status === 'partially_filled').length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Open Orders</h3>
                <p className="text-muted-foreground">
                  You don't have any open orders at the moment
                </p>
              </div>
            ) : (
              orders
                .filter(order => order.status === 'pending' || order.status === 'partially_filled')
                .map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{order.symbol}</span>
                          <Badge 
                            variant="secondary" 
                            className={getSideColor(order.side)}
                          >
                            {order.side.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {order.order_type.toUpperCase()}
                          </Badge>
                          {order.trading_type === 'futures' && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                              {order.leverage}x
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatAmount(order.amount)} @ {formatPrice(order.price)}
                          {order.filled_amount > 0 && (
                            <span className="ml-2">
                              ({formatAmount(order.filled_amount)}/{formatAmount(order.amount)} filled)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      {(order.status === 'pending' || order.status === 'partially_filled') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancelling === order.id}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          {cancelling === order.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-3 mt-4">
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Order History</h3>
                <p className="text-muted-foreground">
                  Your completed orders will appear here
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{order.symbol}</span>
                        <Badge 
                          variant="secondary" 
                          className={getSideColor(order.side)}
                        >
                          {order.side.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {order.order_type.toUpperCase()}
                        </Badge>
                        {order.trading_type === 'futures' && (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                            {order.leverage}x
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatAmount(order.amount)} @ {formatPrice(order.average_price || order.price)}
                        {order.filled_amount > 0 && order.filled_amount !== order.amount && (
                          <span className="ml-2">
                            ({formatAmount(order.filled_amount)}/{formatAmount(order.amount)} filled)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        {order.fees_paid > 0 && (
                          <span className="ml-2">
                            Fee: {formatAmount(order.fees_paid)} {order.fee_asset}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                    {order.total_value && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatAmount(order.total_value)} USDT
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default OrderHistory;