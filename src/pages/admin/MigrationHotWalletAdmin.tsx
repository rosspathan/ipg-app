import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Loader2,
  Fuel,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface WalletCredentials {
  mnemonic: string;
  privateKey: string;
  address: string;
}

export default function MigrationHotWalletAdmin() {
  const [credentials, setCredentials] = useState<WalletCredentials | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);
  const [importMnemonic, setImportMnemonic] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [mode, setMode] = useState<'view' | 'generate' | 'import'>('view');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch current migration wallet status
  const { data: migrationWallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['migration-hot-wallet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_hot_wallet')
        .select('*')
        .eq('label', 'Migration Hot Wallet')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch BNB balance if wallet exists
  const { data: walletBalance } = useQuery({
    queryKey: ['migration-wallet-balance', migrationWallet?.address],
    queryFn: async () => {
      if (!migrationWallet?.address) return null;
      
      try {
        const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
        const balance = await provider.getBalance(migrationWallet.address);
        return {
          bnb: ethers.formatEther(balance),
          isLowGas: parseFloat(ethers.formatEther(balance)) < 0.05
        };
      } catch (error) {
        console.error('Error fetching balance:', error);
        return { bnb: '0', isLowGas: true };
      }
    },
    enabled: !!migrationWallet?.address
  });

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

  const importFromMnemonic = async () => {
    setIsImporting(true);
    try {
      const cleanMnemonic = importMnemonic.trim().toLowerCase();
      
      if (!bip39.validateMnemonic(cleanMnemonic)) {
        throw new Error('Invalid mnemonic phrase. Please check and try again.');
      }
      
      const wallet = ethers.Wallet.fromPhrase(cleanMnemonic);
      
      setCredentials({
        mnemonic: cleanMnemonic,
        privateKey: wallet.privateKey,
        address: wallet.address,
      });
      
      setMode('view');
      toast({
        title: "Wallet Imported",
        description: "Your wallet has been imported successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Invalid mnemonic phrase.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const saveWalletToDatabase = async () => {
    if (!credentials) return;
    
    setIsSavingToDb(true);
    try {
      // Deactivate any existing migration wallets first
      await supabase
        .from('platform_hot_wallet')
        .update({ is_active: false })
        .eq('label', 'Migration Hot Wallet');

      // Insert new migration wallet
      const { error } = await supabase
        .from('platform_hot_wallet')
        .insert({
          address: credentials.address,
          chain: 'BSC',
          label: 'Migration Hot Wallet',
          is_active: true
        });

      if (error) throw error;

      setSavedToDb(true);
      refetchWallet();
      toast({
        title: "Wallet Saved",
        description: "Migration hot wallet address saved to database successfully.",
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
MIGRATION HOT WALLET CREDENTIALS
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
2. Add MIGRATION_WALLET_PRIVATE_KEY secret in Cloud Secrets with the private key above
3. Fund the wallet with BNB for gas fees (~0.5-1 BNB recommended)
4. This wallet will be used for BSK on-chain migration transfers
5. Delete this file after securing the credentials elsewhere

================================
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-wallet-${credentials.address.slice(0, 8)}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Credentials saved to file. Store securely!",
    });
  };

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              Migration Hot Wallet
            </h1>
            <p className="text-muted-foreground">
              Dedicated wallet for BSK on-chain migration transfers
            </p>
          </div>
        </div>

        {/* Current Migration Wallet Status */}
        {migrationWallet?.address && (
          <Card className={walletBalance?.isLowGas ? "border-destructive" : "border-green-500/50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Active Migration Wallet
                {walletBalance?.isLowGas && (
                  <Badge variant="destructive" className="ml-2">Low Gas</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Current migration hot wallet status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address */}
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <div className="flex gap-2">
                  <Input 
                    value={migrationWallet.address} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(migrationWallet.address, 'Address')}
                  >
                    {copiedField === 'Address' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Gas Balance */}
              {walletBalance && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Fuel className="h-4 w-4" />
                      BNB for Gas
                    </div>
                    <div className="text-2xl font-bold">
                      {parseFloat(walletBalance.bnb).toFixed(4)} BNB
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Status</div>
                    <div className={`text-2xl font-bold ${walletBalance.isLowGas ? 'text-destructive' : 'text-green-500'}`}>
                      {walletBalance.isLowGas ? 'Low Gas' : 'Healthy'}
                    </div>
                  </div>
                </div>
              )}

              {walletBalance?.isLowGas && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Low Gas Warning</AlertTitle>
                  <AlertDescription>
                    Send BNB to <code className="bg-muted px-1 rounded">{migrationWallet.address}</code> for migration gas fees.
                  </AlertDescription>
                </Alert>
              )}

              <a
                href={`https://bscscan.com/address/${migrationWallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View on BscScan →
              </a>
            </CardContent>
          </Card>
        )}

        {/* Warning */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Security Operation</AlertTitle>
          <AlertDescription>
            This wallet will be used for BSK on-chain migration transfers. The credentials will only be shown once.
            Save them securely before leaving this page.
          </AlertDescription>
        </Alert>

        {/* Mode Selection */}
        {!credentials && (
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={mode === 'generate' ? 'default' : 'outline'}
              className="h-20"
              onClick={() => setMode('generate')}
            >
              <div className="text-center">
                <Key className="h-6 w-6 mx-auto mb-1" />
                <span className="block text-sm">Generate New</span>
              </div>
            </Button>
            <Button
              variant={mode === 'import' ? 'default' : 'outline'}
              className="h-20"
              onClick={() => setMode('import')}
            >
              <div className="text-center">
                <Download className="h-6 w-6 mx-auto mb-1" />
                <span className="block text-sm">Import Existing</span>
              </div>
            </Button>
          </div>
        )}

        {/* Generate New Wallet */}
        {mode === 'generate' && !credentials && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
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
        )}

        {/* Import Existing Wallet */}
        {mode === 'import' && !credentials && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Import from Mnemonic
              </CardTitle>
              <CardDescription>
                Enter your existing 24-word recovery phrase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Recovery Phrase (24 words)</Label>
                <Textarea
                  value={importMnemonic}
                  onChange={(e) => setImportMnemonic(e.target.value)}
                  placeholder="Enter your 24 words separated by spaces..."
                  className="font-mono text-sm h-32"
                />
              </div>
              
              <Button 
                onClick={importFromMnemonic} 
                disabled={isImporting || !importMnemonic.trim()}
                className="w-full"
                size="lg"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Import Wallet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Credentials Display */}
        {credentials && (
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
              {/* Wallet Address */}
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <div className="flex gap-2">
                  <Input 
                    value={credentials.address} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(credentials.address, 'New Address')}
                  >
                    {copiedField === 'New Address' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Recovery Phrase */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Recovery Phrase (24 words)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMnemonic(!showMnemonic)}
                  >
                    {showMnemonic ? (
                      <><EyeOff className="h-4 w-4 mr-1" /> Hide</>
                    ) : (
                      <><Eye className="h-4 w-4 mr-1" /> Show</>
                    )}
                  </Button>
                </div>
                <div className="relative">
                  <Textarea
                    value={credentials.mnemonic}
                    readOnly
                    className={`font-mono text-sm h-24 ${!showMnemonic ? 'blur-sm select-none' : ''}`}
                  />
                  {!showMnemonic && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-md">
                      <span className="text-muted-foreground text-sm">Click Show to reveal</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.mnemonic, 'Mnemonic')}
                  disabled={!showMnemonic}
                >
                  {copiedField === 'Mnemonic' ? (
                    <><Check className="h-4 w-4 mr-1 text-green-500" /> Copied</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1" /> Copy Mnemonic</>
                  )}
                </Button>
              </div>

              {/* Private Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Private Key</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                  >
                    {showPrivateKey ? (
                      <><EyeOff className="h-4 w-4 mr-1" /> Hide</>
                    ) : (
                      <><Eye className="h-4 w-4 mr-1" /> Show</>
                    )}
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    value={credentials.privateKey}
                    readOnly
                    className={`font-mono text-sm ${!showPrivateKey ? 'blur-sm select-none' : ''}`}
                  />
                  {!showPrivateKey && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-md">
                      <span className="text-muted-foreground text-sm">Click Show to reveal</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.privateKey, 'Private Key')}
                  disabled={!showPrivateKey}
                >
                  {copiedField === 'Private Key' ? (
                    <><Check className="h-4 w-4 mr-1 text-green-500" /> Copied</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1" /> Copy Private Key</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Save this as <code className="bg-muted px-1 rounded">MIGRATION_WALLET_PRIVATE_KEY</code> in Cloud Secrets
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4 border-t">
                <Button onClick={downloadCredentials} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Credentials
                </Button>
                
                <Button 
                  onClick={saveWalletToDatabase} 
                  disabled={isSavingToDb || savedToDb}
                  className="w-full"
                >
                  {isSavingToDb ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : savedToDb ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Saved to Database
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Save Address to Database
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Generate or import a wallet using the options above</li>
              <li>Download and securely store the credentials file</li>
              <li>Click "Save Address to Database" to register the wallet</li>
              <li>Go to Cloud Secrets and add <code className="bg-muted px-1 rounded">MIGRATION_WALLET_PRIVATE_KEY</code></li>
              <li>Fund the wallet with BNB for gas fees (~0.5-1 BNB recommended)</li>
              <li>The wallet is now ready for BSK on-chain migration transfers</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
