import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Shield, Loader2, ArrowLeft } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Welcome Admin",
        description: "Redirecting to admin dashboard..."
      });

      navigate('/admin');
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Warning Banner */}
      <div className="bg-destructive/20 border-b border-destructive/40 px-6 py-3">
        <div className="flex items-center justify-center gap-2 text-destructive text-sm font-medium">
          <Shield className="h-4 w-4" />
          <span>Admin Access Only - Unauthorized access is prohibited</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-white/60 hover:text-white hover:bg-white/10 absolute left-6"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            <Shield className="h-16 w-16 mx-auto text-primary" />
            <h1 className="text-3xl font-bold text-white">Admin Login</h1>
            <p className="text-white/60">
              Enter your admin credentials to access the control panel
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-white/40"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-white/40 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 mr-2" />
                  Admin Sign In
                </>
              )}
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-center text-white/40 text-xs">
            All admin actions are logged and monitored for security purposes
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
