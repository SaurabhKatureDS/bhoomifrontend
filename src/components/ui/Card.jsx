import { cn } from '@/utils/helpers'

/**
 * Card component with optional header and footer
 */
export function Card({ className, hover = false, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-surface-200 bg-white/80 shadow-sm',
        hover && 'card-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return (
    <div className={cn('border-b border-surface-200 px-6 py-4', className)}>{children}</div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

export function CardFooter({ className, children }) {
  return (
    <div className={cn('border-t border-surface-200 px-6 py-4', className)}>{children}</div>
  )
}
