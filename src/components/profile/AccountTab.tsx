import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

interface AccountFormData {
  display_name: string;
  email: string;
  phone: string;
}

export const AccountTab = () => {
  const { userApp, loading, updateUserApp } = useProfile();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
    defaultValues: {
      display_name: userApp?.full_name || '',
      email: userApp?.email || '',
      phone: userApp?.phone || '',
    }
  });

  const onSubmit = async (data: AccountFormData) => {
    try {
      setSaving(true);
      await updateUserApp({ 
        full_name: data.display_name,
        phone: data.phone,
      });
    } catch (error) {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const copyReferralCode = () => {
    if (userApp) {
      navigator.clipboard.writeText(userApp.id);
      toast({
        title: "Copied",
        description: "Referral code copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  {...register("display_name", { required: "Display name is required" })}
                />
                {errors.display_name && (
                  <p className="text-sm text-destructive">{errors.display_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referral Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={userApp?.id || ''}
                readOnly
                className="bg-muted font-mono"
              />
            </div>
            <Button variant="outline" size="icon" onClick={copyReferralCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Share this code with friends to earn referral rewards
          </p>
        </CardContent>
      </Card>
    </div>
  );
};