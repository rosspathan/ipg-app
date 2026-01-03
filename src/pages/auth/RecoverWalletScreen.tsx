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
import { ArrowLeft, Loader2, Key, FileText, AlertCircle } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';

const RecoverWalletScreen: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [activeTab, setActiveTab] = useState<'mnemonic' | 'privatekey'>('mnemonic');
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Normalize mnemonic: trim, lowercase, collapse whitespace
  const normalizeMnemonic = (input: string) => {
    return input.trim().toLowerCase().split(/\s+/).join(' ');
  };

  const getWordCount = (input: string) => {
    const normalized = normalizeMnemonic(input);
    return normalized ? normalized.split(' ').length : 0;
  };

  const wordCount = getWordCount(mnemonic);
  const isValidWordCount = wordCount === 12 || wordCount === 24;

  const handleRecover = async () => {
    setErrorCode(null);
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    const recoveryInput = activeTab === 'mnemonic' 
      ? normalizeMnemonic(mnemonic) 
      : privateKey.trim();

    if (!recoveryInput) {
      toast({
        title: "Recovery Input Required",
        description: `Please enter your ${activeTab === 'mnemonic' ? 'recovery phrase' : 'private key'}`,
        variant: "destructive"
      });
      return;
    }

    // Validate word count for mnemonic
    if (activeTab === 'mnemonic') {
      if (!isValidWordCount) {
        toast({
          title: "Invalid Recovery Phrase",
          description: `Your phrase has ${wordCount} words. Please enter a 12 or 24 word recovery phrase.`,
          variant: "destructive"
        });
        return;
      }
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

      // Handle edge function errors - parse the response for the actual error message
      if (error) {
        let errorMessage = "Could not recover wallet. Please check your details.";
        let errorCodeFromResponse: string | null = null;
        
        try {
          // For FunctionsHttpError, get the response body text
          if (error instanceof FunctionsHttpError && error.context) {
            const errorBody = await error.context.text();
            try {
              const errorJson = JSON.parse(errorBody);
              if (errorJson?.error) {
                errorMessage = errorJson.error;
              }
              if (errorJson?.code) {
                errorCodeFromResponse = errorJson.code;
              }
            } catch {
              // Body wasn't JSON, use it as text if not empty
              if (errorBody && !errorBody.includes('non-2xx')) {
                errorMessage = errorBody;
              }
            }
          } else if (error.message && !error.message.includes('non-2xx')) {
            errorMessage = error.message;
          }
        } catch {
          // Fallback to original error message
          if (error.message && !error.message.includes('non-2xx')) {
            errorMessage = error.message;
          }
        }
        
        setErrorCode(errorCodeFromResponse);
        throw new Error(errorMessage);
      }
      
      // Check for API error in response data
      if (data?.error) {
        if (data?.code) {
          setErrorCode(data.code);
        }
        throw new Error(data.error);
      }

      if (data?.token) {
        // Verify the magic link token
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: data.token,
          type: 'magiclink'
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
      } else if (data?.success) {
        toast({
          title: "Verification Required",
          description: "Please check your email to complete login",
        });
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

  // Render error-specific guidance
  const renderErrorGuidance = () => {
    if (!errorCode) return null;

    switch (errorCode) {
      case 'NO_WALLET_LINKED':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/20 border border-amber-500/40 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-200 font-medium">No Wallet Linked</p>
                <p className="text-amber-200/80 text-sm mt-1">
                  Your account doesn't have a wallet linked yet. Please sign in with your password first, then import your wallet from Settings.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate('/auth/login')}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              >
                Sign In with Password
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/auth/reset-password')}
                className="w-full border-amber-500/50 text-amber-200 hover:bg-amber-500/20"
              >
                Reset Password
              </Button>
            </div>
          </motion.div>
        );

      case 'EMAIL_NOT_FOUND':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-500/20 border border-blue-500/40 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-200 font-medium">Account Not Found</p>
                <p className="text-blue-200/80 text-sm mt-1">
                  No account exists with this email. Please create a new account or try a different email.
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/auth/register')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Create Account
            </Button>
          </motion.div>
        );

      case 'WALLET_MISMATCH':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-200 font-medium">Wallet Mismatch</p>
                <p className="text-red-200/80 text-sm mt-1">
                  The recovery phrase doesn't match the wallet linked to this account. Please check:
                </p>
                <ul className="text-red-200/80 text-sm mt-2 list-disc list-inside space-y-1">
                  <li>Word order is correct</li>
                  <li>All words are spelled correctly</li>
                  <li>You're using the right phrase for this account</li>
                </ul>
              </div>
            </div>
          </motion.div>
        );

      case 'INVALID_MNEMONIC':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-200 font-medium">Invalid Recovery Phrase</p>
                <p className="text-red-200/80 text-sm mt-1">
                  The recovery phrase is not valid. Please check that all words are spelled correctly and are from the BIP39 word list.
                </p>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
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

          {/* Error Guidance */}
          {renderErrorGuidance()}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorCode(null);
              }}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
            />
          </div>

          {/* Recovery Method Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v as any);
            setErrorCode(null);
          }} className="w-full">
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
              <div className="flex justify-between items-center">
                <Label htmlFor="mnemonic" className="text-white">12-Word Recovery Phrase</Label>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  wordCount === 0 
                    ? 'text-white/50' 
                    : isValidWordCount 
                      ? 'text-green-400 bg-green-500/20' 
                      : 'text-amber-400 bg-amber-500/20'
                }`}>
                  {wordCount > 0 ? `${wordCount} / 12 words` : '0 words'}
                </span>
              </div>
              <Textarea
                id="mnemonic"
                placeholder="Enter your 12-word recovery phrase separated by spaces"
                value={mnemonic}
                onChange={(e) => {
                  setMnemonic(e.target.value);
                  setErrorCode(null);
                }}
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
                onChange={(e) => {
                  setPrivateKey(e.target.value);
                  setErrorCode(null);
                }}
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
