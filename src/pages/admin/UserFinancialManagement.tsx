import { useState } from "react";
import { UserFinancialSearch } from "@/components/admin/users/UserFinancialSearch";
import { UserBalanceOverview } from "@/components/admin/users/UserBalanceOverview";
import { UserTransactionHistory } from "@/components/admin/users/UserTransactionHistory";
import { UserFinancialOperations } from "@/components/admin/users/UserFinancialOperations";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserFinancialManagement() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Balance Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
            <TabsTrigger value="operations">Financial Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <UserBalanceOverview userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <UserTransactionHistory userId={selectedUserId} />
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <UserFinancialOperations userId={selectedUserId} />
          </TabsContent>
        </Tabs>
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
