import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, CheckCircle, Link as LinkIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MissingReferral {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  created_at: string;
  status: string;
}

export default function MissingReferralsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);
  const [sponsorCode, setSponsorCode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch missing referrals
  const { data: missingReferrals, isLoading } = useQuery({
    queryKey: ["missing-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_missing_referrals");
      if (error) throw error;
      return data as MissingReferral[];
    },
  });

  // Link user mutation
  const linkUserMutation = useMutation({
    mutationFn: async ({ userId, code }: { userId: string; code: string }) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-manual-link-referral",
        {
          body: {
            user_id: userId,
            sponsor_code: code.toUpperCase(),
          },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "✅ User Linked Successfully",
        description: `User linked to sponsor ${data.sponsor_code}`,
      });
      queryClient.invalidateQueries({ queryKey: ["missing-referrals"] });
      setIsDialogOpen(false);
      setSponsorCode("");
      setLinkingUserId(null);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Link Failed",
        description: error.message || "Failed to link user to sponsor",
        variant: "destructive",
      });
    },
  });

  const handleOpenLinkDialog = (userId: string) => {
    setLinkingUserId(userId);
    setIsDialogOpen(true);
  };

  const handleLink = () => {
    if (!linkingUserId || !sponsorCode.trim()) {
      toast({
        title: "⚠️ Missing Information",
        description: "Please enter a sponsor code",
        variant: "destructive",
      });
      return;
    }
    linkUserMutation.mutate({ userId: linkingUserId, code: sponsorCode.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const missingCount = missingReferrals?.length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Missing Referrals Manager</h1>
        <p className="text-muted-foreground">
          Fix users who signed up without proper referral link capture
        </p>
      </div>

      {/* Stats Card */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Critical Issue Detected
          </CardTitle>
          <CardDescription>
            {missingCount} users are missing referral links - commissions cannot be paid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-destructive">{missingCount}</div>
          <p className="text-sm text-muted-foreground mt-1">
            Users affected since Nov 1, 2025
          </p>
        </CardContent>
      </Card>

      {/* Missing Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users Missing Referral Links</CardTitle>
          <CardDescription>
            Manually link users to their sponsors using referral codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {missingCount === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium">All Users Linked ✓</p>
              <p className="text-sm text-muted-foreground">
                No missing referral links found
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingReferrals?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="text-sm">{user.phone || "N/A"}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(user.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">MISSING LINK</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenLinkDialog(user.id)}
                          className="gap-2"
                        >
                          <LinkIcon className="h-4 w-4" />
                          Link to Sponsor
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link User to Sponsor</DialogTitle>
            <DialogDescription>
              Enter the sponsor's referral code to manually create the referral link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sponsor Referral Code</label>
              <Input
                placeholder="Enter referral code (e.g., 9E78164D)"
                value={sponsorCode}
                onChange={(e) => setSponsorCode(e.target.value.toUpperCase())}
                maxLength={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setSponsorCode("");
                setLinkingUserId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={linkUserMutation.isPending || !sponsorCode.trim()}
            >
              {linkUserMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Link User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
