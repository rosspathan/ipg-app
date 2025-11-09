import { Button } from "@/components/ui/button"
import { Eye, ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

export function ViewAsUserButton() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isInUserView, setIsInUserView] = useState(false)

  // Check if we're currently in user view
  useEffect(() => {
    const checkView = () => {
      setIsInUserView(window.location.pathname.startsWith('/app/'))
    }
    checkView()
    
    // Listen for route changes
    window.addEventListener('popstate', checkView)
    return () => window.removeEventListener('popstate', checkView)
  }, [])

  const handleViewAsUser = () => {
    // Open user view in new tab
    window.open('/app/home', '_blank')
    
    toast({
      title: "User View Opened",
      description: "Testing user experience in new tab",
    })
  }

  const handleQuickSwitch = () => {
    if (isInUserView) {
      // Return to admin
      navigate('/admin')
      toast({
        title: "Admin View",
        description: "Returned to admin dashboard",
      })
    } else {
      // Go to user view
      navigate('/app/home')
      toast({
        title: "User View",
        description: "Viewing as regular user",
      })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleQuickSwitch}
        variant={isInUserView ? "default" : "outline"}
        size="sm"
        className={isInUserView 
          ? "bg-primary text-primary-foreground" 
          : "border-border/40 bg-card/50 hover:bg-card"
        }
      >
        <Eye className="w-4 h-4 mr-2" />
        {isInUserView ? "Back to Admin" : "View as User"}
      </Button>

      {!isInUserView && (
        <Button
          onClick={handleViewAsUser}
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Open user view in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
