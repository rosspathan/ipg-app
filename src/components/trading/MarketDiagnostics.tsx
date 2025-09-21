import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Wifi, WifiOff, Activity, Clock } from 'lucide-react';
import { useMarketDiagnostics, useMarketConnection } from '@/hooks/useMarketStore';

const MarketDiagnostics: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { connectionStatus, subscriptions, isClientInitialized } = useMarketDiagnostics();
  const { isConnected, error } = useMarketConnection();

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-border hover:bg-muted/50"
          >
            {isConnected ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
            Market Feed
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card className="w-80 bg-background/95 backdrop-blur-sm border-border shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Market Feed Diagnostics
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3 text-xs">
              {/* Connection Status */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Connection Status</span>
                  <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                {error && (
                  <div className="text-red-500 text-xs bg-red-500/10 p-2 rounded">
                    {error}
                  </div>
                )}
              </div>

              {/* Client Status */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">WebSocket Client</span>
                  <Badge variant={isClientInitialized ? "default" : "secondary"} className="text-xs">
                    {isClientInitialized ? 'Initialized' : 'Not Initialized'}
                  </Badge>
                </div>
              </div>

              {/* Active Subscriptions */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Active Subscriptions</span>
                  <Badge variant="outline" className="text-xs">
                    {subscriptions.length}
                  </Badge>
                </div>
                {subscriptions.length > 0 && (
                  <div className="bg-muted/20 p-2 rounded text-xs">
                    {subscriptions.map((symbol, index) => (
                      <div key={symbol} className="flex justify-between">
                        <span>{symbol}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {Object.keys(connectionStatus).includes(symbol.toLowerCase().replace('/', '')) ? 'Active' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connection Details */}
              {Object.keys(connectionStatus).length > 0 && (
                <div>
                  <span className="font-medium">Connection Details</span>
                  <div className="bg-muted/20 p-2 rounded mt-1 space-y-2">
                    {Object.entries(connectionStatus).map(([key, status]: [string, any]) => (
                      <div key={key} className="border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs">{key}</span>
                          <Badge 
                            variant={status.connected ? "default" : "destructive"} 
                            className="text-xs"
                          >
                            {status.connected ? 'Connected' : 'Disconnected'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Ready State: {status.readyState}
                        </div>
                        {status.subscriptions && status.subscriptions.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Symbols: {status.subscriptions.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t border-border">
                <Clock className="w-3 h-3" />
                Last update: {new Date().toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default MarketDiagnostics;