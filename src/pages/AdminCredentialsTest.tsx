import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Key, User, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminCredentialsTest = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");

  const testAdminCreation = async () => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      console.log('Testing admin creation...');

      // Call the admin creation function
      const { data, error } = await supabase.functions.invoke('admin-create-default', {
        body: {}
      });

      if (error) {
        console.error('Admin creation error:', error);
        throw error;
      }

      console.log('Admin creation response:', data);
      setResults(data);

      toast({
        title: "Admin Test Complete",
        description: "Check the results below for admin credentials",
      });

    } catch (error: any) {
      console.error("Error testing admin creation:", error);
      setError(error.message || "Failed to test admin creation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Admin Credentials Test</CardTitle>
              <CardDescription>
                Test and create default admin credentials for Phase 1
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">{results.message}</p>
                  {results.adminEmail && (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>Email: <code>{results.adminEmail}</code></span>
                      </div>
                      {results.adminPassword && (
                        <div className="flex items-center gap-2">
                          <Key className="h-3 w-3" />
                          <span>Password: <code>{results.adminPassword}</code></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Phase 1 Admin Setup Summary
            </h3>
            <div className="text-sm space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Default Admin:</p>
                  <code className="text-xs">admin@ipg-app.com</code><br />
                  <code className="text-xs">admin123</code>
                </div>
                <div>
                  <p className="font-medium">Your Admin:</p>
                  <code className="text-xs">admin@example.com</code><br />
                  <span className="text-xs text-muted-foreground">Set password via Admin Login</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded border">
                <p className="text-xs font-medium text-blue-800">Web3 Wallet Authentication:</p>
                <p className="text-xs text-blue-700">Admin wallets stored in ADMIN_WALLETS secret</p>
                <p className="text-xs text-blue-700">Access via /admin-login with MetaMask</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={testAdminCreation}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Testing..." : "Test Admin Creation"}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              This will test the default admin creation and show credentials
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" asChild>
                <a href="/admin-login">Admin Login</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/auth">User Login</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCredentialsTest;