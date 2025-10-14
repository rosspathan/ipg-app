import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"

export interface UserProgramState {
  id: string
  user_id: string
  module_id: string
  status: string
  progress_data: any
  participation_count: number
  total_earned: number
  total_spent: number
  first_participated_at?: string
  last_participated_at?: string
  completed_at?: string
  expires_at?: string
  metadata: any
  created_at: string
  updated_at: string
}

export interface ProgramParticipation {
  id: string
  user_id: string
  module_id: string
  state_id?: string
  participation_type: string
  input_data: any
  output_data: any
  status: string
  outcome?: string
  rewards: any[]
  amount_paid: number
  amount_earned: number
  is_verified: boolean
  started_at: string
  completed_at?: string
}

export type { UserProgramState as ProgramState }

export interface ProgressMilestone {
  id: string
  user_id: string
  module_id: string
  state_id?: string
  milestone_key: string
  milestone_type: string
  current_value: number
  target_value: number
  is_completed: boolean
  completed_at?: string
  metadata: any
  created_at: string
  updated_at: string
}

export function useProgramParticipation(moduleId?: string) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Get user's program state
  const { data: programState, isLoading: stateLoading } = useQuery({
    queryKey: ["program-state", user?.id, moduleId],
    queryFn: async () => {
      if (!user?.id || !moduleId) return null

      const { data, error } = await supabase
        .from("user_program_states")
        .select("*")
        .eq("user_id", user.id)
        .eq("module_id", moduleId)
        .maybeSingle()

      if (error) throw error
      return data as UserProgramState | null
    },
    enabled: !!user?.id && !!moduleId
  })

  // Get participation history
  const { data: participations, isLoading: participationsLoading } = useQuery({
    queryKey: ["program-participations", user?.id, moduleId],
    queryFn: async () => {
      if (!user?.id || !moduleId) return []

      const { data, error } = await supabase
        .from("user_program_participations")
        .select("*")
        .eq("user_id", user.id)
        .eq("module_id", moduleId)
        .order("started_at", { ascending: false })

      if (error) throw error
      return data as ProgramParticipation[]
    },
    enabled: !!user?.id && !!moduleId
  })

  // Initialize program state
  const initializeState = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!user?.id) throw new Error("User not authenticated")

      const { data, error } = await supabase.rpc("initialize_user_program_state", {
        p_user_id: user.id,
        p_module_id: moduleId
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-state"] })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to initialize program",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Record participation
  const recordParticipation = useMutation({
    mutationFn: async (params: {
      moduleId: string
      participationType: string
      inputData?: any
      outputData?: any
      amountPaid?: number
      amountEarned?: number
    }) => {
      if (!user?.id) throw new Error("User not authenticated")

      const { data, error } = await supabase.rpc("record_program_participation", {
        p_user_id: user.id,
        p_module_id: params.moduleId,
        p_participation_type: params.participationType,
        p_input_data: params.inputData || {},
        p_output_data: params.outputData || {},
        p_amount_paid: params.amountPaid || 0,
        p_amount_earned: params.amountEarned || 0
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-state"] })
      queryClient.invalidateQueries({ queryKey: ["program-participations"] })
      toast({
        title: "Participation recorded",
        description: "Your participation has been successfully recorded"
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to record participation",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Update program state
  const updateState = useMutation({
    mutationFn: async (updates: Partial<UserProgramState>) => {
      if (!programState?.id) throw new Error("Program state not found")

      const { data, error } = await supabase
        .from("user_program_states")
        .update(updates)
        .eq("id", programState.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-state"] })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update state",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  return {
    programState,
    participations,
    isLoading: stateLoading || participationsLoading,
    initializeState: initializeState.mutate,
    recordParticipation: recordParticipation.mutate,
    updateState: updateState.mutate,
    isInitializing: initializeState.isPending,
    isRecording: recordParticipation.isPending,
    isUpdating: updateState.isPending
  }
}
