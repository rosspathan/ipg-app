import { BSKTransferForm } from "@/components/user/BSKTransferForm";
import { BSKReceiveQRCode } from "@/components/user/BSKReceiveQRCode";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBSKReceivedNotifications } from "@/hooks/useBSKReceivedNotifications";

export default function BSKTransferScreen() {
  const navigate = useNavigate();
  
  // Enable real-time notifications for received BSK
  useBSKReceivedNotifications();

  return (
    <div className="bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/programs')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Transfer BSK</h1>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-2xl">
        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="send">Send BSK</TabsTrigger>
            <TabsTrigger value="receive">Receive BSK</TabsTrigger>
          </TabsList>
          
          <TabsContent value="send">
            <BSKTransferForm />
          </TabsContent>
          
          <TabsContent value="receive">
            <BSKReceiveQRCode />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}