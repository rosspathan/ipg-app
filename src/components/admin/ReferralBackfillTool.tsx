import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UnlockedUser {
  user_id: string;
  username: string;
  email: string;
  sponsor_code_used: string | null;
  created_at: string;
}

interface BackfillResult {
  user_id: string;
  username: string;
  sponsor_assigned: string;
  success: boolean;
  error?: string;
}

export function ReferralBackfillTool() {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [unlockedUsers, setUnlockedUsers] = useState<UnlockedUser[]>([]);
  const [results, setResults] = useState<BackfillResult[]>([]);
  const [manualSponsorId, setManualSponsorId] = useState<{ [userId: string]: string }>({});
  const { toast } = useToast();

  const scanUnlockedUsers = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase
        .from('referral_links_new')
        .select(`
          user_id,
          sponsor_code_used,
          created_at,
          profiles!referral_links_new_user_id_fkey (
            username,
            email
          )
        `)
        .is('locked_at', null);

      if (error) throw error;

      const formatted = data?.map((row: any) => ({
        user_id: row.user_id,
        username: row.profiles?.username || 'Unknown',
        email: row.profiles?.email || 'N/A',
        sponsor_code_used: row.sponsor_code_used,
        created_at: row.created_at,
      })) || [];

      setUnlockedUsers(formatted);
      toast({
        title: 'Scan Complete',
        description: `Found ${formatted.length} users with unlocked sponsors`,
      });
    } catch (error: any) {
      toast({
        title: 'Scan Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  const resolveSponsorId = async (codeUsed: string): Promise<string | null> => {
    // Try UUID first
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(codeUsed)) {
      return codeUsed;
    }

    // Try short code lookup
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('referral_code', codeUsed.toUpperCase())
      .maybeSingle();

    if (error || !data) return null;
    return data.user_id;
  };

  const lockSponsor = async (userId: string, sponsorId: string): Promise<boolean> => {
    try {
      // Prevent self-referral
      if (userId === sponsorId) {
        throw new Error('Cannot self-refer');
      }

      const { error } = await supabase
        .from('referral_links_new')
        .update({
          sponsor_id: sponsorId,
          locked_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Lock error:', error);
      return false;
    }
  };

  const backfillAll = async () => {
    if (unlockedUsers.length === 0) {
      toast({
        title: 'No Users',
        description: 'Scan for unlocked users first',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const backfillResults: BackfillResult[] = [];

    for (const user of unlockedUsers) {
      let sponsorId: string | null = null;

      // Try manual assignment first
      if (manualSponsorId[user.user_id]) {
        sponsorId = await resolveSponsorId(manualSponsorId[user.user_id]);
      } else if (user.sponsor_code_used) {
        // Try to resolve from code
        sponsorId = await resolveSponsorId(user.sponsor_code_used);
      }

      if (sponsorId) {
        const success = await lockSponsor(user.user_id, sponsorId);
        backfillResults.push({
          user_id: user.user_id,
          username: user.username,
          sponsor_assigned: sponsorId,
          success,
          error: success ? undefined : 'Lock failed',
        });
      } else {
        const errorMsg = manualSponsorId[user.user_id] 
          ? 'Invalid referral code or UUID' 
          : 'No sponsor code or manual assignment';
        backfillResults.push({
          user_id: user.user_id,
          username: user.username,
          sponsor_assigned: 'N/A',
          success: false,
          error: errorMsg,
        });
      }
    }

    setResults(backfillResults);
    setLoading(false);

    const successCount = backfillResults.filter(r => r.success).length;
    toast({
      title: 'Backfill Complete',
      description: `${successCount}/${backfillResults.length} users locked successfully`,
    });
  };

  const assignManualSponsor = (userId: string, sponsorId: string) => {
    setManualSponsorId(prev => ({ ...prev, [userId]: sponsorId }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Referral Backfill Tool
        </CardTitle>
        <CardDescription>
          Scan and assign missing sponsor relationships for users with unlocked referrals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool identifies users with no locked sponsor and attempts to assign them based on the referral code they used during signup. Manual assignment is required for users without a recorded code.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button onClick={scanUnlockedUsers} disabled={scanning} variant="outline">
            {scanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Scan Unlocked Users
          </Button>
          {unlockedUsers.length > 0 && (
            <Button onClick={backfillAll} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Backfill All ({unlockedUsers.length})
            </Button>
          )}
        </div>

        {unlockedUsers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Unlocked Users ({unlockedUsers.length})</h3>
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Code Used</TableHead>
                    <TableHead>Manual Sponsor (Code or ID)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unlockedUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-mono text-xs">{user.username}</TableCell>
                      <TableCell>
                        {user.sponsor_code_used ? (
                          <Badge variant="outline">{user.sponsor_code_used}</Badge>
                        ) : (
                          <Badge variant="destructive">None</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Enter referral code or UUID"
                          value={manualSponsorId[user.user_id] || ''}
                          onChange={(e) => assignManualSponsor(user.user_id, e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        {user.sponsor_code_used || manualSponsorId[user.user_id] ? (
                          <Badge variant="secondary">Ready</Badge>
                        ) : (
                          <Badge variant="outline">Needs Assignment</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Backfill Results</h3>
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[200px]">Username</TableHead>
                    <TableHead className="w-[300px]">Sponsor Assigned</TableHead>
                    <TableHead className="min-w-[250px]">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.user_id}>
                      <TableCell className="font-mono text-xs">{result.username}</TableCell>
                      <TableCell className="font-mono text-xs break-all align-top">{result.sponsor_assigned}</TableCell>
                      <TableCell className="align-top">
                        {result.success ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Success</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="destructive" className="whitespace-nowrap">Error</Badge>
                            <p className="text-xs text-muted-foreground break-words">{result.error}</p>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
