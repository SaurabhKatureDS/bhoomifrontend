import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/helpers'

/**
 * Lightweight modal — overlay + centered card. No external deps.
 */
export function Modal({ open, onClose, title, children, size = 'md', className }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/40 backdrop-blur-sm p-4 animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={cn(
          'w-full rounded-xl bg-white shadow-xl border border-surface-200',
          widths[size] || widths.md,
          className
        )}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4">
            <h3 className="font-display text-lg tracking-wide text-surface-900">{title}</h3>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function ModalFooter({ children, className }) {
  return (
    <div
      className={cn(
        'mt-5 flex items-center justify-end gap-2 border-t border-surface-200 px-6 py-4 -mx-6 -mb-5 bg-surface-50/40 rounded-b-xl',
        className
      )}
    >
      {children}
    </div>
  )
}
