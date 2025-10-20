import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Key, FileText } from 'lucide-react';

const RecoverWalletScreen: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [activeTab, setActiveTab] = useState<'mnemonic' | 'privatekey'>('mnemonic');
  const [loading, setLoading] = useState(false);

  const handleRecover = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    const recoveryInput = activeTab === 'mnemonic' ? mnemonic.trim() : privateKey.trim();

    if (!recoveryInput) {
      toast({
        title: "Recovery Input Required",
        description: `Please enter your ${activeTab === 'mnemonic' ? 'recovery phrase' : 'private key'}`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Call wallet-login edge function
      const { data, error } = await supabase.functions.invoke('wallet-login', {
        body: {
          email,
          mnemonic: activeTab === 'mnemonic' ? recoveryInput : undefined,
          privateKey: activeTab === 'privatekey' ? recoveryInput : undefined
        }
      });

      if (error) throw error;

      if (data?.token) {
        // Verify the OTP token
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: data.token,
          type: 'email'
        });

        if (verifyError) throw verifyError;

        toast({
          title: "Wallet Recovered!",
          description: "Successfully recovered your account",
        });

        // Check if user has security setup
        const hasLocalSecurity = localStorage.getItem('user_pin') || localStorage.getItem('biometric_enabled');
        
        if (hasLocalSecurity) {
          navigate('/auth/lock');
        } else {
          navigate('/app/home');
        }
      }
    } catch (error: any) {
      console.error('Recovery error:', error);
      toast({
        title: "Recovery Failed",
        description: error.message || "Could not recover wallet. Please check your details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex flex-col">
      <div className="flex-1 flex flex-col px-6 py-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white ml-4">Recover Wallet</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 space-y-6 max-w-md mx-auto w-full"
        >
          {/* Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-white/80 text-sm">
              Recover your account using your email and either your 12-word recovery phrase or private key.
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
            />
          </div>

          {/* Recovery Method Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger value="mnemonic" className="data-[state=active]:bg-white data-[state=active]:text-primary">
                <FileText className="w-4 h-4 mr-2" />
                Recovery Phrase
              </TabsTrigger>
              <TabsTrigger value="privatekey" className="data-[state=active]:bg-white data-[state=active]:text-primary">
                <Key className="w-4 h-4 mr-2" />
                Private Key
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mnemonic" className="mt-4 space-y-2">
              <Label htmlFor="mnemonic" className="text-white">12-Word Recovery Phrase</Label>
              <Textarea
                id="mnemonic"
                placeholder="Enter your 12-word recovery phrase separated by spaces"
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                rows={4}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 resize-none"
              />
              <p className="text-white/60 text-xs">
                Example: word1 word2 word3 ... word12
              </p>
            </TabsContent>

            <TabsContent value="privatekey" className="mt-4 space-y-2">
              <Label htmlFor="privateKey" className="text-white">Private Key</Label>
              <Textarea
                id="privateKey"
                placeholder="Enter your private key (0x...)"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                rows={4}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 resize-none font-mono text-sm"
              />
              <p className="text-white/60 text-xs">
                Your private key starts with 0x followed by 64 characters
              </p>
            </TabsContent>
          </Tabs>

          {/* Warning */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
            <p className="text-orange-200 text-sm">
              <strong>⚠️ Security Warning:</strong> Never share your recovery phrase or private key with anyone. We will never ask for this information.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleRecover}
            disabled={loading}
            className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Recovering Wallet...
              </>
            ) : (
              'Recover Wallet'
            )}
          </Button>

          {/* Back to Login */}
          <div className="text-center">
            <p className="text-white/70 text-sm">
              Remember your password?{' '}
              <button
                onClick={() => navigate('/auth/login')}
                className="text-white font-semibold underline hover:no-underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RecoverWalletScreen;
