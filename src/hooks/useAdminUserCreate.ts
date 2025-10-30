import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface CreateUserRequest {
  email: string;
  display_name?: string;
  phone?: string;
  password?: string;
  account_status?: "active" | "suspended" | "pending";
  kyc_status?: "none" | "pending" | "approved" | "rejected";
  initial_bsk_balance?: number;
  role?: "user" | "admin";
  send_welcome_email?: boolean;
}

interface CreateUserResponse {
  success: boolean;
  user_id?: string;
  email?: string;
  temporary_password?: string;
  error?: string;
}

export function useAdminUserCreate() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const createUser = async (request: CreateUserRequest): Promise<CreateUserResponse> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: request,
      });

      if (error) throw error;

      // Invalidate user queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      
      return data as CreateUserResponse;
    } catch (error: any) {
      throw new Error(error.message || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  return { createUser, isLoading };
}
