import { useMemo } from "react";

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export function useOrderBookAggregation(
  bids: OrderBookLevel[],
  asks: OrderBookLevel[],
  precision: number
) {
  const aggregatedBids = useMemo(() => {
    return aggregateOrders(bids, precision, "bid");
  }, [bids, precision]);

  const aggregatedAsks = useMemo(() => {
    return aggregateOrders(asks, precision, "ask");
  }, [asks, precision]);

  return { aggregatedBids, aggregatedAsks };
}

function aggregateOrders(
  orders: OrderBookLevel[],
  precision: number,
  side: "bid" | "ask"
): OrderBookEntry[] {
  const aggregated = new Map<number, number>();

  // Group orders by precision level
  orders.forEach(({ price, quantity }) => {
    // Round price to precision
    const roundedPrice = Math.floor(price / precision) * precision;

    const existing = aggregated.get(roundedPrice) || 0;
    aggregated.set(roundedPrice, existing + quantity);
  });

  // Convert to array and sort
  const entries: OrderBookEntry[] = [];
  let cumulativeTotal = 0;

  const sortedPrices = Array.from(aggregated.keys()).sort((a, b) => 
    side === "bid" ? b - a : a - b
  );

  sortedPrices.forEach((price) => {
    const quantity = aggregated.get(price)!;
    cumulativeTotal += quantity * price;
    
    entries.push({
      price,
      quantity,
      total: cumulativeTotal,
    });
  });

  return entries;
}
