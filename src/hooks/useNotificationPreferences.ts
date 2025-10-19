import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  id?: string;
  user_id?: string;
  email_on_kyc_decision: boolean;
  email_on_withdrawal_decision: boolean;
  email_on_deposit_confirmation: boolean;
  email_on_loan_decision: boolean;
  email_on_insurance_claim: boolean;
}

const defaultPreferences: NotificationPreferences = {
  email_on_kyc_decision: true,
  email_on_withdrawal_decision: true,
  email_on_deposit_confirmation: true,
  email_on_loan_decision: true,
  email_on_insurance_claim: true,
};

export function useNotificationPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from("user_notification_preferences")
          .insert({
            user_id: user.id,
            ...defaultPreferences,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_notification_preferences")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  return {
    preferences: preferences || defaultPreferences,
    isLoading,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
