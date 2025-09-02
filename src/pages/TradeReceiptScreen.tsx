import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Download, Share, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TradeReceiptScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const orderDetails = location.state?.orderDetails || {
    orderId: "ORD-1234567890", 
    pair: "BTC/USDT",
    type: "buy",
    orderMethod: "market",
    amount: "0.1",
    price: "43,250",
    total: "4,325.00",
    fee: "4.33",
    status: "Completed",
    timestamp: new Date().toISOString(),
  };

  const handleDownload = () => {
    toast({
      title: "Receipt Downloaded",
      description: "Trade receipt saved to downloads",
    });
  };

  const handleShare = () => {
    toast({
      title: "Receipt Shared",
      description: "Trade receipt shared successfully",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full space-y-6">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">
            Trade Successful!
          </h1>
          <p className="text-muted-foreground">
            Your order has been executed successfully
          </p>
        </div>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Trade Receipt</CardTitle>
            <p className="text-sm text-muted-foreground">#{orderDetails.orderId}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
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
                <span className="font-medium">
                  {orderDetails.amount} {orderDetails.pair.split('/')[0]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium">{orderDetails.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee:</span>
                <span className="font-medium">
                  {orderDetails.fee} {orderDetails.pair.split('/')[1]}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">
                  {orderDetails.total} {orderDetails.pair.split('/')[1]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-green-500">{orderDetails.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time:</span>
                <span className="font-medium text-sm">
                  {formatDate(orderDetails.timestamp)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline"
            onClick={handleDownload}
            className="flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button 
            variant="outline"
            onClick={handleShare}
            className="flex items-center justify-center"
          >
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        <div className="space-y-3">
          <Button 
            variant="default"
            size="lg"
            onClick={() => navigate("/markets")}
            className="w-full"
          >
            Continue Trading
          </Button>
          
          <Button 
            variant="ghost"
            onClick={() => navigate("/app/wallet")}
            className="w-full flex items-center justify-center"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TradeReceiptScreen;