import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

export interface ProgramPresentation {
  id: string
  key: string
  name: string
  subtitle: string
  description?: string
  icon?: string
  category: string
  status: string
  featured: boolean
  trending: boolean
  seasonal: boolean
  tags?: string[]
  enabled_regions?: string[]
  required_roles?: string[]
  media?: Array<{
    id: string
    media_type: string
    file_url?: string
    alt_text?: string
    display_order: number
  }>
  visibility_rules?: Array<{
    rule_type: string
    conditions: any
    priority: number
  }>
}

export function useProgramPresentation(filters?: {
  category?: string
  featured?: boolean
  trending?: boolean
  seasonal?: boolean
  tags?: string[]
}) {
  const { user } = useAuth()

  const { data: programs, isLoading } = useQuery({
    queryKey: ["program-presentation", filters],
    queryFn: async () => {
      let query = supabase
        .from("program_modules")
        .select(`
          *,
          program_media!inner(*),
          program_visibility_rules(*)
        `)
        .eq("status", "published")
        .order("sort_order", { ascending: true })

      // Apply filters
      if (filters?.category) {
        query = query.eq("category", filters.category)
      }
      if (filters?.featured !== undefined) {
        query = query.eq("featured", filters.featured)
      }
      if (filters?.trending !== undefined) {
        query = query.eq("trending", filters.trending)
      }
      if (filters?.seasonal !== undefined) {
        query = query.eq("seasonal", filters.seasonal)
      }

      const { data, error } = await query

      if (error) throw error

      // Client-side filtering for tags and visibility
      return (data || [])
        .filter((program: any) => {
          // Tag filter
          if (filters?.tags && filters.tags.length > 0) {
            const programTags = program.tags || []
            const hasMatchingTag = filters.tags.some(tag => 
              programTags.includes(tag)
            )
            if (!hasMatchingTag) return false
          }

          // Visibility rules
          const rules = program.program_visibility_rules || []
          if (rules.length > 0) {
            // Check if user meets visibility requirements
            for (const rule of rules) {
              if (rule.rule_type === "role_required") {
                // Would need user role checking logic
                continue
              }
              if (rule.rule_type === "badge_required") {
                // Would need user badge checking logic
                continue
              }
            }
          }

          return true
        })
        .map((program: any) => ({
          id: program.id,
          key: program.key,
          name: program.name,
          subtitle: program.subtitle || "",
          description: program.description,
          icon: program.icon,
          category: program.category,
          status: program.status,
          featured: program.featured,
          trending: program.trending,
          seasonal: program.seasonal,
          tags: program.tags,
          enabled_regions: program.enabled_regions,
          required_roles: program.required_roles,
          media: program.program_media || [],
          visibility_rules: program.program_visibility_rules || []
        })) as ProgramPresentation[]
    },
    enabled: true
  })

  return {
    programs: programs || [],
    isLoading
  }
}
