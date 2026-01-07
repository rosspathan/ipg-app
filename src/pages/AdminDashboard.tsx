import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, ArrowUpCircle, ArrowDownCircle, Shield } from "lucide-react";
import { AdminWalletCard } from "@/components/admin/AdminWalletCard";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeUsers: 0,
    volume24h: 0,
    deposits: 0,
    withdrawals: 0,
    feeRevenue: 0,
    kycPending: 0,
    fiatWithdrawalsPending: 0,
    claimsPending: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load basic stats (mock data for demo)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('account_status', 'active');

      const { data: kycPending } = await supabase
        .from('profiles')
        .select('id')
        .eq('kyc_status', 'pending');

      const { data: fiatPending } = await supabase
        .from('fiat_withdrawals')
        .select('id')
        .eq('status', 'pending');

      const { data: claims } = await supabase
        .from('insurance_claims')
        .select('id')
        .eq('status', 'pending');

      setStats({
        activeUsers: profiles?.length || 0,
        volume24h: 1250000, // Mock data
        deposits: 850000, // Mock data
        withdrawals: 620000, // Mock data
        feeRevenue: 12500, // Mock data
        kycPending: kycPending?.length || 0,
        fiatWithdrawalsPending: fiatPending?.length || 0,
        claimsPending: claims?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">24h Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">${stats.volume24h.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Deposits</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">${stats.deposits.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Withdrawals</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">${stats.withdrawals.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Fee Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">${stats.feeRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Wallet & Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4">
        <AdminWalletCard />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Queues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>KYC Pending</span>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">
                {stats.kycPending}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Fiat Withdrawals</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                {stats.fiatWithdrawalsPending}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Insurance Claims</span>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
                {stats.claimsPending}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/admin/users')}
            >
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/admin/funding')}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Funding Operations
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/admin/insurance-claims')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Insurance Claims
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>New user registration</div>
              <div>KYC document uploaded</div>
              <div>Fiat withdrawal request</div>
              <div>Insurance claim filed</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;