import { ExchangeAdapter, OrderRequest, OrderResponse, BalanceUpdate, ExchangeConfig } from "./ExchangeAdapter";
import { supabase } from "@/integrations/supabase/client";

// Placeholder for external exchange integration
// This would be configured by admin with API credentials
export class ExternalAdapter extends ExchangeAdapter {
  private ws: WebSocket | null = null;

  constructor(config: ExchangeConfig) {
    super(config);
    
    if (!config.apiKey || !config.apiSecret) {
      console.warn("[ExternalAdapter] API credentials not configured, adapter will not function");
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error("External adapter not configured. Please configure API credentials in admin settings.");
    }

    console.log("[ExternalAdapter] Placing order via external API:", order);

    try {
      // Call our edge function which handles Binance API integration securely
      const { data, error } = await supabase.functions.invoke('place-order', {
        body: {
          pair: order.pair,
          side: order.side,
          type: order.type,
          amount: order.amount,
          price: order.price,
          clientOrderId: order.clientOrderId
        }
      });

      if (error) throw error;
      if (!data || !data.success) {
        throw new Error(data?.error || 'Order placement failed');
      }

      return {
        orderId: data.orderId,
        status: data.status || 'pending',
        filledAmount: data.executedQty || 0,
        averagePrice: data.averagePrice || order.price || 0,
        fee: data.fee || 0,
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error("[ExternalAdapter] Order placement error:", error);
      throw new Error(`Order placement failed: ${error.message}`);
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error("External adapter not configured");
    }

    console.log("[ExternalAdapter] Cancelling order:", orderId);

    try {
      const { data, error } = await supabase.functions.invoke('cancel-order', {
        body: { orderId }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error: any) {
      console.error("[ExternalAdapter] Order cancellation error:", error);
      return false;
    }
  }

  async getBalance(asset: string): Promise<BalanceUpdate> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error("External adapter not configured");
    }

    try {
      // Query from our database which is updated by deposit/withdrawal flows
      const { data, error } = await supabase
        .from('wallet_balances')
        .select(`
          available,
          locked,
          assets!inner(symbol)
        `)
        .eq('assets.symbol', asset)
        .single();

      if (error) throw error;

      return {
        asset,
        available: Number(data?.available || 0),
        locked: Number(data?.locked || 0)
      };
    } catch (error: any) {
      console.error("[ExternalAdapter] Balance fetch error:", error);
      return { asset, available: 0, locked: 0 };
    }
  }

  subscribeToUserStream(userId: string, callback: (update: any) => void): void {
    if (!this.config.apiKey || !this.config.endpoint) {
      console.warn("[ExternalAdapter] Cannot subscribe: not configured");
      return;
    }

    try {
      // Connect to our trading WebSocket edge function
      const wsUrl = `wss://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/trading-websocket`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[ExternalAdapter] User stream connected");
        this.ws?.send(JSON.stringify({
          type: 'subscribe',
          channel: 'user',
          userId
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error("[ExternalAdapter] Parse error:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("[ExternalAdapter] WebSocket error:", error);
      };

      this.ws.onclose = () => {
        console.log("[ExternalAdapter] User stream disconnected");
      };
    } catch (error: any) {
      console.error("[ExternalAdapter] Subscription error:", error);
    }
  }

  unsubscribe(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
