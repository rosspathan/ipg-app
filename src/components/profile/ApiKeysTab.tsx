import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Plus, Trash2, Eye, EyeOff, AlertTriangle, Loader2 } from "lucide-react";
import { useApiKeys } from "@/hooks/useApiKeys";

export const ApiKeysTab = () => {
  const { apiKeys, loading, createApiKey, revokeApiKey } = useApiKeys();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [createdKey, setCreatedKey] = useState<{ key: string; preview: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyLabel.trim()) return;

    try {
      const result = await createApiKey(newKeyLabel);
      setCreatedKey(result);
      setNewKeyLabel("");
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCreatedKey(null);
    setShowKey(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <span>API Keys</span>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!createdKey ? (
                    <>
                      <div className="space-y-2">
                        <Label>API Key Label</Label>
                        <Input
                          value={newKeyLabel}
                          onChange={(e) => setNewKeyLabel(e.target.value)}
                          placeholder="e.g., Trading Bot, Portfolio Tracker"
                        />
                      </div>
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          API keys provide read-only access to your account data. Never share your API keys with untrusted parties.
                        </AlertDescription>
                      </Alert>
                      <Button onClick={handleCreateKey} className="w-full" disabled={!newKeyLabel.trim()}>
                        Create API Key
                      </Button>
                    </>
                  ) : (
                    <>
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Important:</strong> This is the only time you'll see the full API key. Copy it now and store it securely.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-2">
                        <Label>Your New API Key</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={showKey ? createdKey.key : '•'.repeat(40)}
                            readOnly
                            className="font-mono"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowKey(!showKey)}
                          >
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(createdKey.key)}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium mb-2">API Key Permissions (Read-Only)</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• View account balances</li>
                          <li>• Access trading history</li>
                          <li>• Read order status</li>
                          <li>• View deposit/withdrawal history</li>
                        </ul>
                      </div>

                      <Button onClick={handleCloseDialog} className="w-full">
                        I've Copied My API Key
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No API keys created yet</p>
              <p className="text-sm text-muted-foreground">Create an API key to access your account data programmatically</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Key Preview</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.label}</TableCell>
                    <TableCell className="font-mono text-sm">{apiKey.key_preview}</TableCell>
                    <TableCell>{new Date(apiKey.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {apiKey.last_used 
                        ? new Date(apiKey.last_used).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={apiKey.revoked ? "destructive" : "default"}>
                        {apiKey.revoked ? 'Revoked' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!apiKey.revoked && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeApiKey(apiKey.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Getting Started</h4>
            <p className="text-sm text-muted-foreground">
              Use your API key to authenticate requests to our API endpoints. Include it in the Authorization header:
            </p>
            <code className="block bg-muted p-2 rounded text-sm">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Base URL</h4>
            <code className="block bg-muted p-2 rounded text-sm">
              https://api.yourapp.com/v1/
            </code>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Available Endpoints</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <code>GET /account/balance</code> - Get account balances</li>
              <li>• <code>GET /orders</code> - List orders</li>
              <li>• <code>GET /trades</code> - Get trade history</li>
              <li>• <code>GET /deposits</code> - Get deposit history</li>
              <li>• <code>GET /withdrawals</code> - Get withdrawal history</li>
            </ul>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> API keys are currently read-only for security. 
              Trading and withdrawal capabilities via API will be available in a future update.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};