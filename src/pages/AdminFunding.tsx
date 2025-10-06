import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminINRAccounts from "@/components/AdminINRAccounts";
import AdminINRDeposits from "@/components/AdminINRDeposits";
import AdminINRWithdrawals from "@/components/AdminINRWithdrawals";
import AdminCryptoControls from "@/components/AdminCryptoControls";
import AdminBSKBalances from "@/components/AdminBSKBalances";
import AdminINRSettings from "@/components/AdminINRSettings";
import { AdminBSKRelease } from "@/components/admin/AdminBSKRelease";

const AdminFunding = () => {

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Funding Operations</h1>
      </div>

      <Tabs defaultValue="inr-settings" className="w-full">
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-8 gap-1 h-auto">
          <TabsTrigger value="inr-settings" className="text-xs md:text-sm py-2">Settings</TabsTrigger>
          <TabsTrigger value="inr-accounts" className="text-xs md:text-sm py-2">INR Accounts</TabsTrigger>
          <TabsTrigger value="inr-deposits" className="text-xs md:text-sm py-2">INR Deposits</TabsTrigger>
          <TabsTrigger value="inr-withdrawals" className="text-xs md:text-sm py-2">INR Withdrawals</TabsTrigger>
          <TabsTrigger value="crypto" className="text-xs md:text-sm py-2">Crypto Controls</TabsTrigger>
          <TabsTrigger value="bsk-withdrawable" className="text-xs md:text-sm py-2">BSK Withdrawable</TabsTrigger>
          <TabsTrigger value="bsk-holding" className="text-xs md:text-sm py-2">BSK Holding</TabsTrigger>
          <TabsTrigger value="bsk-release" className="text-xs md:text-sm py-2">BSK Release</TabsTrigger>
        </TabsList>

        <TabsContent value="inr-settings" className="mt-4">
          <AdminINRSettings />
        </TabsContent>

        <TabsContent value="inr-accounts" className="mt-4">
          <AdminINRAccounts />
        </TabsContent>

        <TabsContent value="inr-deposits" className="mt-4">
          <AdminINRDeposits />
        </TabsContent>

        <TabsContent value="inr-withdrawals" className="mt-4">
          <AdminINRWithdrawals />
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
