import * as React from "react"
import { BacklinkBar } from "./BacklinkBar"
import { cn } from "@/lib/utils"

interface ProgramPageTemplateProps {
  title: string
  subtitle?: string
  headerActions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * ProgramPageTemplate - Standardized layout for all program detail pages
 * Provides consistent header, backlink, and content structure
 */
export function ProgramPageTemplate({
  title,
  subtitle,
  headerActions,
  children,
  className
}: ProgramPageTemplateProps) {
  return (
    <div 
      className={cn("min-h-screen bg-background", className)}
      data-testid="program-page"
    >
      {/* Backlink Bar */}
      <BacklinkBar programName={title} />

      {/* Header Section */}
      <div className="px-4 pt-4 pb-6 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="font-[Space_Grotesk] font-bold text-2xl text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="font-[Inter] text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex-shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="px-4 pb-safe">
        {children}
      </div>
    </div>
  )
}
