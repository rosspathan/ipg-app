import { useState } from "react";
import { useProgramVisibilityRules } from "@/hooks/useProgramVisibilityRules";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RulesTabProps {
  moduleId: string;
}

export function RulesTab({ moduleId }: RulesTabProps) {
  const { rules, createRule, updateRule, deleteRule } = useProgramVisibilityRules(moduleId);
  const [showNewRuleDialog, setShowNewRuleDialog] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_type: 'kyc_level' as any,
    rule_config: {},
    priority: 0
  });

  const handleCreateRule = () => {
    createRule({
      module_id: moduleId,
      ...newRule
    });
    setShowNewRuleDialog(false);
    setNewRule({
      rule_type: 'kyc_level',
      rule_config: {},
      priority: 0
    });
  };

  const toggleRuleActive = (ruleId: string, currentStatus: boolean) => {
    updateRule({
      id: ruleId,
      updates: { is_active: !currentStatus }
    });
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'kyc_level': return 'bg-blue-500/10 text-blue-500';
      case 'badge': return 'bg-purple-500/10 text-purple-500';
      case 'balance_threshold': return 'bg-green-500/10 text-green-500';
      case 'region': return 'bg-orange-500/10 text-orange-500';
      case 'user_segment': return 'bg-pink-500/10 text-pink-500';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Visibility & Access Rules</h3>
            <p className="text-sm text-muted-foreground">
              Control who can see and access this program
            </p>
          </div>
          <Button onClick={() => setShowNewRuleDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </Card>

      {/* Rules List */}
      <div className="space-y-3">
        {rules?.map((rule, index) => (
          <Card key={rule.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{rule.priority}
                  </span>
                  <Badge className={getRuleTypeColor(rule.rule_type)}>
                    {rule.rule_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="text-sm">
                  <pre className="font-mono text-xs bg-muted p-2 rounded">
                    {JSON.stringify(rule.rule_config, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleRuleActive(rule.id, rule.is_active)}
                >
                  {rule.is_active ? (
                    <Eye className="h-4 w-4 text-success" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {(!rules || rules.length === 0) && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No visibility rules configured</p>
            <p className="text-sm text-muted-foreground">This program is visible to all users</p>
          </Card>
        )}
      </div>

      {/* New Rule Dialog */}
      <Dialog open={showNewRuleDialog} onOpenChange={setShowNewRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Visibility Rule</DialogTitle>
            <DialogDescription>
              Define conditions for who can see this program
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Rule Type</Label>
              <Select
                value={newRule.rule_type}
                onValueChange={(val) => setNewRule({ ...newRule, rule_type: val as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kyc_level">KYC Level Required</SelectItem>
                  <SelectItem value="badge">Badge Required</SelectItem>
                  <SelectItem value="balance_threshold">Minimum Balance</SelectItem>
                  <SelectItem value="region">Region Restriction</SelectItem>
                  <SelectItem value="user_segment">User Segment</SelectItem>
                  <SelectItem value="user_age">Account Age</SelectItem>
                  <SelectItem value="activity_level">Activity Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority (lower = higher priority)</Label>
              <Input
                type="number"
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                min="0"
              />
            </div>
            <div>
              <Label>Rule Configuration (JSON)</Label>
              <Input
                placeholder='{"min_kyc_level": "L1"}'
                value={JSON.stringify(newRule.rule_config)}
                onChange={(e) => {
                  try {
                    setNewRule({ ...newRule, rule_config: JSON.parse(e.target.value) });
                  } catch {}
                }}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Example: {'{'}
                "min_kyc_level": "L1", "required_badge": "GOLD", "min_balance": 1000
                {'}'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRule}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
