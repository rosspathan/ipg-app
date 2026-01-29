import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  Database,
  CheckCircle2,
  Loader2,
  Fuel,
  Coins
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

export default function StakingHotWalletAdmin() {
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

  // Fetch current staking wallet status
  const { data: stakingConfig, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['staking-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crypto_staking_config')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch BNB balance if wallet exists
  const { data: walletBalance } = useQuery({
    queryKey: ['staking-wallet-balance', stakingConfig?.admin_hot_wallet_address],
    queryFn: async () => {
      if (!stakingConfig?.admin_hot_wallet_address) return null;
      
      try {
        const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
        const balance = await provider.getBalance(stakingConfig.admin_hot_wallet_address);
        return {
          bnb: ethers.formatEther(balance),
          isLowGas: parseFloat(ethers.formatEther(balance)) < 0.05
        };
      } catch (error) {
        console.error('Error fetching balance:', error);
        return { bnb: '0', isLowGas: true };
      }
    },
    enabled: !!stakingConfig?.admin_hot_wallet_address
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
      // Update or insert staking config with the new wallet address
      const { error } = await supabase
        .from('crypto_staking_config')
        .upsert({
          id: stakingConfig?.id || undefined,
          admin_hot_wallet_address: credentials.address,
          staking_fee_percent: stakingConfig?.staking_fee_percent || 0.5,
          unstaking_fee_percent: stakingConfig?.unstaking_fee_percent || 0.5,
          is_active: stakingConfig?.is_active ?? true
        }, { onConflict: 'id' });

      if (error) throw error;

      setSavedToDb(true);
      refetchConfig();
      toast({
        title: "Wallet Saved",
        description: "Staking hot wallet address saved to database successfully.",
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
STAKING HOT WALLET CREDENTIALS
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
2. Add STAKING_WALLET_PRIVATE_KEY secret in Supabase with the private key above
3. Fund the wallet with BNB for gas fees (~0.1-0.5 BNB recommended)
4. Users can now deposit IPG to this address for staking
5. Delete this file after securing the credentials elsewhere

================================
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staking-wallet-${credentials.address.slice(0, 8)}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Credentials saved to file. Store securely!",
    });
  };

  if (configLoading) {
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
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-6 w-6 text-primary" />
              Staking Hot Wallet
            </h1>
            <p className="text-muted-foreground">
              Dedicated wallet for IPG staking deposits
            </p>
          </div>
        </div>

        {/* Current Staking Wallet Status */}
        {stakingConfig?.admin_hot_wallet_address && (
          <Card className={walletBalance?.isLowGas ? "border-destructive" : "border-green-500/50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Active Staking Wallet
                {walletBalance?.isLowGas && (
                  <Badge variant="destructive" className="ml-2">Low Gas</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Current staking hot wallet status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address */}
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <div className="flex gap-2">
                  <Input 
                    value={stakingConfig.admin_hot_wallet_address} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(stakingConfig.admin_hot_wallet_address, 'Address')}
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
                    Send BNB to <code className="bg-muted px-1 rounded">{stakingConfig.admin_hot_wallet_address}</code> for withdrawal gas fees.
                  </AlertDescription>
                </Alert>
              )}

              <a
                href={`https://bscscan.com/address/${stakingConfig.admin_hot_wallet_address}`}
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
            This wallet will hold all staking deposits. The credentials will only be shown once.
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
                    Use for STAKING_WALLET_PRIVATE_KEY secret
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
                  Save Wallet to Staking Config
                </Label>
                {savedToDb ? (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-green-500 font-medium">Wallet saved to database!</span>
                  </div>
                ) : (
                  <Button
                    onClick={saveWalletToDatabase}
                    disabled={isSavingToDb}
                    className="w-full"
                  >
                    {isSavingToDb ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        Save to Database
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        {credentials && savedToDb && (
          <Card className="border-green-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                Setup Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <p className="font-medium">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to Supabase Edge Function secrets</li>
                  <li>Add <code className="bg-muted px-1 rounded">STAKING_WALLET_PRIVATE_KEY</code> with the private key</li>
                  <li>Fund the wallet with ~0.1-0.5 BNB for gas fees</li>
                  <li>Users can now deposit IPG to start staking</li>
                </ol>
              </div>
              <a
                href="https://supabase.com/dashboard/project/ocblgldglqhlrmtnynmu/settings/functions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Go to Supabase Edge Function Secrets →
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
