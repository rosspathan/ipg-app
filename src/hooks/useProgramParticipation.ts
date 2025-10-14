import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"

export interface ProgramState {
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

export interface Participation {
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
  verification_data?: any
  started_at: string
  completed_at?: string
  metadata: any
  created_at: string
}

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

export function useProgramState(moduleId?: string) {
  const { user } = useAuth()

  return useQuery({
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
      return data as ProgramState | null
    },
    enabled: !!user?.id && !!moduleId
  })
}

export function useParticipationHistory(moduleId?: string, limit = 10) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["participation-history", user?.id, moduleId, limit],
    queryFn: async () => {
      if (!user?.id) return []

      let query = supabase
        .from("user_program_participations")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(limit)

      if (moduleId) {
        query = query.eq("module_id", moduleId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Participation[]
    },
    enabled: !!user?.id
  })
}

export function useProgramProgress(moduleId?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["program-progress", user?.id, moduleId],
    queryFn: async () => {
      if (!user?.id || !moduleId) return []

      const { data, error } = await supabase
        .from("user_program_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("module_id", moduleId)
        .order("created_at", { ascending: true })

      if (error) throw error
      return data as ProgressMilestone[]
    },
    enabled: !!user?.id && !!moduleId
  })
}

export function useParticipate() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      moduleId,
      participationType,
      inputData = {},
      outputData = {},
      amountPaid = 0,
      amountEarned = 0
    }: {
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
        p_module_id: moduleId,
        p_participation_type: participationType,
        p_input_data: inputData,
        p_output_data: outputData,
        p_amount_paid: amountPaid,
        p_amount_earned: amountEarned
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["program-state", user?.id, variables.moduleId] })
      queryClient.invalidateQueries({ queryKey: ["participation-history", user?.id] })
      queryClient.invalidateQueries({ queryKey: ["program-progress", user?.id, variables.moduleId] })
      
      toast({
        title: "Participation recorded",
        description: "Your participation has been successfully recorded."
      })
    },
    onError: (error: any) => {
      toast({
        title: "Participation failed",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

export function useUpdateProgramState() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      stateId,
      updates
    }: {
      stateId: string
      updates: Partial<ProgramState>
    }) => {
      const { data, error } = await supabase
        .from("user_program_states")
        .update(updates)
        .eq("id", stateId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["program-state", user?.id, data.module_id] })
      
      toast({
        title: "State updated",
        description: "Program state has been updated successfully."
      })
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

export function useUpdateProgress() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      progressId,
      currentValue,
      isCompleted
    }: {
      progressId: string
      currentValue: number
      isCompleted?: boolean
    }) => {
      const updates: any = { current_value: currentValue }
      
      if (isCompleted !== undefined) {
        updates.is_completed = isCompleted
        if (isCompleted) {
          updates.completed_at = new Date().toISOString()
        }
      }

      const { data, error } = await supabase
        .from("user_program_progress")
        .update(updates)
        .eq("id", progressId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["program-progress", user?.id, data.module_id] })
      
      if (data.is_completed) {
        toast({
          title: "Milestone completed!",
          description: "Congratulations on reaching this milestone."
        })
      }
    },
    onError: (error: any) => {
      toast({
        title: "Progress update failed",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}
