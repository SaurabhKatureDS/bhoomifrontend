import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/helpers'

export function Spinner({ size = 'md', className }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  }

  return <Loader2 className={cn('animate-spin text-bhoomi-500', sizeClasses[size], className)} />
}

export function PageSpinner() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-surface-500">Loading...</p>
      </div>
    </div>
  )
}
