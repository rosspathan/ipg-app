import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Wallet, TrendingUp, Settings, Users, DollarSign, RefreshCw, Plus } from "lucide-react"
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive"
import { KPIStat } from "@/components/admin/nova/KPIStat"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuthUser } from "@/hooks/useAuthUser"
import { BSKTransferControl } from "@/components/admin/bsk/BSKTransferControl"

/**
 * AdminBSKManagementNova - BSK system admin page
 * Phase 3: Admin Nova completion
 * Manage BSK rates, view ledgers, configure bonus campaigns
 */
export default function AdminBSKManagementNova() {
  const { toast } = useToast()
  const { user } = useAuthUser()
  const queryClient = useQueryClient()
  
  // Mint form state
  const [mintAmount, setMintAmount] = useState("")
  const [mintDestination, setMintDestination] = useState<"user" | "lucky_draw">("user")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [configId, setConfigId] = useState("")
  const [mintNotes, setMintNotes] = useState("")
  const [currentRate, setCurrentRate] = useState("1.00")

  // Fetch current BSK rate
  const { data: bskRate, isLoading: isLoadingRate } = useQuery({
    queryKey: ["bsk-rate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_rates")
        .select("rate_inr_per_bsk")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.rate_inr_per_bsk || 1.0;
    },
  });

  // Fetch active users count
  const { data: activeUsersCount, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["active-users-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("account_status", "active");
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch BSK circulation stats
  const { data: circulationStats, isLoading: isLoadingCirculation } = useQuery({
    queryKey: ["bsk-circulation"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_total_bsk_circulation");
      
      if (error) throw error;
      return data?.[0] || { total_supply: 0, total_withdrawable: 0, total_holding: 0 };
    },
  });

  // Fetch 24h volume
  const { data: volume24h, isLoading: isLoadingVolume } = useQuery({
    queryKey: ["bsk-24h-volume"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unified_bsk_transactions")
        .select("amount")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;
      
      const totalVolume = data?.reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0) || 0;
      return totalVolume;
    },
  });

  // Helper: Format large numbers (300000 -> "300K", 2500000 -> "2.5M")
  const formatLargeNumber = (num: number): string => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toFixed(0);
  };

  // Helper: Format currency with INR symbol
  const formatINR = (num: number): string => {
    return `₹${formatLargeNumber(num)}`;
  };

  // Fetch BSK operations audit
  const { data: operations } = useQuery({
    queryKey: ["bsk-operations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_admin_operations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user balances
  const { data: balances } = useQuery({
    queryKey: ["user-bsk-balances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bsk_balances")
        .select(`
          *,
          profiles:user_id (
            email
          )
        `)
        .order("withdrawable_balance", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch lucky draw configs for dropdown
  const { data: drawConfigs } = useQuery({
    queryKey: ["draw-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_templates")
        .select("id, title, name")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
  });

  // Update rate mutation
  const updateRateMutation = useMutation({
    mutationFn: async (newRate: number) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("admin_update_bsk_rate", {
        p_admin_id: user.id,
        p_new_rate: newRate,
        p_notes: "Rate updated via admin dashboard",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bsk-rate"] });
      toast({
        title: "Rate Updated",
        description: `BSK rate set to ₹${currentRate} per BSK`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mint BSK mutation
  const mintBskMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      let recipientId = null;
      if (mintDestination === "user") {
        // Look up user by email
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", recipientEmail)
          .single();

        if (!profile) throw new Error("User not found");
        recipientId = profile.user_id;
      }

      const { data, error } = await supabase.rpc("admin_mint_bsk", {
        p_admin_id: user.id,
        p_amount: parseFloat(mintAmount),
        p_destination: mintDestination,
        p_recipient_id: recipientId,
        p_config_id: mintDestination === "lucky_draw" ? configId : null,
        p_notes: mintNotes,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bsk-operations"] });
      queryClient.invalidateQueries({ queryKey: ["user-bsk-balances"] });
      toast({
        title: "BSK Minted",
        description: `Successfully minted ${mintAmount} BSK`,
      });
      // Reset form
      setMintAmount("");
      setRecipientEmail("");
      setConfigId("");
      setMintNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateRate = () => {
    updateRateMutation.mutate(parseFloat(currentRate));
  };

  const handleMintBsk = () => {
    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (mintDestination === "user" && !recipientEmail) {
      toast({
        title: "Error",
        description: "Please enter recipient email",
        variant: "destructive",
      });
      return;
    }

    if (mintDestination === "lucky_draw" && !configId) {
      toast({
        title: "Error",
        description: "Please select a lucky draw",
        variant: "destructive",
      });
      return;
    }

    mintBskMutation.mutate();
  };


  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          BSK Management
        </h1>
        <p className="text-muted-foreground">
          Manage BSK rates, ledgers, and bonus campaigns
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPIStat
          icon={<DollarSign className="h-5 w-5" />}
          label="Current Rate"
          value={isLoadingRate ? "..." : `₹${(bskRate || 1.0).toFixed(2)} / BSK`}
          variant="default"
        />
        <KPIStat
          icon={<Users className="h-5 w-5" />}
          label="Active Users"
          value={isLoadingUsers ? "..." : (activeUsersCount || 0).toLocaleString()}
          variant="success"
        />
        <KPIStat
          icon={<Wallet className="h-5 w-5" />}
          label="Total Supply"
          value={isLoadingCirculation ? "..." : `${formatLargeNumber(circulationStats?.total_supply || 0)} BSK`}
          variant="warning"
        />
        <KPIStat
          icon={<TrendingUp className="h-5 w-5" />}
          label="24h Volume"
          value={isLoadingVolume ? "..." : formatINR((volume24h || 0) * (bskRate || 1))}
          variant="success"
        />
      </div>

      {/* BSK Transfer Control */}
      <BSKTransferControl />

      {/* Main Content Tabs */}
      <Tabs defaultValue="mint" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mint">
            <Plus className="h-4 w-4 mr-2" />
            Mint BSK
          </TabsTrigger>
          <TabsTrigger value="rate">
            <Settings className="h-4 w-4 mr-2" />
            Rate
          </TabsTrigger>
          <TabsTrigger value="operations">
            <RefreshCw className="h-4 w-4 mr-2" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="balances">
            <Wallet className="h-4 w-4 mr-2" />
            Balances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mint" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mint BSK</CardTitle>
              <CardDescription>
                Create new BSK tokens for users or program prize pools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mint-amount">Amount (BSK)</Label>
                <Input
                  id="mint-amount"
                  type="number"
                  step="1"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mint-destination">Destination</Label>
                <Select value={mintDestination} onValueChange={(v: any) => setMintDestination(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User Balance</SelectItem>
                    <SelectItem value="lucky_draw">Lucky Draw Prize Pool</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mintDestination === "user" && (
                <div className="space-y-2">
                  <Label htmlFor="recipient-email">Recipient Email</Label>
                  <Input
                    id="recipient-email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
              )}

              {mintDestination === "lucky_draw" && (
                <div className="space-y-2">
                  <Label htmlFor="draw-config">Lucky Draw</Label>
                  <Select value={configId} onValueChange={setConfigId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a draw" />
                    </SelectTrigger>
                    <SelectContent>
                      {drawConfigs?.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.title || config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="mint-notes">Notes (Optional)</Label>
                <Textarea
                  id="mint-notes"
                  value={mintNotes}
                  onChange={(e) => setMintNotes(e.target.value)}
                  placeholder="Reason for minting..."
                />
              </div>

              <Button 
                onClick={handleMintBsk} 
                disabled={mintBskMutation.isPending}
                className="w-full"
              >
                {mintBskMutation.isPending ? "Minting..." : "Mint BSK"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>BSK Exchange Rate</CardTitle>
              <CardDescription>
                Set the BSK to INR conversion rate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Rate (INR per BSK)</Label>
                <div className="flex gap-2">
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    value={currentRate}
                    onChange={(e) => setCurrentRate(e.target.value)}
                    placeholder="1.00"
                  />
                  <Button 
                    onClick={handleUpdateRate} 
                    disabled={updateRateMutation.isPending}
                  >
                    {updateRateMutation.isPending ? "Updating..." : "Update Rate"}
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  This rate is used for all BSK conversions including ad mining rewards, 
                  subscription payments, and bonus calculations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <Card>
            <CardHeader>
              <CardTitle>Admin Operations History</CardTitle>
              <CardDescription>Audit log of all BSK operations</CardDescription>
            </CardHeader>
            <CardContent>
              {operations && operations.length > 0 ? (
                <DataGridAdaptive
                  data={operations}
                  keyExtractor={(row) => row.id}
                  columns={[
                    { key: "operation_type", label: "Type" },
                    { key: "amount", label: "Amount" },
                    { key: "destination", label: "Destination" },
                    { key: "notes", label: "Notes" },
                    { key: "created_at", label: "Date" }
                  ]}
                  renderCard={(row) => (
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{row.operation_type}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(row.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          {row.destination}
                        </span>
                        <span className="font-semibold">{row.amount} BSK</span>
                      </div>
                      {row.notes && (
                        <div className="text-xs text-muted-foreground">{row.notes}</div>
                      )}
                    </div>
                  )}
                  onRowClick={(row) => console.log("View operation:", row)}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No operations yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle>User BSK Balances</CardTitle>
              <CardDescription>Overview of all user balances</CardDescription>
            </CardHeader>
            <CardContent>
              {balances && balances.length > 0 ? (
                <DataGridAdaptive
                  data={balances}
                  keyExtractor={(row) => row.id}
                  columns={[
                    { key: "email", label: "User" },
                    { key: "withdrawable_balance", label: "Withdrawable" },
                    { key: "holding_balance", label: "Holding" },
                    { key: "total_earned_withdrawable", label: "Lifetime Earned" }
                  ]}
                  renderCard={(row) => (
                    <div className="p-4 space-y-2">
                      <div className="font-medium">{(row as any).profiles?.email || "N/A"}</div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Withdrawable</div>
                          <div className="font-semibold">{row.withdrawable_balance} BSK</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Holding</div>
                          <div className="font-semibold">{row.holding_balance} BSK</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Lifetime</div>
                          <div className="font-semibold">{row.total_earned_withdrawable} BSK</div>
                        </div>
                      </div>
                    </div>
                  )}
                  onRowClick={(row) => console.log("View user balance:", row)}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No user balances yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
