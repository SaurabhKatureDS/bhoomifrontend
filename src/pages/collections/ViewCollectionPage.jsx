import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Edit2, Trash2, Save, X } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getCollection, deleteCollection, updateCollection } from '@/api/collections'
import { ROUTES } from '@/utils/constants'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

const TYPE_LABELS = { ADVANCE: 'Advance', ON_ACCOUNT: 'On Account', AGAINST_DC: 'Against Delivery Challan' }
const TYPES = [
  { value: 'ADVANCE', label: 'Advance' },
  { value: 'ON_ACCOUNT', label: 'On Account' },
  { value: 'AGAINST_DC', label: 'Against Delivery Challan' },
]

export default function ViewCollectionPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [collection, setCollection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    getCollection(id).then(setCollection).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const startEdit = () => {
    setForm({
      collectionDate: collection.collectionDate || '',
      amount: collection.amount || '',
      collectedBy: collection.collectedBy || '',
      type: collection.type || 'AGAINST_DC',
      notes: collection.notes || '',
      customerId: collection.customerId,
      allocations: (collection.allocations || []).map(a => ({
        challanId: a.challanId,
        amountAdjusted: a.amountAdjusted,
      })),
    })
    setErrors({})
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setForm({})
    setErrors({})
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const errs = {}
    if (!form.collectionDate) errs.collectionDate = 'Required'
    const amt = Math.round(Number(form.amount))
    if (!form.amount || amt <= 0) errs.amount = 'Enter a valid amount'
    if (!form.collectedBy?.trim()) errs.collectedBy = 'Required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      const payload = {
        customerId: form.customerId,
        collectionDate: form.collectionDate,
        amount: amt,
        collectedBy: form.collectedBy,
        type: form.type,
        notes: form.notes || undefined,
        allocations: form.type === 'AGAINST_DC' ? form.allocations : undefined,
      }
      const updated = await updateCollection(id, payload)
      setCollection(updated)
      setEditing(false)
    } catch (e) {
      setErrors({ submit: e.message || 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this collection record?')) return
    try { await deleteCollection(id); navigate(ROUTES.COLLECTIONS) }
    catch (e) { alert(e.message) }
  }

  if (loading) return <AppLayout title="Collection"><div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div></AppLayout>
  if (!collection) return <AppLayout title="Collection"><div className="px-8 py-16 text-center text-surface-500">Collection not found.</div></AppLayout>

  return (
    <AppLayout
      title={`Collection #${collection.id}`}
      breadcrumbs={['Cash Sales', 'Collections', `#${collection.id}`]}
      actions={
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="secondary" size="sm" onClick={startEdit}>
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={cancelEdit} disabled={saving}>
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="px-4 py-6 md:px-8 max-w-xl">
        <Card>
          <CardBody className="space-y-4">
            {errors.submit && (
              <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                {errors.submit}
              </div>
            )}

            <dl className="grid grid-cols-2 gap-4">
              {/* Collection Date */}
              <div>
                <dt className="text-xs text-surface-500 font-medium">Collection Date</dt>
                {editing ? (
                  <>
                    <input
                      type="date"
                      value={form.collectionDate}
                      onChange={e => set('collectionDate', e.target.value)}
                      className={`mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 ${errors.collectionDate ? 'border-red-400' : 'border-surface-300'}`}
                    />
                    {errors.collectionDate && <p className="mt-1 text-xs text-red-500">{errors.collectionDate}</p>}
                  </>
                ) : (
                  <dd className="text-sm font-semibold text-surface-900">{fmtDate(collection.collectionDate)}</dd>
                )}
              </div>

              {/* Type */}
              <div>
                <dt className="text-xs text-surface-500 font-medium">Type</dt>
                {editing ? (
                  <select
                    value={form.type}
                    onChange={e => set('type', e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500"
                  >
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                ) : (
                  <dd className="text-sm text-surface-800">{TYPE_LABELS[collection.type] || collection.type}</dd>
                )}
              </div>

              {/* Customer (read-only even in edit mode) */}
              <div>
                <dt className="text-xs text-surface-500 font-medium">Customer</dt>
                <dd className="text-sm font-medium text-surface-900">{collection.customerName}</dd>
              </div>

              {/* Challan # */}
              {collection.allocations?.[0]?.challanNumber && (
                <div>
                  <dt className="text-xs text-surface-500 font-medium">Challan #</dt>
                  <dd
                    className="text-sm text-bhoomi-700 font-medium cursor-pointer hover:underline"
                    onClick={() => navigate(ROUTES.CHALLAN_VIEW.replace(':id', collection.allocations[0].challanId))}
                  >
                    {collection.allocations[0].challanNumber}
                  </dd>
                </div>
              )}

              {/* Amount Collected */}
              <div>
                <dt className="text-xs text-surface-500 font-medium">Amount Collected</dt>
                {editing ? (
                  <>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.amount}
                      onChange={e => { set('amount', e.target.value); setErrors(v => ({ ...v, amount: undefined })) }}
                      placeholder="₹ amount"
                      className={`mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 ${errors.amount ? 'border-red-400' : 'border-surface-300'}`}
                    />
                    {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                  </>
                ) : (
                  <dd className="text-lg font-bold text-green-700">{fmtMoney(collection.amount)}</dd>
                )}
              </div>

              {/* Collected By */}
              <div>
                <dt className="text-xs text-surface-500 font-medium">Collected By</dt>
                {editing ? (
                  <>
                    <input
                      type="text"
                      value={form.collectedBy}
                      onChange={e => { set('collectedBy', e.target.value); setErrors(v => ({ ...v, collectedBy: undefined })) }}
                      className={`mt-1 w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 ${errors.collectedBy ? 'border-red-400' : 'border-surface-300'}`}
                    />
                    {errors.collectedBy && <p className="mt-1 text-xs text-red-500">{errors.collectedBy}</p>}
                  </>
                ) : (
                  collection.collectedBy && <dd className="text-sm text-surface-800">{collection.collectedBy}</dd>
                )}
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <dt className="text-xs text-surface-500 font-medium">Notes</dt>
                {editing ? (
                  <textarea
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 resize-none"
                  />
                ) : (
                  collection.notes
                    ? <dd className="text-sm text-surface-800">{collection.notes}</dd>
                    : <dd className="text-sm text-surface-400 italic">No notes</dd>
                )}
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
