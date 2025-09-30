// Exchange Adapter Interface for pluggable trading execution

export interface OrderRequest {
  pair: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  amount: number;
  price?: number;
  clientOrderId?: string;
}

export interface OrderResponse {
  orderId: string;
  status: "pending" | "filled" | "partially_filled" | "cancelled" | "rejected";
  filledAmount: number;
  averagePrice: number;
  fee: number;
  timestamp: number;
}

export interface BalanceUpdate {
  asset: string;
  available: number;
  locked: number;
}

export interface ExchangeConfig {
  apiKey?: string;
  apiSecret?: string;
  endpoint?: string;
  mode: "LIVE" | "SIM";
}

export abstract class ExchangeAdapter {
  protected config: ExchangeConfig;

  constructor(config: ExchangeConfig) {
    this.config = config;
  }

  abstract placeOrder(order: OrderRequest): Promise<OrderResponse>;
  abstract cancelOrder(orderId: string): Promise<boolean>;
  abstract getBalance(asset: string): Promise<BalanceUpdate>;
  abstract subscribeToUserStream(userId: string, callback: (update: any) => void): void;
  abstract unsubscribe(): void;
}
