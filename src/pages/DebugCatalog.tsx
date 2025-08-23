import { useCatalog } from '@/hooks/useCatalog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AssetLogo from '@/components/AssetLogo';

const DebugCatalog = () => {
  const { assetsById, assetsList, marketsList, pairsBySymbol, loading, error } = useCatalog();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold mb-6">Debug Catalog - Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Debug Catalog</h1>
          <Badge variant="outline">
            {error ? 'Error' : 'Live Data'}
          </Badge>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assets Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assetsList.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Markets Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{marketsList.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Trading Pairs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(pairsBySymbol).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Assets List */}
        <Card>
          <CardHeader>
            <CardTitle>Assets List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assetsList.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} />
                    <div>
                      <div className="font-medium">{asset.symbol}</div>
                      <div className="text-sm text-muted-foreground">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{asset.network}</div>
                    <div className="text-muted-foreground">ID: {asset.id.slice(0, 8)}...</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Markets List */}
        <Card>
          <CardHeader>
            <CardTitle>Markets List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {marketsList.map((market) => (
                <div key={market.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {market.base_asset && market.quote_asset && (
                      <>
                        <div className="flex -space-x-2">
                          <AssetLogo symbol={market.base_asset.symbol} logoUrl={market.base_asset.logo_url} size="sm" />
                          <AssetLogo symbol={market.quote_asset.symbol} logoUrl={market.quote_asset.logo_url} size="sm" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {market.base_asset.symbol}/{market.quote_asset.symbol}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Tick: {market.tick_size} | Lot: {market.lot_size} | Min: {market.min_notional}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-muted-foreground">ID: {market.id.slice(0, 8)}...</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pairs by Symbol */}
        <Card>
          <CardHeader>
            <CardTitle>Pairs by Symbol (Object Keys)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.keys(pairsBySymbol).map((symbol) => (
                <Badge key={symbol} variant="outline">
                  {symbol}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assets by ID Sample */}
        <Card>
          <CardHeader>
            <CardTitle>Assets by ID (Sample)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(assetsById).slice(0, 3).map(([id, asset]) => [
                    id,
                    {
                      symbol: asset.symbol,
                      name: asset.name,
                      network: asset.network,
                      logo_url: asset.logo_url?.slice(0, 50) + '...' || null,
                    },
                  ])
                ),
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugCatalog;