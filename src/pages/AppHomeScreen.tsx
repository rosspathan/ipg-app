import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

const AppHomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthUser();

  const tiles = [
    {
      title: "Wallet",
      description: "Manage your crypto assets",
      icon: "💼",
      action: () => navigate("/app/wallet"),
      primary: true
    },
    {
      title: "Markets",
      description: "View market data",
      icon: "📈",
      action: () => navigate("/app/markets")
    },
    {
      title: "Trade",
      description: "Buy and sell crypto",
      icon: "🔄",
      action: () => navigate("/app/trade")
    },
    {
      title: "Programs",
      description: "Staking & referrals",
      icon: "🎯",
      action: () => navigate("/app/programs")
    },
    {
      title: "Support",
      description: "Get help",
      icon: "💬",
      action: () => navigate("/app/support")
    },
    {
      title: "Notifications",
      description: "Your alerts",
      icon: "🔔",
      action: () => navigate("/app/notifications")
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <img 
              src="/lovable-uploads/a9cfc5de-7126-4662-923b-cc0348077e3d.png" 
              alt="I-SMART Logo" 
              className="w-8 h-8 rounded object-contain"
            />
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              I-SMART
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Badge variant="outline">
              {user?.email?.split('@')[0]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
          <p className="text-muted-foreground">
            Manage your crypto portfolio and explore new opportunities
          </p>
        </div>

        {/* Quick Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Overview</CardTitle>
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
                <div className="text-2xl font-bold text-primary">+0%</div>
                <div className="text-sm text-muted-foreground">24h Change</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Tiles */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <Card 
              key={tile.title} 
              className={`hover:shadow-lg transition-shadow cursor-pointer ${
                tile.primary ? 'border-primary' : ''
              }`}
              onClick={tile.action}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="text-2xl">{tile.icon}</div>
                  {tile.title}
                </CardTitle>
                <CardDescription>
                  {tile.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant={tile.primary ? "default" : "outline"}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    tile.action();
                  }}
                >
                  {tile.primary ? "Open Wallet" : `Go to ${tile.title}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppHomeScreen;