import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TestUsers = () => {
  const [testUsers] = useState([
    {
      email: 'user1@test.com',
      password: 'testpass123',
      full_name: 'John Doe',
      phone: '+1234567890',
      referralCode: '' // Will be the referrer
    },
    {
      email: 'user2@test.com', 
      password: 'testpass456',
      full_name: 'Jane Smith',
      phone: '+1987654321',
      referralCode: '' // Will use user1's referral code
    }
  ]);
  
  const [referralCode, setReferralCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const createTestUser = async (testUser: typeof testUsers[0], useReferralCode?: string) => {
    try {
      const referralToUse = useReferralCode || testUser.referralCode;
      
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testUser.email,
        password: testUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: testUser.full_name,
            phone: testUser.phone,
            ...(referralToUse && { referral_code: referralToUse })
          }
        }
      });

      if (authError) {
        return `❌ Auth failed for ${testUser.email}: ${authError.message}`;
      }

      if (!authData.user) {
        return `❌ No user data returned for ${testUser.email}`;
      }

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: testUser.email,
          full_name: testUser.full_name,
          phone: testUser.phone,
          kyc_status: 'pending',
          account_status: 'active',
          two_fa_enabled: false,
          withdrawal_locked: false,
          referral_code: authData.user.id.substring(0, 8).toUpperCase()
        });

      if (profileError) {
        return `❌ Profile creation failed for ${testUser.email}: ${profileError.message}`;
      }

      // Create initial user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'user'
        });

      if (roleError) {
        return `❌ Role creation failed for ${testUser.email}: ${roleError.message}`;
      }

      // Fetch the created user's referral code
      const { data: profileData } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', authData.user.id)
        .single();
      
      const userReferralCode = profileData?.referral_code || 'N/A';
      
      return `✅ Successfully created user: ${testUser.email} | Referral Code: ${userReferralCode}`;
    } catch (error: any) {
      return `❌ Unexpected error for ${testUser.email}: ${error.message}`;
    }
  };
  
  const testReferralSignup = async () => {
    setLoading(true);
    setResults([]);
    
    const newResults: string[] = [];
    
    // Step 1: Create User A (referrer)
    newResults.push('🔄 Step 1: Creating User A (referrer)...');
    const resultA = await createTestUser(testUsers[0]);
    newResults.push(resultA);
    setResults([...newResults]);
    
    if (!resultA.includes('✅')) {
      setLoading(false);
      return;
    }
    
    // Extract User A's referral code
    const referralCodeMatch = resultA.match(/Referral Code: (\w+)/);
    const userAReferralCode = referralCodeMatch ? referralCodeMatch[1] : null;
    
    if (!userAReferralCode) {
      newResults.push('❌ Failed to get User A referral code');
      setResults([...newResults]);
      setLoading(false);
      return;
    }
    
    setReferralCode(userAReferralCode);
    newResults.push(`✓ User A Referral Code: ${userAReferralCode}`);
    setResults([...newResults]);
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Create User B using User A's referral code
    newResults.push('🔄 Step 2: Creating User B with User A\'s referral code...');
    setResults([...newResults]);
    
    const resultB = await createTestUser(testUsers[1], userAReferralCode);
    newResults.push(resultB);
    setResults([...newResults]);
    
    // Wait 3 seconds for edge functions to process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Check User A's BSK holding balance
    newResults.push('🔄 Step 3: Verifying User A received L1 reward (5 BSK holding)...');
    setResults([...newResults]);
    
    const { data: userAProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', testUsers[0].email)
      .single();
    
    if (!userAProfile) {
      newResults.push('❌ Could not find User A profile');
      setResults([...newResults]);
      setLoading(false);
      return;
    }
    
    const { data: bskBalance } = await supabase
      .from('user_bsk_balances')
      .select('holding_balance')
      .eq('user_id', userAProfile.user_id)
      .single();
    
    const holdingBalance = bskBalance?.holding_balance || 0;
    
    if (holdingBalance >= 5) {
      newResults.push(`✅ SUCCESS! User A received ${holdingBalance} BSK holding reward`);
    } else {
      newResults.push(`❌ FAILED! User A only has ${holdingBalance} BSK holding (expected 5+)`);
    }
    
    setResults(newResults);
    setLoading(false);
    
    toast({
      title: holdingBalance >= 5 ? "Test Passed! ✅" : "Test Failed ❌",
      description: holdingBalance >= 5 
        ? `User A received ${holdingBalance} BSK holding reward` 
        : `Expected 5 BSK, got ${holdingBalance} BSK`,
      variant: holdingBalance >= 5 ? "default" : "destructive"
    });
  };

  const createAllTestUsers = async () => {
    setLoading(true);
    setResults([]);
    
    const newResults: string[] = [];
    
    for (const testUser of testUsers) {
      const result = await createTestUser(testUser);
      newResults.push(result);
    }
    
    setResults(newResults);
    setLoading(false);
    
    toast({
      title: "Test Users Creation Complete",
      description: `Created ${newResults.filter(r => r.includes('✅')).length} users successfully`,
    });
  };

  const clearAllUsers = async () => {
    if (!confirm('This will delete all test users. Are you sure?')) return;
    
    setLoading(true);
    try {
      // This is a simplified cleanup - in production you'd want more careful deletion
      for (const testUser of testUsers) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', testUser.email)
          .single();
          
        if (profile?.user_id) {
          // Delete from user_roles first
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', profile.user_id);
            
          // Delete from profiles
          await supabase
            .from('profiles')
            .delete()
            .eq('user_id', profile.user_id);
        }
      }
      
      toast({
        title: "Cleanup Complete",
        description: "Test user data has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Cleanup Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  if (!user || !isAdmin) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            You need to be logged in as an admin to create test users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test User Creation Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-medium">Test Users to Create:</h3>
            {testUsers.map((user, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Email:</strong> {user.email}</div>
                  <div><strong>Password:</strong> {user.password}</div>
                  <div><strong>Name:</strong> {user.full_name}</div>
                  <div><strong>Phone:</strong> {user.phone}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={testReferralSignup} 
              disabled={loading}
              className="flex-1"
              variant="default"
            >
              {loading ? 'Testing...' : '🧪 Test Referral Signup & L1 Rewards'}
            </Button>
            <Button 
              onClick={createAllTestUsers} 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Creating...' : 'Create Without Referral'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={clearAllUsers}
              disabled={loading}
            >
              Clear Test Data
            </Button>
          </div>
          
          {referralCode && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">User A Referral Code: <span className="font-mono text-primary">{referralCode}</span></p>
            </div>
          )}
          
          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Results:</h3>
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded text-sm ${
                    result.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          )}
          
          <Alert>
            <AlertDescription>
              Note: Email verification is disabled for testing. Users can log in immediately.
              After creating users, go to Admin Panel → Users to test field management.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestUsers;