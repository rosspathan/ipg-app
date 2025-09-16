import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, CreditCard, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface FundingRoute {
  id: string;
  route_type: 'bank' | 'upi';
  is_active: boolean;
  is_default: boolean;
  priority: number;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  upi_name?: string;
  notes?: string;
  min_amount: number;
  max_amount: number;
  fee_percent: number;
  fee_fixed: number;
  created_at: string;
  updated_at: string;
}

const AdminINRFundingScreen = () => {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<FundingRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<FundingRoute | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<FundingRoute>>({
    route_type: 'bank',
    is_active: true,
    is_default: false,
    priority: 1,
    min_amount: 100,
    max_amount: 500000,
    fee_percent: 0,
    fee_fixed: 0
  });

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('inr_funding_routes')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      setRoutes((data || []) as FundingRoute[]);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast({
        title: "Error",
        description: "Failed to load funding routes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoute = async () => {
    try {
      if (selectedRoute) {
        // Update existing route
        const { error } = await supabase
          .from('inr_funding_routes')
          .update(formData)
          .eq('id', selectedRoute.id);

        if (error) throw error;
        toast({ title: "Success", description: "Route updated successfully" });
      } else {
        // Create new route
        const { error } = await supabase
          .from('inr_funding_routes')
          .insert([formData as any]);

        if (error) throw error;
        toast({ title: "Success", description: "Route created successfully" });
      }

      setShowDialog(false);
      setSelectedRoute(null);
      setFormData({
        route_type: 'bank',
        is_active: true,
        is_default: false,
        priority: 1,
        min_amount: 100,
        max_amount: 500000,
        fee_percent: 0,
        fee_fixed: 0
      });
      fetchRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save route",
        variant: "destructive"
      });
    }
  };

  const handleEditRoute = (route: FundingRoute) => {
    setSelectedRoute(route);
    setFormData(route);
    setShowDialog(true);
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      const { error } = await supabase
        .from('inr_funding_routes')
        .delete()
        .eq('id', routeId);

      if (error) throw error;
      toast({ title: "Success", description: "Route deleted successfully" });
      fetchRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete route",
        variant: "destructive"
      });
    }
  };

  const toggleRouteStatus = async (routeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('inr_funding_routes')
        .update({ is_active: !isActive })
        .eq('id', routeId);

      if (error) throw error;
      fetchRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update route status",
        variant: "destructive"
      });
    }
  };

  const bankRoutes = routes.filter(r => r.route_type === 'bank');
  const upiRoutes = routes.filter(r => r.route_type === 'upi');

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">INR Funding Routes</h1>
          <p className="text-muted-foreground">Manage bank accounts and UPI IDs for Indian Rupee deposits</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setSelectedRoute(null);
              setFormData({
                route_type: 'bank',
                is_active: true,
                is_default: false,
                priority: 1,
                min_amount: 100,
                max_amount: 500000,
                fee_percent: 0,
                fee_fixed: 0
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedRoute ? 'Edit' : 'Add'} Funding Route
              </DialogTitle>
              <DialogDescription>
                Configure bank account or UPI ID for INR deposits
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Tabs value={formData.route_type} onValueChange={(value: 'bank' | 'upi') => 
                setFormData(prev => ({ ...prev, route_type: value }))
              }>
                <TabsList>
                  <TabsTrigger value="bank">Bank Account</TabsTrigger>
                  <TabsTrigger value="upi">UPI</TabsTrigger>
                </TabsList>
                
                <TabsContent value="bank" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bank Name</Label>
                      <Input
                        value={formData.bank_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                        placeholder="State Bank of India"
                      />
                    </div>
                    <div>
                      <Label>Account Name</Label>
                      <Input
                        value={formData.account_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                        placeholder="IPG i-SMART Deposits"
                      />
                    </div>
                    <div>
                      <Label>Account Number</Label>
                      <Input
                        value={formData.account_number || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                        placeholder="1234567890123456"
                      />
                    </div>
                    <div>
                      <Label>IFSC Code</Label>
                      <Input
                        value={formData.ifsc_code || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, ifsc_code: e.target.value }))}
                        placeholder="SBIN0001234"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="upi" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>UPI ID</Label>
                      <Input
                        value={formData.upi_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, upi_id: e.target.value }))}
                        placeholder="deposits@paytm"
                      />
                    </div>
                    <div>
                      <Label>UPI Name</Label>
                      <Input
                        value={formData.upi_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, upi_name: e.target.value }))}
                        placeholder="IPG Deposits"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Amount (₹)</Label>
                  <Input
                    type="number"
                    value={formData.min_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_amount: parseFloat(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Max Amount (₹)</Label>
                  <Input
                    type="number"
                    value={formData.max_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_amount: parseFloat(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Fee (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.fee_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, fee_percent: parseFloat(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Fixed Fee (₹)</Label>
                  <Input
                    type="number"
                    value={formData.fee_fixed}
                    onChange={(e) => setFormData(prev => ({ ...prev, fee_fixed: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
              
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional instructions for users"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                  />
                  <Label>Default</Label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRoute}>
                {selectedRoute ? 'Update' : 'Create'} Route
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="bank" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bank">
            <CreditCard className="w-4 h-4 mr-2" />
            Bank Accounts ({bankRoutes.length})
          </TabsTrigger>
          <TabsTrigger value="upi">
            <Smartphone className="w-4 h-4 mr-2" />
            UPI IDs ({upiRoutes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bank">
          <div className="grid gap-4">
            {bankRoutes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No bank accounts configured</p>
                </CardContent>
              </Card>
            ) : (
              bankRoutes.map((route) => (
                <Card key={route.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{route.bank_name}</CardTitle>
                        {route.is_default && <Badge>Default</Badge>}
                        <Badge variant={route.is_active ? "default" : "secondary"}>
                          {route.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditRoute(route)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Switch
                          checked={route.is_active}
                          onCheckedChange={() => toggleRouteStatus(route.id, route.is_active)}
                        />
                        <Button variant="outline" size="sm" onClick={() => handleDeleteRoute(route.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Account Name</p>
                        <p className="text-sm text-muted-foreground">{route.account_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Account Number</p>
                        <p className="text-sm text-muted-foreground">{route.account_number}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">IFSC Code</p>
                        <p className="text-sm text-muted-foreground">{route.ifsc_code}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Limits</p>
                        <p className="text-sm text-muted-foreground">₹{route.min_amount} - ₹{route.max_amount}</p>
                      </div>
                    </div>
                    {route.notes && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Notes</p>
                        <p className="text-sm text-muted-foreground">{route.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="upi">
          <div className="grid gap-4">
            {upiRoutes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No UPI IDs configured</p>
                </CardContent>
              </Card>
            ) : (
              upiRoutes.map((route) => (
                <Card key={route.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{route.upi_name}</CardTitle>
                        {route.is_default && <Badge>Default</Badge>}
                        <Badge variant={route.is_active ? "default" : "secondary"}>
                          {route.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditRoute(route)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Switch
                          checked={route.is_active}
                          onCheckedChange={() => toggleRouteStatus(route.id, route.is_active)}
                        />
                        <Button variant="outline" size="sm" onClick={() => handleDeleteRoute(route.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">UPI ID</p>
                        <p className="text-sm text-muted-foreground">{route.upi_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Limits</p>
                        <p className="text-sm text-muted-foreground">₹{route.min_amount} - ₹{route.max_amount}</p>
                      </div>
                    </div>
                    {route.notes && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Notes</p>
                        <p className="text-sm text-muted-foreground">{route.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminINRFundingScreen;