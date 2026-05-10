import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Edit2, Trash2, ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getCollection, deleteCollection, updateCollection } from '@/api/collections'
import { ROUTES } from '@/utils/constants'

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

const TYPE_LABELS = { ADVANCE: 'Advance', ON_ACCOUNT: 'On Account', AGAINST_DC: 'Against Delivery Challan' }

export default function ViewCollectionPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [collection, setCollection] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCollection(id).then(setCollection).catch(console.error).finally(() => setLoading(false))
  }, [id])

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
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      }
    >
      <div className="px-4 py-6 md:px-8 max-w-xl">
        <Card>
          <CardBody className="space-y-4">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-surface-500 font-medium">Collection Date</dt>
                <dd className="text-sm font-semibold text-surface-900">{fmtDate(collection.collectionDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Type</dt>
                <dd className="text-sm text-surface-800">{TYPE_LABELS[collection.type] || collection.type}</dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500 font-medium">Customer</dt>
                <dd className="text-sm font-medium text-surface-900">{collection.customerName}</dd>
              </div>
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
              <div>
                <dt className="text-xs text-surface-500 font-medium">Amount Collected</dt>
                <dd className="text-lg font-bold text-green-700">{fmtMoney(collection.amount)}</dd>
              </div>
              {collection.collectedBy && (
                <div>
                  <dt className="text-xs text-surface-500 font-medium">Collected By</dt>
                  <dd className="text-sm text-surface-800">{collection.collectedBy}</dd>
                </div>
              )}
              {collection.notes && (
                <div className="col-span-2">
                  <dt className="text-xs text-surface-500 font-medium">Notes</dt>
                  <dd className="text-sm text-surface-800">{collection.notes}</dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
