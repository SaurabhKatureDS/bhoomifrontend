import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit2, Truck, CheckCircle, Trash2, Plus, Printer } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getChallan, getChallanTimeline, markDispatched, markDelivered, deleteChallan } from '@/api/challans'
import { listCollections, createCollection } from '@/api/collections'
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

const fmtDateTime = (v) => {
  if (!v) return '—'
  return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function TimelineStep({ label, date, user, active, done }) {
  return (
    <div className={cn('flex items-start gap-3 pb-6 relative', !done && !active && 'opacity-40')}>
      <div className={cn(
        'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10',
        done ? 'bg-green-500 border-green-500 text-white' : active ? 'bg-bhoomi-500 border-bhoomi-500 text-white' : 'bg-white border-surface-300'
      )}>
        {done ? <CheckCircle className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current block" />}
      </div>
      <div>
        <div className="text-sm font-semibold text-surface-800">{label}</div>
        {date && <div className="text-xs text-surface-500">{fmtDateTime(date)}{user ? ` · ${user}` : ''}</div>}
      </div>
    </div>
  )
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
      const [c, tl, cols] = await Promise.all([
        getChallan(id),
        getChallanTimeline(id).catch(() => []),
        listCollections({ challanId: id }).catch(() => ({ content: [] })),
      ])
      setChallan(c)
      setTimeline(Array.isArray(tl) ? tl : [])
      setCollections(cols?.content || cols || [])
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
  const tl = {
    SAVED:      timeline.find(t => t.status === 'SAVED'),
    DISPATCHED: timeline.find(t => t.status === 'DISPATCHED'),
    DELIVERED:  timeline.find(t => t.status === 'DELIVERED'),
  }

  return (
    <AppLayout
      title={challan.challanNumber || `Challan #${id}`}
      breadcrumbs={['Cash Sales', 'Challans', challan.challanNumber || id]}
      actions={
        <div className="flex gap-2 items-center">
          <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border', st.className)}>
            {st.label}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.CHALLAN_EDIT.replace(':id', id))}>
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
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.CHALLAN_PRINT.replace(':id', id))}>
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

          {/* Collection History */}
          <Card>
            <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-surface-800">Collection History</h3>
                <div className="flex gap-4 mt-1 text-xs">
                  <span className="text-green-700 font-medium">Received: {fmtMoney(challan.totalCollected)}</span>
                  <span className={cn('font-medium', balance > 0 ? 'text-red-600' : 'text-surface-500')}>
                    Balance: {balance > 0 ? fmtMoney(balance) : '—'}
                  </span>
                </div>
              </div>
              <Button size="sm" onClick={() => setShowRecordCollection(true)}>
                <Plus className="h-4 w-4" /> Record Collection
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Collected By</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Type</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {collections.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-xs text-surface-400">No collections recorded.</td>
                    </tr>
                  ) : (
                    collections.map(c => (
                      <tr key={c.id} className="hover:bg-surface-50 cursor-pointer" onClick={() => navigate(ROUTES.COLLECTION_VIEW.replace(':id', c.id))}>
                        <td className="px-3 py-2 text-surface-700">{fmtDate(c.collectionDate)}</td>
                        <td className="px-3 py-2 text-surface-700">{c.collectedBy}</td>
                        <td className="px-3 py-2 text-surface-500">{c.type}</td>
                        <td className="px-3 py-2 text-right font-medium text-green-700">{fmtMoney(c.collectedAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar: Timeline */}
        <div className="space-y-4">
          <Card>
            <div className="px-4 py-3 border-b border-surface-200">
              <h3 className="text-sm font-semibold text-surface-800">Timeline</h3>
            </div>
            <CardBody className="py-4">
              <div className="relative">
                {/* vertical line */}
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-surface-200" />
                <TimelineStep label="Saved" date={tl.SAVED?.eventAt} user={tl.SAVED?.userName} active={status === 'SAVED'} done={['DISPATCHED','DELIVERED','PAID'].includes(status)} />
                <TimelineStep label="Dispatched" date={tl.DISPATCHED?.eventAt} user={tl.DISPATCHED?.userName} active={status === 'DISPATCHED'} done={['DELIVERED','PAID'].includes(status)} />
                <TimelineStep label="Delivered" date={tl.DELIVERED?.eventAt} user={tl.DELIVERED?.userName} active={status === 'DELIVERED'} done={['PAID'].includes(status)} />
                <TimelineStep label="Paid" date={null} user={null} active={status === 'PAID'} done={status === 'PAID'} />
              </div>
            </CardBody>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardBody className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">Challan Amount</span>
                <span className="font-semibold text-surface-900">{fmtMoney(challan.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">Collected</span>
                <span className="font-semibold text-green-700">{fmtMoney(challan.totalCollected)}</span>
              </div>
              <div className="border-t border-surface-200 pt-3 flex justify-between text-sm">
                <span className="font-semibold text-surface-800">Balance</span>
                <span className={cn('font-bold', balance > 0 ? 'text-red-600' : 'text-green-700')}>
                  {balance > 0 ? fmtMoney(balance) : '—'}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {showRecordCollection && (
        <RecordCollectionModal
          challanId={id}
          challanNumber={challan.challanNumber}
          customerId={challan.customerId}
          customerName={challan.customerName}
          balance={balance}
          onClose={() => setShowRecordCollection(false)}
          onSuccess={() => { setShowRecordCollection(false); load() }}
        />
      )}
    </AppLayout>
  )
}

function RecordCollectionModal({ challanId, challanNumber, customerId, customerName, balance, onClose, onSuccess }) {
  const [form, setForm] = useState({
    collectionDate: new Date().toISOString().slice(0, 10),
    amount: '',
    collectedBy: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Enter a valid amount.')
      return
    }
    const amt = Math.round(Number(form.amount))
    setSaving(true)
    try {
      await createCollection({
        customerId,
        collectionDate: form.collectionDate,
        amount: amt,
        collectedBy: form.collectedBy,
        type: 'AGAINST_DC',
        notes: form.notes || undefined,
        allocations: [{ challanId: Number(challanId), amountAdjusted: amt }],
      })
      onSuccess()
    } catch (e) {
      alert(e.message || 'Failed to record collection')
    } finally {
      setSaving(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open title="Record Collection" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-surface-600 mb-1">Collection Date</label>
          <input type="date" value={form.collectionDate} onChange={e => set('collectionDate', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-600 mb-1">Customer</label>
          <input value={customerName} readOnly className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 bg-surface-50 text-surface-500 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-600 mb-1">
            Amount Collected *{balance > 0 && <span className="ml-2 text-red-500 font-normal">O/S: ₹{balance.toLocaleString('en-IN')}</span>}
          </label>
          <input type="number" min={1} step={1} value={form.amount} onChange={e => set('amount', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-600 mb-1">Collected By</label>
          <input type="text" value={form.collectedBy} onChange={e => set('collectedBy', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-600 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 resize-none" />
        </div>
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : null}
          Save
        </Button>
      </ModalFooter>
    </Modal>
  )
}
