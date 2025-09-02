import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Trash2, FileText, Shield, ExternalLink, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const PrivacyTab = () => {
  const { toast } = useToast();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);

  const handleDownloadData = async () => {
    try {
      setDownloadingData(true);
      
      // In a real app, this would make an API call to generate the data export
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      const mockData = {
        account: {
          email: "user@example.com",
          created_at: new Date().toISOString(),
          verified: true
        },
        profile: {
          display_name: "John Doe",
          country: "US"
        },
        transactions: [],
        api_usage: []
      };

      const dataStr = JSON.stringify(mockData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'my-account-data.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Your data has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download data",
        variant: "destructive",
      });
    } finally {
      setDownloadingData(false);
    }
  };

  const handleDeleteRequest = () => {
    toast({
      title: "Delete Request Submitted",
      description: "We've received your account deletion request. Our support team will contact you within 24 hours.",
    });
    setDeleteDialog(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download My Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a copy of all your personal data stored in our systems, including account information, 
            transaction history, and usage data.
          </p>
          
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Your data export will include:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Account and profile information</li>
                <li>Transaction and trading history</li>
                <li>API usage logs</li>
                <li>Login and security events</li>
                <li>Support communications</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button onClick={handleDownloadData} disabled={downloadingData}>
            <Download className="h-4 w-4 mr-2" />
            {downloadingData ? 'Preparing Download...' : 'Download My Data'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete My Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Request permanent deletion of your account and all associated data. This action cannot be undone.
          </p>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Account deletion is permanent and irreversible. You will lose:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>All account balances and holdings</li>
                <li>Complete trading and transaction history</li>
                <li>Access to all associated services</li>
                <li>Any pending transactions or orders</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Request Account Deletion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Account Confirmation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>This action cannot be undone.</strong> All your data, including account balances, 
                    will be permanently deleted.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium">Before proceeding:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Withdraw all your funds</li>
                    <li>• Cancel any pending orders</li>
                    <li>• Download your data if needed</li>
                    <li>• Contact support if you have questions</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteRequest}>
                    I Understand, Delete My Account
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Legal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium flex items-center gap-2">
                  Terms of Service
                  <ExternalLink className="h-4 w-4" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Read our terms and conditions
                </p>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium flex items-center gap-2">
                  Privacy Policy
                  <ExternalLink className="h-4 w-4" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  How we handle your data
                </p>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium flex items-center gap-2">
                  Cookie Policy
                  <ExternalLink className="h-4 w-4" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Our use of cookies and tracking
                </p>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium flex items-center gap-2">
                  Data Protection
                  <ExternalLink className="h-4 w-4" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  GDPR and data rights information
                </p>
              </div>
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Need help?</strong> Contact our support team at{' '}
              <a href="mailto:support@yourapp.com" className="text-primary hover:underline">
                support@yourapp.com
              </a>{' '}
              for any privacy-related questions or concerns.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};