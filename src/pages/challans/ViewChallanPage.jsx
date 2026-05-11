import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Edit2, Truck, CheckCircle, Trash2, Plus, Printer,
  FilePlus2, PackageCheck, Archive, IndianRupee, ClipboardList,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ActivityTimeline } from '@/components/ui/ActivityTimeline'
import { getChallan, getChallanTimeline, markDispatched, markDelivered, deleteChallan } from '@/api/challans'
import { listCollections } from '@/api/collections'
import RecordCollectionModal from '@/pages/collections/RecordCollectionModal'
import { cn } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'

const STATUS_META = {
  SAVED:      { label: 'Saved',      className: 'bg-surface-100 text-surface-600 border-surface-300', step: 1 },
  DISPATCHED: { label: 'Dispatched', className: 'bg-amber-50 text-amber-700 border-amber-200',  step: 2 },
  DELIVERED:  { label: 'Delivered',  className: 'bg-blue-50 text-blue-700 border-blue-200',     step: 3 },
  PAID:       { label: 'Paid',       className: 'bg-green-50 text-green-700 border-green-200',  step: 4 },
  ARCHIVED:   { label: 'Archived',   className: 'bg-red-50 text-red-700 border-red-200',        step: 0 },
}

const fmtMoney = (v) =>
  v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))

const fmtDate = (v) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

const EVENT_META = {
  SAVED: {
    icon: FilePlus2,
    iconClassName: 'bg-blue-100 text-blue-600',
    badge: 'Created',
    badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  DISPATCHED: {
    icon: Truck,
    iconClassName: 'bg-amber-100 text-amber-600',
    badge: 'Dispatched',
    badgeClassName: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  DELIVERED: {
    icon: PackageCheck,
    iconClassName: 'bg-indigo-100 text-indigo-600',
    badge: 'Delivered',
    badgeClassName: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  PAID: {
    icon: IndianRupee,
    iconClassName: 'bg-green-100 text-green-600',
    badge: 'Paid',
    badgeClassName: 'bg-green-50 text-green-700 border-green-200',
  },
  ARCHIVED: {
    icon: Archive,
    iconClassName: 'bg-red-100 text-red-500',
    badge: 'Archived',
    badgeClassName: 'bg-red-50 text-red-600 border-red-200',
  },
}

const EVENT_TITLES = {
  SAVED:      'Challan Created',
  DISPATCHED: 'Dispatched for Delivery',
  DELIVERED:  'Delivery Confirmed',
  PAID:       'Fully Paid',
  ARCHIVED:   'Challan Archived',
}

/** Build a unified, sorted activity list from timeline + collection entries */
function buildActivityEvents(timeline, collections, challan) {
  const events = []

  for (const t of timeline) {
    const meta = EVENT_META[t.event] ?? {
      icon: ClipboardList,
      iconClassName: 'bg-surface-100 text-surface-500',
    }
    let description = null
    if (t.event === 'SAVED' && challan) {
      const items = challan.items?.length ?? 0
      const amt = challan.totalAmount
      description = [
        items ? `${items} product${items !== 1 ? 's' : ''}` : null,
        amt != null ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(amt))}` : null,
      ].filter(Boolean).join(' · ')
    }
    events.push({
      id: `tl-${t.id}`,
      ...meta,
      title: EVENT_TITLES[t.event] ?? t.event,
      description: description || t.note || null,
      note: description ? (t.note || null) : null,
      timestamp: t.occurredAt ?? t.eventAt,
      user: t.userName || (t.userId ? `User #${t.userId}` : null),
    })
  }

  for (const col of collections) {
    events.push({
      id: `col-${col.id}`,
      icon: IndianRupee,
      iconClassName: 'bg-green-100 text-green-600',
      title: 'Payment Recorded',
      badge: col.type ?? null,
      badgeClassName: 'bg-green-50 text-green-700 border-green-200',
      description: col.notes || null,
      note: null,
      timestamp: col.createdAt ?? col.collectionDate,
      user: col.collectedBy || null,
      amount: col._challanAmount ?? col.amount,
      amountClassName: 'text-green-700',
    })
  }

  // Sort chronologically (oldest first)
  events.sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
    return ta - tb
  })

  return events
}

