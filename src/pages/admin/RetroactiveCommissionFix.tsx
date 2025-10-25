import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, ChevronLeft, Database, DollarSign, RefreshCw } from 'lucide-react';
import { ReferralTreeRebuildTool } from '@/components/admin/ReferralTreeRebuildTool';
import { RetroactiveCommissionPanel } from '@/components/admin/RetroactiveCommissionPanel';
import { useNavigate } from 'react-router-dom';

export default function RetroactiveCommissionFix() {
  const navigate = useNavigate();
  const [step1Complete, setStep1Complete] = useState(false);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/admin/referrals-nova')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Retroactive Commission Fix</h1>
            <p className="text-muted-foreground mt-1">
              Complete workflow to rebuild referral trees and pay missing commissions
            </p>
          </div>
        </div>

        {/* Overview Alert */}
        <Alert>
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>What happened?</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>
              The referral tree structure was missing critical data (<code>direct_sponsor_id</code>), causing:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All commissions being paid at Level 1 rates (10%)</li>
              <li>Level 2-50 sponsors not receiving their commissions (5%, 3%, 2%, 1%)</li>
              <li>Incorrect hierarchy display in the team tree view</li>
            </ul>
            <p className="font-semibold mt-3">This tool fixes the issue in 2 steps:</p>
          </AlertDescription>
        </Alert>

        {/* Workflow Steps */}
        <div className="grid gap-6">
          {/* STEP 1: Rebuild Trees */}
          <Card className={step1Complete ? 'border-success' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    step1Complete 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {step1Complete ? <CheckCircle2 className="h-6 w-6" /> : '1'}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Rebuild Referral Trees
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Fix the referral tree structure for all users
                    </CardDescription>
                  </div>
                </div>
                {step1Complete && (
                  <Badge variant="default" className="bg-success">Complete</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This rebuilds the referral tree for ALL users, adding the missing <code>direct_sponsor_id</code> field.
                  This is required before calculating retroactive commissions.
                </AlertDescription>
              </Alert>

              <ReferralTreeRebuildTool />

              {!step1Complete && (
                <div className="pt-4">
                  <Button 
                    onClick={() => setStep1Complete(true)}
                    variant="outline"
                    className="w-full"
                  >
                    Mark Step 1 as Complete
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Click after rebuilding all trees successfully
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="text-muted-foreground">↓</div>
          </div>

          {/* STEP 2: Pay Retroactive Commissions */}
          <Card className={!step1Complete ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    step1Complete 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    2
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Calculate & Pay Missing Commissions
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Preview and execute retroactive commission payments
                    </CardDescription>
                  </div>
                </div>
                {!step1Complete && (
                  <Badge variant="secondary">Locked</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!step1Complete ? (
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Complete Step 1 first to unlock this section.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert className="bg-primary/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This calculates what each sponsor SHOULD have earned based on their level, 
                      compares it with what they ACTUALLY received, and pays the difference.
                    </AlertDescription>
                  </Alert>

                  <RetroactiveCommissionPanel />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Technical Details */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="font-semibold">What was fixed:</div>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Added <code>direct_sponsor_id</code> column to <code>referral_tree</code> table</li>
                <li>Updated <code>build-referral-tree</code> edge function to capture sponsor relationships</li>
                <li>Created database functions to calculate expected vs actual commissions</li>
                <li>Frontend hooks now use correct parent-child relationships</li>
              </ul>
            </div>
            
            <div className="pt-2">
              <div className="font-semibold">Commission Structure:</div>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><strong>Level 1 (Direct):</strong> 10% - Previously paid correctly ✓</li>
                <li><strong>Level 2-10:</strong> 5% each - Previously NOT paid ✗</li>
                <li><strong>Level 11-20:</strong> 3% each - Previously NOT paid ✗</li>
                <li><strong>Level 21-30:</strong> 2% each - Previously NOT paid ✗</li>
                <li><strong>Level 31-50:</strong> 1% each - Previously NOT paid ✗</li>
              </ul>
            </div>

            <div className="pt-2">
              <div className="font-semibold">Database Functions:</div>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><code>calculate_retroactive_commissions()</code> - Identifies missing commissions</li>
                <li><code>pay_retroactive_commissions()</code> - Credits BSK to sponsor balances</li>
                <li>All payments logged in <code>referral_commissions</code> and <code>bonus_ledger</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Need help?</strong> If you encounter errors or have questions about the process,
            check the browser console for detailed logs or contact support.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
