import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Key, 
  Copy, 
  Check, 
  AlertTriangle, 
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Wallet,
  ArrowLeft,
  Database,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';

interface WalletCredentials {
  mnemonic: string;
  privateKey: string;
  address: string;
}

export default function GenerateHotWallet() {
  const [credentials, setCredentials] = useState<WalletCredentials | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const saveWalletToDatabase = async () => {
    if (!credentials) return;
    
    setIsSavingToDb(true);
    try {
      // First, deactivate any existing active hot wallets for BSC
      await supabase
        .from('platform_hot_wallet')
        .update({ is_active: false })
        .eq('chain', 'BSC')
        .eq('is_active', true);

      // Insert new hot wallet
      const { error } = await supabase
        .from('platform_hot_wallet')
        .insert({
          address: credentials.address,
          chain: 'BSC',
          label: 'Trading Hot Wallet',
          is_active: true
        });

      if (error) throw error;

      setSavedToDb(true);
      toast({
        title: "Wallet Saved",
        description: "Hot wallet address saved to database successfully.",
      });
    } catch (error: any) {
      console.error('Error saving wallet to database:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save wallet to database.",
        variant: "destructive",
      });
    } finally {
      setIsSavingToDb(false);
    }
  };

  const generateWallet = async () => {
    setIsGenerating(true);
    try {
      // Generate a 24-word mnemonic for extra security
      const mnemonic = bip39.generateMnemonic(256);
      
      // Create wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      
      setCredentials({
        mnemonic,
        privateKey: wallet.privateKey,
        address: wallet.address,
      });
      
      toast({
        title: "Wallet Generated",
        description: "Save your credentials securely before proceeding.",
      });
    } catch (error) {
      console.error('Error generating wallet:', error);
      toast({
        title: "Error",
        description: "Failed to generate wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied",
        description: `${field} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const downloadCredentials = () => {
    if (!credentials) return;
    
    const content = `
PLATFORM HOT WALLET CREDENTIALS
================================
Generated: ${new Date().toISOString()}

⚠️ KEEP THIS FILE SECURE - NEVER SHARE

WALLET ADDRESS:
${credentials.address}

RECOVERY PHRASE (24 words):
${credentials.mnemonic}

PRIVATE KEY:
${credentials.privateKey}

NEXT STEPS:
1. Store this file in a secure, encrypted location
2. Update ADMIN_WALLET_PRIVATE_KEY secret in Supabase with the private key above
3. Fund the wallet with BNB for gas fees (~0.5-1 BNB recommended)
4. Transfer any tokens you want to hold in the hot wallet
5. Delete this file after securing the credentials elsewhere

================================
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hot-wallet-${credentials.address.slice(0, 8)}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Credentials saved to file. Store securely!",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/admin/nova')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Generate Platform Hot Wallet</h1>
            <p className="text-muted-foreground">
              Create a new wallet for custodial exchange operations
            </p>
          </div>
        </div>

        {/* Warning */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Security Operation</AlertTitle>
          <AlertDescription>
            This wallet will hold all user funds. The credentials will only be shown once.
            Save them securely before leaving this page.
          </AlertDescription>
        </Alert>

        {/* Generation Card */}
        {!credentials ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Generate New Wallet
              </CardTitle>
              <CardDescription>
                Generate a new BIP39 wallet with a 24-word recovery phrase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">What will be generated:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 24-word BIP39 recovery phrase</li>
                  <li>• Private key for signing transactions</li>
                  <li>• Ethereum/BSC compatible address</li>
                </ul>
              </div>
              
              <Button 
                onClick={generateWallet} 
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Generate Wallet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Credentials Display */}
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Wallet Credentials
                </CardTitle>
                <CardDescription>
                  Save these credentials securely. They will not be shown again.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Address */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Badge variant="secondary">Public</Badge>
                    Wallet Address
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      value={credentials.address} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(credentials.address, 'Address')}
                    >
                      {copiedField === 'Address' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Recovery Phrase */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Badge variant="destructive">Secret</Badge>
                    Recovery Phrase (24 words)
                  </Label>
                  <div className="relative">
                    <div 
                      className={`bg-muted rounded-lg p-4 font-mono text-sm break-words ${
                        !showMnemonic ? 'blur-md select-none' : ''
                      }`}
                    >
                      {credentials.mnemonic}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setShowMnemonic(!showMnemonic)}
                    >
                      {showMnemonic ? (
                        <><EyeOff className="h-4 w-4 mr-1" /> Hide</>
                      ) : (
                        <><Eye className="h-4 w-4 mr-1" /> Show</>
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => copyToClipboard(credentials.mnemonic, 'Recovery Phrase')}
                  >
                    {copiedField === 'Recovery Phrase' ? (
                      <><Check className="h-4 w-4 mr-2 text-green-500" /> Copied</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" /> Copy Recovery Phrase</>
                    )}
                  </Button>
                </div>

                <Separator />

                {/* Private Key */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Badge variant="destructive">Secret</Badge>
                    Private Key
                    <span className="text-xs text-muted-foreground ml-auto">
                      Use this for ADMIN_WALLET_PRIVATE_KEY secret
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      value={credentials.privateKey}
                      readOnly
                      type={showPrivateKey ? 'text' : 'password'}
                      className="font-mono text-sm pr-20"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-10 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => copyToClipboard(credentials.privateKey, 'Private Key')}
                    >
                      {copiedField === 'Private Key' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Download */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={downloadCredentials}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Credentials File
                </Button>

                <Separator />

                {/* Save to Database */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Save Wallet to Database
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    This will save the wallet address to the platform_hot_wallet table and mark it as active.
                  </p>
                  <Button
                    variant={savedToDb ? "secondary" : "default"}
                    className="w-full"
                    onClick={saveWalletToDatabase}
                    disabled={isSavingToDb || savedToDb}
                  >
                    {isSavingToDb ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                    ) : savedToDb ? (
                      <><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Saved to Database</>
                    ) : (
                      <><Database className="h-4 w-4 mr-2" /> Activate Hot Wallet</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li className="text-muted-foreground">
                    <span className="text-foreground font-medium">Save credentials securely</span>
                    <p className="ml-5 mt-1">Store in a password manager or encrypted file</p>
                  </li>
                  <li className="text-muted-foreground">
                    <span className="text-foreground font-medium">Update Supabase Secret</span>
                    <p className="ml-5 mt-1">
                      Go to Supabase Dashboard → Edge Functions → Secrets → Update <code className="bg-muted px-1 rounded">ADMIN_WALLET_PRIVATE_KEY</code> with the private key
                    </p>
                  </li>
                  <li className="text-muted-foreground">
                    <span className="text-foreground font-medium">Fund the wallet</span>
                    <p className="ml-5 mt-1">
                      Send 0.5-1 BNB for gas fees to: <code className="bg-muted px-1 rounded text-xs">{credentials.address}</code>
                    </p>
                  </li>
                  <li className="text-muted-foreground">
                    <span className="text-foreground font-medium">Run database migration</span>
                    <p className="ml-5 mt-1">Apply the custodial model database schema</p>
                  </li>
                </ol>

                <Separator />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirm"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="confirm" className="text-sm">
                    I have securely saved the wallet credentials
                  </label>
                </div>

                <Button
                  className="w-full"
                  disabled={!confirmed}
                  onClick={() => navigate('/admin/nova')}
                >
                  Continue to Admin Dashboard
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
