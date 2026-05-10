import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Save, Truck, CheckCircle, Eye, Printer, ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  createChallan, updateChallan, getChallan,
  markDispatched, markDelivered, deleteChallan,
} from '@/api/challans'
import { listLocations } from '@/api/locations'
import { apiGet } from '@/api/client'
import { cn } from '@/utils/helpers'
import { ROUTES } from '@/utils/constants'

const RATE_MODES = [
  { value: 'NET',       label: 'Net Rate' },
  { value: 'DISC_TUR',  label: 'Disc % TUR' },
  { value: 'DISC_MRP',  label: 'Disc % MRP' },
  { value: 'ADHOC',     label: 'Adhoc' },
]

const STATUS_META = {
  SAVED:      { label: 'Saved',      className: 'bg-surface-100 text-surface-600' },
  DISPATCHED: { label: 'Dispatched', className: 'bg-amber-100 text-amber-700' },
  DELIVERED:  { label: 'Delivered',  className: 'bg-blue-100 text-blue-700' },
  PAID:       { label: 'Paid',       className: 'bg-green-100 text-green-700' },
}

const emptyLine = () => ({
  _key: Math.random().toString(36).slice(2),
  itemId: '',
  sku: '',
  productName: '',
  packing: '',
  mrp: '',
  gstRate: '',
  cases: '',
  rateMode: 'NET',
  netRate: '',
  discPct: '',
  adhocAmount: '',
  lineTotal: '',
})

function calcLineTotal(line) {
  const cases = Number(line.cases) || 0
  if (line.rateMode === 'NET') {
    return cases * (Number(line.netRate) || 0)
  }
  if (line.rateMode === 'DISC_TUR' || line.rateMode === 'DISC_MRP') {
    const mrp = Number(line.mrp) || 0
    const disc = Number(line.discPct) || 0
    return cases * mrp * (1 - disc / 100)
  }
  if (line.rateMode === 'ADHOC') {
    return Number(line.adhocAmount) || 0
  }
  return 0
}

