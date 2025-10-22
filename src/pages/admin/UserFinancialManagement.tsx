import { useState, useEffect } from "react";
import { UserFinancialSearch } from "@/components/admin/users/UserFinancialSearch";
import { UserBalanceOverview } from "@/components/admin/users/UserBalanceOverview";
import { UserTransactionHistory } from "@/components/admin/users/UserTransactionHistory";
import { UserFinancialOperations } from "@/components/admin/users/UserFinancialOperations";
import { ForceDeleteDialog } from "@/components/admin/users/ForceDeleteDialog";
import { UserBalanceHistory } from "@/components/admin/UserBalanceHistory";
import { FixBadgeBonus } from "@/components/admin/FixBadgeBonus";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function UserFinancialManagement() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails();
    }
  }, [selectedUserId]);

  const fetchUserDetails = async () => {
    if (!selectedUserId) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', selectedUserId)
      .single();

    if (profile) {
      setSelectedUserEmail(profile.email);
    }

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', selectedUserId)
      .eq('role', 'admin')
      .maybeSingle();

    setIsUserAdmin(!!role);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    toast.success("User deleted successfully");
    setSelectedUserId(null);
    setSelectedUserEmail("");
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">User Financial Management</h1>
        <p className="text-muted-foreground">
          Manage user balances, transactions, and financial operations
        </p>
      </div>

      <UserFinancialSearch onUserSelect={setSelectedUserId} />

      {selectedUserId ? (
        <>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete User Account
            </Button>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Balance Overview</TabsTrigger>
              <TabsTrigger value="bsk-history">BSK History</TabsTrigger>
              <TabsTrigger value="transactions">Transaction History</TabsTrigger>
              <TabsTrigger value="operations">Financial Operations</TabsTrigger>
              <TabsTrigger value="fix-bonus">Fix Badge Bonus</TabsTrigger>
            </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <UserBalanceOverview userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="bsk-history" className="space-y-4">
            <UserBalanceHistory userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <UserTransactionHistory userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <UserFinancialOperations userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="fix-bonus" className="space-y-4">
            <FixBadgeBonus />
          </TabsContent>
        </Tabs>

        <ForceDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          userId={selectedUserId}
          userEmail={selectedUserEmail}
          isAdmin={isUserAdmin}
          onSuccess={handleDeleteSuccess}
        />
        </>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Search and select a user to view their financial information
          </p>
        </Card>
      )}
    </div>
  );
}
