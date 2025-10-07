import React from 'react';
import { cn } from '@/lib/utils';

type IconButtonVariant = 'inline' | 'fab';
type IconButtonElement = 'a' | 'button';

interface IconButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** Visual variant - inline (transparent) or fab (filled) */
  variant?: IconButtonVariant;
  /** Render as anchor or button */
  as?: IconButtonElement;
  /** Required for anchors */
  href?: string;
  /** Aria label for accessibility */
  'aria-label': string;
  /** Target for links */
  target?: string;
  /** Rel for links */
  rel?: string;
  /** Children (typically an icon) */
  children: React.ReactNode;
}

/**
 * IconButton - Circular icon button with variants
 * 
 * Variants:
 * - inline: 40×40 transparent, for headers/toolbars
 * - fab: 56×56 filled, for floating action buttons
 */
export const IconButton = React.forwardRef<HTMLElement, IconButtonProps>(
  (
    {
      variant = 'inline',
      as = 'button',
      href,
      target,
      rel,
      className,
      children,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const Component = as;

    const baseStyles = cn(
      // Base button styles
      "inline-flex items-center justify-center",
      "rounded-full transition-all duration-200",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      "disabled:opacity-50 disabled:pointer-events-none",
      // Minimum hit target
      "min-w-[44px] min-h-[44px]",
      // Reduced motion
      "motion-reduce:transition-none"
    );

    const variantStyles = {
      inline: cn(
        // Size
        "w-10 h-10",
        // Colors - transparent with brand color icon
        "bg-transparent text-[#25D366]",
        // Hover state - subtle ring
        "hover:ring-1 hover:ring-[#25D366]/25",
        // Active state - darken
        "active:text-[#21B857]",
        // Focus ring
        "focus-visible:ring-[#25D366]/45"
      ),
      fab: cn(
        // Size
        "w-14 h-14",
        // Colors - filled green with white icon
        "bg-[#25D366] text-white",
        // Shadow
        "shadow-lg shadow-[#25D366]/35",
        // Hover state - elevate and darken
        "hover:bg-[#21B857] hover:shadow-xl hover:shadow-[#25D366]/40 hover:-translate-y-0.5",
        // Active state
        "active:translate-y-0",
        // Focus ring
        "focus-visible:ring-[#25D366]/45"
      ),
    };

    const combinedClassName = cn(
      baseStyles,
      variantStyles[variant],
      className
    );

    const commonProps = {
      className: combinedClassName,
      'aria-label': ariaLabel,
      title: ariaLabel,
      'data-testid': 'wa-support-link',
      'data-wa-support-variant': variant,
      ...props,
    };

    if (as === 'a') {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target={target}
          rel={rel}
          {...commonProps}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        {...commonProps}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
