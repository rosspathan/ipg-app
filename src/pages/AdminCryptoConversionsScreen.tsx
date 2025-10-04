import { AdminCryptoConversions } from "@/components/admin/AdminCryptoConversions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminCryptoConversionSettings } from "@/components/admin/AdminCryptoConversionSettings";

export default function AdminCryptoConversionsScreen() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Crypto to BSK Conversions</h1>
        <p className="text-muted-foreground">
          Manage cryptocurrency conversion settings and review user requests
        </p>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Conversion Requests</TabsTrigger>
          <TabsTrigger value="settings">Wallet Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <AdminCryptoConversions />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AdminCryptoConversionSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
