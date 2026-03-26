import React, { useState, useMemo } from 'react';
import { OpenOrdersTab } from './history/OpenOrdersTab';
import { OrderHistoryTab } from './history/OrderHistoryTab';
import { TradeHistoryFillsTab } from './history/TradeHistoryFillsTab';
import { FundsLedgerTab } from './history/FundsLedgerTab';
import { useTradeHistory, useOrderCancel } from '@/hooks/useTradeHistory';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface TradingHistoryTabsProps {
  symbol?: string;
  onOrderDetails?: (orderId: string) => void;
  onTradeDetails?: (tradeId: string) => void;
}

const tabs = [
  { key: 'open', label: 'Open' },
  { key: 'orders', label: 'Orders' },
  { key: 'trades', label: 'Trades' },
  { key: 'funds', label: 'Funds' },
] as const;

export function TradingHistoryTabs({
  symbol,
  onOrderDetails,
  onTradeDetails
}: TradingHistoryTabsProps) {
  const [activeTab, setActiveTab] = useState<string>('open');

  const normalizedSymbol = useMemo(() => {
    if (!symbol) return undefined;
    return symbol.replace('-', '/');
  }, [symbol]);

  const {
    fills, orders, openOrders, fundsMovements,
    isLoadingFills, isLoadingOrders, isLoadingOpenOrders, isLoadingFunds,
  } = useTradeHistory({ symbol: normalizedSymbol });

  const { cancelOrder, isCancelling } = useOrderCancel();
  const openCount = openOrders.length;

  return (
    <div>
      {/* Premium tab bar */}
      <div className="flex items-stretch border-b border-[hsl(230,20%,12%)]/40">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 h-[40px] text-[11px] font-bold uppercase tracking-wider transition-all relative",
              activeTab === key
                ? "text-foreground"
                : "text-muted-foreground/35 hover:text-muted-foreground/60"
            )}
          >
            {label}
            {key === 'open' && openCount > 0 && (
              <span className="min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold text-danger-foreground bg-danger rounded-full px-1">{openCount}</span>
            )}
            {activeTab === key && (
              <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] bg-accent rounded-full shadow-[0_0_8px_hsl(186,100%,50%,0.4)]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pt-2 px-3 min-h-[100px]">
        {activeTab === 'open' && (
          isLoadingOpenOrders ? <LoadingState /> : (
            <OpenOrdersTab
              orders={openOrders}
              currentSymbol={normalizedSymbol}
              onCancel={cancelOrder}
              isCancelling={isCancelling}
              onDetails={onOrderDetails}
            />
          )
        )}
        {activeTab === 'orders' && (
          isLoadingOrders ? <LoadingState /> : (
            <OrderHistoryTab
              orders={orders}
              currentSymbol={normalizedSymbol}
              onDetails={onOrderDetails}
            />
          )
        )}
        {activeTab === 'trades' && (
          isLoadingFills ? <LoadingState /> : (
            <TradeHistoryFillsTab
              fills={fills}
              currentSymbol={normalizedSymbol}
              onDetails={onTradeDetails}
            />
          )
        )}
        {activeTab === 'funds' && (
          isLoadingFunds ? <LoadingState /> : (
            <FundsLedgerTab movements={fundsMovements} />
          )
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" />
    </div>
  );
}
