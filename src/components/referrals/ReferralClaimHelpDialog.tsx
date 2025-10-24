import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Gift, AlertCircle, Clock, UserCheck } from "lucide-react";

export function ReferralClaimHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Referral Code Help
          </DialogTitle>
          <DialogDescription>
            Everything you need to know about claiming referral codes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              What is a Referral Code?
            </h3>
            <p className="text-muted-foreground">
              A referral code connects you to your sponsor (the person who invited you). When you claim a code, you join their referral network and become eligible for team benefits and support.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              How Long Do I Have to Claim?
            </h3>
            <p className="text-muted-foreground">
              You have <strong>7 days</strong> from account creation to claim a referral code. After this grace period expires, you will no longer be able to add a sponsor.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              Important Things to Know
            </h3>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Claiming a code is <strong>permanent and cannot be changed</strong></li>
              <li>You can only claim one referral code</li>
              <li>You cannot use your own referral code</li>
              <li>The person who referred you must have an active account</li>
              <li>Make sure you trust the code provided by your sponsor</li>
            </ul>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Frequently Asked Questions</h3>
            
            <div className="space-y-3">
              <div>
                <p className="font-medium">What if I don't have a referral code?</p>
                <p className="text-muted-foreground text-xs mt-1">
                  You can still use the platform without a referral code. However, you won't be connected to a sponsor or referral network.
                </p>
              </div>

              <div>
                <p className="font-medium">Can I change my sponsor later?</p>
                <p className="text-muted-foreground text-xs mt-1">
                  No, once you claim a referral code and lock your sponsor, it cannot be changed. This ensures integrity of the referral network.
                </p>
              </div>

              <div>
                <p className="font-medium">What if my sponsor becomes inactive?</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Your sponsor relationship remains even if they become inactive. You'll still be part of their network and eligible for any team benefits.
                </p>
              </div>

              <div>
                <p className="font-medium">What happens after the 7-day grace period?</p>
                <p className="text-muted-foreground text-xs mt-1">
                  After 7 days, you will no longer be able to claim a referral code through the self-service system. Contact support if you have special circumstances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
