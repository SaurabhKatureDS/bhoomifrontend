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

  useEffect(() => {
    apiGet('/api/v1/cash-customers', { page: 0, size: 200 })
      .then(r => setCustomers(r?.content || r || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.customerId || form.type !== 'AGAINST_DC') { setChallans([]); return }
    setChallansLoading(true)
    getOutstandingChallans(form.customerId)
      .then(r => setChallans(Array.isArray(r) ? r : r?.content || []))
      .catch(() => setChallans([]))
      .finally(() => setChallansLoading(false))
  }, [form.customerId, form.type])

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
    if (!form.customerId) { alert('Select a customer.'); return }
    if (!form.collectedAmount || Number(form.collectedAmount) <= 0) { alert('Enter a valid amount.'); return }
    if (form.type === 'AGAINST_DC' && !form.challanId) { alert('Select a challan.'); return }
    setSaving(true)
    try {
      await createCollection({
        customerId: form.customerId,
        challanId: form.type === 'AGAINST_DC' ? form.challanId : undefined,
        collectionDate: form.collectionDate,
        collectedAmount: Math.round(Number(form.collectedAmount)),
        collectedBy: form.collectedBy || undefined,
        type: form.type,
        notes: form.notes || undefined,
      })
      onSuccess()
    } catch (e) {
      alert(e.message || 'Failed to record collection')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Record Collection" onClose={onClose} size="md">
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
            onChange={e => { setCustomerSearch(e.target.value); setCustomerDropdown(true) }}
            onFocus={() => setCustomerDropdown(true)}
            placeholder="Search customer..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500"
          />
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
                    <span className="ml-auto text-xs text-red-600 float-right">O/S: {fmtMoney(ch.balance)}</span>
                  </li>
                ))}
              </ul>
            )}
            {selectedChallan && (
              <div className="mt-1 flex gap-4 text-xs">
                <span>Challan Amt: <strong>{fmtMoney(selectedChallan.totalAmount)}</strong></span>
                <span className="text-red-600">O/S: <strong>{fmtMoney(selectedChallan.balance)}</strong></span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Amount Collected *</label>
            <input type="number" min={1} step={1} value={form.collectedAmount} onChange={e => set('collectedAmount', e.target.value)}
              placeholder="₹ no decimals"
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Collected By</label>
            <input type="text" value={form.collectedBy} onChange={e => set('collectedBy', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
          </div>
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
          Save Collection
        </Button>
      </ModalFooter>
    </Modal>
  )
}
