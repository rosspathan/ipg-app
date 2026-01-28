import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import AdminCryptoControls from "@/components/AdminCryptoControls";
import AdminBSKBalances from "@/components/AdminBSKBalances";
import { AdminBSKRelease } from "@/components/admin/AdminBSKRelease";
import AdminDepositFeeManager from "@/components/admin/AdminDepositFeeManager";
import { AdminTransactionDashboard } from "@/components/admin/AdminTransactionDashboard";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import { useNavigate } from "react-router-dom";

const AdminFunding = () => {
  const navigate = useNavigate();

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Funding Operations</h1>
        <div className="flex gap-2 items-center">
          <AdminNotificationBell />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/app/wallet/deposit')}
          >
            👁️ User View
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 gap-1 h-auto">
          <TabsTrigger value="dashboard" className="text-xs md:text-sm py-2">Dashboard</TabsTrigger>
          <TabsTrigger value="deposit-fees" className="text-xs md:text-sm py-2">Deposit Fees</TabsTrigger>
          <TabsTrigger value="crypto" className="text-xs md:text-sm py-2">Crypto Controls</TabsTrigger>
          <TabsTrigger value="bsk-withdrawable" className="text-xs md:text-sm py-2">BSK Withdrawable</TabsTrigger>
          <TabsTrigger value="bsk-holding" className="text-xs md:text-sm py-2">BSK Holding</TabsTrigger>
          <TabsTrigger value="bsk-release" className="text-xs md:text-sm py-2">BSK Release</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminTransactionDashboard />
        </TabsContent>

        <TabsContent value="deposit-fees" className="mt-4">
          <AdminDepositFeeManager />
        </TabsContent>

        <TabsContent value="crypto" className="mt-4">
          <AdminCryptoControls />
        </TabsContent>

        <TabsContent value="bsk-withdrawable" className="mt-4">
          <AdminBSKBalances balanceType="withdrawable" />
        </TabsContent>

        <TabsContent value="bsk-holding" className="mt-4">
          <AdminBSKBalances balanceType="holding" />
        </TabsContent>

        <TabsContent value="bsk-release" className="mt-4">
          <AdminBSKRelease />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminFunding;
