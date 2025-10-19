import { useEffect, useRef, useState } from 'react';
import { useCatalog } from '@/hooks/useCatalog';
import { Button } from '@/components/ui/button';
import { Maximize2, LineChart, CandlestickChart, TrendingUp } from 'lucide-react';

interface TradingViewWidgetProps {
  symbol?: string;
  width?: string | number;
  height?: string | number;
  colorTheme?: 'light' | 'dark';
  widgetType?: 'market-overview' | 'mini-chart' | 'ticker' | 'advanced-chart';
  className?: string;
  showControls?: boolean;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol = 'BINANCE:BTCUSDT',
  width = '100%',
  height = 400,
  colorTheme = 'dark',
  widgetType = 'mini-chart',
  className = '',
  showControls = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { pairsList } = useCatalog();
  const [interval, setInterval] = useState('1D');
  const [chartType, setChartType] = useState('1'); // 1=candles, 3=line
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getChartUrl = () => {
    const theme = colorTheme === 'dark' ? '2' : '1';
    const cleanSymbol = symbol.replace('BINANCE:', '');
    return `https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${symbol}&interval=${interval}&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&theme=${theme}&style=${chartType}&studies=[]&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=&utm_medium=widget&utm_campaign=chart&utm_term=${cleanSymbol}`;
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`tradingview-widget-container relative ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    >
      {showControls && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 bg-background/95 backdrop-blur-sm rounded-lg border border-border p-1">
          <Button
            size="sm"
            variant={interval === '1' ? 'default' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => setInterval('1')}
          >
            1m
          </Button>
          <Button
            size="sm"
            variant={interval === '5' ? 'default' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => setInterval('5')}
          >
            5m
          </Button>
          <Button
            size="sm"
            variant={interval === '60' ? 'default' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => setInterval('60')}
          >
            1H
          </Button>
          <Button
            size="sm"
            variant={interval === '1D' ? 'default' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => setInterval('1D')}
          >
            1D
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button
            size="sm"
            variant={chartType === '1' ? 'default' : 'ghost'}
            className="h-7 px-2"
            onClick={() => setChartType('1')}
          >
            <CandlestickChart className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant={chartType === '3' ? 'default' : 'ghost'}
            className="h-7 px-2"
            onClick={() => setChartType('3')}
          >
            <LineChart className="h-3 w-3" />
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={handleFullscreen}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <iframe
        key={`${symbol}-${interval}-${chartType}`}
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