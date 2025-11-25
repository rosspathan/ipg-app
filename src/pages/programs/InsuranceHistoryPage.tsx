import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, Calendar, DollarSign, AlertCircle, CheckCircle, Clock, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function InsuranceHistoryPage() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  const { data: policies, isLoading: loadingPolicies } = useQuery({
    queryKey: ['insurance-policies', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('insurance_policies')
        .select(`
          *,
          insurance_plans (
            plan_name,
            premium_amount,
            max_coverage_per_claim
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false});
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: claims, isLoading: loadingClaims } = useQuery({
    queryKey: ['insurance-claims', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, className: 'bg-green-500 text-white', icon: CheckCircle },
      expired: { variant: 'secondary' as const, className: 'bg-gray-500 text-white', icon: Clock },
      pending: { variant: 'outline' as const, className: 'border-yellow-500 text-yellow-600', icon: Clock },
      approved: { variant: 'default' as const, className: 'bg-green-500 text-white', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, className: '', icon: AlertCircle },
      processing: { variant: 'outline' as const, className: 'border-blue-500 text-blue-600', icon: Clock },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={cn('flex items-center gap-1', config.className)}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPolicyTypeBadge = (type: string) => {
    const colors = {
      accident: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      life: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      trading: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please log in to view your insurance history.</p>
          <Button onClick={() => navigate('/auth/login')}>Log In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Insurance History
            </h1>
            <p className="text-muted-foreground mt-1">
              View all your insurance policies and claims
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/app/programs/insurance')}>
            <Shield className="w-4 h-4 mr-2" />
            Buy Insurance
          </Button>
        </div>

        <Tabs defaultValue="policies" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="policies">
              <FileText className="w-4 h-4 mr-2" />
              Policies ({policies?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="claims">
              <AlertCircle className="w-4 h-4 mr-2" />
              Claims ({claims?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-4">
            {loadingPolicies ? (
              <Card className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading policies...</p>
              </Card>
            ) : policies && policies.length > 0 ? (
              policies.map((policy) => (
                <Card key={policy.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="space-y-4">
                    {/* Policy Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(policy.status)}
                        </div>
                        <h3 className="text-xl font-bold">
                          {(policy.insurance_plans as any)?.plan_name || 'Insurance Policy'}
                        </h3>
                        <p className="text-sm text-muted-foreground">Policy ID: {policy.id.slice(0, 8)}...</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Max Coverage</p>
                        <p className="text-2xl font-bold text-primary">₹{((policy.insurance_plans as any)?.max_coverage_per_claim || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Policy Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Subscribed</p>
                          <p className="font-semibold">{format(new Date(policy.subscribed_at || policy.created_at), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Expires</p>
                          <p className="font-semibold">{policy.expires_at ? format(new Date(policy.expires_at), 'MMM dd, yyyy') : 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Premium Paid</p>
                          <p className="font-semibold">{policy.premium_paid} BSK</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/app/programs/insurance/claim?policy=${policy.id}`)}>
                        <FileText className="w-4 h-4 mr-2" />
                        File Claim
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download Policy
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Insurance Policies</h3>
                <p className="text-muted-foreground mb-4">You haven't purchased any insurance policies yet.</p>
                <Button onClick={() => navigate('/app/programs/insurance')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Buy Insurance
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims" className="space-y-4">
            {loadingClaims ? (
              <Card className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading claims...</p>
              </Card>
            ) : claims && claims.length > 0 ? (
              claims.map((claim) => (
                <Card key={claim.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="space-y-4">
                    {/* Claim Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(claim.status)}
                        </div>
                        <h3 className="text-xl font-bold">Claim #{claim.id.slice(0, 8)}...</h3>
                        <p className="text-sm text-muted-foreground">
                          Filed on {format(new Date(claim.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Loss Amount</p>
                        <p className="text-2xl font-bold text-primary">₹{claim.loss_amount.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Claim Details */}
                    <div className="pt-4 border-t space-y-2">
                      <p className="text-sm"><span className="font-medium">Reason:</span> {claim.claim_reason || 'Not specified'}</p>
                      {claim.reimbursed_amount && (
                        <p className="text-sm"><span className="font-medium">Reimbursed:</span> ₹{claim.reimbursed_amount.toLocaleString()}</p>
                      )}
                      {claim.admin_notes && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1">Admin Notes:</p>
                          <p className="text-sm text-muted-foreground">{claim.admin_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    {claim.updated_at && claim.updated_at !== claim.created_at && (
                      <div className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Timeline:</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Submitted: {format(new Date(claim.created_at), 'MMM dd, yyyy HH:mm')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Updated: {format(new Date(claim.updated_at), 'MMM dd, yyyy HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Claims Filed</h3>
                <p className="text-muted-foreground mb-4">You haven't filed any insurance claims yet.</p>
                <Button onClick={() => navigate('/app/programs/insurance')}>
                  <FileText className="w-4 h-4 mr-2" />
                  View Policies
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
