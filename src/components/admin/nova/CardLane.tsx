import * as React from "react";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CardLaneProps {
  title?: string;
  children: React.ReactNode;
  enableParallax?: boolean;
  className?: string;
}

/**
 * CardLane - Horizontal snap-scrolling lane
 * - Snap scroll behavior
 * - Optional parallax effect (respects prefers-reduced-motion)
 * - 60fps performance (transform/opacity only)
 */
export function CardLane({
  title,
  children,
  enableParallax = true,
  className,
}: CardLaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!enableParallax || prefersReducedMotion || !scrollRef.current) return;

    const container = scrollRef.current;
    let rafId: number;

    const handleScroll = () => {
      rafId = requestAnimationFrame(() => {
        const cards = container.querySelectorAll("[data-parallax-card]");
        const scrollLeft = container.scrollLeft;

        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const cardCenter = rect.left + rect.width / 2;
          const containerCenter = containerRect.left + containerRect.width / 2;
          const distance = cardCenter - containerCenter;
          const maxDistance = containerRect.width / 2;
          const ratio = Math.max(-1, Math.min(1, distance / maxDistance));

          // Subtle parallax: slight scale and opacity shift
          const scale = 1 - Math.abs(ratio) * 0.05;
          const opacity = 1 - Math.abs(ratio) * 0.15;

          (card as HTMLElement).style.transform = `scale(${scale})`;
          (card as HTMLElement).style.opacity = `${opacity}`;
        });
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [enableParallax, prefersReducedMotion]);

  return (
    <div
      data-testid="card-lane"
      className={cn("space-y-2 sm:space-y-3", className)}
    >
      {title && (
        <h2 className="text-sm sm:text-base font-heading font-semibold text-foreground px-2 sm:px-3 lg:px-4">
          {title}
        </h2>
      )}
      
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-2 sm:gap-3 overflow-x-auto px-2 sm:px-3 lg:px-4 pb-2",
          "snap-x snap-mandatory scroll-smooth",
          "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[hsl(225_24%_22%/0.3)]",
          "-mx-2 sm:-mx-3 lg:-mx-4" // Negative margin for edge-to-edge scroll
        )}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "hsl(225 24% 22% / 0.3) transparent",
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
        }}
      >
        {React.Children.map(children, (child, idx) => (
          <div
            key={idx}
            data-parallax-card
            className="snap-start shrink-0 transition-[transform,opacity] duration-200 first:ml-2 last:mr-2 sm:first:ml-3 sm:last:mr-3 lg:first:ml-4 lg:last:mr-4"
            style={{ willChange: "transform, opacity" }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
