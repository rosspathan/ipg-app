import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Database, TrendingUp } from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import { format } from "date-fns";

const DebugCatalogScreen = () => {
  const { 
    status, 
    assets, 
    markets, 
    pairsList, 
    pairsBySymbol, 
    assetsById,
    error, 
    refetch, 
    lastUpdated, 
    lastRealtimeEvent 
  } = useCatalog();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading': return 'bg-yellow-500';
      case 'ready': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'empty': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading catalog data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug Catalog</h1>
          <p className="text-muted-foreground">Real-time catalog data inspection</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(status)} text-white`}>
            {status.toUpperCase()}
          </Badge>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refetch
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.assets ? format(new Date(lastUpdated.assets), 'HH:mm:ss') : 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{markets.length}</div>
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.markets ? format(new Date(lastUpdated.markets), 'HH:mm:ss') : 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trading Pairs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pairsList.length}</div>
            <p className="text-xs text-muted-foreground">
              Available for trading
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status */}
      {lastRealtimeEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last Real-time Event</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm bg-muted p-2 rounded block">
              {lastRealtimeEvent}
            </code>
          </CardContent>
        </Card>
      )}

      {/* Assets List */}
      <Card>
        <CardHeader>
          <CardTitle>Assets ({assets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {assets.slice(0, 10).map((asset) => (
              <div key={asset.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                <img 
                  src={asset.logo_url || '/placeholder-crypto.svg'} 
                  alt={asset.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-crypto.svg';
                  }}
                />
                <span className="font-medium">{asset.symbol}</span>
                <span className="text-xs text-muted-foreground">({asset.network})</span>
              </div>
            ))}
            {assets.length > 10 && (
              <div className="text-sm text-muted-foreground p-2">
                ... and {assets.length - 10} more
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trading Pairs List */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Pairs ({pairsList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {pairsList.slice(0, 15).map((pair) => (
              <div key={pair.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                <div className="flex items-center gap-1">
                  <img 
                    src={pair.base_logo} 
                    alt={pair.base_symbol}
                    className="w-5 h-5 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-crypto.svg';
                    }}
                  />
                  <img 
                    src={pair.quote_logo} 
                    alt={pair.quote_symbol}
                    className="w-5 h-5 rounded-full -ml-1"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-crypto.svg';
                    }}
                  />
                </div>
                <span className="font-medium">{pair.pair}</span>
                <div className="text-xs text-muted-foreground">
                  Min: {pair.min_notional}
                </div>
              </div>
            ))}
            {pairsList.length > 15 && (
              <div className="text-sm text-muted-foreground p-2">
                ... and {pairsList.length - 15} more
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sample pairsBySymbol */}
      <Card>
        <CardHeader>
          <CardTitle>Sample pairsBySymbol Object</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
            {JSON.stringify(
              Object.fromEntries(Object.entries(pairsBySymbol).slice(0, 3)), 
              null, 
              2
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugCatalogScreen;