import { ChevronRight, Home } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface BreadcrumbSegment {
  label: string
  path?: string
}

/**
 * BreadcrumbNav - Admin console breadcrumb navigation
 * Phase 2D: Nova admin navigation enhancement
 */
export function BreadcrumbNav() {
  const location = useLocation()
  const pathSegments = location.pathname.split("/").filter(Boolean)

  // Skip if on home/root
  if (pathSegments.length <= 1) {
    return null
  }

  const breadcrumbs: BreadcrumbSegment[] = [
    { label: "Admin", path: "/admin" }
  ]

  // Build breadcrumb trail
  let currentPath = ""
  for (let i = 1; i < pathSegments.length; i++) {
    currentPath += "/" + pathSegments[i]
    const label = pathSegments[i]
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
    
    // Last segment is current page (no link)
    if (i === pathSegments.length - 1) {
      breadcrumbs.push({ label })
    } else {
      breadcrumbs.push({ label, path: "/admin" + currentPath })
    }
  }

  return (
    <div className="flex items-center gap-2 px-6 py-3 bg-card/30 backdrop-blur-sm border-b border-border/50">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Home className="h-3.5 w-3.5" />
                <span className="text-sm">Dashboard</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {breadcrumbs.slice(1).map((crumb, index) => (
            <BreadcrumbItem key={index}>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              {crumb.path ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path} className="text-sm hover:text-primary transition-colors">
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-sm font-medium">
                  {crumb.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
