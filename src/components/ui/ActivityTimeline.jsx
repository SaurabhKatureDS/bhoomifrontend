import { cn } from '@/utils/helpers'

/**
 * Generic activity timeline component.
 *
 * Usage:
 *   <ActivityTimeline events={[
 *     {
 *       id: 1,
 *       icon: TruckIcon,           // any Lucide (or other) icon component
 *       iconClassName: 'bg-amber-100 text-amber-600',
 *       title: 'Dispatched',
 *       description: 'Sent out for delivery to Ramesh Kale',
 *       timestamp: '2026-05-10T09:30:00',
 *       user: 'saurabh',
 *       note: 'Handle with care',  // optional italicised note block
 *       badge: 'DISPATCHED',       // optional pill label
 *       badgeClassName: 'bg-amber-50 text-amber-700 border-amber-200',
 *       amount: 16605,             // optional ₹ amount
 *       amountClassName: 'text-green-700',
 *     },
 *     ...
 *   ]} />
 */

/** Parse a timestamp string as UTC when it has no timezone designator. */
function parseTimestamp(v) {
  if (!v) return null
  // If there's no timezone offset or Z suffix, the server sent a naive UTC string — append Z
  const s = /[Zz]$|[+-]\d{2}:\d{2}$/.test(v) ? v : v + 'Z'
  const d = new Date(s)
  return isNaN(d) ? null : d
}

function relativeTime(dateStr) {
  const date = parseTimestamp(dateStr)
  if (!date) return null
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)
  if (diffMin < 2) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return null
}

function fmtDateTime(v) {
  const d = parseTimestamp(v)
  if (!d) return null
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtMoney(v) {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
}

export function ActivityTimeline({ events = [], emptyText = 'No activity recorded yet.' }) {
  if (!events.length) {
    return (
      <p className="text-xs text-surface-400 text-center py-6 italic">{emptyText}</p>
    )
  }

  return (
    <div className="relative">
      {events.map((ev, idx) => {
        const isLast = idx === events.length - 1
        const Icon = ev.icon
        const rel = relativeTime(ev.timestamp)
        const formatted = fmtDateTime(ev.timestamp)

        return (
          <div key={ev.id ?? idx} className="flex gap-3 relative">
            {/* Vertical connector line */}
            {!isLast && (
              <div className="absolute left-4 top-8 bottom-0 w-px bg-surface-200 z-0" />
            )}

            {/* Icon bubble */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                'ring-2 ring-white z-10',
                ev.iconClassName ?? 'bg-surface-100 text-surface-500',
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
            </div>

            {/* Content block */}
            <div className={cn('flex-1 min-w-0', isLast ? 'pb-0' : 'pb-5')}>
              {/* Title + badge row */}
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-sm font-semibold text-surface-900 leading-tight">
                  {ev.title}
                </span>
                {ev.badge && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border leading-none',
                      ev.badgeClassName ?? 'bg-surface-50 text-surface-600 border-surface-200',
                    )}
                  >
                    {ev.badge}
                  </span>
                )}
              </div>

              {/* Timestamp row */}
              {(rel || formatted) && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {formatted && (
                    <span className="text-xs text-surface-400">{formatted}</span>
                  )}
                  {rel && formatted && (
                    <span className="text-xs text-surface-300">·</span>
                  )}
                  {rel && (
                    <span className="text-xs text-surface-400">{rel}</span>
                  )}
                </div>
              )}

              {/* Description */}
              {ev.description && (
                <p className="text-xs text-surface-600 mt-0.5 leading-relaxed">{ev.description}</p>
              )}

              {/* Meta row: user + amount */}
              {(ev.user || ev.amount != null) && (
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {ev.user && (
                    <span className="text-xs text-surface-500 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-surface-300 flex-shrink-0" />
                      {ev.user}
                    </span>
                  )}
                  {ev.amount != null && (
                    <span
                      className={cn(
                        'text-xs font-semibold tabular-nums',
                        ev.amountClassName ?? 'text-green-700',
                      )}
                    >
                      {fmtMoney(ev.amount)}
                    </span>
                  )}
                </div>
              )}

              {/* Optional italicised note */}
              {ev.note && (
                <div className="mt-2 px-3 py-1.5 rounded-md bg-surface-50 border border-surface-100">
                  <p className="text-xs text-surface-500 italic leading-relaxed">"{ev.note}"</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
