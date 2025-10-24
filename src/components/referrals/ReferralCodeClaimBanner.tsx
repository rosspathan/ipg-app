import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthUser } from '@/hooks/useAuthUser';
import { supabase } from '@/integrations/supabase/client';
import { ReferralCodeClaimInput } from './ReferralCodeClaimInput';
import { useReferralCodeClaim } from '@/hooks/useReferralCodeClaim';

const DISMISS_COUNT_KEY = 'referral_claim_banner_dismissed';
const MAX_DISMISSALS = 3;

export function ReferralCodeClaimBanner() {
  const { user } = useAuthUser();
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const [eligible, setEligible] = useState(false);
  const { checkEligibility } = useReferralCodeClaim();

  useEffect(() => {
    if (!user) return;

    const checkBannerStatus = async () => {
      // Check local dismiss count
      const storedCount = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0');
      setDismissCount(storedCount);

      if (storedCount >= MAX_DISMISSALS) {
        setShow(false);
        return;
      }

      // Check eligibility
      const result = await checkEligibility();
      setEligible(result.eligible);
      setShow(result.eligible);
    };

    checkBannerStatus();
  }, [user]);

  const handleDismiss = () => {
    const newCount = dismissCount + 1;
    setDismissCount(newCount);
    localStorage.setItem(DISMISS_COUNT_KEY, newCount.toString());
    setShow(false);
  };

  const handleSuccess = () => {
    // Clear dismiss count and hide banner permanently
    localStorage.removeItem(DISMISS_COUNT_KEY);
    setShow(false);
  };

  if (!show || !eligible) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-amber-500/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <Gift className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm text-foreground">
                  Join a Referral Network
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter your referral code to connect with your sponsor and unlock team benefits
                </p>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="h-8 px-2"
                >
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {expanded && (
              <div className="mt-3 max-w-md">
                <ReferralCodeClaimInput onSuccess={handleSuccess} compact />
                <p className="text-xs text-muted-foreground mt-2">
                  You have 7 days from signup to claim a referral code
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
