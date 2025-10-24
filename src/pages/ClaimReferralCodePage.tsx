import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, CheckCircle, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReferralCodeClaimInput } from '@/components/referrals/ReferralCodeClaimInput';
import { useReferralCodeClaim } from '@/hooks/useReferralCodeClaim';
import { useToast } from '@/hooks/use-toast';

export default function ClaimReferralCodePage() {
  const navigate = useNavigate();
  const { checkEligibility } = useReferralCodeClaim();
  const { toast } = useToast();
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    const checkStatus = async () => {
      const result = await checkEligibility();
      setEligible(result.eligible);
      if (!result.eligible && result.reason) {
        setReason(result.reason);
        toast({
          title: 'Cannot Claim Code',
          description: result.reason,
          variant: 'destructive',
        });
      }
    };
    checkStatus();
  }, []);

  const handleSuccess = () => {
    navigate('/app/programs/team-referrals');
  };

  if (eligible === null) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (eligible === false) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-6 w-6" />
              Cannot Claim Referral Code
            </CardTitle>
            <CardDescription>{reason}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 mb-4">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Claim Your Referral Code</h1>
          <p className="text-muted-foreground">
            Connect with your sponsor and join their referral network
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter Referral Code</CardTitle>
            <CardDescription>
              Enter the code provided by your sponsor. This is a one-time action and cannot be changed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReferralCodeClaimInput onSuccess={handleSuccess} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Why Join a Referral Network?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Be Part of a Team</p>
                <p className="text-sm text-muted-foreground">
                  Connect with your sponsor and become part of a growing network
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Support & Guidance</p>
                <p className="text-sm text-muted-foreground">
                  Your sponsor can help you succeed and answer your questions
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Team Benefits</p>
                <p className="text-sm text-muted-foreground">
                  Unlock exclusive team rewards and commission opportunities
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            ⏰ Grace Period: 7 Days
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
            You have 7 days from account creation to claim a referral code. After that, this option will no longer be available.
          </p>
        </div>
      </div>
    </div>
  );
}