export default function ViewChallanPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [challan, setChallan] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [showRecordCollection, setShowRecordCollection] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [c, tl] = await Promise.all([
        getChallan(id),
        getChallanTimeline(id).catch(() => []),
      ])
      setChallan(c)
      setTimeline(Array.isArray(tl) ? tl : [])
      // Fetch collections by customer then filter to those allocated to this challan
      const challanIdNum = Number(id)
      const cols = await listCollections({ customerId: c.customerId, size: 200 }).catch(() => ({ content: [] }))
      const allCols = cols?.content || cols || []
      const filtered = allCols
        .map(col => {
          const alloc = (col.allocations || []).find(a => a.challanId === challanIdNum)
          if (!alloc) return null
          return { ...col, _challanAmount: alloc.amountAdjusted }
        })
        .filter(Boolean)
      setCollections(filtered)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleDispatch = async () => {
    setActing(true)
    try { await markDispatched(id); load() } catch (e) { alert(e.message) } finally { setActing(false) }
  }

  const handleDeliver = async () => {
    setActing(true)
    try { await markDelivered(id); load() } catch (e) { alert(e.message) } finally { setActing(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Archive this challan?')) return
    try { await deleteChallan(id); navigate(ROUTES.CHALLANS) } catch (e) { alert(e.message) }
  }

  if (loading) return (
    <AppLayout title="Challan">
      <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
    </AppLayout>
  )

  if (!challan) return (
    <AppLayout title="Challan">
      <div className="px-8 py-16 text-center text-surface-500">Challan not found.</div>
    </AppLayout>
  )

  const status = challan.status || 'SAVED'
  const st = STATUS_META[status] || STATUS_META.SAVED
  const balance = (challan.totalAmount || 0) - (challan.totalCollected || 0)
  const totalCases = challan.items?.reduce((sum, l) => sum + (Number(l.cases) || 0), 0) || challan.totalCases || 0
  const activityEvents = buildActivityEvents(timeline, collections, challan)

  return (
    <AppLayout
      title={challan.challanNumber || `Challan #${id}`}
      breadcrumbs={['Cash Sales', 'Challans', challan.challanNumber || id]}
      actions={
        <div className="flex gap-2 items-center">
          <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border', st.className)}>
            {st.label}
          </span>
          <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.CHALLAN_EDIT.replace(':id', id))}>
            <Edit2 className="h-4 w-4" /> Edit
          </Button>
          {status === 'SAVED' && (
            <Button variant="secondary" size="sm" onClick={handleDispatch} disabled={acting}>
              <Truck className="h-4 w-4" /> Mark Dispatched
            </Button>
          )}
          {status === 'DISPATCHED' && (
            <Button variant="secondary" size="sm" onClick={handleDeliver} disabled={acting}>
              <CheckCircle className="h-4 w-4" /> Mark Delivered
            </Button>
          )}
          {!['PAID', 'ARCHIVED'].includes(status) && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Archive
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => window.open(ROUTES.CHALLAN_PRINT.replace(':id', id), '_blank')}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      }
    >
      <div className="px-4 py-6 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Challan Details */}
          <Card>
            <div className="px-4 py-3 border-b border-surface-200">
              <h3 className="text-sm font-semibold text-surface-800">Challan Details</h3>
            </div>
            <CardBody className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-xs text-surface-500 font-medium">Challan #</dt>
                <dd className="text-sm font-semibold text-bhoomi-700">{challan.challanNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Date</dt>
                <dd className="text-sm text-surface-800">{fmtDate(challan.challanDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Customer</dt>
                <dd className="text-sm font-medium text-surface-800">{challan.customerName}</dd>
                {challan.clusterSnapshot && <dd className="text-xs text-surface-500">{challan.clusterSnapshot}</dd>}
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Location</dt>
                <dd className="text-sm text-surface-800">{challan.locationName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Total Cases</dt>
                <dd className="text-sm font-medium text-surface-800">{totalCases}</dd>
              </div>
              {challan.notes && (
                <div className="col-span-2 md:col-span-3">
                  <dt className="text-xs text-surface-500 font-medium">Notes</dt>
                  <dd className="text-sm text-surface-800">{challan.notes}</dd>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Line items */}
          <Card>
            <div className="px-4 py-3 border-b border-surface-200">
              <h3 className="text-sm font-semibold text-surface-800">Products</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">SKU</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Pack</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Cases</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Units</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Rate Mode</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {(challan.items || []).map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium text-surface-800">{item.productName}</td>
                      <td className="px-3 py-2 text-surface-500">{item.sku}</td>
                      <td className="px-3 py-2 text-surface-500">{item.packing}</td>
                      <td className="px-3 py-2 text-surface-700">{item.cases}</td>
                      <td className="px-3 py-2 text-surface-500">{(item.cases || 0) * (parseInt(item.packing) || 1)}</td>
                      <td className="px-3 py-2 text-surface-500">{item.rateMode}</td>
                      <td className="px-3 py-2 text-right font-medium text-surface-900">{fmtMoney(item.lineAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-200 bg-surface-50">
                    <td colSpan={6} className="px-3 py-3 text-right font-semibold text-surface-700">Total</td>
                    <td className="px-3 py-3 text-right font-bold text-surface-900">{fmtMoney(challan.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Collection Status + History */}
          <Card>
            {/* Stat row */}
            <div className="px-4 pt-4 pb-3 border-b border-surface-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-surface-800">Collection Status</h3>
                <Button size="sm" onClick={() => setShowRecordCollection(true)} disabled={balance <= 0}>
                  <Plus className="h-4 w-4" /> Record Collection
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-surface-50 border border-surface-200 px-3 py-3">
                  <p className="text-xs text-surface-500 font-medium mb-1">Challan Amount</p>
                  <p className="text-base font-bold text-surface-900">{fmtMoney(challan.totalAmount)}</p>
                </div>
                <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-3">
                  <p className="text-xs text-green-700 font-medium mb-1">Received</p>
                  <p className="text-base font-bold text-green-700">{fmtMoney(challan.totalCollected)}</p>
                </div>
                <div className={cn('rounded-xl border px-3 py-3', balance > 0 ? 'bg-red-50 border-red-200' : 'bg-surface-50 border-surface-200')}>
                  <p className={cn('text-xs font-medium mb-1', balance > 0 ? 'text-red-600' : 'text-surface-500')}>Balance Due</p>
                  <p className={cn('text-base font-bold', balance > 0 ? 'text-red-600' : 'text-surface-400')}>
                    {balance > 0 ? fmtMoney(balance) : '—'}
                  </p>
                </div>
              </div>
            </div>
            {/* Collection history table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Collection Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Collected By</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Collected Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {collections.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-xs text-surface-400">No collections recorded yet.</td>
                    </tr>
                  ) : (
                    collections.map(c => (
                      <tr key={c.id} className="hover:bg-surface-50 cursor-pointer" onClick={() => navigate(ROUTES.COLLECTION_VIEW.replace(':id', c.id))}>
                        <td className="px-3 py-2.5 text-surface-700">{fmtDate(c.collectionDate)}</td>
                        <td className="px-3 py-2.5 text-surface-700">{c.collectedBy || '—'}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-green-700">{fmtMoney(c._challanAmount ?? c.collectedAmount ?? c.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {collections.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-surface-200 bg-surface-50">
                      <td colSpan={2} className="px-3 py-2 text-right text-xs font-semibold text-surface-600">Total Collected</td>
                      <td className="px-3 py-2 text-right font-bold text-green-700 text-sm">{fmtMoney(challan.totalCollected)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar: Activity History */}
        <div className="space-y-4">
          <Card>
            <div className="px-4 py-3 border-b border-surface-200">
              <h3 className="text-sm font-semibold text-surface-800">Activity History</h3>
              <p className="text-xs text-surface-400 mt-0.5">{activityEvents.length} event{activityEvents.length !== 1 ? 's' : ''}</p>
            </div>
            <CardBody className="py-4">
              <ActivityTimeline events={activityEvents} />
            </CardBody>
          </Card>
        </div>
      </div>

      {showRecordCollection && (
        <RecordCollectionModal
          prefillChallanId={Number(id)}
          prefillCustomerId={challan.customerId}
          onClose={() => setShowRecordCollection(false)}
          onSuccess={() => { setShowRecordCollection(false); load() }}
        />
      )}
    </AppLayout>
  )
}
