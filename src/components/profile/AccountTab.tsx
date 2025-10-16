import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2, User as UserIcon, Mail, Phone, Check, X, RotateCcw } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";
import { ProfileAvatarUploader } from "@/components/badge-id/ProfileAvatarUploader";
import { useAvatar } from "@/hooks/useAvatar";
import { useDisplayName } from "@/hooks/useDisplayName";
import { motion, AnimatePresence } from "framer-motion";

interface AccountFormData {
  display_name: string;
  email: string;
  phone: string;
}

export const AccountTab = () => {
  const { userApp, loading, updateUserApp } = useProfile();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [optimisticData, setOptimisticData] = useState<Partial<AccountFormData> | null>(null);
  const { avatar, uploading, uploadAvatar, getAvatarUrl } = useAvatar();
  const displayName = useDisplayName();
  const avatarUrl = getAvatarUrl('2x');
  
  const { register, handleSubmit, formState: { errors, isDirty }, reset, getValues, watch } = useForm<AccountFormData>({
    defaultValues: {
      display_name: userApp?.full_name || '',
      email: userApp?.email || '',
      phone: userApp?.phone || '',
    }
  });

  // Update form when userApp changes
  useEffect(() => {
    if (userApp) {
      reset({
        display_name: userApp.full_name || '',
        email: userApp.email || '',
        phone: userApp.phone || '',
      });
    }
  }, [userApp, reset]);

  const onSubmit = async (data: AccountFormData) => {
    // Optimistic update
    setOptimisticData(data);
    setSaveSuccess(false);
    setSaveError(false);
    
    try {
      setSaving(true);
      await updateUserApp({ 
        full_name: data.display_name,
        phone: data.phone,
      });
      
      // Show success
      setSaveSuccess(true);
      setOptimisticData(null);
      
      // Clear success after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
      
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully",
        className: "bg-success/10 border-success/50 text-success",
      });
    } catch (error) {
      // Revert optimistic update
      setOptimisticData(null);
      setSaveError(true);
      
      // Clear error after 3 seconds
      setTimeout(() => setSaveError(false), 3000);
      
      toast({
        title: "Update Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = () => {
    if (userApp) {
      reset({
        display_name: userApp.full_name || '',
        email: userApp.email || '',
        phone: userApp.phone || '',
      });
      setOptimisticData(null);
      setSaveError(false);
    }
  };

  const copyReferralCode = async () => {
    if (userApp) {
      const success = await copyToClipboard(userApp.id);
      
      if (success) {
        toast({
          title: "Copied",
          description: "Referral code copied to clipboard",
        });
      } else {
        toast({
          title: "Error", 
          description: "Failed to copy referral code",
          variant: "destructive",
        });
      }
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
      {/* Avatar Section */}
      <Card className="border-2 border-primary/10">
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Upload a professional photo to personalize your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileAvatarUploader
            avatarUrl={avatarUrl || undefined}
            displayName={displayName || 'User'}
            uploading={uploading}
            onUpload={uploadAvatar}
          />
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Manage your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Display Name
                </Label>
                <Input
                  id="display_name"
                  {...register("display_name", { required: "Display name is required" })}
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
                {errors.display_name && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    {errors.display_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="+1234567890"
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !isDirty} className="flex-1">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                {isDirty && !saving && (
                  <Button type="button" variant="outline" onClick={handleUndo}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-sm text-success bg-success/10 p-3 rounded-lg"
                  >
                    <Check className="h-4 w-4" />
                    <span>Changes saved successfully!</span>
                  </motion.div>
                )}
                {saveError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                    <span>Failed to save changes. Please try again.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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