import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle, Users, TrendingUp, Award } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function ReferralHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="w-4 h-4 mr-2" />
          How It Works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Understanding Your Referral Network</DialogTitle>
          <DialogDescription>
            Learn how the 50-level referral system works and how you earn rewards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visual Diagram */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Referral Level Structure
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  You
                </div>
                <div className="text-muted-foreground">Your Account</div>
              </div>
              <div className="ml-4 border-l-2 border-dashed border-primary/30 pl-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                    L1
                  </div>
                  <div>
                    <p className="font-medium">Level 1 (Direct Referrals)</p>
                    <p className="text-xs text-muted-foreground">People who used YOUR referral code</p>
                  </div>
                </div>
                <div className="ml-4 border-l-2 border-dashed border-muted-foreground/30 pl-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      L2
                    </div>
                    <div>
                      <p className="font-medium">Level 2 (Indirect)</p>
                      <p className="text-xs text-muted-foreground">People referred by your L1 members</p>
                    </div>
                  </div>
                  <div className="ml-4 border-l-2 border-dashed border-muted-foreground/30 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
                        L3
                      </div>
                      <div>
                        <p className="font-medium">Level 3-50</p>
                        <p className="text-xs text-muted-foreground">Your extended team network</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                Why am I not seeing all my referrals?
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm">
                <p>You only see referrals that have <strong>completed these steps:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Used your referral code during registration</li>
                  <li>Created an account and verified their identity</li>
                  <li><strong>Locked their referral link</strong> (completed onboarding)</li>
                </ol>
                <p className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-200 dark:border-yellow-800">
                  💡 <strong>Tip:</strong> If someone says they used your code but isn't showing up, ask them to complete their account setup. They may have registered but not finished the onboarding process.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>
                What's the difference between "Direct VIP" and "Total VIP"?
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm">
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                    <p className="font-semibold text-green-700 dark:text-green-300">Direct VIP (Level 1 Only)</p>
                    <p className="mt-1">People who used YOUR code AND purchased a VIP badge</p>
                    <p className="text-xs mt-1 text-muted-foreground">This counts toward VIP milestone rewards</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
                    <p className="font-semibold text-blue-700 dark:text-blue-300">Total VIP in Team (All Levels)</p>
                    <p className="mt-1">All VIP badge holders across your entire 50-level network</p>
                    <p className="text-xs mt-1 text-muted-foreground">This shows your team's overall VIP strength</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>
                How do I earn from my team?
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">50-Level Commission</p>
                      <p className="text-muted-foreground">Earn from every badge purchase made by anyone in your 50-level network. Higher badges = more commission!</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">VIP Milestone Rewards</p>
                      <p className="text-muted-foreground">Earn BONUS rewards when your DIRECT (L1) referrals purchase VIP badges. Milestones: 10, 50, 100, 250, 500 VIP referrals!</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>
                What counts as a "completed" referral?
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm">
                <p>A referral is considered <strong>completed</strong> when they:</p>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950 text-green-600 flex items-center justify-center text-xs">✓</div>
                    <p>Used your referral code</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950 text-green-600 flex items-center justify-center text-xs">✓</div>
                    <p>Created and verified their account</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950 text-green-600 flex items-center justify-center text-xs">✓</div>
                    <p>Locked their referral link (finished onboarding)</p>
                  </div>
                </div>
                <p className="mt-3 text-muted-foreground">
                  Once completed, they'll appear in your team tree and start generating commissions for you!
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  )
}
