import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const RealUserCreation = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    kyc_status: 'pending',
    role: 'user',
    account_status: 'active',
    two_fa_enabled: false,
    withdrawal_locked: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const createRealUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');

    try {
      // Validate required fields
      if (!formData.email || !formData.password || !formData.full_name) {
        throw new Error('Email, password, and full name are required');
      }

      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.full_name,
            phone: formData.phone
          }
        }
      });

      if (authError) {
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('No user data returned from authentication');
      }

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          kyc_status: formData.kyc_status,
          account_status: formData.account_status,
          two_fa_enabled: formData.two_fa_enabled,
          withdrawal_locked: formData.withdrawal_locked,
          referral_code: authData.user.id.substring(0, 8).toUpperCase()
        });

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // Create user role
      const { error: roleError } = await (supabase as any)
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: formData.role as 'user' | 'admin'
        });

      if (roleError) {
        throw new Error(`Role assignment failed: ${roleError.message}`);
      }

      // Log admin action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id || '',
          action: 'user_created',
          resource_type: 'user',
          resource_id: authData.user.id,
          new_values: formData
        });

      setResult(`✅ Successfully created user: ${formData.email}`);
      
      toast({
        title: "User Created Successfully",
        description: `User ${formData.email} has been created with all profile data`,
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        kyc_status: 'pending',
        role: 'user',
        account_status: 'active',
        two_fa_enabled: false,
        withdrawal_locked: false,
      });

    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
      toast({
        title: "User Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Alert>
          <AlertDescription>
            You need to be logged in as an admin to create users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              ← Back
            </Button>
            <h1 className="text-xl font-bold">Create Real User</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Admin Panel
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create New User Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRealUser} className="space-y-6">
              
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              {/* Account Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Account Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>User Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => handleInputChange('role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>KYC Status</Label>
                    <Select
                      value={formData.kyc_status}
                      onValueChange={(value) => handleInputChange('kyc_status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="unverified">Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Account Status</Label>
                  <Select
                    value={formData.account_status}
                    onValueChange={(value) => handleInputChange('account_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Security Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Security Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>2FA Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable two-factor authentication for this user
                    </p>
                  </div>
                  <Switch
                    checked={formData.two_fa_enabled}
                    onCheckedChange={(checked) => handleInputChange('two_fa_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Withdrawal Locked</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent this user from making withdrawals
                    </p>
                  </div>
                  <Switch
                    checked={formData.withdrawal_locked}
                    onCheckedChange={(checked) => handleInputChange('withdrawal_locked', checked)}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating User...' : 'Create User Account'}
              </Button>

              {result && (
                <Alert className={result.includes('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={result.includes('✅') ? 'text-green-800' : 'text-red-800'}>
                    {result}
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RealUserCreation;