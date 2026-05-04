import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import {
  listCashCustomers,
  listGstCustomers,
  createCashCustomer,
  updateCashCustomer,
} from '@/api/customers'
import { listClusters } from '@/api/clusters'
import { cn, formatPhone } from '@/utils/helpers'
import AddCashCustomerModal from './AddCashCustomerModal'

const TABS = {
  GST: 'gst',
  CASH: 'cash',
}

/**
 * Pick badge colour for B2B customer "type".
 * Source field: gstTreatment (Zoho) — we map known values to display labels.
 */
function deriveBusinessType(c) {
  const t = (c.gstTreatment || '').toLowerCase()
  if (t.includes('overseas') || t.includes('export')) return { label: 'Exporter', variant: 'purple' }
  if (t.includes('composition')) return { label: 'Distributor', variant: 'blue' }
  if (t.includes('consumer')) return { label: 'Retailer', variant: 'amber' }
  if (c.gstin) return { label: 'Wholesaler', variant: 'blue' }
  return { label: '—', variant: 'default' }
}

const fmtMoney = (v) =>
  v == null ? null : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))

const fmtDate = (v) => {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function CustomersPage() {
  const [tab, setTab] = useState(TABS.GST)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [clusterId, setClusterId] = useState('')
  const [clusters, setClusters] = useState([])

  const [gstData, setGstData] = useState({ content: [], totalElements: 0 })
  const [cashData, setCashData] = useState({ content: [], totalElements: 0 })
  const [loading, setLoading] = useState(false)

  // Per-tab pagination state
  const [gstPage, setGstPage] = useState(0)
  const [cashPage, setCashPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Load clusters once
  useEffect(() => {
    listClusters()
      .then((data) => setClusters(data || []))
      .catch(() => setClusters([]))
  }, [])

  // Reset to page 0 whenever filters change
  useEffect(() => {
    setGstPage(0)
    setCashPage(0)
  }, [debouncedSearch, clusterId, pageSize])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const baseParams = {
        q: debouncedSearch || undefined,
        clusterId: clusterId ? Number(clusterId) : undefined,
        size: pageSize,
      }
      // Only fetch the active tab. Inactive tab count is preserved from last load.
      if (tab === TABS.GST) {
        const gst = await listGstCustomers({ ...baseParams, page: gstPage })
        setGstData(gst || { content: [], totalElements: 0 })
      } else {
        const cash = await listCashCustomers({ ...baseParams, page: cashPage })
        setCashData(cash || { content: [], totalElements: 0 })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [tab, debouncedSearch, clusterId, pageSize, gstPage, cashPage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      if (editing) {
        await updateCashCustomer(editing.id, payload)
      } else {
        await createCashCustomer(payload)
      }
      setModalOpen(false)
      setEditing(null)
      await fetchData()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.message || 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (cust) => {
    setEditing(cust)
    setModalOpen(true)
  }

  const rows = tab === TABS.GST ? gstData.content : cashData.content
  const gstCount = gstData.totalElements ?? gstData.content.length
  const cashCount = cashData.totalElements ?? cashData.content.length

  return (
    <AppLayout
      title="Customers"
      subtitle="Bhoomi Enterprises · Config"
      breadcrumbs={['Bhoomi Enterprises', 'Customers']}
    >
      <div className="px-4 py-6 md:px-8 space-y-5">
        {/* Tabs */}
        <div className="border-b border-surface-200">
          <div className="flex gap-4 sm:gap-8 overflow-x-auto">
            <TabButton
              active={tab === TABS.GST}
              onClick={() => setTab(TABS.GST)}
              label={`B2B / GST (${gstCount})`}
            />
            <TabButton
              active={tab === TABS.CASH}
              onClick={() => setTab(TABS.CASH)}
              label={`Cash (${cashCount})`}
            />
          </div>
        </div>

        {/* B2B read-only banner */}
        {tab === TABS.GST && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-700">
            Read-only. Synced from Zoho Books. To edit, update in Zoho Books and sync.
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <select
              value={clusterId}
              onChange={(e) => setClusterId(e.target.value)}
              className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/30"
            >
              <option value="">All Clusters</option>
              {clusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg border border-surface-300 bg-white py-2 pl-9 pr-3 text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/30"
              />
            </div>
          </div>
          {tab === TABS.CASH && (
            <Button onClick={openAdd} className="gap-1.5 w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          )}
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            {tab === TABS.GST ? (
              <GstTable rows={rows} loading={loading} />
            ) : (
              <CashTable rows={rows} loading={loading} onEdit={openEdit} />
            )}
          </div>
          <div className="px-5 pb-4">
            <Pagination
              page={tab === TABS.GST ? gstPage : cashPage}
              size={pageSize}
              totalElements={tab === TABS.GST ? gstCount : cashCount}
              onPageChange={(p) => (tab === TABS.GST ? setGstPage(p) : setCashPage(p))}
              onSizeChange={setPageSize}
            />
          </div>
        </Card>
      </div>

      <AddCashCustomerModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSave}
        clusters={clusters}
        customer={editing}
        saving={saving}
      />
    </AppLayout>
  )
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative -mb-px whitespace-nowrap px-1 py-3 text-sm font-medium transition-colors cursor-pointer',
        active ? 'text-bhoomi-600' : 'text-surface-500 hover:text-surface-800'
      )}
    >
      {label}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-bhoomi-600" />}
    </button>
  )
}

function TableHeader({ cols }) {
  return (
    <thead className="bg-surface-50">
      <tr>
        {cols.map((c) => (
          <th
            key={c}
            className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-500"
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function LoadingRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center">
        <Spinner />
      </td>
    </tr>
  )
}

function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-surface-500">
        {message}
      </td>
    </tr>
  )
}

function GstTable({ rows, loading }) {
  const cols = ['Name', 'Type', 'Cluster', 'Phone', 'Last Rate', 'Active']
  return (
    <table className="min-w-full divide-y divide-surface-200">
      <TableHeader cols={cols} />
      <tbody className="divide-y divide-surface-100 bg-white">
        {loading ? (
          <LoadingRow colSpan={cols.length} />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={cols.length} message="No B2B customers found." />
        ) : (
          rows.map((c) => {
            const type = deriveBusinessType(c)
            const phone = c.phone || c.mobilePhone
            const lastRate = fmtDate(c.updatedAt)
            return (
              <tr key={c.id} className="hover:bg-surface-50/50">
                <td className="px-5 py-3 text-sm font-medium text-surface-900">{c.name}</td>
                <td className="px-5 py-3 text-sm">
                  <Badge variant={type.variant}>{type.label}</Badge>
                </td>
                <td className="px-5 py-3 text-sm">
                  {c.clusterName ? <Badge variant="default">{c.clusterName}</Badge> : <span className="text-surface-400">—</span>}
                </td>
                <td className="px-5 py-3 text-sm text-surface-700">
                  {phone ? formatPhone(phone) : <span className="text-surface-400">—</span>}
                </td>
                <td className="px-5 py-3 text-sm text-surface-600">{lastRate || <span className="text-surface-400">—</span>}</td>
                <td className="px-5 py-3 text-sm">
                  <Badge variant={c.status === 'ACTIVE' ? 'green' : 'red'}>
                    {c.status === 'ACTIVE' ? 'Yes' : 'No'}
                  </Badge>
                </td>
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}

function CashTable({ rows, loading, onEdit }) {
  const cols = ['Name', 'Cluster', 'Phone', 'Outstanding', '']
  return (
    <table className="min-w-full divide-y divide-surface-200">
      <TableHeader cols={cols} />
      <tbody className="divide-y divide-surface-100 bg-white">
        {loading ? (
          <LoadingRow colSpan={cols.length} />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={cols.length} message="No cash customers yet — click Add Customer." />
        ) : (
          rows.map((c) => {
            const phone = c.phone || c.mobilePhone
            const outstanding = c.receivables != null ? Number(c.receivables) : null
            return (
              <tr key={c.id} className="hover:bg-surface-50/50">
                <td className="px-5 py-3 text-sm font-medium text-surface-900">{c.name}</td>
                <td className="px-5 py-3 text-sm">
                  {c.clusterName ? <Badge variant="default">{c.clusterName}</Badge> : <span className="text-surface-400">—</span>}
                </td>
                <td className="px-5 py-3 text-sm text-surface-700">
                  {phone ? formatPhone(phone) : <span className="text-surface-400">—</span>}
                </td>
                <td className="px-5 py-3 text-sm">
                  {outstanding == null || outstanding === 0 ? (
                    <span className="text-surface-400">—</span>
                  ) : (
                    <span className={outstanding > 0 ? 'text-red-600 font-medium' : 'text-surface-700'}>
                      ₹{fmtMoney(outstanding)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(c)}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </td>
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}
