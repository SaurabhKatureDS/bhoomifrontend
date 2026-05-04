import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { cn } from '@/utils/helpers'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200]

/**
 * Pagination control — shows total count, page-size dropdown, and prev/next.
 * Range label is computed from `page` (0-based), `size`, and `totalElements`.
 */
export function Pagination({
  page = 0,
  size = 25,
  totalElements = 0,
  onPageChange,
  onSizeChange,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const popRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const start = totalElements === 0 ? 0 : page * size + 1
  const end = Math.min(totalElements, (page + 1) * size)
  const canPrev = page > 0
  const canNext = page < totalPages - 1

  const filteredOpts = PAGE_SIZE_OPTIONS.filter((n) =>
    String(n).includes(filter.trim())
  )

  return (
    <div
      className={cn(
        'mt-4 flex flex-col items-center justify-between gap-3 border-t border-surface-200 pt-4 sm:flex-row',
        className
      )}
    >
      <div className="text-sm text-surface-600">
        Total Count: <span className="font-semibold text-surface-900">{totalElements}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Page-size selector */}
        <div className="relative" ref={popRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-50 cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 text-surface-500" />
            <span>{size} per page</span>
          </button>

          {open && (
            <div className="absolute right-0 bottom-full mb-2 z-30 w-56 rounded-xl border border-surface-200 bg-white p-2 shadow-xl">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search"
                className="mb-2 w-full rounded-lg border border-bhoomi-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bhoomi-500/30"
                autoFocus
              />
              <div className="max-h-60 overflow-auto">
                {filteredOpts.map((n) => {
                  const active = n === size
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        onSizeChange?.(n)
                        setOpen(false)
                        setFilter('')
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer',
                        active
                          ? 'bg-bhoomi-500 text-white'
                          : 'text-surface-700 hover:bg-surface-100'
                      )}
                    >
                      <span>{n} per page</span>
                      {active && <span className="text-white">✓</span>}
                    </button>
                  )
                })}
                {filteredOpts.length === 0 && (
                  <div className="px-3 py-2 text-sm text-surface-400">No options</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Prev / range / next */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-surface-300 bg-white px-2 py-1">
          <button
            type="button"
            onClick={() => canPrev && onPageChange?.(page - 1)}
            disabled={!canPrev}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              canPrev
                ? 'text-bhoomi-600 hover:bg-bhoomi-50 cursor-pointer'
                : 'text-surface-300 cursor-not-allowed'
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="px-2 text-sm font-medium text-surface-700 tabular-nums">
            {start} - {end}
          </div>
          <button
            type="button"
            onClick={() => canNext && onPageChange?.(page + 1)}
            disabled={!canNext}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              canNext
                ? 'text-bhoomi-600 hover:bg-bhoomi-50 cursor-pointer'
                : 'text-surface-300 cursor-not-allowed'
            )}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
