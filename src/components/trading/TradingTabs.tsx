import React from 'react';
import { cn } from '@/lib/utils';

interface TradingTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = ['Spot', 'Swap', 'Margin', 'P2P', 'Staking'];

export const TradingTabs: React.FC<TradingTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex items-center gap-1 bg-card/50 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md",
            activeTab === tab
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
