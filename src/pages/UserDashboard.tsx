import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      localStorage.removeItem("cryptoflow_pin");
      localStorage.removeItem("cryptoflow_biometric");
      localStorage.removeItem("cryptoflow_antiphishing");
      localStorage.removeItem("cryptoflow_setup_complete");
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CryptoFlow
            </h1>
            <Badge variant="outline">User Dashboard</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Wallet Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  💼
                </div>
                My Wallet
              </CardTitle>
              <CardDescription>
                Manage your crypto assets and view balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/app/wallet")}
                className="w-full"
              >
                Open Wallet
              </Button>
            </CardContent>
          </Card>

          {/* Trading Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  📈
                </div>
                Trading
              </CardTitle>
              <CardDescription>
                Trade cryptocurrencies and view market data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  onClick={() => navigate("/trading")}
                  className="w-full"
                >
                  Start Trading
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/markets")}
                  className="w-full"
                >
                  View Markets
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  📋
                </div>
                History
              </CardTitle>
              <CardDescription>
                View your transaction and trading history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                onClick={() => navigate("/history")}
                className="w-full"
              >
                View History
              </Button>
            </CardContent>
          </Card>

          {/* Programs Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  🎯
                </div>
                Programs
              </CardTitle>
              <CardDescription>
                Access staking, referrals, and other programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline"
                  onClick={() => navigate("/staking")}
                  className="w-full"
                >
                  Staking
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/referrals")}
                  className="w-full"
                >
                  Referrals
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Services Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  🛡️
                </div>
                Services
              </CardTitle>
              <CardDescription>
                Insurance, subscriptions, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline"
                  onClick={() => navigate("/insurance")}
                  className="w-full"
                >
                  Insurance
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/subscriptions")}
                  className="w-full"
                >
                  Subscriptions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Support Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  💎
                </div>
                Lucky Draw
              </CardTitle>
              <CardDescription>
                Participate in lucky draws and win prizes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                onClick={() => navigate("/lucky-draw")}
                className="w-full"
              >
                Try Your Luck
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Overview</CardTitle>
              <CardDescription>
                Your account summary and recent activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">$0.00</div>
                  <div className="text-sm text-muted-foreground">Total Balance</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Open Orders</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Completed Trades</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;