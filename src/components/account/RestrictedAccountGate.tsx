import React from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

const RESTRICTED_STATUSES = ["held", "suspended", "banned", "frozen"];

/**
 * Hard gate shown when an account has been placed on hold/suspension by an admin.
 * This is a UX convenience only — the real enforcement happens at the database
 * level (guard triggers + is_account_restricted), so even a bypass of this screen
 * cannot perform any financial action.
 */
const RestrictedAccountGate = ({ children }: { children: React.ReactNode }) => {
  const { userApp, loading } = useProfile();

  // While loading, render children to avoid a flash; DB still enforces everything.
  if (loading || !userApp) return <>{children}</>;

  const status = (userApp.account_status || "active").toLowerCase();
  const isRestricted =
    RESTRICTED_STATUSES.includes(status) || (userApp as any).is_suspended === true;

  if (!isRestricted) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Account Restricted
          </h1>
          <p className="text-sm text-muted-foreground">
            Your account is temporarily restricted. Please contact support.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "mailto:support@i-smartapp.com";
            }}
          >
            Contact Support
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth/login";
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RestrictedAccountGate;
