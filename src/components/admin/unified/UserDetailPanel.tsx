import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, User, Wallet, Activity, Shield, AlertTriangle, TrendingUp, Lock, Mail, Eye, Download, KeyRound, Award, Network, Users, ExternalLink } from "lucide-react";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { BalanceAdjustmentDialog } from "@/components/admin/users/BalanceAdjustmentDialog";
import { UserBalanceOverview } from "@/components/admin/users/UserBalanceOverview";
import { UserTransactionHistory } from "@/components/admin/users/UserTransactionHistory";
import { useIsMobile } from "@/hooks/use-mobile";
import { ForceDeleteDialog } from "@/components/admin/users/ForceDeleteDialog";
import { SendEmailDialog } from "@/components/admin/users/SendEmailDialog";
import { AccountActionDialog } from "@/components/admin/users/AccountActionDialog";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatDistanceToNow } from "date-fns";

interface UserDetailPanelProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function UserDetailPanel({ userId, open, onClose }: UserDetailPanelProps) {
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentOperation, setAdjustmentOperation] = useState<"add" | "deduct">("add");
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountActionDialogOpen, setAccountActionDialogOpen] = useState(false);
  const [accountAction, setAccountAction] = useState<"suspend" | "ban">("suspend");
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .single();

      setIsUserAdmin(!!roleData);

      return data;
    },
    enabled: open && !!userId,
  });

  const { data: balance } = useQuery({
    queryKey: ["admin-user-balance", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bsk_balances")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!userId,
  });

  const { data: inrBalance } = useQuery({
    queryKey: ["admin-user-inr-balance", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_inr_balances")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!userId,
  });

  // Fetch user badge information
  const { data: userBadge } = useQuery({
    queryKey: ["admin-user-badge", userId],
    queryFn: async () => {
      // First check user_badge_holdings (purchased badges)
      const { data: holdingData } = await supabase
        .from("user_badge_holdings")
        .select("current_badge, purchased_at, unlock_levels, previous_badge")
        .eq("user_id", userId)
        .order("purchased_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (holdingData?.current_badge) {
        return { ...holdingData, source: 'purchased' };
      }

      // Then check user_badge_status (qualified badges)
      const { data: statusData } = await supabase
        .from("user_badge_status")
        .select("current_badge")
        .eq("user_id", userId)
        .maybeSingle();

      return statusData?.current_badge 
        ? { current_badge: statusData.current_badge, source: 'qualified' }
        : { current_badge: 'None', source: 'none' };
    },
    enabled: open && !!userId,
  });

  // Fetch sponsor information
  const { data: sponsorInfo } = useQuery({
    queryKey: ["admin-user-sponsor", userId],
    queryFn: async () => {
      const { data: referralLink } = await supabase
        .from("referral_links_new")
        .select(`
          sponsor_id,
          sponsor_code_used,
          created_at
        `)
        .eq("user_id", userId)
        .maybeSingle();

      if (!referralLink?.sponsor_id) return null;

      // Fetch sponsor profile
      const { data: sponsor } = await supabase
        .from("profiles")
        .select("username, display_name, email")
        .eq("user_id", referralLink.sponsor_id)
        .single();

      // Fetch sponsor badge
      const { data: sponsorBadge } = await supabase
        .from("user_badge_holdings")
        .select("current_badge")
        .eq("user_id", referralLink.sponsor_id)
        .order("purchased_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        sponsor_id: referralLink.sponsor_id,
        sponsor_code_used: referralLink.sponsor_code_used,
        sponsor_username: sponsor?.username,
        sponsor_display_name: sponsor?.display_name,
        sponsor_email: sponsor?.email,
        sponsor_badge: sponsorBadge?.current_badge || 'None',
        join_date: referralLink.created_at,
      };
    },
    enabled: open && !!userId,
  });

  // Fetch downline tree
  const { data: downlineTree } = useQuery({
    queryKey: ["admin-user-downline", userId],
    queryFn: async () => {
      // Fetch all downline members
      const { data: members } = await supabase
        .from("referral_tree")
        .select(`
          user_id,
          level,
          direct_sponsor_id,
          created_at
        `)
        .eq("ancestor_id", userId)
        .order("level")
        .order("created_at");

      if (!members || members.length === 0) return { 
        members: [], 
        totalMembers: 0, 
        directReferrals: 0,
        deepestLevel: 0,
        levelGroups: {}
      };

      // Fetch profiles for all members
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, email")
        .in("user_id", userIds);

      // Fetch badges for all members
      const { data: badges } = await supabase
        .from("user_badge_holdings")
        .select("user_id, current_badge")
        .in("user_id", userIds);

      // Merge data
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const badgeMap = new Map(badges?.map(b => [b.user_id, b.current_badge]) || []);

      const enrichedMembers = members.map(m => ({
        ...m,
        username: profileMap.get(m.user_id)?.username,
        display_name: profileMap.get(m.user_id)?.display_name,
        email: profileMap.get(m.user_id)?.email,
        badge: badgeMap.get(m.user_id) || 'None',
      }));

      // Group by level
      const levelGroups: Record<number, typeof enrichedMembers> = {};
      enrichedMembers.forEach(member => {
        if (!levelGroups[member.level]) {
          levelGroups[member.level] = [];
        }
        levelGroups[member.level].push(member);
      });

      return {
        members: enrichedMembers,
        totalMembers: enrichedMembers.length,
        directReferrals: enrichedMembers.filter(m => m.level === 1).length,
        deepestLevel: Math.max(...enrichedMembers.map(m => m.level), 0),
        levelGroups,
      };
    },
    enabled: open && !!userId,
  });

  const handleResetPassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || "", {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Password Reset Email Sent",
        description: `Reset link sent to ${user?.email}`,
      });
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast({
        title: "Failed to Send",
        description: error.message || "Failed to send password reset email",
        variant: "destructive",
      });
    }
  };

  const handleViewAsUser = () => {
    window.open(`/app/profile`, '_blank');
    toast({
      title: "Opening User View",
      description: "Opening user profile in new tab",
    });
  };

  const handleExportData = async () => {
    try {
      const exportData = {
        user: user,
        balance: balance,
        inrBalance: inrBalance,
        badge: userBadge,
        sponsor: sponsorInfo,
        downline: {
          totalMembers: downlineTree?.totalMembers,
          directReferrals: downlineTree?.directReferrals,
          deepestLevel: downlineTree?.deepestLevel,
        },
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-${userId.substring(0, 8)}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "User data exported successfully",
      });
    } catch (error: any) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export user data",
        variant: "destructive",
      });
    }
  };

  const handleAccountActionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
  };

  const handleDeleteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-[600px] bg-[hsl(235_28%_13%)] border-[hsl(235_20%_22%/0.4)] overflow-y-auto px-4 sm:px-6 safe-top safe-bottom">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(262_100%_65%)]" />
          </div>
        ) : user ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-[hsl(0_0%_98%)]">
                {user.display_name || user.email}
              </SheetTitle>
              <SheetDescription className="text-[hsl(240_10%_70%)]">
                User ID: {user.user_id.substring(0, 8)}...
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-1 bg-[hsl(220_13%_7%)]">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="financials" className="text-xs sm:text-sm">Financials</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
                <TabsTrigger value="team" className="text-xs sm:text-sm">Team</TabsTrigger>
                <TabsTrigger value="danger" className="text-xs sm:text-sm">Danger</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <CleanCard padding="lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                      <h3 className="font-semibold text-[hsl(0_0%_98%)]">Profile Information</h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-[hsl(240_10%_70%)]">Email</div>
                        <div className="text-sm text-[hsl(0_0%_98%)]">{user.email}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(240_10%_70%)]">Display Name</div>
                        <div className="text-sm text-[hsl(0_0%_98%)]">
                          {user.display_name || "Not set"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(240_10%_70%)]">Phone</div>
                        <div className="text-sm text-[hsl(0_0%_98%)]">
                          {user.phone || "Not set"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(240_10%_70%)]">Account Status</div>
                        <Badge
                          variant={
                            user.account_status === "active"
                              ? "default"
                              : user.account_status === "suspended"
                              ? "destructive"
                              : "secondary"
                          }
                          className="mt-1"
                        >
                          {user.account_status || "pending"}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(240_10%_70%)]">KYC Status</div>
                        <Badge
                          variant={
                            user.kyc_status === "approved"
                              ? "default"
                              : user.kyc_status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                          className="mt-1"
                        >
                          {user.kyc_status || "none"}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(240_10%_70%)]">Member Since</div>
                        <div className="text-sm text-[hsl(0_0%_98%)]">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </CleanCard>

                <CleanCard padding="lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                      <h3 className="font-semibold text-[hsl(0_0%_98%)]">Badge Status</h3>
                    </div>

                    {userBadge ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[hsl(240_10%_70%)]">Current Badge</span>
                          <Badge variant={userBadge.current_badge === 'None' ? 'outline' : 'default'}>
                            {userBadge.current_badge}
                          </Badge>
                        </div>
                        {userBadge.source === 'purchased' && 'purchased_at' in userBadge && (
                          <>
                            {userBadge.purchased_at && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-[hsl(240_10%_70%)]">Purchased</span>
                                <span className="text-sm text-[hsl(0_0%_98%)]">
                                  {formatDistanceToNow(new Date(userBadge.purchased_at), { addSuffix: true })}
                                </span>
                              </div>
                            )}
                            {'unlock_levels' in userBadge && userBadge.unlock_levels && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-[hsl(240_10%_70%)]">Unlock Levels</span>
                                <span className="text-sm text-[hsl(0_0%_98%)]">
                                  {userBadge.unlock_levels}
                                </span>
                              </div>
                            )}
                            {'previous_badge' in userBadge && userBadge.previous_badge && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-[hsl(240_10%_70%)]">Previous Badge</span>
                                <Badge variant="outline">
                                  {userBadge.previous_badge}
                                </Badge>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[hsl(240_10%_70%)]">Source</span>
                          <span className="text-xs text-[hsl(240_10%_70%)] capitalize">
                            {userBadge.source}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[hsl(240_10%_70%)]">No badge data available</p>
                    )}
                  </div>
                </CleanCard>

                {sponsorInfo && (
                  <CleanCard padding="lg">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                        <h3 className="font-semibold text-[hsl(0_0%_98%)]">Sponsor Information</h3>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[hsl(240_10%_70%)]">Sponsor</span>
                          <span className="text-sm text-[hsl(0_0%_98%)]">
                            {sponsorInfo.sponsor_display_name || sponsorInfo.sponsor_username || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[hsl(240_10%_70%)]">Email</span>
                          <span className="text-sm text-[hsl(0_0%_98%)]">
                            {sponsorInfo.sponsor_email}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[hsl(240_10%_70%)]">Badge</span>
                          <Badge variant={sponsorInfo.sponsor_badge === 'None' ? 'outline' : 'default'}>
                            {sponsorInfo.sponsor_badge}
                          </Badge>
                        </div>
                        {sponsorInfo.sponsor_code_used && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[hsl(240_10%_70%)]">Referral Code Used</span>
                            <span className="text-sm text-[hsl(0_0%_98%)] font-mono">
                              {sponsorInfo.sponsor_code_used}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[hsl(240_10%_70%)]">Joined</span>
                          <span className="text-sm text-[hsl(0_0%_98%)]">
                            {formatDistanceToNow(new Date(sponsorInfo.join_date), { addSuffix: true })}
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-[hsl(235_20%_22%/0.4)] min-h-[44px]"
                          onClick={() => {
                            // Open sponsor in new detail panel - for now just show ID
                            toast({
                              title: "Sponsor Details",
                              description: `Sponsor ID: ${sponsorInfo.sponsor_id.substring(0, 8)}...`,
                            });
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Sponsor Profile
                        </Button>
                      </div>
                    </div>
                  </CleanCard>
                )}

                <CleanCard padding="lg">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-[hsl(0_0%_98%)] flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[hsl(262_100%_65%)]" />
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-[hsl(235_20%_22%/0.4)] min-h-[44px]"
                        onClick={handleResetPassword}
                      >
                        <KeyRound className="w-4 h-4 mr-2" />
                        Reset Password
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-[hsl(235_20%_22%/0.4)] min-h-[44px]"
                        onClick={() => setSendEmailDialogOpen(true)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-[hsl(235_20%_22%/0.4)] min-h-[44px]"
                        onClick={handleViewAsUser}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View as User
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-[hsl(235_20%_22%/0.4)] min-h-[44px]"
                        onClick={handleExportData}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                      </Button>
                    </div>
                  </div>
                </CleanCard>
              </TabsContent>

              <TabsContent value="financials" className="space-y-4 mt-4">
                <CleanCard padding="lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                      <h3 className="font-semibold text-[hsl(0_0%_98%)]">BSK Balances</h3>
                    </div>

                    {balance ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[hsl(240_10%_70%)]">Withdrawable</span>
                          <span className="text-lg font-bold text-[hsl(152_64%_48%)]">
                            {balance.withdrawable_balance.toLocaleString()} BSK
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[hsl(240_10%_70%)]">Holding</span>
                          <span className="text-lg font-bold text-[hsl(38_100%_60%)]">
                            {balance.holding_balance.toLocaleString()} BSK
                          </span>
                        </div>
                        <div className="pt-3 border-t border-[hsl(235_20%_22%/0.4)]">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-[hsl(0_0%_98%)]">Total</span>
                            <span className="text-xl font-bold text-[hsl(262_100%_65%)]">
                              {(balance.withdrawable_balance + balance.holding_balance).toLocaleString()} BSK
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[hsl(240_10%_70%)]">No balance data available</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4">
                      <Button 
                        size="sm" 
                        className="bg-[hsl(152_64%_48%)] hover:bg-[hsl(152_64%_43%)] min-h-[44px]"
                        onClick={() => {
                          setAdjustmentOperation("add");
                          setAdjustmentDialogOpen(true);
                        }}
                      >
                        Add BSK
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-[hsl(235_20%_22%/0.4)] min-h-[44px]"
                        onClick={() => {
                          setAdjustmentOperation("deduct");
                          setAdjustmentDialogOpen(true);
                        }}
                      >
                        Subtract BSK
                      </Button>
                    </div>
                  </div>
                </CleanCard>

                <CleanCard padding="lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                      <h3 className="font-semibold text-[hsl(0_0%_98%)]">INR Balance</h3>
                    </div>

                    {inrBalance ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[hsl(240_10%_70%)]">Available</span>
                          <span className="text-lg font-bold text-[hsl(152_64%_48%)]">
                            ₹{(inrBalance.balance || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[hsl(240_10%_70%)]">Locked</span>
                          <span className="text-lg font-bold text-[hsl(38_100%_60%)]">
                            ₹{(inrBalance.locked || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="pt-3 border-t border-[hsl(235_20%_22%/0.4)]">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-[hsl(0_0%_98%)]">Total</span>
                            <span className="text-xl font-bold text-[hsl(262_100%_65%)]">
                              ₹{((inrBalance.balance || 0) + (inrBalance.locked || 0)).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[hsl(240_10%_70%)]">No INR balance data available</p>
                    )}
                  </div>
                </CleanCard>

                <CleanCard padding="lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                      <h3 className="font-semibold text-[hsl(0_0%_98%)]">All Balances & Assets</h3>
                    </div>
                    <UserBalanceOverview userId={userId} />
                  </div>
                </CleanCard>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-4">
                <CleanCard padding="lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                      <h3 className="font-semibold text-[hsl(0_0%_98%)]">Complete Transaction History</h3>
                    </div>
                    <UserTransactionHistory userId={userId} />
                  </div>
                </CleanCard>
              </TabsContent>

              <TabsContent value="team" className="space-y-4 mt-4">
                <CleanCard padding="lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Network className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                      <h3 className="font-semibold text-[hsl(0_0%_98%)]">Downline Tree</h3>
                    </div>

                    {downlineTree && downlineTree.totalMembers > 0 ? (
                      <>
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-[hsl(220_13%_7%)] rounded-lg">
                          <div>
                            <div className="text-xs text-[hsl(240_10%_70%)]">Direct Referrals</div>
                            <div className="text-2xl font-bold text-[hsl(262_100%_65%)]">
                              {downlineTree.directReferrals}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-[hsl(240_10%_70%)]">Total Team</div>
                            <div className="text-2xl font-bold text-[hsl(152_64%_48%)]">
                              {downlineTree.totalMembers}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-[hsl(240_10%_70%)]">Deepest Level</div>
                            <div className="text-2xl font-bold text-[hsl(38_100%_60%)]">
                              {downlineTree.deepestLevel}
                            </div>
                          </div>
                        </div>

                        {/* Member List grouped by Level */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-[hsl(0_0%_98%)]">Team Members by Level</h4>
                          <Accordion type="multiple" className="w-full space-y-2">
                            {Object.entries(downlineTree.levelGroups).map(([level, members]) => (
                              <AccordionItem 
                                key={level} 
                                value={`level-${level}`}
                                className="border border-[hsl(235_20%_22%/0.4)] rounded-lg px-4"
                              >
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex items-center justify-between w-full pr-4">
                                    <span className="text-sm font-medium text-[hsl(0_0%_98%)]">
                                      Level {level}
                                    </span>
                                    <Badge variant="secondary" className="ml-2">
                                      {members.length} {members.length === 1 ? 'member' : 'members'}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-3 pt-2">
                                    {members.map((member) => (
                                      <div 
                                        key={member.user_id}
                                        className="flex items-center justify-between p-3 bg-[hsl(220_13%_7%)] rounded-lg"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium text-[hsl(0_0%_98%)] truncate">
                                            {member.display_name || member.username || 'Unknown'}
                                          </div>
                                          <div className="text-xs text-[hsl(240_10%_70%)] truncate">
                                            {member.email}
                                          </div>
                                          <div className="text-xs text-[hsl(240_10%_70%)] mt-1">
                                            Joined {formatDistanceToNow(new Date(member.created_at), { addSuffix: true })}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-3">
                                          <Badge variant={member.badge === 'None' ? 'outline' : 'default'}>
                                            {member.badge}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Network className="w-12 h-12 mx-auto text-[hsl(240_10%_70%)] opacity-50 mb-3" />
                        <p className="text-sm text-[hsl(240_10%_70%)]">
                          This user has no downline members yet
                        </p>
                      </div>
                    )}
                  </div>
                </CleanCard>
              </TabsContent>

              <TabsContent value="danger" className="space-y-4 mt-4">
                <CleanCard padding="lg" className="border-l-4 border-l-[hsl(0_70%_68%)]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-[hsl(0_70%_68%)]" />
                      <h3 className="font-semibold text-[hsl(0_0%_98%)]">Danger Zone</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-[hsl(0_0%_98%)]">Suspend Account</div>
                          <div className="text-xs text-[hsl(240_10%_70%)]">
                            Temporarily disable user access
                          </div>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="min-h-[44px] w-full sm:w-auto"
                          onClick={() => {
                            setAccountAction("suspend");
                            setAccountActionDialogOpen(true);
                          }}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Suspend
                        </Button>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-[hsl(0_0%_98%)]">Ban User</div>
                          <div className="text-xs text-[hsl(240_10%_70%)]">
                            Permanently ban from platform
                          </div>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="min-h-[44px] w-full sm:w-auto"
                          onClick={() => {
                            setAccountAction("ban");
                            setAccountActionDialogOpen(true);
                          }}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Ban
                        </Button>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-[hsl(0_0%_98%)]">Delete User</div>
                          <div className="text-xs text-[hsl(240_10%_70%)]">
                            Permanently delete all data
                          </div>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="min-h-[44px] w-full sm:w-auto"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CleanCard>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[hsl(240_10%_70%)]">User not found</p>
          </div>
        )}

        <BalanceAdjustmentDialog
          userId={userId}
          open={adjustmentDialogOpen}
          onClose={() => setAdjustmentDialogOpen(false)}
          defaultOperation={adjustmentOperation}
        />

        {user && (
          <>
            <SendEmailDialog
              open={sendEmailDialogOpen}
              onOpenChange={setSendEmailDialogOpen}
              userEmail={user.email}
            />

            <AccountActionDialog
              open={accountActionDialogOpen}
              onOpenChange={setAccountActionDialogOpen}
              userId={userId}
              userEmail={user.email}
              action={accountAction}
              onSuccess={handleAccountActionSuccess}
            />

            <ForceDeleteDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              userId={userId}
              userEmail={user.email}
              isAdmin={isUserAdmin}
              onSuccess={handleDeleteSuccess}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
