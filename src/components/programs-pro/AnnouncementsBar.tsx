import * as React from "react"
import { Megaphone } from "lucide-react"

const announcements = [
  "New: BSK Purchase Bonus - Get 50% extra!",
  "Lucky Draw pool reaching 100 seats - Join now!",
  "Staking APY increased to 12.4%"
]

export function AnnouncementsBar() {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])
  
  return (
    <div className="bg-primary/10 border-y border-primary/20 px-4 py-2 flex items-center gap-3 overflow-hidden">
      <Megaphone className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 overflow-hidden">
        <p className="text-sm text-foreground font-medium animate-fade-in">
          {announcements[currentIndex]}
        </p>
      </div>
    </div>
  )
}
