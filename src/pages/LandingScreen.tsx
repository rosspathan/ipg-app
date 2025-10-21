import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Zap, Users, TrendingUp } from 'lucide-react';
import BrandSplash from '@/components/brand/BrandSplash';

const LandingScreen: React.FC = () => {
  const navigate = useNavigate();
  
  // Developer bypass: Check URL for nosplash parameter or dev mode
  const [showSplash, setShowSplash] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('nosplash') === '1') return false;
    
    // In development, skip splash unless ?splash=1
    if (import.meta.env.DEV && params.get('splash') !== '1') return false;
    
    return true;
  });

  // Ultimate failsafe: Force landing page after 3 seconds NO MATTER WHAT
  React.useEffect(() => {
    if (!showSplash) return;
    
    const emergencyTimer = setTimeout(() => {
      console.warn('[LandingScreen] Emergency failsafe triggered - forcing landing page');
      setShowSplash(false);
    }, 3000);
    
    return () => clearTimeout(emergencyTimer);
  }, [showSplash]);

  if (showSplash) {
    return (
      <BrandSplash 
        onComplete={() => {
          console.log('[LandingScreen] Splash completed, showing content');
          setShowSplash(false);
        }} 
        duration={1800}
        canSkip={true} 
      />
    );
  }

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Bank-Grade Security',
      description: 'Military encryption & biometric protection'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Real-Time Trading',
      description: 'Lightning-fast crypto exchange'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Earn Rewards',
      description: '50-level referral system & BSK tokens'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Instant Transfers',
      description: 'Send & receive in seconds'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Logo & Title */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/30"
            >
              <span className="text-4xl">💎</span>
            </motion.div>
            
            <h1 className="text-4xl font-bold text-white">
              IPG I-Smart Exchange
            </h1>
            <p className="text-white/80 text-lg">
              World's most trusted crypto trading platform
            </p>
          </div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 gap-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
              >
                <div className="text-white/90 mb-2">{feature.icon}</div>
                <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-white/70 text-xs">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="space-y-4"
          >
            <Button
              onClick={() => navigate('/auth/signup')}
              className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl text-lg"
              size="lg"
            >
              Create Account
            </Button>

            <Button
              onClick={() => navigate('/auth/login')}
              variant="outline"
              className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20 font-semibold py-6 rounded-2xl text-lg backdrop-blur-sm"
              size="lg"
            >
              Sign In
            </Button>

            <button
              onClick={() => navigate('/auth/recover')}
              className="w-full text-white/70 hover:text-white text-sm py-2 transition-colors"
            >
              Recover existing wallet
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 px-6">
        <p className="text-white/60 text-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default LandingScreen;
