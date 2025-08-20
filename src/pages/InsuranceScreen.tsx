import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Shield, Wallet, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const InsuranceScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const insurancePlans = [
    {
      id: "wallet-protection",
      name: "Wallet Protection",
      icon: Wallet,
      iconColor: "text-blue-500",
      premium: "$19.99/month",
      coverage: "Up to $50,000",
      duration: "Monthly",
      features: [
        "Protection against unauthorized access",
        "Malware & phishing protection",
        "24/7 monitoring",
        "Instant alerts",
        "Recovery assistance"
      ]
    },
    {
      id: "trade-insurance",
      name: "Trade Insurance",
      icon: TrendingUp,
      iconColor: "text-green-500",
      premium: "$29.99/month",
      coverage: "Up to $100,000",
      duration: "Monthly",
      features: [
        "Protection against platform failures",
        "Network congestion coverage",
        "Slippage protection",
        "Failed transaction coverage",
        "Technical analysis tools"
      ]
    }
  ];

  const userPolicies = [
    {
      id: "POL001",
      plan: "Wallet Protection",
      premium: "$19.99/month",
      coverage: "$50,000",
      startDate: "Dec 1, 2024",
      endDate: "Dec 1, 2025",
      status: "Active",
      nextPayment: "Jan 1, 2025"
    }
  ];

  const claims = [
    {
      id: "CLM001",
      policy: "Wallet Protection",
      reason: "Unauthorized Transaction",
      amount: "$1,250.00",
      status: "Approved",
      submittedDate: "Nov 15, 2024",
      resolvedDate: "Nov 20, 2024"
    },
    {
      id: "CLM002",
      policy: "Trade Insurance",
      reason: "Platform Downtime",
      amount: "$500.00",
      status: "Pending",
      submittedDate: "Nov 25, 2024",
      resolvedDate: null
    }
  ];

  const handleBuyInsurance = (planId: string, planName: string) => {
    toast({
      title: "Insurance Purchased!",
      description: `Successfully purchased ${planName} insurance`,
    });
  };

  const handleFileClaim = () => {
    navigate("/file-claim");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "text-green-600 border-green-600";
      case "Expired": return "text-red-600 border-red-600";
      case "Approved": return "text-green-600 border-green-600";
      case "Pending": return "text-yellow-600 border-yellow-600";
      case "Rejected": return "text-red-600 border-red-600";
      default: return "text-gray-600 border-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active": return <CheckCircle className="w-4 h-4" />;
      case "Approved": return <CheckCircle className="w-4 h-4" />;
      case "Pending": return <Clock className="w-4 h-4" />;
      case "Rejected": return <AlertCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

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
        <h1 className="text-xl font-semibold">Insurance</h1>
      </div>

      <Tabs defaultValue="plans" className="flex-1">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="policies">My Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          {insurancePlans.map((plan) => (
            <Card key={plan.id} className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <plan.icon className={`w-8 h-8 ${plan.iconColor}`} />
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{plan.duration}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{plan.premium}</p>
                    <p className="text-sm text-muted-foreground">Premium</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <span className="font-medium">Coverage Amount</span>
                  <span className="text-lg font-bold text-green-600">{plan.coverage}</span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Coverage Details:</h4>
                  <div className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={() => handleBuyInsurance(plan.id, plan.name)}
                  className="w-full"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Buy Insurance
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {userPolicies.length > 0 ? (
            <>
              {userPolicies.map((policy) => (
                <Card key={policy.id} className="bg-gradient-card shadow-card border-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{policy.plan}</CardTitle>
                        <p className="text-sm text-muted-foreground">Policy #{policy.id}</p>
                      </div>
                      <Badge variant="outline" className={getStatusColor(policy.status)}>
                        {policy.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Premium</p>
                        <p className="font-medium">{policy.premium}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Coverage</p>
                        <p className="font-medium">{policy.coverage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="font-medium">{policy.startDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <p className="font-medium">{policy.endDate}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Next Payment:</strong> {policy.nextPayment}
                      </p>
                    </div>

                    <Button variant="outline" className="w-full">
                      View Policy Details
                    </Button>
                  </CardContent>
                </Card>
              ))}

              <Button 
                onClick={handleFileClaim}
                className="w-full"
                size="lg"
              >
                File New Claim
              </Button>
            </>
          ) : (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Active Policies</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Protect your crypto assets with our insurance plans
                </p>
                <Button onClick={() => navigate("/insurance")}>
                  Browse Insurance Plans
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          {claims.map((claim) => (
            <Card key={claim.id} className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Claim #{claim.id}</CardTitle>
                    <p className="text-sm text-muted-foreground">{claim.policy}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(claim.status)}
                    <Badge variant="outline" className={getStatusColor(claim.status)}>
                      {claim.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{claim.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Claim Amount</p>
                    <p className="font-medium text-green-600">{claim.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-medium">{claim.submittedDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {claim.status === "Approved" ? "Resolved" : "Status"}
                    </p>
                    <p className="font-medium">
                      {claim.resolvedDate || claim.status}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button 
            onClick={handleFileClaim}
            className="w-full"
            size="lg"
          >
            File New Claim
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InsuranceScreen;