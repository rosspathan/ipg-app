import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, User } from 'lucide-react';
import { useReferralCodeValidation } from '@/hooks/useReferralCodeValidation';
import { useReferralCodeClaim } from '@/hooks/useReferralCodeClaim';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReferralCodeClaimInputProps {
  onSuccess?: () => void;
  compact?: boolean;
}

export function ReferralCodeClaimInput({ onSuccess, compact = false }: ReferralCodeClaimInputProps) {
  const [code, setCode] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const { isValid, sponsorId, sponsorUsername, loading, error } = useReferralCodeValidation(code);
  const { claiming, claimReferralCode } = useReferralCodeClaim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !sponsorId) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!sponsorId) return;
    
    const result = await claimReferralCode(code.trim().toUpperCase(), sponsorId);
    
    if (result.success) {
      setCode('');
      setShowConfirm(false);
      onSuccess?.();
    } else {
      setShowConfirm(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={compact ? "flex gap-2" : "space-y-4"}>
        <div className={compact ? "flex-1" : "space-y-2"}>
          <div className="relative">
            <Input
              type="text"
              placeholder="Enter referral code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={compact ? "" : "text-lg"}
              disabled={claiming}
            />
            {code && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!loading && isValid && <CheckCircle className="h-4 w-4 text-green-500" />}
                {!loading && error && <XCircle className="h-4 w-4 text-destructive" />}
              </div>
            )}
          </div>
          
          {!compact && code && !loading && isValid && sponsorUsername && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Sponsor: <span className="font-medium text-foreground">{sponsorUsername}</span></span>
            </div>
          )}
          
          {!compact && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={!isValid || loading || claiming}
          className={compact ? "" : "w-full"}
        >
          {claiming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Claiming...
            </>
          ) : (
            'Claim Code'
          )}
        </Button>
      </form>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Referral Claim</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You're about to claim the referral code from <strong>{sponsorUsername}</strong>.</p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ This action is permanent and cannot be changed.
              </p>
              <p>Are you sure you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={claiming}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={claiming}>
              {claiming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                'Confirm Claim'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
