import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { listItems, syncItemsFromZoho, getZohoStatus } from '@/api/items'
import { cn } from '@/utils/helpers'

const fmtMoney = (v) =>
  v == null
    ? '—'
    : '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))

const fmtDate = (v) => {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/** NET RATE = purchaseRate * (1 + RM 9%) */
const calcNetRate = (purchaseRate) =>
  purchaseRate == null ? null : Number(purchaseRate) * 1.09

const gstVariant = (pct) => {
  if (pct == null) return 'default'
  const n = Number(pct)
  if (n === 0) return 'default'
  if (n <= 5) return 'green'
  if (n <= 12) return 'blue'
  return 'amber'
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

export default function ItemMasterPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [itemData, setItemData] = useState({ content: [], totalElements: 0 })
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null) // ZohoSyncStatus for ITEMS

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset page on filter change
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, status, pageSize])

  // Load Zoho sync status once on mount
  useEffect(() => {
    getZohoStatus()
      .then((data) => setSyncStatus(data?.ITEMS ?? null))
      .catch(() => {})
  }, [])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listItems({
        q: debouncedSearch || undefined,
        status: status || undefined,
        page,
        size: pageSize,
      })
      setItemData(data || { content: [], totalElements: 0 })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, status, page, pageSize])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await syncItemsFromZoho()
      setSyncStatus(result)
      // Reset to first page and refetch
      setPage(0)
      await fetchItems()
    } catch (err) {
      console.error(err)
      alert(err?.message || 'Sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const lastSync = syncStatus?.lastSuccessAt ? fmtDate(syncStatus.lastSuccessAt) : null

  return (
    <AppLayout
      title="Item Master"
      subtitle="Bhoomi Enterprises · Config"
      breadcrumbs={['Bhoomi Enterprises', 'Item Master']}
      actions={
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="gap-1.5"
        >
          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          {syncing ? 'Syncing…' : 'Sync'}
        </Button>
      }
    >
      <div className="px-4 py-6 md:px-8 space-y-5">
        {/* Sync info banner */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3">
          <p className="text-sm text-blue-700">
            Read-only. Synced from Zoho Books.
            {lastSync && (
              <span className="font-medium"> Last sync: {lastSync}.</span>
            )}
          </p>
          <Button
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="gap-1.5 shrink-0"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            {syncing ? 'Syncing…' : 'Sync Items'}
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/30"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU…"
              className="w-full rounded-lg border border-surface-300 bg-white py-2 pl-9 pr-3 text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/30"
            />
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <ItemTable rows={itemData.content} loading={loading} />
          </div>
          <div className="px-5 pb-4">
            <Pagination
              page={page}
              size={pageSize}
              totalElements={itemData.totalElements}
              onPageChange={setPage}
              onSizeChange={setPageSize}
            />
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}

function ItemTable({ rows, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="py-16 text-center text-sm text-surface-400">
        No items found.
      </div>
    )
  }

  return (
    <table className="min-w-full divide-y divide-surface-100 text-sm">
      <thead>
        <tr className="bg-surface-50">
          {['Item Name', 'MRP', 'PKG', 'GST%', 'Purchase Rate', 'Net Rate (RM 9%)', 'Active'].map(
            (h) => (
              <th
                key={h}
                className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-500"
              >
                {h}
              </th>
            )
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-100">
        {rows.map((item) => {
          const netRate = calcNetRate(item.purchaseRate)
          const isActive = item.status === 'ACTIVE'
          return (
            <tr key={item.id} className="hover:bg-surface-50/50 transition-colors">
              <td className="px-5 py-3 font-medium text-surface-800">
                {item.name}
                {item.sku && (
                  <span className="ml-2 text-xs text-surface-400">{item.sku}</span>
                )}
              </td>
              <td className="px-5 py-3 text-surface-700 tabular-nums">
                {fmtMoney(item.mrp)}
              </td>
              <td className="px-5 py-3 text-surface-600 tabular-nums">
                {item.packing ?? '—'}
              </td>
              <td className="px-5 py-3">
                {item.gstPercent != null ? (
                  <Badge variant={gstVariant(item.gstPercent)}>
                    {Number(item.gstPercent)}%
                  </Badge>
                ) : (
                  <span className="text-surface-400">—</span>
                )}
              </td>
              <td className="px-5 py-3 text-surface-700 tabular-nums">
                {fmtMoney(item.purchaseRate)}
              </td>
              <td className="px-5 py-3 font-medium text-surface-800 tabular-nums">
                {netRate != null ? fmtMoney(netRate) : '—'}
              </td>
              <td className="px-5 py-3">
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isActive ? 'text-green-600' : 'text-red-400'
                  )}
                >
                  {isActive ? 'Yes' : 'No'}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
