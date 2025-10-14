import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"

export interface ProgramProgress {
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

export function useProgramProgress(moduleId?: string) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Get all progress milestones
  const { data: progress, isLoading } = useQuery({
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
      return data as ProgramProgress[]
    },
    enabled: !!user?.id && !!moduleId
  })

  // Calculate overall completion percentage
  const completionPercentage = progress
    ? (progress.filter(p => p.is_completed).length / progress.length) * 100
    : 0

  // Update progress
  const updateProgress = useMutation({
    mutationFn: async (params: {
      milestoneKey: string
      milestoneType: string
      currentValue: number
      targetValue: number
      metadata?: any
    }) => {
      if (!user?.id || !moduleId) throw new Error("Missing required parameters")

      const isCompleted = params.currentValue >= params.targetValue

      const { data, error } = await supabase
        .from("user_program_progress")
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          milestone_key: params.milestoneKey,
          milestone_type: params.milestoneType,
          current_value: params.currentValue,
          target_value: params.targetValue,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          metadata: params.metadata || {}
        }, {
          onConflict: "user_id,module_id,milestone_key"
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-progress"] })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update progress",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Increment progress value
  const incrementProgress = useMutation({
    mutationFn: async (params: {
      milestoneKey: string
      incrementBy?: number
    }) => {
      const existing = progress?.find(p => p.milestone_key === params.milestoneKey)
      if (!existing) throw new Error("Milestone not found")

      const newValue = existing.current_value + (params.incrementBy || 1)
      
      return updateProgress.mutateAsync({
        milestoneKey: params.milestoneKey,
        milestoneType: existing.milestone_type,
        currentValue: newValue,
        targetValue: existing.target_value,
        metadata: existing.metadata
      })
    }
  })

  // Complete milestone
  const completeMilestone = useMutation({
    mutationFn: async (milestoneKey: string) => {
      const existing = progress?.find(p => p.milestone_key === milestoneKey)
      if (!existing) throw new Error("Milestone not found")

      return updateProgress.mutateAsync({
        milestoneKey: milestoneKey,
        milestoneType: existing.milestone_type,
        currentValue: existing.target_value,
        targetValue: existing.target_value,
        metadata: existing.metadata
      })
    },
    onSuccess: () => {
      toast({
        title: "Milestone completed!",
        description: "Congratulations on reaching this milestone"
      })
    }
  })

  return {
    progress: progress || [],
    completionPercentage,
    isLoading,
    updateProgress: updateProgress.mutate,
    incrementProgress: incrementProgress.mutate,
    completeMilestone: completeMilestone.mutate,
    isUpdating: updateProgress.isPending || incrementProgress.isPending
  }
}
