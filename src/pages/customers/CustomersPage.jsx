import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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

const TABS = { GST: 'gst', CASH: 'cash' }


const fmtMoney = (v) =>
  v == null ? null : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))

const fmtDate = (v) => {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

function downloadCSV(rows) {
  const headers = [
    'Name', 'Cluster', 'Phone', 'O/S Balance', 'Label',
    'Sales Till Date', 'Collection Till Date', 'Last Sales Date', 'Last Collection Date',
  ]
  const escape = (v) => {
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.name,
        r.clusterName || '',
        r.phone || '',
        r.outstanding != null ? Number(r.outstanding) : '',
        r.label || '',
        r.salesTillDate != null ? Number(r.salesTillDate) : '',
        r.collectionTillDate != null ? Number(r.collectionTillDate) : '',
        fmtDate(r.lastSalesDate) || '',
        fmtDate(r.lastCollectionDate) || '',
      ]
        .map(escape)
        .join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cash-customers-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(TABS.GST)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [clusterId, setClusterId] = useState('')
  const [clusters, setClusters] = useState([])

  const [gstData, setGstData] = useState({ content: [], totalElements: 0 })
  const [cashData, setCashData] = useState({ content: [], totalElements: 0 })
  const [loading, setLoading] = useState(false)

  const [gstPage, setGstPage] = useState(0)
  const [cashPage, setCashPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // Cash sort state
  const [cashSort, setCashSort] = useState({ by: 'outstanding', dir: 'desc' })
  const [cashLabel, setCashLabel] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    listClusters()
      .then((data) => setClusters(data || []))
      .catch(() => setClusters([]))
  }, [])

  useEffect(() => {
    setGstPage(0)
    setCashPage(0)
  }, [debouncedSearch, clusterId, pageSize, cashSort, cashLabel])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const baseParams = {
        q: debouncedSearch || undefined,
        clusterId: clusterId ? Number(clusterId) : undefined,
        size: pageSize,
      }
      if (tab === TABS.GST) {
        const gst = await listGstCustomers({ ...baseParams, page: gstPage })
        setGstData(gst || { content: [], totalElements: 0 })
      } else {
        const cash = await listCashCustomers({
          ...baseParams,
          page: cashPage,
          sortBy: cashSort.by,
          sortDir: cashSort.dir,
          label: cashLabel || undefined,
        })
        setCashData(cash || { content: [], totalElements: 0 })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [tab, debouncedSearch, clusterId, pageSize, gstPage, cashPage, cashSort, cashLabel])

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

  const handleClusterAdded = (newCluster) => setClusters((prev) => [...prev, newCluster])
  const handleClusterUpdated = (updated) =>
    setClusters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))

  const openAdd = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (cust) => { setEditing(cust); setModalOpen(true) }

  const handleCashSort = (col) => {
    setCashSort((prev) =>
      prev.by === col
        ? { by: col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { by: col, dir: col === 'outstanding' ? 'desc' : 'asc' }
    )
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
            <TabButton active={tab === TABS.GST} onClick={() => setTab(TABS.GST)} label={`B2B / GST (${gstCount})`} />
            <TabButton active={tab === TABS.CASH} onClick={() => setTab(TABS.CASH)} label={`Cash (${cashCount})`} />
          </div>
        </div>

        {tab === TABS.GST && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-700">
            Read-only. Synced from Zoho Books.
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
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {tab === TABS.CASH && (
              <select
                value={cashLabel}
                onChange={(e) => setCashLabel(e.target.value)}
                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/30"
              >
                <option value="">All Labels</option>
                <option value="Receivable">Receivable</option>
                <option value="Advance received">Advance received</option>
              </select>
            )}
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, cluster, phone…"
                className="w-full rounded-lg border border-surface-300 bg-white py-2 pl-9 pr-3 text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {tab === TABS.CASH && (
              <>
                <Button
                  variant="outline"
                  onClick={() => downloadCSV(cashData.content)}
                  className="gap-1.5"
                  title="Download as CSV (opens in Excel)"
                >
                  <Download className="h-4 w-4" /> Excel
                </Button>
                <Button onClick={openAdd} className="gap-1.5 flex-1 sm:flex-none">
                  <Plus className="h-4 w-4" /> Add Customer
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            {tab === TABS.GST ? (
              <GstTable rows={rows} loading={loading} />
            ) : (
              <CashTable
                rows={rows}
                loading={loading}
                sort={cashSort}
                onSort={handleCashSort}
                onEdit={openEdit}
                onRowClick={(c) => navigate(`/customers/cash/${c.id}`)}
              />
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
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSubmit={handleSave}
        clusters={clusters}
        onClusterAdded={handleClusterAdded}
        onClusterUpdated={handleClusterUpdated}
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

function SortIcon({ col, sort }) {
  if (sort.by !== col) return <ArrowUpDown className="h-3 w-3 ml-1 text-surface-400 inline" />
  return sort.dir === 'asc'
    ? <ArrowUp className="h-3 w-3 ml-1 text-bhoomi-600 inline" />
    : <ArrowDown className="h-3 w-3 ml-1 text-bhoomi-600 inline" />
}

const CASH_COLS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'cluster', label: 'Cluster', sortable: true },
  { key: null, label: 'Phone', sortable: false },
  { key: 'outstanding', label: 'O/S Balance', sortable: true },
  { key: null, label: 'Label', sortable: false },
  { key: 'salesTillDate', label: 'Sales Till Date', sortable: true },
  { key: 'collectionTillDate', label: 'Collection Till Date', sortable: true },
  { key: 'lastSalesDate', label: 'Last Sale', sortable: true },
  { key: 'lastCollectionDate', label: 'Last Collection', sortable: true },
  { key: null, label: '', sortable: false },
]

function LabelBadge({ label }) {
  if (!label) return <span className="text-surface-400">—</span>
  if (label === 'Receivable') return <Badge variant="amber">{label}</Badge>
  if (label === 'Advance received') return <Badge variant="green">{label}</Badge>
  return <Badge variant="default">{label}</Badge>
}

function OutstandingCell({ value }) {
  if (value == null) return <span className="text-surface-400">—</span>
  const n = Number(value)
  if (n === 0) return <span className="text-surface-400">—</span>
  if (n > 0) return <span className="font-medium text-red-600">₹{fmtMoney(n)}</span>
  return <span className="font-medium text-green-600">(₹{fmtMoney(Math.abs(n))})</span>
}

function CashTable({ rows, loading, sort, onSort, onEdit, onRowClick }) {
  return (
    <table className="min-w-full divide-y divide-surface-200">
      <thead className="bg-surface-50">
        <tr>
          {CASH_COLS.map((col, i) => (
            <th
              key={col.label + i}
              onClick={col.sortable && col.key ? () => onSort(col.key) : undefined}
              className={cn(
                'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-500 whitespace-nowrap',
                col.sortable && col.key ? 'cursor-pointer select-none hover:text-surface-800' : ''
              )}
            >
              {col.label}
              {col.sortable && col.key && <SortIcon col={col.key} sort={sort} />}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-100 bg-white">
        {loading ? (
          <tr>
            <td colSpan={CASH_COLS.length} className="px-5 py-10 text-center">
              <Spinner />
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={CASH_COLS.length} className="px-5 py-10 text-center text-sm text-surface-500">
              No cash customers yet — click Add Customer.
            </td>
          </tr>
        ) : (
          rows.map((c) => (
            <tr
              key={c.id}
              className="hover:bg-surface-50/50 cursor-pointer"
              onClick={() => onRowClick(c)}
            >
              <td className="px-4 py-3 text-sm font-medium text-surface-900">{c.name}</td>
              <td className="px-4 py-3 text-sm">
                {c.clusterName
                  ? <Badge variant="default">{c.clusterName}</Badge>
                  : <span className="text-surface-400">—</span>}
              </td>
              <td className="px-4 py-3 text-sm text-surface-700">
                {c.phone ? formatPhone(c.phone) : <span className="text-surface-400">—</span>}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums">
                <OutstandingCell value={c.outstanding} />
              </td>
              <td className="px-4 py-3 text-sm">
                <LabelBadge label={c.label} />
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-surface-700">
                {c.salesTillDate != null && Number(c.salesTillDate) !== 0
                  ? `₹${fmtMoney(c.salesTillDate)}`
                  : <span className="text-surface-400">—</span>}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-surface-700">
                {c.collectionTillDate != null && Number(c.collectionTillDate) !== 0
                  ? `₹${fmtMoney(c.collectionTillDate)}`
                  : <span className="text-surface-400">—</span>}
              </td>
              <td className="px-4 py-3 text-sm text-surface-600 whitespace-nowrap">
                {fmtDate(c.lastSalesDate) || <span className="text-surface-400">—</span>}
              </td>
              <td className="px-4 py-3 text-sm text-surface-600 whitespace-nowrap">
                {fmtDate(c.lastCollectionDate) || <span className="text-surface-400">—</span>}
              </td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" onClick={() => onEdit(c)} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              </td>
            </tr>
          ))
        )}
      </tbody>
      {/* Totals row */}
      {!loading && rows.length > 0 && (
        <tfoot className="bg-surface-50 border-t-2 border-surface-200">
          <tr>
            <td className="px-4 py-3 text-xs font-semibold text-surface-700">
              Total ({rows.length})
            </td>
            <td colSpan={2} />
            <td className="px-4 py-3 text-sm font-semibold tabular-nums text-red-600">
              ₹{fmtMoney(rows.reduce((s, r) => s + (Number(r.outstanding) || 0), 0))}
            </td>
            <td />
            <td className="px-4 py-3 text-sm font-semibold tabular-nums text-surface-700">
              ₹{fmtMoney(rows.reduce((s, r) => s + (Number(r.salesTillDate) || 0), 0))}
            </td>
            <td className="px-4 py-3 text-sm font-semibold tabular-nums text-surface-700">
              ₹{fmtMoney(rows.reduce((s, r) => s + (Number(r.collectionTillDate) || 0), 0))}
            </td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      )}
    </table>
  )
}

const GST_COLS = [
  'Customer Name',
  'Billing Address',
  'Shipping Address',
  'GSTIN',
  'Place of Supply',
  'Mobile Phone',
]

function GstTable({ rows, loading }) {
  return (
    <table className="min-w-full divide-y divide-surface-200">
      <thead className="bg-surface-50">
        <tr>
          {GST_COLS.map((col) => (
            <th key={col} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-surface-500 whitespace-nowrap">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-100 bg-white">
        {loading ? (
          <tr>
            <td colSpan={GST_COLS.length} className="px-5 py-10 text-center"><Spinner /></td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={GST_COLS.length} className="px-5 py-10 text-center text-sm text-surface-500">No B2B customers found.</td>
          </tr>
        ) : (
          rows.map((c) => (
            <tr key={c.id} className="hover:bg-surface-50/50">
              <td className="px-5 py-3 text-sm font-medium text-surface-900">{c.name || <span className="text-surface-400">—</span>}</td>
              <td className="px-5 py-3 text-sm text-surface-700 max-w-xs whitespace-pre-line">
                {c.billingAddress || <span className="text-surface-400">—</span>}
              </td>
              <td className="px-5 py-3 text-sm text-surface-700 max-w-xs whitespace-pre-line">
                {c.shippingAddress || <span className="text-surface-400">—</span>}
              </td>
              <td className="px-5 py-3 text-sm font-mono text-surface-800">
                {c.gstin || <span className="text-surface-400">—</span>}
              </td>
              <td className="px-5 py-3 text-sm text-surface-700">
                {c.placeOfSupply || <span className="text-surface-400">—</span>}
              </td>
              <td className="px-5 py-3 text-sm text-surface-700">
                {c.mobilePhone ? formatPhone(c.mobilePhone) : <span className="text-surface-400">—</span>}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
