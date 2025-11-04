import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DraftCleanupButtonProps {
  onCleanupComplete?: () => void;
}

export function DraftCleanupButton({ onCleanupComplete }: DraftCleanupButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [draftCount, setDraftCount] = useState<number | null>(null);

  const checkDrafts = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count, error } = await supabase
        .from('kyc_profiles_new')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft')
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;
      setDraftCount(count || 0);
    } catch (error) {
      console.error('Error checking drafts:', error);
      toast({
        title: "Error",
        description: "Failed to check draft count",
        variant: "destructive"
      });
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Archive old drafts by updating status
      const { error } = await supabase
        .from('kyc_profiles_new')
        .update({ 
          status: 'archived',
          reviewed_at: new Date().toISOString()
        })
        .eq('status', 'draft')
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      toast({
        title: "Cleanup Complete",
        description: `${draftCount} old drafts archived successfully`
      });

      setDraftCount(null);
      onCleanupComplete?.();
    } catch (error) {
      console.error('Error cleaning up drafts:', error);
      toast({
        title: "Cleanup Failed",
        description: "Failed to archive old drafts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={checkDrafts}
          className="border-warning text-warning hover:bg-warning/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clean Old Drafts
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Old KYC Drafts?</AlertDialogTitle>
          <AlertDialogDescription>
            {draftCount === null ? (
              "Checking for old drafts..."
            ) : draftCount === 0 ? (
              "No old drafts found. All drafts are less than 30 days old."
            ) : (
              `This will archive ${draftCount} draft submission(s) older than 30 days. This action cannot be undone.`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {draftCount !== null && draftCount > 0 && (
            <AlertDialogAction
              onClick={handleCleanup}
              disabled={loading}
              className="bg-warning hover:bg-warning/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                'Archive Drafts'
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
