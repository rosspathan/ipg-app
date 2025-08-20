import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Eye, Plus, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InsuranceClaim {
  id: string;
  user_id: string;
  claim_amount: number;
  reason: string;
  description: string;
  attachments: string[];
  status: string;
  payout_amount: number;
  payout_asset: string;
  reference_id: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
  insurance_policies?: {
    insurance_plans?: {
      name: string;
      type: string;
    };
  };
}

interface InsurancePlan {
  id: string;
  name: string;
  type: string;
  premium: number;
  coverage_amount: number;
  coverage_scope: string;
  duration_days: number;
  exclusions: string[];
  max_claims: number;
  waiting_period_hours: number;
  active: boolean;
}

const AdminInsuranceClaims = () => {
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutAsset, setPayoutAsset] = useState('USDT');
  const [referenceId, setReferenceId] = useState('');
  const { toast } = useToast();

  const [newPlan, setNewPlan] = useState({
    name: '',
    type: 'wallet_protection',
    premium: 0,
    coverage_amount: 0,
    coverage_scope: '',
    duration_days: 365,
    exclusions: [''],
    max_claims: 1,
    waiting_period_hours: 24,
    active: true,
  });

  useEffect(() => {
    loadClaims();
    loadPlans();
  }, []);

  const loadClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select(`
          *,
          profiles!insurance_claims_user_id_fkey (
            email,
            full_name
          ),
          insurance_policies (
            insurance_plans (
              name,
              type
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      console.error('Error loading claims:', error);
      toast({
        title: "Error",
        description: "Failed to load insurance claims",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_plans')
        .select('*')
        .order('name');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleClaimAction = async (claimId: string, action: 'approved' | 'rejected') => {
    try {
      const updateData: any = {
        status: action,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString(),
      };

      if (action === 'approved') {
        if (!payoutAmount || !payoutAsset) {
          toast({
            title: "Error",
            description: "Please specify payout amount and asset",
            variant: "destructive",
          });
          return;
        }
        updateData.payout_amount = parseFloat(payoutAmount);
        updateData.payout_asset = payoutAsset;
        updateData.reference_id = referenceId;
      }

      const { error } = await supabase
        .from('insurance_claims')
        .update(updateData)
        .eq('id', claimId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: `insurance_claim_${action}`,
        p_resource_type: 'insurance_claim',
        p_resource_id: claimId,
        p_new_values: updateData,
      });

      toast({
        title: "Success",
        description: `Insurance claim ${action} successfully`,
      });

      setSelectedClaim(null);
      setPayoutAmount('');
      setPayoutAsset('USDT');
      setReferenceId('');
      loadClaims();
    } catch (error) {
      console.error('Error processing claim:', error);
      toast({
        title: "Error",
        description: "Failed to process claim",
        variant: "destructive",
      });
    }
  };

  const handleCreatePlan = async () => {
    try {
      const { error } = await supabase
        .from('insurance_plans')
        .insert([{
          ...newPlan,
          exclusions: newPlan.exclusions.filter(e => e.trim() !== '')
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Insurance plan created successfully",
      });

      // Reset form
      setNewPlan({
        name: '',
        type: 'wallet_protection',
        premium: 0,
        coverage_amount: 0,
        coverage_scope: '',
        duration_days: 365,
        exclusions: [''],
        max_claims: 1,
        waiting_period_hours: 24,
        active: true,
      });

      loadPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast({
        title: "Error",
        description: "Failed to create insurance plan",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
      approved: { variant: "default", className: "bg-green-100 text-green-800" },
      rejected: { variant: "destructive", className: "bg-red-100 text-red-800" },
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-6">Loading insurance claims...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Insurance Management</h1>
      </div>

      <Tabs defaultValue="claims" className="w-full">
        <TabsList>
          <TabsTrigger value="claims">Claims Queue</TabsTrigger>
          <TabsTrigger value="plans">Insurance Plans</TabsTrigger>
          <TabsTrigger value="policies">Active Policies</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Claims Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan Type</TableHead>
                    <TableHead>Claim Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{claim.profiles?.full_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{claim.profiles?.email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {claim.insurance_policies?.insurance_plans?.name || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          ${claim.claim_amount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {claim.reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(claim.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(claim.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedClaim(claim)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Review Insurance Claim</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>User</Label>
                                  <p>{claim.profiles?.full_name} ({claim.profiles?.email})</p>
                                </div>
                                <div>
                                  <Label>Claim Amount</Label>
                                  <p>${claim.claim_amount.toLocaleString()}</p>
                                </div>
                                <div>
                                  <Label>Reason</Label>
                                  <p>{claim.reason}</p>
                                </div>
                                <div>
                                  <Label>Description</Label>
                                  <p className="text-sm bg-muted p-2 rounded">
                                    {claim.description || 'No description provided'}
                                  </p>
                                </div>
                                {claim.attachments && claim.attachments.length > 0 && (
                                  <div>
                                    <Label>Attachments</Label>
                                    <div className="space-y-1">
                                      {claim.attachments.map((attachment, index) => (
                                        <div key={index} className="text-sm">
                                          <a href={attachment} target="_blank" rel="noopener noreferrer" 
                                             className="text-blue-600 hover:underline">
                                            Attachment {index + 1}
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {claim.status === 'pending' && (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Payout Amount</Label>
                                        <Input
                                          type="number"
                                          value={payoutAmount}
                                          onChange={(e) => setPayoutAmount(e.target.value)}
                                          placeholder="Enter payout amount"
                                        />
                                      </div>
                                      <div>
                                        <Label>Payout Asset</Label>
                                        <Select value={payoutAsset} onValueChange={setPayoutAsset}>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="USDT">USDT</SelectItem>
                                            <SelectItem value="BTC">BTC</SelectItem>
                                            <SelectItem value="ETH">ETH</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Reference ID</Label>
                                      <Input
                                        value={referenceId}
                                        onChange={(e) => setReferenceId(e.target.value)}
                                        placeholder="Internal reference ID"
                                      />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => handleClaimAction(claim.id, 'rejected')}
                                      >
                                        <X className="mr-2 h-4 w-4" />
                                        Reject
                                      </Button>
                                      <Button
                                        onClick={() => handleClaimAction(claim.id, 'approved')}
                                      >
                                        <Check className="mr-2 h-4 w-4" />
                                        Approve & Pay
                                      </Button>
                                    </div>
                                  </>
                                )}

                                {claim.status !== 'pending' && (
                                  <div className="bg-muted p-4 rounded">
                                    <h4 className="font-medium mb-2">Resolution Details</h4>
                                    {claim.payout_amount && (
                                      <p>Payout: {claim.payout_amount} {claim.payout_asset}</p>
                                    )}
                                    {claim.reference_id && (
                                      <p>Reference: {claim.reference_id}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Insurance Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Plan Name</Label>
                    <Input
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                      placeholder="e.g., Wallet Protection Plus"
                    />
                  </div>
                  <div>
                    <Label>Plan Type</Label>
                    <Select value={newPlan.type} onValueChange={(value) => setNewPlan({...newPlan, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wallet_protection">Wallet Protection</SelectItem>
                        <SelectItem value="trade_insurance">Trade Insurance</SelectItem>
                        <SelectItem value="staking_protection">Staking Protection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Premium ($)</Label>
                    <Input
                      type="number"
                      value={newPlan.premium}
                      onChange={(e) => setNewPlan({...newPlan, premium: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Coverage Amount ($)</Label>
                    <Input
                      type="number"
                      value={newPlan.coverage_amount}
                      onChange={(e) => setNewPlan({...newPlan, coverage_amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Duration (days)</Label>
                    <Input
                      type="number"
                      value={newPlan.duration_days}
                      onChange={(e) => setNewPlan({...newPlan, duration_days: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Coverage Scope</Label>
                  <Textarea
                    value={newPlan.coverage_scope}
                    onChange={(e) => setNewPlan({...newPlan, coverage_scope: e.target.value})}
                    placeholder="Describe what is covered by this plan..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Claims</Label>
                    <Input
                      type="number"
                      value={newPlan.max_claims}
                      onChange={(e) => setNewPlan({...newPlan, max_claims: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div>
                    <Label>Waiting Period (hours)</Label>
                    <Input
                      type="number"
                      value={newPlan.waiting_period_hours}
                      onChange={(e) => setNewPlan({...newPlan, waiting_period_hours: parseInt(e.target.value) || 24})}
                    />
                  </div>
                </div>

                <Button onClick={handleCreatePlan}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Plan
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Insurance Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{plan.type.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>${plan.premium}</TableCell>
                        <TableCell>${plan.coverage_amount.toLocaleString()}</TableCell>
                        <TableCell>{plan.duration_days} days</TableCell>
                        <TableCell>
                          <Badge variant={plan.active ? "default" : "secondary"}>
                            {plan.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>Active Insurance Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Active policies purchased by users would be displayed here.</p>
                <p>Including policy details, start/end dates, and coverage status.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Premiums Collected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$12,450</div>
                    <p className="text-sm text-muted-foreground">This month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Claims Paid</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$3,200</div>
                    <p className="text-sm text-muted-foreground">This month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Loss Ratio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">25.7%</div>
                    <p className="text-sm text-muted-foreground">Claims/Premiums</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInsuranceClaims;