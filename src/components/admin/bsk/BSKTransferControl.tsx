import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAdminTransferControl } from "@/hooks/useAdminTransferControl";
import { RefreshCw, Power } from "lucide-react";

export function BSKTransferControl() {
  const { 
    transfersEnabled, 
    isLoading, 
    toggleTransfers, 
    isToggling,
    syncWithOffers,
    isSyncing 
  } = useAdminTransferControl();

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Power className="w-5 h-5" />
              BSK Transfer Control
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage peer-to-peer BSK transfer availability
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isLoading 
              ? 'bg-muted text-muted-foreground'
              : transfersEnabled 
              ? 'bg-success/20 text-success' 
              : 'bg-destructive/20 text-destructive'
          }`}>
            {isLoading ? 'Loading...' : transfersEnabled ? 'ENABLED' : 'DISABLED'}
          </div>
        </div>

        <div className="flex items-center justify-between py-4 border-t border-border">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Manual Toggle
            </p>
            <p className="text-xs text-muted-foreground">
              Override automatic control based on active offers
            </p>
          </div>
          <Switch
            checked={transfersEnabled}
            onCheckedChange={toggleTransfers}
            disabled={isLoading || isToggling}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <Button
            onClick={() => syncWithOffers()}
            disabled={isSyncing || isLoading}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync with Active Offers'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Automatically enables/disables based on whether any one-time purchase offers are currently active
          </p>
        </div>
      </div>
    </Card>
  );
}
