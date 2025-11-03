import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserPlus, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TestUserTemplate {
  email: string;
  password: string;
  display_name: string;
  kyc_status: 'none' | 'pending' | 'approved' | 'rejected';
  badge?: string;
  initial_bsk_withdrawable: number;
  initial_bsk_holding: number;
  sponsor_email?: string;
}

interface CreateResult {
  success: boolean;
  user_id?: string;
  email?: string;
  referral_code?: string;
  badge_assigned?: string | null;
  errors?: string[];
  details?: string;
}

const BADGE_OPTIONS = [
  'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 
  'Ruby', 'Emerald', 'Sapphire', 'Opal', 'Obsidian'
];

const PREDEFINED_TEMPLATES: TestUserTemplate[] = [
  {
    email: 'test.bronze@ipg.test',
    password: 'Test@12345',
    display_name: 'Bronze Test User',
    kyc_status: 'approved',
    badge: 'Bronze',
    initial_bsk_withdrawable: 10000,
    initial_bsk_holding: 5000,
  },
  {
    email: 'test.silver@ipg.test',
    password: 'Test@12345',
    display_name: 'Silver Test User',
    kyc_status: 'approved',
    badge: 'Silver',
    initial_bsk_withdrawable: 50000,
    initial_bsk_holding: 25000,
    sponsor_email: 'test.bronze@ipg.test',
  },
  {
    email: 'test.gold@ipg.test',
    password: 'Test@12345',
    display_name: 'Gold Test User',
    kyc_status: 'approved',
    badge: 'Gold',
    initial_bsk_withdrawable: 100000,
    initial_bsk_holding: 50000,
    sponsor_email: 'test.silver@ipg.test',
  },
  {
    email: 'test.platinum@ipg.test',
    password: 'Test@12345',
    display_name: 'Platinum Test User',
    kyc_status: 'approved',
    badge: 'Platinum',
    initial_bsk_withdrawable: 200000,
    initial_bsk_holding: 100000,
    sponsor_email: 'test.gold@ipg.test',
  },
  {
    email: 'test.diamond@ipg.test',
    password: 'Test@12345',
    display_name: 'Diamond Test User',
    kyc_status: 'approved',
    badge: 'Diamond',
    initial_bsk_withdrawable: 500000,
    initial_bsk_holding: 250000,
    sponsor_email: 'test.platinum@ipg.test',
  },
];

export default function AdminTestUserGenerator() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CreateResult[]>([]);

  // Single user form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Test@12345");
  const [displayName, setDisplayName] = useState("");
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('approved');
  const [badge, setBadge] = useState<string>("");
  const [bskWithdrawable, setBskWithdrawable] = useState(10000);
  const [bskHolding, setBskHolding] = useState(5000);
  const [sponsorEmail, setSponsorEmail] = useState("");

  const createSingleUser = async (userData: TestUserTemplate) => {
    const { data, error } = await supabase.functions.invoke('admin-create-test-user', {
      body: userData,
    });

    if (error) throw error;
    return data as CreateResult;
  };

  const handleCreateSingle = async () => {
    if (!email || !displayName) {
      toast({
        title: "Missing Fields",
        description: "Email and display name are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const result = await createSingleUser({
        email,
        password,
        display_name: displayName,
        kyc_status: kycStatus,
        badge: badge || undefined,
        initial_bsk_withdrawable: bskWithdrawable,
        initial_bsk_holding: bskHolding,
        sponsor_email: sponsorEmail || undefined,
      });

      setResults([result]);

      toast({
        title: "User Created",
        description: `Test user ${email} created successfully`,
      });

      // Reset form
      setEmail("");
      setDisplayName("");
      setBadge("");
      setSponsorEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    setLoading(true);
    setResults([]);
    setProgress(0);

    try {
      toast({
        title: "Creating Test Users",
        description: `Creating ${PREDEFINED_TEMPLATES.length} test users...`,
      });

      const creationResults: CreateResult[] = [];
      let processed = 0;

      for (const template of PREDEFINED_TEMPLATES) {
        try {
          const result = await createSingleUser(template);
          creationResults.push(result);
        } catch (error: any) {
          creationResults.push({
            success: false,
            email: template.email,
            errors: [error.message],
          });
        }

        processed++;
        setProgress((processed / PREDEFINED_TEMPLATES.length) * 100);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setResults(creationResults);

      toast({
        title: "Batch Creation Complete",
        description: `${creationResults.filter(r => r.success).length}/${PREDEFINED_TEMPLATES.length} users created successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test User Generator</h1>
          <p className="text-muted-foreground">Create test users with predefined configurations</p>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-4 h-4 mr-1" />
          Testing Tool
        </Badge>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          All test users are created with verified email and active status. They can be used immediately
          for testing. Use the User Cleanup tool to remove test users when done.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Create Single User</TabsTrigger>
          <TabsTrigger value="batch">Create Batch Users</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create Single Test User
              </CardTitle>
              <CardDescription>
                Create a custom test user with specific configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="test.user@example.com"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Test User"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kycStatus">KYC Status</Label>
                  <Select value={kycStatus} onValueChange={(v: any) => setKycStatus(v)} disabled={loading}>
                    <SelectTrigger id="kycStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="badge">Badge (Optional)</Label>
                  <Select value={badge} onValueChange={setBadge} disabled={loading}>
                    <SelectTrigger id="badge">
                      <SelectValue placeholder="No badge" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Badge</SelectItem>
                      {BADGE_OPTIONS.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sponsorEmail">Sponsor Email (Optional)</Label>
                  <Input
                    id="sponsorEmail"
                    type="email"
                    value={sponsorEmail}
                    onChange={(e) => setSponsorEmail(e.target.value)}
                    placeholder="sponsor@example.com"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bskWithdrawable">BSK Withdrawable</Label>
                  <Input
                    id="bskWithdrawable"
                    type="number"
                    value={bskWithdrawable}
                    onChange={(e) => setBskWithdrawable(Number(e.target.value))}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bskHolding">BSK Holding</Label>
                  <Input
                    id="bskHolding"
                    type="number"
                    value={bskHolding}
                    onChange={(e) => setBskHolding(Number(e.target.value))}
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateSingle}
                disabled={loading || !email || !displayName}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating User...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Test User
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Create Predefined Test Suite
              </CardTitle>
              <CardDescription>
                Creates 5 test users with different badge levels and a referral chain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">The following users will be created:</p>
                {PREDEFINED_TEMPLATES.map((template, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{template.display_name}</p>
                      <p className="text-sm text-muted-foreground">{template.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge>{template.badge}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.initial_bsk_withdrawable.toLocaleString()} BSK
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleCreateBatch}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Users...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Full Test Suite
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && (
        <Card>
          <CardHeader>
            <CardTitle>Creation Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}% complete</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Creation Report
            </CardTitle>
            <CardDescription>
              Summary of user creation ({results.filter(r => r.success).length}/{results.length} successful)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{result.email}</p>
                      {result.referral_code && (
                        <p className="text-sm text-muted-foreground">Code: {result.referral_code}</p>
                      )}
                    </div>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Created" : "Failed"}
                    </Badge>
                  </div>
                  {result.badge_assigned && (
                    <p className="text-sm">Badge: {result.badge_assigned}</p>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.errors.map((error, i) => (
                        <p key={i} className="text-sm text-red-600">{error}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
