import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface MemberCardProps {
  displayName: string
  username: string
  badge?: string
  generatedAmount: number
  isActive: boolean
  onClick?: () => void
}

export function MemberCard({ 
  displayName, 
  username, 
  badge, 
  generatedAmount, 
  isActive,
  onClick 
}: MemberCardProps) {
  const initials = displayName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isActive && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">@{username}</p>
              </div>
              {badge && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {badge}
                </Badge>
              )}
            </div>
            
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Earned</span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  {generatedAmount.toFixed(0)} BSK
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
