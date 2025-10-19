import * as React from "react"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

interface ScrollingAnnouncementProps {
  className?: string
}

/**
 * ScrollingAnnouncement - Horizontally scrolling text banner
 * Admin-controlled announcement that moves from right to left
 * Fetches active announcements from database
 */
export function ScrollingAnnouncement({ className }: ScrollingAnnouncementProps) {
  const { data: announcement } = useQuery({
    queryKey: ['scrolling-announcement'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('announcements')
        .select('content')
        .eq('status', 'active')
        .lte('start_date', now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching announcement:', error);
        return null;
      }
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  const displayText = announcement?.content || "🎉 Welcome to IPG I-SMART! Earn rewards daily through our premium programs. Trade crypto, stake tokens, and win big prizes! 🎉";
  return (
    <div 
      className={cn(
        "relative w-full h-8 rounded-xl overflow-hidden",
        "bg-gradient-to-r from-primary/10 via-accent/20 to-primary/10",
        "border border-primary/30",
        "shadow-lg shadow-primary/10",
        "backdrop-blur-xl",
        "animate-fade-in",
        className
      )}
      data-testid="scrolling-announcement"
    >
      {/* Scrolling text container */}
      <div className="absolute inset-0 flex items-center">
        <div 
          className="flex items-center whitespace-nowrap animate-scroll"
          style={{
            animation: 'scroll-left 30s linear infinite'
          }}
        >
          <span className="text-sm font-[Inter] font-semibold text-foreground/90 px-4">
            {displayText}
          </span>
          {/* Duplicate for seamless loop */}
          <span className="text-sm font-[Inter] font-semibold text-foreground/90 px-4">
            {displayText}
          </span>
        </div>
      </div>

      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/80 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent pointer-events-none z-10" />

      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}
