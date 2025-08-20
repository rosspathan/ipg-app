import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FileClaimScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    policy: "",
    reason: "",
    amount: "",
    description: "",
    transactionId: "",
    attachments: [] as File[]
  });

  const claimReasons = [
    "Unauthorized Transaction",
    "Platform Downtime",
    "Network Congestion",
    "Failed Transaction",
    "Malware Attack",
    "Phishing Attack",
    "Technical Error",
    "Other"
  ];

  const userPolicies = [
    { id: "POL001", name: "Wallet Protection", coverage: "$50,000" },
    { id: "POL002", name: "Trade Insurance", coverage: "$100,000" }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const handleSubmitClaim = () => {
    if (!formData.policy || !formData.reason || !formData.amount || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Claim Submitted Successfully!",
      description: "Your claim has been submitted and is under review",
    });

    setTimeout(() => {
      navigate("/insurance");
    }, 2000);
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
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
        <h1 className="text-xl font-semibold">File Insurance Claim</h1>
      </div>

      <Card className="bg-gradient-card shadow-card border-0 mb-6">
        <CardHeader>
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-base text-blue-600">Claim Guidelines</CardTitle>
              <p className="text-sm text-blue-600 mt-1">
                Please provide accurate information and supporting documents. 
                Claims are typically processed within 3-5 business days.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        {/* Policy Selection */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base">Policy Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Policy *</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, policy: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your policy" />
                </SelectTrigger>
                <SelectContent>
                  {userPolicies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.name} - {policy.coverage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Claim Details */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base">Claim Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Claim *</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {claimReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Claim Amount (USD) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Transaction ID (if applicable)</Label>
              <Input
                placeholder="Enter transaction hash or ID"
                value={formData.transactionId}
                onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Please provide detailed information about the incident..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Supporting Documents */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base">Supporting Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Upload Proof (Screenshots, receipts, etc.)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop files here, or click to browse
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button variant="outline" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Choose Files
                  </label>
                </Button>
              </div>
            </div>

            {formData.attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files:</Label>
                <div className="space-y-1">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Supported formats: JPG, PNG, PDF, DOC, DOCX. Max file size: 10MB each.
            </p>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSubmitClaim}
          size="lg"
          className="w-full"
          disabled={!formData.policy || !formData.reason || !formData.amount || !formData.description}
        >
          Submit Claim
        </Button>
      </div>
    </div>
  );
};

export default FileClaimScreen;