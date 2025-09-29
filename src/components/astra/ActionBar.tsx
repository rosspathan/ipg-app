import * as React from "react"
import { ArrowUpCircle, ArrowDownCircle, Send, Repeat, History, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useNavigation } from "@/hooks/useNavigation"

const actionConfig = {
  deposit: {
    icon: ArrowDownCircle,
    label: "Deposit",
    route: "/app/wallet/deposit",
    variant: "default" as const,
    className: "text-success hover:bg-success/10"
  },
  withdraw: {
    icon: ArrowUpCircle,
    label: "Withdraw", 
    route: "/app/wallet/withdraw",
    variant: "outline" as const,
    className: "text-danger hover:bg-danger/10"
  },
  send: {
    icon: Send,
    label: "Send",
    route: "/app/wallet/send", 
    variant: "outline" as const,
    className: "text-warning hover:bg-warning/10"
  },
  swap: {
    icon: Repeat,
    label: "Swap",
    route: "/app/swap",
    variant: "outline" as const,
    className: "text-accent hover:bg-accent/10"
  },
  transfer: {
    icon: Send,
    label: "Transfer",
    route: "/app/wallet/transfer",
    variant: "outline" as const,
    className: "text-primary hover:bg-primary/10"
  },
  history: {
    icon: History,
    label: "History",
    route: "/app/wallet/history",
    variant: "ghost" as const,
    className: "text-text-secondary hover:bg-card-glass"
  },
  view: {
    icon: Eye,
    label: "View",
    route: "#",
    variant: "ghost" as const,
    className: "text-text-secondary hover:bg-card-glass"
  }
}

interface ActionBarProps {
  actions: (keyof typeof actionConfig)[]
  className?: string
  size?: "sm" | "md" | "lg"
  layout?: "horizontal" | "grid"
}

export function ActionBar({ 
  actions, 
  className, 
  size = "md",
  layout = "horizontal" 
}: ActionBarProps) {
  const { navigate } = useNavigation()

  const buttonSize = size === "sm" ? "sm" : size === "lg" ? "lg" : "default"

  return (
    <div 
      className={cn(
        "flex gap-2",
        layout === "grid" && actions.length > 3 && "grid grid-cols-2",
        layout === "horizontal" && "flex-wrap",
        className
      )}
      data-testid="action-bar"
    >
      {actions.map((actionKey) => {
        const action = actionConfig[actionKey]
        const Icon = action.icon
        
        return (
          <Button
            key={actionKey}
            variant={action.variant}
            size={buttonSize}
            onClick={() => navigate(action.route)}
            className={cn(
              "flex items-center gap-2 transition-all duration-standard",
              action.className,
              layout === "horizontal" && "flex-1"
            )}
            data-testid={`action-${actionKey}`}
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium">{action.label}</span>
          </Button>
        )
      })}
    </div>
  )
}