import { useEffect, useRef } from 'react';
import { useCatalog } from '@/hooks/useCatalog';

interface TradingViewWidgetProps {
  symbol?: string;
  width?: string | number;
  height?: string | number;
  colorTheme?: 'light' | 'dark';
  widgetType?: 'market-overview' | 'mini-chart' | 'ticker' | 'advanced-chart';
  className?: string;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol = 'BINANCE:BTCUSDT',
  width = '100%',
  height = 400,
  colorTheme = 'dark',
  widgetType = 'mini-chart',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { pairsList } = useCatalog();

  // Simple iframe-based chart that should work reliably
  const getChartUrl = () => {
    const theme = colorTheme === 'dark' ? '2' : '1';
    const cleanSymbol = symbol.replace('BINANCE:', '');
    return `https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${symbol}&interval=1D&hidesidetoolbar=1&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&theme=${theme}&studies=[]&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=&utm_medium=widget&utm_campaign=chart&utm_term=${cleanSymbol}`;
  };

  return (
    <div 
      ref={containerRef} 
      className={`tradingview-widget-container ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    >
      <iframe
        src={getChartUrl()}
        width="100%"
        height="100%"
        frameBorder="0"
        allowFullScreen
        title="TradingView Chart"
        style={{
          border: 'none',
          borderRadius: '8px'
        }}
      />
    </div>
  );
};

export default TradingViewWidget;