import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface UserReferralStatus {
  user_id: string;
  email: string;
  referral_code: string | null;
  sponsor_id: string | null;
  sponsor_code_used: string | null;
  locked_at: string | null;
  tree_exists: boolean;
  tree_depth: number | null;
  pending_code_localStorage: string | null;
}

export default function ReferralDebugger() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserReferralStatus[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [manualLinkUserId, setManualLinkUserId] = useState('');
  const [manualLinkCode, setManualLinkCode] = useState('');
  const [linking, setLinking] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all users with their referral status
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, referral_code')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!profiles) {
        setUsers([]);
        return;
      }

      const userStatuses: UserReferralStatus[] = [];

      for (const profile of profiles) {
        // Get user email
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
        
        // Get referral link
        const { data: link } = await supabase
          .from('referral_links_new')
          .select('sponsor_id, sponsor_code_used, locked_at')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        // Get tree status
        const { data: tree } = await supabase
          .from('referral_tree')
          .select('level')
          .eq('user_id', profile.user_id)
          .order('level', { ascending: false })
          .limit(1)
          .maybeSingle();

        userStatuses.push({
          user_id: profile.user_id,
          email: user?.email || 'N/A',
          referral_code: profile.referral_code,
          sponsor_id: link?.sponsor_id || null,
          sponsor_code_used: link?.sponsor_code_used || null,
          locked_at: link?.locked_at || null,
          tree_exists: !!tree,
          tree_depth: tree?.level || null,
          pending_code_localStorage: null // Can't access from admin panel
        });
      }

      setUsers(userStatuses);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const manualLinkReferral = async () => {
    if (!manualLinkUserId || !manualLinkCode) {
      toast.error('Please provide both user ID and sponsor code');
      return;
    }

    setLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manual-link-referral', {
        body: {
          user_id: manualLinkUserId,
          sponsor_code: manualLinkCode
        }
      });

      if (error) throw error;

      toast.success(`Successfully linked user to sponsor: ${data.sponsor_id}`);
      setManualLinkUserId('');
      setManualLinkCode('');
      fetchUsers();
    } catch (error: any) {
      console.error('Manual link failed:', error);
      toast.error(error.message || 'Failed to link referral');
    } finally {
      setLinking(false);
    }
  };

  const rebuildTree = async (userId: string) => {
    try {
      toast.loading('Rebuilding tree...', { id: 'rebuild' });
      
      const { error } = await supabase.functions.invoke('build-referral-tree', {
        body: { user_id: userId }
      });

      if (error) throw error;

      toast.success('Tree rebuilt successfully', { id: 'rebuild' });
      fetchUsers();
    } catch (error: any) {
      console.error('Tree rebuild failed:', error);
      toast.error(error.message || 'Failed to rebuild tree', { id: 'rebuild' });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = searchEmail
    ? users.filter(u => u.email.toLowerCase().includes(searchEmail.toLowerCase()))
    : users;

  const stats = {
    total: users.length,
    linked: users.filter(u => u.sponsor_id).length,
    locked: users.filter(u => u.locked_at).length,
    withTree: users.filter(u => u.tree_exists).length,
    orphaned: users.filter(u => !u.sponsor_id).length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Referral System Debugger</h1>
          <p className="text-muted-foreground">Monitor and fix referral relationships</p>
        </div>
        <Button onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Linked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.linked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Locked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.locked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">With Tree</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.withTree}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-600">Orphaned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.orphaned}</div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Link Tool */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Referral Linking</CardTitle>
          <CardDescription>
            Manually link a user to a sponsor by referral code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="User ID (UUID)"
              value={manualLinkUserId}
              onChange={(e) => setManualLinkUserId(e.target.value)}
            />
            <Input
              placeholder="Sponsor Referral Code"
              value={manualLinkCode}
              onChange={(e) => setManualLinkCode(e.target.value.toUpperCase())}
            />
            <Button onClick={manualLinkReferral} disabled={linking}>
              {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Link User'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>User Referral Status</CardTitle>
          <Input
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="mt-2"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="font-mono text-sm text-muted-foreground">
                        {user.user_id}
                      </div>
                      <div className="font-medium">{user.email}</div>
                      <div className="flex gap-4 text-sm">
                        <span>
                          Code: <code className="bg-muted px-1 rounded">{user.referral_code || 'N/A'}</code>
                        </span>
                        <span>
                          Sponsor: <code className="bg-muted px-1 rounded">{user.sponsor_code_used || 'None'}</code>
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {user.locked_at ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Locked
                          </span>
                        ) : user.sponsor_id ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            <AlertCircle className="w-3 h-3" /> Unlocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            <XCircle className="w-3 h-3" /> No Sponsor
                          </span>
                        )}
                        {user.tree_exists ? (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            Tree: {user.tree_depth} levels
                          </span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            No Tree
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rebuildTree(user.user_id)}
                      disabled={!user.sponsor_id}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Rebuild
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
