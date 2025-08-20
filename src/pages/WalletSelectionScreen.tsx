import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Download } from "lucide-react";

const WalletSelectionScreen = () => {
  const navigate = useNavigate();

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
        <h1 className="text-xl font-semibold">Setup Wallet</h1>
      </div>

      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Let's Get Started
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose how you'd like to set up your crypto wallet
          </p>
        </div>

        <div className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/create-wallet")}>
            <CardHeader className="text-center pb-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-lg">Create New Wallet</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground text-center mb-4">
                Generate a new wallet with a secure recovery phrase
              </p>
              <Button 
                variant="default" 
                size="lg" 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/create-wallet");
                }}
              >
                Create Wallet
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-0 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/import-wallet")}>
            <CardHeader className="text-center pb-3">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Download className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-lg">Import Existing Wallet</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground text-center mb-4">
                Restore your wallet using a recovery phrase
              </p>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/import-wallet");
                }}
              >
                Import Wallet
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4 mt-8">
          <p className="text-xs text-muted-foreground text-center">
            🔒 Your wallet is secured with industry-standard encryption and stored locally on your device.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletSelectionScreen;