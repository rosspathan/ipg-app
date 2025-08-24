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

  useEffect(() => {
    // Clear and mark container to avoid StrictMode double-initialization artifacts
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.setAttribute('data-tv-embed-initialized', 'true');
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;

    let config: any = {};

    switch (widgetType) {
      case 'market-overview':
        script.src = 'https://www.tradingview.com/external-embedding/embed-widget-market-overview.js';
        config = {
          "colorTheme": colorTheme,
          "dateRange": "12M",
          "showChart": true,
          "locale": "en",
          "width": width,
          "height": height,
          "largeChartUrl": "",
          "isTransparent": true,
          "showSymbolLogo": true,
          "showFloatingTooltip": false,
          "plotLineColorGrowing": "rgba(41, 98, 255, 1)",
          "plotLineColorFalling": "rgba(41, 98, 255, 1)",
          "gridLineColor": "rgba(240, 243, 250, 0)",
          "scaleFontColor": "rgba(106, 109, 120, 1)",
          "belowLineFillColorGrowing": "rgba(41, 98, 255, 0.12)",
          "belowLineFillColorFalling": "rgba(41, 98, 255, 0.12)",
          "belowLineFillColorGrowingBottom": "rgba(41, 98, 255, 0)",
          "belowLineFillColorFallingBottom": "rgba(41, 98, 255, 0)",
          "symbolActiveColor": "rgba(41, 98, 255, 0.12)",
          "tabs": [
            {
              "title": "Crypto",
              "symbols": pairsList.slice(0, 10).map(pair => ({
                "s": pair.tradingview_symbol || `BINANCE:${pair.base_symbol}${pair.quote_symbol}`,
                "d": pair.pair
              })),
              "originalTitle": "Crypto"
            }
          ]
        };
        break;

      case 'ticker':
        script.src = 'https://www.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
        config = {
          "symbols": pairsList.slice(0, 8).map(pair => ({
            "proName": pair.tradingview_symbol || `BINANCE:${pair.base_symbol}${pair.quote_symbol}`,
            "title": pair.pair
          })),
          "showSymbolLogo": true,
          "colorTheme": colorTheme,
          "isTransparent": true,
          "displayMode": "adaptive",
          "locale": "en"
        };
        break;

      case 'mini-chart':
        script.src = 'https://www.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
        config = {
          "symbol": symbol,
          "width": width,
          "height": height,
          "locale": "en",
          "dateRange": "12M",
          "colorTheme": colorTheme,
          "isTransparent": true,
          "autosize": false,
          "largeChartUrl": ""
        };
        break;

      default: // advanced-chart
        script.src = 'https://www.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        config = {
          "autosize": false,
          "symbol": symbol,
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": colorTheme,
          "style": "1",
          "locale": "en",
          "enable_publishing": false,
          "allow_symbol_change": true,
          "width": width,
          "height": height,
          "hide_top_toolbar": false,
          "hide_legend": false,
          "save_image": false,
          "backgroundColor": "rgba(0, 0, 0, 0)",
          "gridColor": "rgba(240, 243, 250, 0.06)",
          "hide_volume": false,
          "support_host": "https://www.tradingview.com",
          "details": true,
          "hotlist": true,
          "calendar": false
        };
    }

    script.innerHTML = JSON.stringify(config);

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    // Add a small delay to ensure script loads
    const timeout = setTimeout(() => {
      console.log('TradingView widget loading for symbol:', symbol);
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, width, height, colorTheme, widgetType, pairsList]);

  return (
    <div 
      ref={containerRef} 
      className={`tradingview-widget-container ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    >
      <div className="tradingview-widget-container__widget" />
    </div>
  );
};

export default TradingViewWidget;