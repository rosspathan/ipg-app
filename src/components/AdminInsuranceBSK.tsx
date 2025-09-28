import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Shield, 
  TrendingDown, 
  Heart, 
  FileText, 
  Users, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Plus,
  AlertCircle
} from "lucide-react";

interface PlanConfig {
  id: string;
  plan_type: string;
  premium_inr: number;
  plan_settings: any;
  is_enabled: boolean;
}

interface Policy {
  id: string;
  user_id: string;
  plan_type: string;
  policy_number: string;
  premium_inr: number;
  premium_bsk: number;
  status: string;
  created_at: string;
}

interface Claim {
  id: string;
  policy_id: string;
  user_id: string;
  claim_type: string;
  claim_reference: string;
  status: string;
  submitted_at: string;
  requested_amount_inr?: number;
  approved_amount_inr?: number;
  description: string;
  admin_notes?: string;
}

const AdminInsuranceBSK = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [bskRate, setBskRate] = useState(1.0);
  const [newBskRate, setNewBskRate] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [processClaimData, setProcessClaimData] = useState({
    action: 'approve',
    approved_amount_inr: '',
    admin_notes: '',
    rejection_reason: ''
  });

  useEffect(() => {
    loadInsuranceData();
  }, []);

  const loadInsuranceData = async () => {
    try {
      setLoading(true);

      // Load plan configurations
      const { data: plans, error: plansError } = await supabase
        .from('insurance_bsk_plan_configs')
        .select('*')
        .order('plan_type');

      if (plansError) throw plansError;
      setPlanConfigs(plans || []);

      // Load global settings
      const { data: settings, error: settingsError } = await supabase
        .from('insurance_bsk_global_settings')
        .select('*')
        .limit(1)
        .single();

      if (!settingsError && settings) {
        setGlobalSettings(settings);
      }

      // Load policies
      const { data: policiesData, error: policiesError } = await supabase
        .from('insurance_bsk_policies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!policiesError) {
        setPolicies(policiesData || []);
      }

      // Load claims
      const { data: claimsData, error: claimsError } = await supabase
        .from('insurance_bsk_claims')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!claimsError) {
        setClaims(claimsData || []);
      }

      // Load current BSK rate
      const { data: rate } = await supabase
        .from('bsk_rates')
        .select('rate_inr_per_bsk')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setBskRate(rate?.rate_inr_per_bsk || 1.0);

    } catch (error: any) {
      console.error('Error loading insurance data:', error);
      toast({
        title: "Error",
        description: "Failed to load insurance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBskRate = async () => {
    if (!newBskRate || isNaN(parseFloat(newBskRate))) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid BSK rate",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('bsk_rates')
        .insert({
          rate_inr_per_bsk: parseFloat(newBskRate),
          notes: 'Updated via admin panel',
          set_by: 'admin'
        });

      if (error) throw error;

      setBskRate(parseFloat(newBskRate));
      setNewBskRate('');
      
      toast({
        title: "Rate Updated",
        description: `BSK rate updated to ₹${newBskRate}/BSK`
      });

    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updatePlanConfig = async (planId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('insurance_bsk_plan_configs')
        .update(updates)
        .eq('id', planId);

      if (error) throw error;

      setPlanConfigs(configs => 
        configs.map(config => 
          config.id === planId ? { ...config, ...updates } : config
        )
      );

      toast({
        title: "Plan Updated",
        description: "Plan configuration updated successfully"
      });

    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateGlobalSettings = async (updates: any) => {
    try {
      const { error } = await supabase
        .from('insurance_bsk_global_settings')
        .update(updates)
        .eq('id', globalSettings.id);

      if (error) throw error;

      setGlobalSettings(prev => ({ ...prev, ...updates }));

      toast({
        title: "Settings Updated",
        description: "Global settings updated successfully"
      });

    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const processClaim = async () => {
    if (!selectedClaim) return;

    try {
      const { error } = await supabase.functions.invoke('insurance-claim-process', {
        body: {
          claim_id: selectedClaim.id,
          action: processClaimData.action,
          approved_amount_inr: processClaimData.action === 'approve' && processClaimData.approved_amount_inr ? 
            parseFloat(processClaimData.approved_amount_inr) : undefined,
          admin_notes: processClaimData.admin_notes || undefined,
          rejection_reason: processClaimData.action === 'reject' ? processClaimData.rejection_reason : undefined
        }
      });

      if (error) throw error;

      toast({
        title: "Claim Processed",
        description: `Claim ${processClaimData.action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      setSelectedClaim(null);
      setProcessClaimData({
        action: 'approve',
        approved_amount_inr: '',
        admin_notes: '',
        rejection_reason: ''
      });

      // Reload claims
      loadInsuranceData();

    } catch (error: any) {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'accident': return Shield;
      case 'trading': return TrendingDown;
      case 'life': return Heart;
      default: return FileText;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'approved': case 'paid': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'submitted': case 'in_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">BSK Insurance Administration</h1>
        <Badge variant="outline" className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4" />
          <span>₹{bskRate.toFixed(2)}/BSK</span>
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {policies.filter(p => p.status === 'active').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {claims.filter(c => c.status === 'submitted' || c.status === 'in_review').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Premiums (INR)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{policies.reduce((sum, p) => sum + p.premium_inr, 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Claims</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {claims.filter(c => c.status === 'approved' || c.status === 'paid').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BSK Rate Management */}
          <Card>
            <CardHeader>
              <CardTitle>BSK Rate Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="bsk-rate">New BSK Rate (₹/BSK)</Label>
                  <Input
                    id="bsk-rate"
                    type="number"
                    step="0.01"
                    value={newBskRate}
                    onChange={(e) => setNewBskRate(e.target.value)}
                    placeholder={`Current: ₹${bskRate.toFixed(2)}`}
                  />
                </div>
                <Button onClick={updateBskRate} disabled={!newBskRate}>
                  Update Rate
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Current rate: ₹{bskRate.toFixed(2)} per BSK. Changes affect new transactions only.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          {planConfigs.map((plan) => {
            const Icon = getPlanIcon(plan.plan_type);
            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-8 h-8 text-primary" />
                      <div>
                        <CardTitle className="capitalize">{plan.plan_type} Plan</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Premium: ₹{plan.premium_inr.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={plan.is_enabled}
                        onCheckedChange={(enabled) => 
                          updatePlanConfig(plan.id, { is_enabled: enabled })
                        }
                      />
                      <Badge variant={plan.is_enabled ? "default" : "secondary"}>
                        {plan.is_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`premium-${plan.id}`}>Premium (₹)</Label>
                      <Input
                        id={`premium-${plan.id}`}
                        type="number"
                        defaultValue={plan.premium_inr}
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value && value !== plan.premium_inr) {
                            updatePlanConfig(plan.id, { premium_inr: value });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label>BSK Equivalent</Label>
                      <Input
                        value={`${(plan.premium_inr / bskRate).toFixed(2)} BSK`}
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor={`settings-${plan.id}`}>Plan Settings (JSON)</Label>
                    <Textarea
                      id={`settings-${plan.id}`}
                      value={JSON.stringify(plan.plan_settings, null, 2)}
                      onChange={(e) => {
                        try {
                          const settings = JSON.parse(e.target.value);
                          updatePlanConfig(plan.id, { plan_settings: settings });
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                      className="h-32 font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Number</TableHead>
                    <TableHead>Plan Type</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.slice(0, 10).map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-mono text-sm">
                        {policy.policy_number}
                      </TableCell>
                      <TableCell className="capitalize">
                        {policy.plan_type}
                      </TableCell>
                      <TableCell>
                        ₹{policy.premium_inr.toLocaleString()}
                        <div className="text-xs text-muted-foreground">
                          {policy.premium_bsk.toFixed(2)} BSK
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(policy.status)}>
                          {policy.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(policy.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested Amount</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-mono text-sm">
                        {claim.claim_reference}
                      </TableCell>
                      <TableCell className="capitalize">
                        {claim.claim_type.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(claim.status)}>
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {claim.requested_amount_inr ? 
                          `₹${claim.requested_amount_inr.toLocaleString()}` : 
                          'TBD'
                        }
                      </TableCell>
                      <TableCell>
                        {new Date(claim.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {(claim.status === 'submitted' || claim.status === 'in_review') && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedClaim(claim)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Process Claim: {claim.claim_reference}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Description</Label>
                                  <p className="text-sm bg-muted p-2 rounded">
                                    {claim.description || 'No description provided'}
                                  </p>
                                </div>
                                
                                <div>
                                  <Label htmlFor="action">Action</Label>
                                  <Select 
                                    value={processClaimData.action}
                                    onValueChange={(value) => 
                                      setProcessClaimData(prev => ({ ...prev, action: value }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="approve">Approve</SelectItem>
                                      <SelectItem value="reject">Reject</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {processClaimData.action === 'approve' && (
                                  <div>
                                    <Label htmlFor="approved-amount">Approved Amount (₹)</Label>
                                    <Input
                                      id="approved-amount"
                                      type="number"
                                      value={processClaimData.approved_amount_inr}
                                      onChange={(e) => 
                                        setProcessClaimData(prev => ({ 
                                          ...prev, 
                                          approved_amount_inr: e.target.value 
                                        }))
                                      }
                                      placeholder={claim.requested_amount_inr?.toString() || ''}
                                    />
                                  </div>
                                )}

                                {processClaimData.action === 'reject' && (
                                  <div>
                                    <Label htmlFor="rejection-reason">Rejection Reason</Label>
                                    <Textarea
                                      id="rejection-reason"
                                      value={processClaimData.rejection_reason}
                                      onChange={(e) => 
                                        setProcessClaimData(prev => ({ 
                                          ...prev, 
                                          rejection_reason: e.target.value 
                                        }))
                                      }
                                      placeholder="Reason for rejection..."
                                    />
                                  </div>
                                )}

                                <div>
                                  <Label htmlFor="admin-notes">Admin Notes</Label>
                                  <Textarea
                                    id="admin-notes"
                                    value={processClaimData.admin_notes}
                                    onChange={(e) => 
                                      setProcessClaimData(prev => ({ 
                                        ...prev, 
                                        admin_notes: e.target.value 
                                      }))
                                    }
                                    placeholder="Internal notes..."
                                  />
                                </div>

                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedClaim(null);
                                      setProcessClaimData({
                                        action: 'approve',
                                        approved_amount_inr: '',
                                        admin_notes: '',
                                        rejection_reason: ''
                                      });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button onClick={processClaim}>
                                    {processClaimData.action === 'approve' ? 'Approve' : 'Reject'} Claim
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {globalSettings && (
            <Card>
              <CardHeader>
                <CardTitle>Global Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>System Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                      Master switch for the entire insurance system
                    </p>
                  </div>
                  <Switch
                    checked={globalSettings.system_enabled}
                    onCheckedChange={
                      (enabled) => updateGlobalSettings({ system_enabled: enabled })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>KYC Required for Payout</Label>
                    <p className="text-sm text-muted-foreground">
                      Require KYC verification before processing payouts
                    </p>
                  </div>
                  <Switch
                    checked={globalSettings.kyc_required_for_payout}
                    onCheckedChange={
                      (required) => updateGlobalSettings({ kyc_required_for_payout: required })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="payout-destination">Default Payout Destination</Label>
                  <Select 
                    value={globalSettings.payout_destination}
                    onValueChange={(destination) => 
                      updateGlobalSettings({ payout_destination: destination })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="withdrawable">Withdrawable Balance</SelectItem>
                      <SelectItem value="holding">Holding Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="refund-window">Refund Window (Hours)</Label>
                  <Input
                    id="refund-window"
                    type="number"
                    defaultValue={globalSettings.refund_window_hours}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (value && value !== globalSettings.refund_window_hours) {
                        updateGlobalSettings({ refund_window_hours: value });
                      }
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="disclaimer">Disclaimer Text</Label>
                  <Textarea
                    id="disclaimer"
                    value={globalSettings.disclaimer_text}
                    onChange={(e) => 
                      updateGlobalSettings({ disclaimer_text: e.target.value })
                    }
                    placeholder="Legal disclaimer text..."
                    className="h-24"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInsuranceBSK;