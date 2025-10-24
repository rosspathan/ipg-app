import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { ReactNode } from "react"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  sublabel?: string
  trend?: {
    value: string
    positive: boolean
  }
  onClick?: () => void
}

export function StatCard({ icon: Icon, label, value, sublabel, trend, onClick }: StatCardProps) {
  return (
    <Card 
      className={`transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          {trend && (
            <span className={`text-xs font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          {sublabel && (
            <p className="text-xs text-muted-foreground/70">{sublabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