export default function NewChallanPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [status, setStatus] = useState('SAVED')
  const [challanNumber, setChallanNumber] = useState('')
  const [challanDate, setChallanDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [locationId, setLocationId] = useState('')
  const [locations, setLocations] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [items, setItems] = useState([])
  const [lines, setLines] = useState([emptyLine()])
  const customerRef = useRef(null)

  // Load reference data
  useEffect(() => {
    Promise.all([
      listLocations(),
      apiGet('/api/v1/cash-customers', { page: 0, size: 200 }),
      apiGet('/api/v1/items', { page: 0, size: 500 }),
    ]).then(([locs, custs, itms]) => {
      setLocations(Array.isArray(locs) ? locs : locs?.content || [])
      setCustomers(custs?.content || custs || [])
      setItems(itms?.content || itms || [])
    })
  }, [])

  // Load challan for edit
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    getChallan(id).then(c => {
      setChallanNumber(c.challanNumber || '')
      setChallanDate(c.challanDate || new Date().toISOString().slice(0, 10))
      setNotes(c.notes || '')
      setLocationId(c.locationId || '')
      setStatus(c.status || 'SAVED')
      setSelectedCustomer({ id: c.customerId, name: c.customerName, clusterName: c.clusterSnapshot })
      setCustomerSearch(c.customerName || '')
      setLines((c.items || []).map(l => ({
        _key: Math.random().toString(36).slice(2),
        itemId: l.itemId,
        sku: l.sku,
        productName: l.productName,
        packing: l.packing,
        mrp: l.mrp,
        gstRate: l.gstRate,
        cases: l.cases,
        rateMode: l.rateMode || 'NET',
        netRate: l.netRate || '',
        discPct: l.discPct || '',
        adhocAmount: l.adhocAmount || '',
        lineTotal: l.lineTotal || '',
      })))
    }).finally(() => setLoading(false))
  }, [id, isEdit])

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.name?.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 25)

  const handleCustomerSelect = (c) => {
    setSelectedCustomer(c)
    setCustomerSearch(c.name)
    setCustomerDropdownOpen(false)
  }

  const handleItemSelect = (idx, itemId) => {
    const item = items.find(i => String(i.id) === String(itemId))
    if (!item) return
    setLines(ls => ls.map((l, i) => i === idx ? {
      ...l,
      itemId: item.id,
      sku: item.sku || '',
      productName: item.name || '',
      packing: item.standardPacking || item.packing || '',
      mrp: item.mrp || '',
      gstRate: item.gstRate || '',
      lineTotal: calcLineTotal({ ...l, itemId: item.id, packing: item.standardPacking || item.packing || '', mrp: item.mrp || '' }),
    } : l))
  }

  const updateLine = (idx, field, value) => {
    setLines(ls => ls.map((l, i) => {
      if (i !== idx) return l
      const updated = { ...l, [field]: value }
      updated.lineTotal = calcLineTotal(updated)
      return updated
    }))
  }

  const addLine = () => setLines(ls => [...ls, emptyLine()])
  const removeLine = (idx) => setLines(ls => ls.filter((_, i) => i !== idx))

  const totalAmount = lines.reduce((sum, l) => sum + (Number(l.lineTotal) || 0), 0)

  const buildPayload = () => ({
    customerId: selectedCustomer?.id,
    challanDate,
    locationId: locationId || undefined,
    notes: notes || undefined,
    items: lines.filter(l => l.itemId).map(l => ({
      itemId: l.itemId,
      cases: Number(l.cases) || 0,
      rateMode: l.rateMode,
      netRate: l.rateMode === 'NET' ? Number(l.netRate) || undefined : undefined,
      discPct: ['DISC_TUR', 'DISC_MRP'].includes(l.rateMode) ? Number(l.discPct) || undefined : undefined,
      lineAmount: Number(l.lineTotal) || undefined,
      adhoc: l.rateMode === 'ADHOC' ? true : undefined,
    })),
  })

  const handleSave = async () => {
    if (!selectedCustomer) { alert('Please select a customer.'); return }
    setSaving(true)
    try {
      const payload = buildPayload()
      if (isEdit) {
        await updateChallan(id, payload)
        navigate(ROUTES.CHALLAN_VIEW.replace(':id', id))
      } else {
        const challan = await createChallan(payload)
        navigate(ROUTES.CHALLAN_VIEW.replace(':id', challan.id))
      }
    } catch (e) {
      alert(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDispatch = async () => {
    if (!isEdit) return
    setSaving(true)
    try { await markDispatched(id); setStatus('DISPATCHED') }
    catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDeliver = async () => {
    if (!isEdit) return
    setSaving(true)
    try { await markDelivered(id); setStatus('DELIVERED') }
    catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    if (!window.confirm('Archive this challan?')) return
    try { await deleteChallan(id); navigate(ROUTES.CHALLANS) }
    catch (e) { alert(e.message) }
  }

  const readOnly = isEdit && !['SAVED'].includes(status)

  if (loading) return (
    <AppLayout title={isEdit ? 'Edit Challan' : 'New Challan'}>
      <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
    </AppLayout>
  )

  return (
    <AppLayout
      title={isEdit ? (challanNumber || 'Edit Challan') : 'New Challan'}
      breadcrumbs={['Cash Sales', 'Challans', isEdit ? challanNumber : 'New']}
      actions={
        <div className="flex gap-2 items-center">
          {isEdit && (
            <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', STATUS_META[status]?.className)}>
              {STATUS_META[status]?.label || status}
            </span>
          )}
          {isEdit && (
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.CHALLAN_VIEW.replace(':id', id))}>
              <Eye className="h-4 w-4" /> View
            </Button>
          )}
          {isEdit && status === 'SAVED' && (
            <Button variant="secondary" size="sm" onClick={handleDispatch} disabled={saving}>
              <Truck className="h-4 w-4" /> Mark Dispatched
            </Button>
          )}
          {isEdit && status === 'DISPATCHED' && (
            <Button variant="secondary" size="sm" onClick={handleDeliver} disabled={saving}>
              <CheckCircle className="h-4 w-4" /> Mark Delivered
            </Button>
          )}
          {isEdit && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Archive
            </Button>
          )}
          {!readOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Update' : 'Save Challan'}
            </Button>
          )}
        </div>
      }
    >
      <div className="px-4 py-6 md:px-8 space-y-6 max-w-5xl">
        {/* Header fields */}
        <Card>
          <CardBody className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Challan #</label>
              <input
                value={challanNumber || 'Auto-generated'}
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 bg-surface-50 text-surface-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Date *</label>
              <input
                type="date"
                value={challanDate}
                onChange={e => setChallanDate(e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 disabled:bg-surface-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="relative md:col-span-1" ref={customerRef}>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Customer *</label>
              <input
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setCustomerDropdownOpen(true) }}
                onFocus={() => setCustomerDropdownOpen(true)}
                disabled={readOnly}
                placeholder="Search customer..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 disabled:bg-surface-50 disabled:cursor-not-allowed"
              />
              {customerDropdownOpen && filteredCustomers.length > 0 && (
                <ul className="absolute z-40 mt-1 w-full bg-white border border-surface-200 rounded-lg shadow-lg max-h-56 overflow-y-auto text-sm">
                  {filteredCustomers.map(c => (
                    <li
                      key={c.id}
                      className="px-3 py-2.5 hover:bg-bhoomi-50 cursor-pointer"
                      onMouseDown={e => { e.preventDefault(); handleCustomerSelect(c) }}
                    >
                      <div className="font-medium">{c.name}</div>
                      {(c.clusterName || c.category) && (
                        <div className="text-xs text-surface-500">{[c.clusterName, c.category].filter(Boolean).join(' · ')}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {selectedCustomer && (
                <div className="mt-1 text-xs text-surface-500">
                  {selectedCustomer.clusterName && <span>{selectedCustomer.clusterName}</span>}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Location (Zoho)</label>
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 disabled:bg-surface-50 disabled:cursor-not-allowed"
              >
                <option value="">Select location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-surface-600 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={readOnly}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 disabled:bg-surface-50 disabled:cursor-not-allowed resize-none"
              />
            </div>
          </CardBody>
        </Card>

        {/* Line items */}
        <Card>
          <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-800">Products</h3>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4" /> Add Row
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500 w-48">Product</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">SKU</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Pack</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">MRP</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">GST%</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Cases</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Rate Mode</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Rate / Disc%</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Total</th>
                  {!readOnly && <th className="w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {lines.map((line, idx) => (
                  <tr key={line._key} className={cn(readOnly && 'bg-surface-50/50')}>
                    <td className="px-3 py-2">
                      {readOnly ? (
                        <span>{line.productName}</span>
                      ) : (
                        <select
                          value={line.itemId}
                          onChange={e => handleItemSelect(idx, e.target.value)}
                          className="w-full px-2 py-1.5 text-sm rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500"
                        >
                          <option value="">Select product</option>
                          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-2 text-surface-500 whitespace-nowrap">{line.sku || '—'}</td>
                    <td className="px-3 py-2 text-surface-500">{line.packing || '—'}</td>
                    <td className="px-3 py-2 text-surface-500">
                      {line.mrp ? `₹${line.mrp}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-surface-500">{line.gstRate ? `${line.gstRate}%` : '—'}</td>
                    <td className="px-3 py-2">
                      {readOnly ? line.cases : (
                        <input
                          type="number"
                          min={1}
                          value={line.cases}
                          onChange={e => updateLine(idx, 'cases', e.target.value)}
                          className="w-16 px-2 py-1.5 text-sm rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {readOnly ? RATE_MODES.find(r => r.value === line.rateMode)?.label : (
                        <select
                          value={line.rateMode}
                          onChange={e => updateLine(idx, 'rateMode', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500"
                        >
                          {RATE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {readOnly ? (
                        <span>
                          {line.rateMode === 'NET' && (line.netRate ? `₹${line.netRate}` : '—')}
                          {['DISC_TUR','DISC_MRP'].includes(line.rateMode) && (line.discPct ? `${line.discPct}%` : '—')}
                          {line.rateMode === 'ADHOC' && (line.adhocAmount ? `₹${line.adhocAmount}` : '—')}
                        </span>
                      ) : (
                        <>
                          {line.rateMode === 'NET' && (
                            <input type="number" min={0} step={0.01} value={line.netRate} onChange={e => updateLine(idx, 'netRate', e.target.value)}
                              placeholder="₹ rate" className="w-24 px-2 py-1.5 text-sm rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500" />
                          )}
                          {['DISC_TUR','DISC_MRP'].includes(line.rateMode) && (
                            <input type="number" min={0} max={100} step={0.1} value={line.discPct} onChange={e => updateLine(idx, 'discPct', e.target.value)}
                              placeholder="disc %" className="w-24 px-2 py-1.5 text-sm rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500" />
                          )}
                          {line.rateMode === 'ADHOC' && (
                            <input type="number" min={0} step={1} value={line.adhocAmount} onChange={e => updateLine(idx, 'adhocAmount', e.target.value)}
                              placeholder="₹ amount" className="w-24 px-2 py-1.5 text-sm rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500" />
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-surface-900">
                      {line.lineTotal ? `₹${Number(line.lineTotal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                    </td>
                    {!readOnly && (
                      <td className="px-2 py-2">
                        <button onClick={() => removeLine(idx)} className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-300 bg-surface-50">
                  <td colSpan={readOnly ? 8 : 8} className="px-3 py-3 text-right font-semibold text-surface-700">Total Amount</td>
                  <td className="px-3 py-3 text-right font-bold text-surface-900">
                    ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  {!readOnly && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {!readOnly && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(ROUTES.CHALLANS)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Update' : 'Save Challan'}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
