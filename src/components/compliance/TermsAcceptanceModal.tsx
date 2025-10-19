import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { FileText } from 'lucide-react';

interface TermsAcceptanceModalProps {
  open: boolean;
  onAccept: (version: string) => void;
  onDecline: () => void;
}

export const TermsAcceptanceModal = ({ open, onAccept, onDecline }: TermsAcceptanceModalProps) => {
  const [accepted, setAccepted] = useState(false);
  const [terms, setTerms] = useState<{ version: string; title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchCurrentTerms();
    }
  }, [open]);

  const fetchCurrentTerms = async () => {
    try {
      const { data } = await supabase
        .from('terms_versions')
        .select('version, title, content')
        .eq('is_current', true)
        .single();

      if (data) {
        setTerms(data);
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (accepted && terms) {
      onAccept(terms.version);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-6 w-6 text-primary" />
            <DialogTitle>{terms?.title || 'Terms and Conditions'}</DialogTitle>
          </div>
          <DialogDescription>
            Version {terms?.version} • Please review and accept to continue
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading terms...</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-sm">{terms?.content}</div>
            </div>
          )}
        </ScrollArea>

        <div className="flex items-start gap-2 mt-4">
          <Checkbox
            id="terms-accept"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <label
            htmlFor="terms-accept"
            className="text-sm cursor-pointer leading-tight"
          >
            I have read and agree to the Terms and Conditions (Version {terms?.version})
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDecline}>
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="bg-primary hover:bg-primary/90"
          >
            Accept Terms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
