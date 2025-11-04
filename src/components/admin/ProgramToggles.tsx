import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { RefreshCw, Shield, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProgramFlag {
  program_code: string
  enabled: boolean
  updated_at: string
}

const PROGRAMS = [
  { code: 'spin_wheel', name: 'Spin Wheel', description: 'Lucky spin game with BSK bets and prizes' },
  { code: 'lucky_draw', name: 'Lucky Draw', description: '100-participant draw with multiple winners' },
  { code: 'ad_mining', name: 'Ad Mining', description: 'Free daily ads and subscription tiers' },
  { code: 'one_time_purchase', name: 'One-Time Purchase', description: '+50% holding bonus with tier requirement' },
  { code: 'team_referrals', name: 'Team & Referrals', description: '50-level referral system with badges' },
  { code: 'insurance', name: 'Insurance', description: 'Accident, Trading, and Life insurance plans' },
  { code: 'loans', name: 'BSK Loans', description: '0% interest loans with collateral' },
  { code: 'staking', name: 'Staking', description: 'Real crypto staking pools' },
  { code: 'trading', name: 'Trading', description: 'Crypto spot trading and swaps' },
]

export function ProgramToggles() {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadFlags()
  }, [])

  const loadFlags = async () => {
    try {
      setLoading(true)
      const { data, error } = await (supabase as any)
        .rpc('get_program_flags')

      if (error) {
        console.error('Error loading program flags:', error)
        // Initialize with defaults if table doesn't exist yet
        const defaultFlags: Record<string, boolean> = {}
        PROGRAMS.forEach(program => {
          defaultFlags[program.code] = true
        })
        setFlags(defaultFlags)
        return
      }

      const flagsMap: Record<string, boolean> = {}
      const flagsArray = data as unknown as ProgramFlag[]
      flagsArray?.forEach((flag: ProgramFlag) => {
        flagsMap[flag.program_code] = flag.enabled
      })

      // Set defaults for missing programs
      PROGRAMS.forEach(program => {
        if (!(program.code in flagsMap)) {
          flagsMap[program.code] = true
        }
      })

      setFlags(flagsMap)
    } catch (error: any) {
      console.error('Error loading program flags:', error)
      // Initialize with defaults
      const defaultFlags: Record<string, boolean> = {}
      PROGRAMS.forEach(program => {
        defaultFlags[program.code] = true
      })
      setFlags(defaultFlags)
    } finally {
      setLoading(false)
    }
  }

  const toggleProgram = async (programCode: string, currentEnabled: boolean) => {
    try {
      setUpdating(programCode)
      
      const newEnabled = !currentEnabled

      const { error } = await (supabase as any).rpc('upsert_program_flag', {
        p_program_code: programCode,
        p_enabled: newEnabled
      })

      if (error) throw error

      setFlags(prev => ({ ...prev, [programCode]: newEnabled }))
      
      toast.success(
        `${PROGRAMS.find(p => p.code === programCode)?.name} ${newEnabled ? 'enabled' : 'disabled'}`,
        {
          description: newEnabled 
            ? 'Program is now available to users' 
            : 'Users cannot access this program'
        }
      )
    } catch (error: any) {
      console.error('Error toggling program:', error)
      toast.error(`Failed to update program: ${error.message}`)
    } finally {
      setUpdating(null)
    }
  }

  const enableAll = async () => {
    try {
      setUpdating('all')
      
      for (const program of PROGRAMS) {
        await (supabase as any).rpc('upsert_program_flag', {
          p_program_code: program.code,
          p_enabled: true
        })
      }

      const newFlags: Record<string, boolean> = {}
      PROGRAMS.forEach(p => { newFlags[p.code] = true })
      setFlags(newFlags)

      toast.success('All programs enabled')
    } catch (error: any) {
      console.error('Error enabling all programs:', error)
      toast.error(`Failed to enable all: ${error.message}`)
    } finally {
      setUpdating(null)
    }
  }

  const disableAll = async () => {
    try {
      setUpdating('all')
      
      for (const program of PROGRAMS) {
        await (supabase as any).rpc('upsert_program_flag', {
          p_program_code: program.code,
          p_enabled: false
        })
      }

      const newFlags: Record<string, boolean> = {}
      PROGRAMS.forEach(p => { newFlags[p.code] = false })
      setFlags(newFlags)

      toast.success('All programs disabled')
    } catch (error: any) {
      console.error('Error disabling all programs:', error)
      toast.error(`Failed to disable all: ${error.message}`)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Program Toggles</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const enabledCount = Object.values(flags).filter(Boolean).length
  const totalCount = PROGRAMS.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Program Toggles
            </CardTitle>
            <CardDescription>
              Enable or disable entire programs. Disabled programs are hidden from users and API calls return 403.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadFlags}
              disabled={updating !== null}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{enabledCount}/{totalCount} programs enabled</strong>
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={enableAll}
                disabled={updating !== null}
              >
                Enable All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={disableAll}
                disabled={updating !== null}
              >
                Disable All
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          {PROGRAMS.map(program => {
            const isEnabled = flags[program.code] ?? true
            const isUpdating = updating === program.code

            return (
              <div 
                key={program.code}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{program.name}</div>
                  <div className="text-sm text-muted-foreground">{program.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Code: <code className="bg-muted px-1 rounded">{program.code}</code>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-sm font-medium ${isEnabled ? 'text-success' : 'text-muted-foreground'}`}>
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleProgram(program.code, isEnabled)}
                    disabled={isUpdating}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
