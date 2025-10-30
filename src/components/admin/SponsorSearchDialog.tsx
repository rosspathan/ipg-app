import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SponsorResult {
  user_id: string;
  username: string;
  display_name?: string;
  email?: string;
  referral_code?: string;
}

interface SponsorSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSponsorSelect: (sponsorCodeOrId: string, username: string) => void;
}

export function SponsorSearchDialog({ open, onOpenChange, onSponsorSelect }: SponsorSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SponsorResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    try {
      setLoading(true);
      setResults([]);

      // Search profiles by username, email, or display_name
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, email')
        .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (profileError) throw profileError;

      if (!profiles || profiles.length === 0) {
        toast.info('No users found');
        return;
      }

      // Fetch referral codes from profiles table
      const userIds = profiles.map(p => p.user_id);
      const { data: profilesWithCodes } = await supabase
        .from('profiles')
        .select('user_id, referral_code')
        .in('user_id', userIds);

      // Combine results
      const combinedResults: SponsorResult[] = profiles.map(profile => ({
        user_id: profile.user_id,
        username: profile.username || 'Unknown',
        display_name: profile.display_name || undefined,
        email: profile.email || undefined,
        referral_code: profilesWithCodes?.find(c => c.user_id === profile.user_id)?.referral_code || undefined,
      }));

      setResults(combinedResults);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (sponsor: SponsorResult) => {
    // Prefer referral code over user_id for easier verification
    const value = sponsor.referral_code || sponsor.user_id;
    onSponsorSelect(value, sponsor.username);
    setSearchTerm('');
    setResults([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search for Sponsor</DialogTitle>
          <DialogDescription>
            Search by username, email, or display name to assign as sponsor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by username, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((sponsor) => (
                <Button
                  key={sponsor.user_id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => handleSelect(sponsor)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <User className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{sponsor.username}</div>
                      {sponsor.display_name && (
                        <div className="text-sm text-muted-foreground">
                          {sponsor.display_name}
                        </div>
                      )}
                      {sponsor.email && (
                        <div className="text-xs text-muted-foreground truncate">
                          {sponsor.email}
                        </div>
                      )}
                      {sponsor.referral_code && (
                        <div className="text-xs font-mono text-primary mt-1">
                          Code: {sponsor.referral_code}
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
