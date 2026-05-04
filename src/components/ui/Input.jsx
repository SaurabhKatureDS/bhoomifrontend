import { forwardRef } from 'react'
import { cn } from '@/utils/helpers'

/**
 * Reusable Input component with label, error, and icon support
 */
const Input = forwardRef(({ label, error, icon, rightIcon, className, id, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-surface-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border bg-surface-50 px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 transition-all duration-200',
            'border-surface-300 focus:border-bhoomi-500 focus:ring-2 focus:ring-bhoomi-500/20 focus:outline-none',
            icon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
            {rightIcon}
          </span>
        )}
      </div>
      {typeof error === 'string' && error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'

export { Input }
