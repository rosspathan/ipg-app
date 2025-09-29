import { cn } from "@/lib/utils"
import BrandLoader from '@/components/brand/BrandLoader'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function LoadingSpinner({ className, size = 'md', label }: LoadingSpinnerProps) {
  // Map our sizes to BrandLoader sizes
  const brandSize = size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'medium'
  
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <BrandLoader size={brandSize} label={label} />
    </div>
  )
}