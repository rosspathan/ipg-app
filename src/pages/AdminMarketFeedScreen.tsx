import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Settings, Wifi, WifiOff, ExternalLink, Database, TestTube } from 'lucide-react';

const AdminMarketFeedScreen: React.FC = () => {
  const { toast } = useToast();
  
  // Mock settings - in real app, fetch from database
  const [settings, setSettings] = useState({
    marketFeedUrl: '',
    useExternalBinanceFeed: true,
    connectionTimeout: 30,
    reconnectMaxAttempts: 5,
    reconnectDelay: 3000,
    heartbeatInterval: 30000,
    enableFallbackRest: true,
    restFallbackInterval: 3000
  });
  
  const [testResults, setTestResults] = useState<{
    binance?: { status: string; latency?: number; error?: string };
    internal?: { status: string; latency?: number; error?: string };
  }>({});
  
  const [testing, setTesting] = useState(false);

  const handleSaveSettings = () => {
    // In real app, save to database/environment
    toast({
      title: "Settings Saved",
      description: "Market feed settings have been updated successfully.",
    });
  };

  const handleTestConnection = async (type: 'binance' | 'internal') => {
    setTesting(true);
    
    try {
      const startTime = Date.now();
      
      if (type === 'binance') {
        // Test Binance WebSocket connection
        const testWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            testWs.close();
            reject(new Error('Connection timeout'));
          }, 10000);
          
          testWs.onopen = () => {
            clearTimeout(timeout);
            const latency = Date.now() - startTime;
            testWs.close();
            setTestResults(prev => ({
              ...prev,
              binance: { status: 'success', latency }
            }));
            resolve(null);
          };
          
          testWs.onerror = (error) => {
            clearTimeout(timeout);
            setTestResults(prev => ({
              ...prev,
              binance: { status: 'error', error: 'Connection failed' }
            }));
            reject(error);
          };
        });
      } else {
        // Test internal market feed URL
        if (!settings.marketFeedUrl) {
          throw new Error('No internal market feed URL configured');
        }
        
        const response = await fetch(settings.marketFeedUrl.replace('wss://', 'https://').replace('ws://', 'http://'), {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000)
        });
        
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          setTestResults(prev => ({
            ...prev,
            internal: { status: 'success', latency }
          }));
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      }
      
      toast({
        title: "Connection Test Successful",
        description: `${type === 'binance' ? 'Binance' : 'Internal'} feed is reachable.`,
      });
      
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [type]: { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
      }));
      
      toast({
        title: "Connection Test Failed",
        description: `Failed to connect to ${type === 'binance' ? 'Binance' : 'internal'} feed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (result?: { status: string; latency?: number; error?: string }) => {
    if (!result) return <Badge variant="outline">Not Tested</Badge>;
    
    switch (result.status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-500">
            <Wifi className="w-3 h-3 mr-1" />
            Connected {result.latency && `(${result.latency}ms)`}
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <WifiOff className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Market Feed Configuration</h1>
      </div>
      
      <div className="grid gap-6">
        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Internal Market Feed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Internal Market Aggregator</Label>
                  <p className="text-sm text-muted-foreground">
                    Custom WebSocket URL for internal market data aggregator
                  </p>
                </div>
                {getStatusBadge(testResults.internal)}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="marketFeedUrl">WebSocket URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="marketFeedUrl"
                    placeholder="wss://your-market-feed.com/ws"
                    value={settings.marketFeedUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, marketFeedUrl: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection('internal')}
                    disabled={testing || !settings.marketFeedUrl}
                  >
                    <TestTube className="w-4 h-4 mr-1" />
                    Test
                  </Button>
                </div>
                {testResults.internal?.error && (
                  <p className="text-sm text-red-500">{testResults.internal.error}</p>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Binance Feed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Binance External Feed</Label>
                  <p className="text-sm text-muted-foreground">
                    Use public Binance WebSocket API as fallback or primary source
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(testResults.binance)}
                  <Switch
                    checked={settings.useExternalBinanceFeed}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, useExternalBinanceFeed: checked }))
                    }
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection('binance')}
                  disabled={testing}
                >
                  <TestTube className="w-4 h-4 mr-1" />
                  Test Binance Connection
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a 
                    href="https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    API Docs
                  </a>
                </Button>
              </div>
              
              {testResults.binance?.error && (
                <p className="text-sm text-red-500">{testResults.binance.error}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="connectionTimeout">Connection Timeout (seconds)</Label>
                <Input
                  id="connectionTimeout"
                  type="number"
                  min="5"
                  max="120"
                  value={settings.connectionTimeout}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    connectionTimeout: parseInt(e.target.value) || 30 
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reconnectMaxAttempts">Max Reconnect Attempts</Label>
                <Input
                  id="reconnectMaxAttempts"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.reconnectMaxAttempts}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    reconnectMaxAttempts: parseInt(e.target.value) || 5 
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reconnectDelay">Reconnect Delay (ms)</Label>
                <Input
                  id="reconnectDelay"
                  type="number"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={settings.reconnectDelay}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    reconnectDelay: parseInt(e.target.value) || 3000 
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="heartbeatInterval">Heartbeat Interval (ms)</Label>
                <Input
                  id="heartbeatInterval"
                  type="number"
                  min="10000"
                  max="120000"
                  step="5000"
                  value={settings.heartbeatInterval}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    heartbeatInterval: parseInt(e.target.value) || 30000 
                  }))}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* REST Fallback */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">REST API Fallback</Label>
                  <p className="text-sm text-muted-foreground">
                    Fall back to REST API polling when WebSocket connections fail
                  </p>
                </div>
                <Switch
                  checked={settings.enableFallbackRest}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableFallbackRest: checked }))
                  }
                />
              </div>
              
              {settings.enableFallbackRest && (
                <div className="space-y-2">
                  <Label htmlFor="restFallbackInterval">REST Polling Interval (ms)</Label>
                  <Input
                    id="restFallbackInterval"
                    type="number"
                    min="1000"
                    max="30000"
                    step="500"
                    value={settings.restFallbackInterval}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      restFallbackInterval: parseInt(e.target.value) || 3000 
                    }))}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Priority Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Feed Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The system will use data sources in the following priority order:
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border">
                  <Badge variant="default">1</Badge>
                  <div>
                    <p className="font-medium">
                      {settings.marketFeedUrl ? 'Internal Market Aggregator' : 'Not Configured'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {settings.marketFeedUrl || 'Configure URL above to enable'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border">
                  <Badge variant="outline">2</Badge>
                  <div>
                    <p className="font-medium">
                      Binance Public API {!settings.useExternalBinanceFeed && '(Disabled)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      wss://stream.binance.com:9443/ws/
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border">
                  <Badge variant="outline">3</Badge>
                  <div>
                    <p className="font-medium">
                      REST API Fallback {!settings.enableFallbackRest && '(Disabled)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Binance REST API polling every {settings.restFallbackInterval}ms
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} className="min-w-32">
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminMarketFeedScreen;