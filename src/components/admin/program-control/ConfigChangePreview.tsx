import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  Info
} from "lucide-react";

interface ConfigChange {
  field: string;
  oldValue: any;
  newValue: any;
  impact: 'positive' | 'negative' | 'neutral';
}

interface ImpactEstimate {
  dailyPayoutChange: number;
  userEngagementChange: number;
  revenueImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  recommendations: string[];
}

interface ConfigChangePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programName: string;
  changes: ConfigChange[];
  impact: ImpactEstimate;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfigChangePreview({
  open,
  onOpenChange,
  programName,
  changes,
  impact,
  onConfirm,
  onCancel
}: ConfigChangePreviewProps) {
  const [confirmed, setConfirmed] = useState(false);

  const getRiskColor = () => {
    switch (impact.riskLevel) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  const getImpactIcon = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Review Configuration Changes
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Changes for: <span className="font-medium">{programName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Risk Assessment */}
          <Alert variant={getRiskColor() as any}>
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-medium">Risk Level: </span>
                <Badge variant={getRiskColor() as any} className="ml-2">
                  {impact.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </AlertDescription>
          </Alert>

          {/* Changes List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Configuration Changes</h3>
            {changes.map((change, index) => (
              <div 
                key={index}
                className="p-3 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getImpactIcon(change.impact)}
                    <span className="font-medium text-sm">{change.field}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {change.impact}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex-1">
                    <span className="text-muted-foreground">Old: </span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {JSON.stringify(change.oldValue)}
                    </code>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex-1">
                    <span className="text-muted-foreground">New: </span>
                    <code className="bg-primary/10 px-2 py-1 rounded text-xs">
                      {JSON.stringify(change.newValue)}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Impact Estimates */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Estimated Impact</h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Daily Payout</span>
                </div>
                <p className={`text-lg font-bold ${
                  impact.dailyPayoutChange > 0 ? 'text-destructive' : 'text-success'
                }`}>
                  {impact.dailyPayoutChange > 0 ? '+' : ''}
                  {impact.dailyPayoutChange}%
                </p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Engagement</span>
                </div>
                <p className={`text-lg font-bold ${
                  impact.userEngagementChange > 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {impact.userEngagementChange > 0 ? '+' : ''}
                  {impact.userEngagementChange}%
                </p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Revenue</span>
                </div>
                <p className={`text-lg font-bold ${
                  impact.revenueImpact > 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {impact.revenueImpact > 0 ? '+' : ''}
                  ${Math.abs(impact.revenueImpact).toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {impact.warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-warning flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings
              </h3>
              <ul className="space-y-1">
                {impact.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-muted-foreground pl-4">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {impact.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                <Info className="w-4 h-4" />
                Recommendations
              </h3>
              <ul className="space-y-1">
                {impact.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-muted-foreground pl-4">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <input
              type="checkbox"
              id="confirm-changes"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="confirm-changes" className="text-sm cursor-pointer">
              I understand the impact and want to proceed with these changes
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={!confirmed}
          >
            Confirm Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
