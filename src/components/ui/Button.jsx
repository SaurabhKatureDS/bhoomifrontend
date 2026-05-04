import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/helpers'

/**
 * Button variants using class-variance-authority
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap gap-2 rounded-lg font-medium leading-none transition-[transform,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:
          'bg-bhoomi-600 text-white hover:bg-bhoomi-700 focus-visible:ring-bhoomi-500 shadow-sm hover:shadow-md',
        secondary:
          'bg-surface-100 text-surface-900 hover:bg-surface-200 focus-visible:ring-surface-400',
        outline:
          'border border-surface-300 bg-transparent text-surface-700 hover:bg-surface-50 focus-visible:ring-surface-400',
        ghost: 'text-surface-600 hover:bg-surface-100 hover:text-surface-900',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
        gold:
          'bg-bhoomi-500 text-white hover:bg-bhoomi-600 focus-visible:ring-bhoomi-500 shadow-sm font-semibold',
      },
      size: {
        xs: 'h-7 px-2 text-[10px]',
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

const Button = forwardRef(
  ({ className, variant, size, loading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
