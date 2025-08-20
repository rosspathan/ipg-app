import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Copy, Users, DollarSign, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ReferralsScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [referralLink] = useState("https://cryptoflow.app/ref/ABC123XYZ");

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const referralStats = {
    totalIncome: "$1,247.83",
    totalReferrals: 23,
    activeReferrals: 18
  };

  const referralTree = [
    { level: "L1", user: "user001", volume: "$5,200", commission: "$52.00", status: "Active" },
    { level: "L1", user: "user042", volume: "$2,100", commission: "$21.00", status: "Active" },
    { level: "L1", user: "user089", volume: "$8,900", commission: "$89.00", status: "Active" },
    { level: "L2", user: "user156", volume: "$1,400", commission: "$7.00", status: "Active" },
    { level: "L2", user: "user203", volume: "$3,300", commission: "$16.50", status: "Inactive" },
    { level: "L3", user: "user267", volume: "$900", commission: "$2.70", status: "Active" },
  ];

  const commissionRates = [
    { level: "Level 1", rate: "1.0%", description: "Direct referrals" },
    { level: "Level 2", rate: "0.5%", description: "Second level referrals" },
    { level: "Level 3", rate: "0.3%", description: "Third level referrals" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Referrals</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{referralStats.totalIncome}</p>
            <p className="text-xs text-muted-foreground">Total Income</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{referralStats.totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Total Refs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{referralStats.activeReferrals}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="bg-gradient-card shadow-card border-0 mb-6">
        <CardHeader>
          <CardTitle className="text-base">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={referralLink}
              readOnly
              className="flex-1"
            />
            <Button onClick={handleCopyLink} size="icon">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link to earn commissions from your referrals' trading activity
          </p>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="bg-yellow-50 border-yellow-200 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Referral income is only available for subscribed users. 
              Subscribe to a plan to activate your referral earnings.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="referrals" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="referrals">My Referrals</TabsTrigger>
          <TabsTrigger value="rates">Commission Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Referral Tree</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b border-border pb-2">
                  <span>Level</span>
                  <span>User</span>
                  <span>Volume</span>
                  <span>Commission</span>
                </div>
                {referralTree.map((referral, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 text-sm">
                    <span className={`font-medium ${
                      referral.level === 'L1' ? 'text-green-500' :
                      referral.level === 'L2' ? 'text-blue-500' : 'text-purple-500'
                    }`}>
                      {referral.level}
                    </span>
                    <span className="text-foreground">{referral.user}</span>
                    <span className="text-foreground">{referral.volume}</span>
                    <span className="font-medium text-green-600">{referral.commission}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Commission Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissionRates.map((rate, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{rate.level}</p>
                      <p className="text-sm text-muted-foreground">{rate.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{rate.rate}</p>
                      <p className="text-xs text-muted-foreground">of trading volume</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferralsScreen;