import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { createCollection, getOutstandingChallans } from '@/api/collections'
import { apiGet } from '@/api/client'

const TYPES = [
  { value: 'ADVANCE', label: 'Advance' },
  { value: 'ON_ACCOUNT', label: 'On Account' },
  { value: 'AGAINST_DC', label: 'Against Delivery Challan' },
]

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))

export default function RecordCollectionModal({ onClose, onSuccess, prefillCustomerId, prefillChallanId }) {
  const [form, setForm] = useState({
    collectionDate: new Date().toISOString().slice(0, 10),
    customerId: prefillCustomerId || '',
    collectedAmount: '',
    collectedBy: '',
    type: prefillChallanId ? 'AGAINST_DC' : 'AGAINST_DC',
    challanId: prefillChallanId || '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdown, setCustomerDropdown] = useState(false)
  const [challans, setChallans] = useState([])
  const [challansLoading, setChallansLoading] = useState(false)
  const [challanSearch, setChallanSearch] = useState('')
  const [challanDropdown, setChallanDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedChallan, setSelectedChallan] = useState(null)
  const [totalAllocated, setTotalAllocated] = useState(0)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    apiGet('/api/v1/cash-customers', { page: 0, size: 200 })
      .then(r => {
        const list = r?.content || r || []
        setCustomers(list)
        // Auto-select if prefill was provided
        if (prefillCustomerId) {
          const match = list.find(c => String(c.id) === String(prefillCustomerId))
          if (match) { setSelectedCustomer(match); setCustomerSearch(match.name) }
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!form.customerId || form.type !== 'AGAINST_DC') { setChallans([]); return }
    setChallansLoading(true)
    getOutstandingChallans(form.customerId)
      .then(r => {
        const list = Array.isArray(r) ? r : r?.content || []
        setChallans(list)
        // Auto-select challan if prefill was provided
        if (prefillChallanId) {
          const match = list.find(ch => String(ch.id) === String(prefillChallanId))
          if (match) { setSelectedChallan(match); setChallanSearch(match.challanNumber) }
        }
      })
      .catch(() => setChallans([]))
      .finally(() => setChallansLoading(false))
  }, [form.customerId, form.type]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCustomerSelect = (c) => {
    setSelectedCustomer(c)
    setCustomerSearch(c.name)
    setCustomerDropdown(false)
    set('customerId', c.id)
    set('challanId', '')
    setSelectedChallan(null)
  }

  const handleChallanSelect = (ch) => {
    setSelectedChallan(ch)
    setChallanSearch(ch.challanNumber)
    setChallanDropdown(false)
    set('challanId', ch.id)
  }

  const filteredCustomers = customers.filter(c => !customerSearch || c.name?.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 20)
  const filteredChallans = challans.filter(c => !challanSearch || c.challanNumber?.toLowerCase().includes(challanSearch.toLowerCase())).slice(0, 20)

  const handleSubmit = async () => {
    const errs = {}
    if (!form.customerId) errs.customerId = 'Please select a customer.'
    if (!form.collectedAmount || Number(form.collectedAmount) <= 0) errs.collectedAmount = 'Enter a valid amount greater than 0.'
    if (!form.collectedBy?.trim()) errs.collectedBy = 'Collected By is required.'
    if (form.type === 'AGAINST_DC' && !form.challanId) errs.challanId = 'Please select a delivery challan.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    try {
      const amt = Math.round(Number(form.collectedAmount))
      await createCollection({
        customerId: form.customerId,
        collectionDate: form.collectionDate,
        amount: amt,
        collectedBy: form.collectedBy || undefined,
        type: form.type,
        notes: form.notes || undefined,
        allocations: form.type === 'AGAINST_DC' && form.challanId
          ? [{ challanId: Number(form.challanId), amountAdjusted: amt }]
          : undefined,
      })
      onSuccess()
    } catch (e) {
      setErrors({ submit: e.message || 'Failed to record collection. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title="Record Collection" onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Collection Date *</label>
            <input type="date" value={form.collectionDate} onChange={e => set('collectionDate', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Type *</label>
            <select value={form.type} onChange={e => { set('type', e.target.value); set('challanId', ''); setSelectedChallan(null); setChallanSearch('') }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500">
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold text-surface-600 mb-1">Customer *</label>
          <input
            value={customerSearch}
            onChange={e => { setCustomerSearch(e.target.value); setCustomerDropdown(true); setErrors(v => ({ ...v, customerId: undefined })) }}
            onFocus={() => setCustomerDropdown(true)}
            placeholder="Search customer..."
            className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 ${errors.customerId ? 'border-red-400' : 'border-surface-300'}`}
          />
          {errors.customerId && <p className="mt-1 text-xs text-red-500">{errors.customerId}</p>}
          {customerDropdown && filteredCustomers.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
              {filteredCustomers.map(c => (
                <li key={c.id} className="px-3 py-2 hover:bg-bhoomi-50 cursor-pointer"
                  onMouseDown={e => { e.preventDefault(); handleCustomerSelect(c) }}>
                  {c.name}
                  {c.clusterName && <span className="ml-1 text-xs text-surface-500">· {c.clusterName}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {form.type === 'AGAINST_DC' && form.customerId && (
          <div className="relative">
            <label className="block text-xs font-semibold text-surface-600 mb-1">
              Delivery Challan *
              {challansLoading && <Spinner className="h-3 w-3 inline ml-2" />}
            </label>
            <input
              value={challanSearch}
              onChange={e => { setChallanSearch(e.target.value); setChallanDropdown(true) }}
              onFocus={() => setChallanDropdown(true)}
              placeholder="Search challan..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500"
            />
            {challanDropdown && filteredChallans.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
                {filteredChallans.map(ch => (
                  <li key={ch.id} className="px-3 py-2 hover:bg-bhoomi-50 cursor-pointer"
                    onMouseDown={e => { e.preventDefault(); handleChallanSelect(ch) }}>
                    <span className="font-medium">{ch.challanNumber}</span>
                    <span className="ml-2 text-xs text-surface-500">{new Date(ch.challanDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    <span className="ml-auto text-xs text-red-600 float-right">O/S: {fmtMoney((ch.totalAmount || 0) - (ch.totalCollected || 0))}</span>
                  </li>
                ))}
              </ul>
            )}
            {selectedChallan && (
              <div className="mt-1 flex gap-4 text-xs">
                <span>Challan Amt: <strong>{fmtMoney(selectedChallan.totalAmount)}</strong></span>
                <span className="text-red-600">O/S: <strong>{fmtMoney((selectedChallan.totalAmount || 0) - (selectedChallan.totalCollected || 0))}</strong></span>
              </div>
            )}
            {errors.challanId && <p className="mt-1 text-xs text-red-500">{errors.challanId}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            {(() => {
              const challanBalance = selectedChallan
                ? (Number(selectedChallan.totalAmount) || 0) - (Number(selectedChallan.totalCollected) || 0)
                : null
              const maxAmt = selectedChallan
                ? Math.min(
                    Number(selectedChallan.totalAmount) || Infinity,
                    challanBalance > 0 ? challanBalance : Infinity,
                  )
                : null
              const limitedMax = maxAmt === Infinity ? null : maxAmt
              const overLimit = limitedMax != null && Number(form.collectedAmount) > limitedMax
              return (
                <>
                  <label className="block text-xs font-semibold text-surface-600 mb-1">
                    Amount Collected *
                    {limitedMax != null && (
                      <span className="ml-2 font-normal text-surface-400">max {fmtMoney(limitedMax)}</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={limitedMax ?? undefined}
                    step={1}
                    value={form.collectedAmount}
                    onChange={e => {
                      const val = e.target.value
                      setErrors(v => ({ ...v, collectedAmount: undefined }))
                      if (limitedMax != null && Number(val) > limitedMax) {
                        set('collectedAmount', String(limitedMax))
                      } else {
                        set('collectedAmount', val)
                      }
                    }}
                    placeholder="₹ no decimals"
                    className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 ${overLimit || errors.collectedAmount ? 'border-red-400 bg-red-50' : 'border-surface-300'}`}
                  />
                  {(overLimit || errors.collectedAmount) && (
                    <p className="mt-1 text-xs text-red-500">{overLimit ? `Cannot exceed ${fmtMoney(limitedMax)}` : errors.collectedAmount}</p>
                  )}
                </>
              )
            })()}
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Collected By *</label>
            <input type="text" value={form.collectedBy} onChange={e => { set('collectedBy', e.target.value); setErrors(v => ({ ...v, collectedBy: undefined })) }}
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 ${errors.collectedBy ? 'border-red-400' : 'border-surface-300'}`} />
            {errors.collectedBy && <p className="mt-1 text-xs text-red-500">{errors.collectedBy}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-surface-600 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 resize-none" />
        </div>
      </div>

      {errors.submit && (
        <div className="mx-6 mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
          {errors.submit}
        </div>
      )}

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : null}
          Save Collection
        </Button>
      </ModalFooter>
    </Modal>
  )
}
