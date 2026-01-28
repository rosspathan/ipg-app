import { ExchangeAdapter, OrderRequest, OrderResponse, BalanceUpdate, ExchangeConfig } from "./ExchangeAdapter";

// Simulation adapter for paper trading (default fallback)
export class SimAdapter extends ExchangeAdapter {
  private orders: Map<string, OrderResponse> = new Map();
  private balances: Map<string, BalanceUpdate> = new Map();
  private slippagePercent: number = 0.1; // 0.1% slippage

  constructor(config: ExchangeConfig) {
    super(config);
    
    // Initialize mock balances
    this.balances.set("BSK", { asset: "BSK", available: 1000, locked: 0 });
    this.balances.set("USDT", { asset: "USDT", available: 10000, locked: 0 });
    this.balances.set("USDI", { asset: "USDI", available: 10000, locked: 0 });
    this.balances.set("BTC", { asset: "BTC", available: 0.5, locked: 0 });
    this.balances.set("ETH", { asset: "ETH", available: 5, locked: 0 });
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    console.log("[SimAdapter] Placing simulated order:", order);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get current market price (in real implementation, would fetch from price feed)
    const marketPrice = order.price || this.getMockPrice(order.pair);
    
    // Apply slippage for market orders
    const executionPrice = order.type === "market" 
      ? marketPrice * (1 + (order.side === "buy" ? 1 : -1) * (this.slippagePercent / 100))
      : order.price!;

    const orderId = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const response: OrderResponse = {
      orderId,
      status: "filled", // Instantly fill in simulation
      filledAmount: order.amount,
      averagePrice: executionPrice,
      fee: order.amount * executionPrice * 0.001, // 0.1% fee
      timestamp: Date.now()
    };

    this.orders.set(orderId, response);

    // Update balances
    this.updateBalancesAfterFill(order, response);

    console.log("[SimAdapter] Order filled:", response);
    return response;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    console.log("[SimAdapter] Cancelling order:", orderId);
    
    const order = this.orders.get(orderId);
    if (!order) return false;

    this.orders.delete(orderId);
    return true;
  }

  async getBalance(asset: string): Promise<BalanceUpdate> {
    return this.balances.get(asset) || { asset, available: 0, locked: 0 };
  }

  subscribeToUserStream(userId: string, callback: (update: any) => void): void {
    console.log("[SimAdapter] User stream subscription (no-op in SIM)");
    // No-op in simulation mode
  }

  unsubscribe(): void {
    console.log("[SimAdapter] Unsubscribe (no-op in SIM)");
    // No-op in simulation mode
  }

  private getMockPrice(pair: string): number {
    // Mock prices for common pairs (all in USD)
    const prices: Record<string, number> = {
      "BSK/USDT": 0.012,
      "BSK/USDI": 0.012,
      "USDI/USDT": 1,
      "BTC/USDT": 43250,
      "ETH/USDT": 2650,
      "BNB/USDT": 315
    };
    return prices[pair] || 1;
  }

  private updateBalancesAfterFill(order: OrderRequest, response: OrderResponse): void {
    const [base, quote] = order.pair.split("/");
    
    const baseBalance = this.balances.get(base) || { asset: base, available: 0, locked: 0 };
    const quoteBalance = this.balances.get(quote) || { asset: quote, available: 0, locked: 0 };

    if (order.side === "buy") {
      // Deduct quote currency
      quoteBalance.available -= (response.filledAmount * response.averagePrice + response.fee);
      // Add base currency
      baseBalance.available += response.filledAmount;
    } else {
      // Deduct base currency
      baseBalance.available -= response.filledAmount;
      // Add quote currency
      quoteBalance.available += (response.filledAmount * response.averagePrice - response.fee);
    }

    this.balances.set(base, baseBalance);
    this.balances.set(quote, quoteBalance);
  }
}
