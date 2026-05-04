import { cn } from '@/utils/helpers'

const VARIANT = {
  default: 'bg-surface-100 text-surface-700 border-surface-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
}

export function Badge({ variant = 'default', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        VARIANT[variant] || VARIANT.default,
        className
      )}
    >
      {children}
    </span>
  )
}
