import { Button } from "@/components/ui/button"
import { Eye, ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"

export function ViewAsUserButton() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleViewAsUser = () => {
    // Open user view in new tab
    window.open('/app/home', '_blank')
    
    toast({
      title: "User View Opened",
      description: "View opened in new tab to test user experience",
    })
  }

  const handleQuickSwitch = () => {
    // Navigate to user view in same tab
    navigate('/app/home')
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleQuickSwitch}
        variant="outline"
        size="sm"
        className="border-[hsl(220_13%_14%)] bg-[hsl(220_13%_10%)] text-[hsl(0_0%_98%)] hover:bg-[hsl(220_13%_14%)]"
      >
        <Eye className="w-4 h-4 mr-2" />
        Switch to User
      </Button>

      <Button
        onClick={handleViewAsUser}
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-[hsl(220_9%_65%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(220_13%_12%)]"
        title="Open in new tab"
      >
        <ExternalLink className="w-4 h-4" />
      </Button>
    </div>
  )
}
