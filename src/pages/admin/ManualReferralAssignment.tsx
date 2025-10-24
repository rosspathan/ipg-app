import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserWithoutSponsor {
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
}

interface SponsorInfo {
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  referral_code: string;
}

export default function ManualReferralAssignment() {
  const [searchEmail, setSearchEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [validating, setValidating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  
  const [usersWithoutSponsors, setUsersWithoutSponsors] = useState<UserWithoutSponsor[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithoutSponsor | null>(null);
  const [sponsorInfo, setSponsorInfo] = useState<SponsorInfo | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const { toast } = useToast();

  const loadUsersWithoutSponsors = async () => {
    setLoading(true);
    try {
      // Get users who don't have a sponsor in referral_links_new
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, username, display_name, created_at')
        .not('user_id', 'in', supabase
          .from('referral_links_new')
          .select('user_id')
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUsersWithoutSponsors(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!searchEmail.trim()) return;
    
    setSearching(true);
    setSelectedUser(null);
    setSponsorInfo(null);
    setValidationError(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, username, display_name, created_at')
        .or(`email.ilike.%${searchEmail}%,username.ilike.%${searchEmail}%`)
        .single();

      if (error) throw error;
      
      // Check if user already has sponsor
      const { data: existingSponsor } = await supabase
        .from('referral_links_new')
        .select('sponsor_id')
        .eq('user_id', data.user_id)
        .single();
      
      if (existingSponsor) {
        toast({
          title: "User Already Has Sponsor",
          description: "This user already has a referral sponsor assigned.",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedUser(data);
    } catch (error: any) {
      toast({
        title: "User Not Found",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const validateReferralCode = async () => {
    if (!referralCode.trim() || !selectedUser) return;
    
    setValidating(true);
    setSponsorInfo(null);
    setValidationError(null);
    
    try {
      // Find sponsor by referral code
      const { data: sponsor, error } = await supabase
        .from('profiles')
        .select('user_id, email, username, display_name')
        .eq('referral_code', referralCode.toUpperCase())
        .single();

      if (error) {
        setValidationError("Invalid referral code - sponsor not found");
        return;
      }
      
      // Check for self-referral
      if (sponsor.user_id === selectedUser.user_id) {
        setValidationError("Cannot assign self-referral");
        return;
      }
      
      setSponsorInfo({ ...sponsor, referral_code: referralCode.toUpperCase() });
    } catch (error: any) {
      setValidationError(error.message);
    } finally {
      setValidating(false);
    }
  };

  const assignReferral = async () => {
    if (!selectedUser || !sponsorInfo) return;
    
    setAssigning(true);
    
    try {
      // Insert into referral_links_new
      const { error: insertError } = await supabase
        .from('referral_links_new')
        .insert({
          user_id: selectedUser.user_id,
          sponsor_id: sponsorInfo.user_id,
          sponsor_code_used: sponsorInfo.referral_code,
          locked_at: new Date().toISOString(),
          source: 'manual_admin_assignment'
        });
      
      if (insertError) throw insertError;
      
      // Rebuild referral tree
      const { error: rebuildError } = await supabase.functions.invoke('build-referral-tree', {
        body: { user_id: selectedUser.user_id }
      });
      
      if (rebuildError) {
        console.error('Tree rebuild error:', rebuildError);
        toast({
          title: "Warning",
          description: "Referral assigned but tree rebuild failed. Run rebuild manually.",
          variant: "destructive"
        });
      }
      
      // Log in audit
      await supabase.from('audit_logs').insert({
        user_id: selectedUser.user_id,
        action: 'manual_referral_assignment',
        resource_type: 'referral_links_new',
        resource_id: selectedUser.user_id,
        new_values: {
          sponsor_id: sponsorInfo.user_id,
          sponsor_code: sponsorInfo.referral_code,
          assigned_by: 'admin'
        }
      });
      
      toast({
        title: "Success",
        description: `Referral assigned: ${selectedUser.email} → ${sponsorInfo.email}`,
      });
      
      // Reset form
      setSelectedUser(null);
      setSponsorInfo(null);
      setReferralCode('');
      setSearchEmail('');
      
      // Reload list
      loadUsersWithoutSponsors();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  React.useEffect(() => {
    loadUsersWithoutSponsors();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manual Referral Assignment</h1>
          <p className="text-muted-foreground">Fix missing referral relationships</p>
        </div>
        <Button onClick={loadUsersWithoutSponsors} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign Referral Sponsor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search User */}
          <div className="space-y-2">
            <label className="text-sm font-medium">1. Search User (Email or Username)</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email or username"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              />
              <Button onClick={searchUser} disabled={searching || !searchEmail.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {selectedUser && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">User Found:</div>
                  <div className="text-sm">Email: {selectedUser.email}</div>
                  <div className="text-sm">Username: {selectedUser.username || 'N/A'}</div>
                  <div className="text-sm">Display Name: {selectedUser.display_name || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">
                    Signed up: {new Date(selectedUser.created_at).toLocaleDateString()}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Enter Referral Code */}
          {selectedUser && (
            <div className="space-y-2">
              <label className="text-sm font-medium">2. Enter Sponsor's Referral Code</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter referral code (e.g., 364415F7)"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value.toUpperCase());
                    setSponsorInfo(null);
                    setValidationError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && validateReferralCode()}
                />
                <Button 
                  onClick={validateReferralCode} 
                  disabled={validating || !referralCode.trim()}
                  variant="outline"
                >
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validate'}
                </Button>
              </div>
            </div>
          )}

          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {sponsorInfo && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Sponsor Found:</div>
                  <div className="text-sm">Email: {sponsorInfo.email}</div>
                  <div className="text-sm">Username: {sponsorInfo.username || 'N/A'}</div>
                  <div className="text-sm">Display Name: {sponsorInfo.display_name || 'N/A'}</div>
                  <div className="text-sm">Code: {sponsorInfo.referral_code}</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Assign Button */}
          {selectedUser && sponsorInfo && (
            <div className="pt-4 border-t">
              <Button 
                onClick={assignReferral} 
                disabled={assigning}
                className="w-full"
                size="lg"
              >
                {assigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign {selectedUser.email} → {sponsorInfo.email}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Without Sponsors List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Users Without Sponsors ({usersWithoutSponsors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : usersWithoutSponsors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              All users have sponsors assigned!
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {usersWithoutSponsors.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setSearchEmail(user.email);
                    setSelectedUser(user);
                    setSponsorInfo(null);
                    setValidationError(null);
                    setReferralCode('');
                  }}
                >
                  <div className="flex-1">
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.username || 'No username'} • 
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
