import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    let config: any = {};

    switch (widgetType) {
      case 'market-overview':
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
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
              "symbols": [
                { "s": "BINANCE:BTCUSDT", "d": "Bitcoin" },
                { "s": "BINANCE:ETHUSDT", "d": "Ethereum" },
                { "s": "BINANCE:BNBUSDT", "d": "BNB" },
                { "s": "BINANCE:ADAUSDT", "d": "Cardano" },
                { "s": "BINANCE:SOLUSDT", "d": "Solana" },
                { "s": "BINANCE:DOTUSDT", "d": "Polkadot" }
              ],
              "originalTitle": "Crypto"
            }
          ]
        };
        break;

      case 'ticker':
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
        config = {
          "symbols": [
            { "proName": "BINANCE:BTCUSDT", "title": "Bitcoin" },
            { "proName": "BINANCE:ETHUSDT", "title": "Ethereum" },
            { "proName": "BINANCE:BNBUSDT", "title": "BNB" },
            { "proName": "BINANCE:ADAUSDT", "title": "Cardano" },
            { "proName": "BINANCE:SOLUSDT", "title": "Solana" }
          ],
          "showSymbolLogo": true,
          "colorTheme": colorTheme,
          "isTransparent": true,
          "displayMode": "adaptive",
          "locale": "en"
        };
        break;

      case 'mini-chart':
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
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
        config = {
          "autosize": true,
          "symbol": symbol,
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": colorTheme,
          "style": "1",
          "locale": "en",
          "enable_publishing": false,
          "allow_symbol_change": true,
          "container_id": "tradingview_widget",
          "width": width,
          "height": height,
          "hide_top_toolbar": false,
          "hide_legend": false,
          "save_image": false,
          "backgroundColor": "rgba(0, 0, 0, 0)",
          "gridColor": "rgba(240, 243, 250, 0.06)",
          "hide_volume": false,
          "support_host": "https://www.tradingview.com"
        };
    }

    script.innerHTML = `
      ${JSON.stringify(config)}
    `;

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, width, height, colorTheme, widgetType]);

  return (
    <div 
      ref={containerRef} 
      className={`tradingview-widget-container ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
};

export default TradingViewWidget;