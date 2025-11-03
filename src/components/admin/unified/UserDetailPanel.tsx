import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, User, Wallet, Activity, Shield, AlertTriangle, TrendingUp, Lock } from "lucide-react";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { BalanceAdjustmentDialog } from "@/components/admin/users/BalanceAdjustmentDialog";
import { UserBalanceOverview } from "@/components/admin/users/UserBalanceOverview";
import { UserTransactionHistory } from "@/components/admin/users/UserTransactionHistory";
import { useIsMobile } from "@/hooks/use-mobile";

interface UserDetailPanelProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function UserDetailPanel({ userId, open, onClose }: UserDetailPanelProps) {
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentOperation, setAdjustmentOperation] = useState<"add" | "deduct">("add");
  const isMobile = useIsMobile();

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
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
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 bg-[hsl(220_13%_7%)]">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="financials" className="text-xs sm:text-sm">Financials</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
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
                  <div className="space-y-3">
                    <h3 className="font-semibold text-[hsl(0_0%_98%)] flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[hsl(262_100%_65%)]" />
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="border-[hsl(235_20%_22%/0.4)] min-h-[44px]">
                        Reset Password
                      </Button>
                      <Button variant="outline" size="sm" className="border-[hsl(235_20%_22%/0.4)] min-h-[44px]">
                        Send Email
                      </Button>
                      <Button variant="outline" size="sm" className="border-[hsl(235_20%_22%/0.4)] min-h-[44px]">
                        View as User
                      </Button>
                      <Button variant="outline" size="sm" className="border-[hsl(235_20%_22%/0.4)] min-h-[44px]">
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
                        <Button variant="destructive" size="sm" className="min-h-[44px] w-full sm:w-auto">
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
                        <Button variant="destructive" size="sm" className="min-h-[44px] w-full sm:w-auto">
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
                        <Button variant="destructive" size="sm" className="min-h-[44px] w-full sm:w-auto">
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
      </SheetContent>
    </Sheet>
  );
}
