interface NetworkBadgeProps {
  network: string
  className?: string
}

export function NetworkBadge({ network = 'BINANCE SMART CHAIN', className = '' }: NetworkBadgeProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
        <div className="absolute w-2 h-2 bg-warning rounded-full animate-ping opacity-75" />
      </div>
      <span className="text-xs font-semibold text-warning tracking-wide uppercase">
        {network}
      </span>
    </div>
  )
}
