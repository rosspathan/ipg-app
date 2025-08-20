import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Shield, Fingerprint, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OrderConfirmationScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [pin, setPin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const orderDetails = location.state?.orderDetails || {
    pair: "BTC/USDT",
    type: "buy",
    orderMethod: "market",
    amount: "0.1",
    price: "43,250",
    total: "4,325.00",
    fee: "4.33",
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "Please enter your 6-digit PIN",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate order processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsConfirmed(true);
      
      toast({
        title: "Order Placed Successfully!",
        description: "Your order has been executed",
      });

      // Auto redirect to trade receipt after 2 seconds
      setTimeout(() => {
        navigate("/trade-receipt", {
          state: {
            orderDetails: {
              ...orderDetails,
              orderId: "ORD-" + Date.now(),
              status: "Completed",
              timestamp: new Date().toISOString(),
            }
          }
        });
      }, 2000);
    }, 2000);
  };

  const handleBiometricAuth = () => {
    toast({
      title: "Biometric authentication",
      description: "Feature not available in demo",
    });
    
    setTimeout(() => {
      handlePinSubmit();
    }, 500);
  };

  if (isConfirmed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">
            Order Confirmed!
          </h1>
          <p className="text-sm text-muted-foreground">
            Redirecting to receipt...
          </p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-xl font-semibold">Confirm Order</h1>
      </div>

      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full space-y-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pair:</span>
              <span className="font-medium">{orderDetails.pair}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Type:</span>
              <span className="font-medium capitalize">
                {orderDetails.type} - {orderDetails.orderMethod}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{orderDetails.amount} {orderDetails.pair.split('/')[0]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium">{orderDetails.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee:</span>
              <span className="font-medium">{orderDetails.fee} {orderDetails.pair.split('/')[1]}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{orderDetails.total} {orderDetails.pair.split('/')[1]}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Security Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-sm font-medium mb-2">Enter PIN</h3>
                <div className="flex justify-center space-x-2 mb-4">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full border-2 ${
                        i < pin.length 
                          ? "bg-primary border-primary" 
                          : "border-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <Input
                type="password"
                value={pin}
                onChange={(e) => {
                  if (e.target.value.length <= 6 && /^\d*$/.test(e.target.value)) {
                    setPin(e.target.value);
                  }
                }}
                className="text-center text-2xl tracking-widest opacity-0 absolute -left-full"
                autoFocus
                maxLength={6}
              />

              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((num, i) => (
                  <Button
                    key={i}
                    variant={num === "" ? "ghost" : "outline"}
                    className="h-12 text-lg"
                    disabled={num === "" || isProcessing}
                    onClick={() => {
                      if (num === "⌫") {
                        setPin(pin.slice(0, -1));
                      } else if (typeof num === "number" && pin.length < 6) {
                        setPin(pin + num.toString());
                      }
                    }}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={handleBiometricAuth}
              className="w-full"
              disabled={isProcessing}
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              Use Biometric
            </Button>

            <Button 
              onClick={handlePinSubmit}
              className="w-full"
              size="lg"
              disabled={pin.length !== 6 || isProcessing}
            >
              {isProcessing ? "Processing..." : "Confirm Order"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderConfirmationScreen;