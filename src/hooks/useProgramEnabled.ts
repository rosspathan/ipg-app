import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export type ProgramCode = 
  | 'spin_wheel' 
  | 'lucky_draw' 
  | 'ad_mining' 
  | 'one_time_purchase' 
  | 'team_referrals' 
  | 'insurance' 
  | 'loans' 
  | 'staking' 
  | 'trading'

interface ProgramFlag {
  program_code: string
  enabled: boolean
  updated_at: string
}

export function useProgramEnabled(programCode: ProgramCode) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['program-flag', programCode],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_program_flag', {
        p_program_code: programCode
      })

      if (error) {
        console.error('Error fetching program flag:', error)
        // Default to enabled if table doesn't exist yet
        return { program_code: programCode, enabled: true, updated_at: new Date().toISOString() }
      }

      const flagData = data as unknown as ProgramFlag
      return flagData || { program_code: programCode, enabled: true, updated_at: new Date().toISOString() }
    },
    staleTime: 60000, // Cache for 60 seconds as per spec
    refetchOnWindowFocus: false
  })

  return {
    isEnabled: data?.enabled ?? true, // Default to enabled if no data
    isLoading,
    error,
    lastUpdated: data?.updated_at
  }
}

export function useAllProgramFlags() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['program-flags-all'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_program_flags')

      if (error) {
        console.error('Error fetching program flags:', error)
        return {}
      }

      const flagsArray = data as unknown as ProgramFlag[]
      const flagsMap: Record<string, boolean> = {}
      flagsArray?.forEach((flag: ProgramFlag) => {
        flagsMap[flag.program_code] = flag.enabled
      })

      return flagsMap
    },
    staleTime: 60000,
    refetchOnWindowFocus: false
  })

  return {
    flags: data ?? {},
    isLoading,
    error
  }
}
