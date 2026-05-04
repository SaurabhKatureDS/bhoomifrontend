import { cn } from '@/utils/helpers'

/**
 * Page content wrapper with consistent padding and max-width.
 * Mirrors the reference project's PageWrapper.
 */
export function PageWrapper({ title, subtitle, actions, className, children }) {
  return (
    <div className={cn('flex-1 p-4 md:p-6 lg:p-8 animate-fade-in', className)}>
      {(title || actions) && (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <h1 className="text-2xl font-bold text-surface-900 font-display tracking-wide">
                {title}
              </h1>
            )}
            {subtitle && <p className="mt-1 text-sm text-surface-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
