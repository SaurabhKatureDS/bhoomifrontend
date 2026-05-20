import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { createCollection, getOutstandingChallans } from '@/api/collections'
import { apiGet } from '@/api/client'
import { Search, Trash2 } from 'lucide-react'

const TYPES = [
  { value: 'ADVANCE', label: 'Advance' },
  { value: 'ON_ACCOUNT', label: 'On Account' },
  { value: 'AGAINST_DC', label: 'Against Delivery Challan' },
]

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))

const fmtDate = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function RecordCollectionModal({ onClose, onSuccess, prefillCustomerId, prefillChallanId }) {
  const [form, setForm] = useState({
    collectionDate: new Date().toISOString().slice(0, 10),
    customerId: prefillCustomerId || '',
    collectedAmount: '',
    collectedBy: '',
    type: prefillChallanId ? 'AGAINST_DC' : 'AGAINST_DC',
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
  
  const [allocations, setAllocations] = useState([])
  const [errors, setErrors] = useState({})

  useEffect(() => {
    apiGet('/api/v1/cash-customers', { page: 0, size: 200 })
      .then(r => {
        const list = r?.content || r || []
        setCustomers(list)
        // Auto-select if prefill was provided
        if (prefillCustomerId) {
          const match = list.find(c => String(c.id) === String(prefillCustomerId))
          if (match) { setCustomerSearch(match.name) }
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!form.customerId || form.type !== 'AGAINST_DC') {
      Promise.resolve().then(() => {
        setChallans([])
        setAllocations([])
      })
      return
    }
    Promise.resolve().then(() => setChallansLoading(true))
    getOutstandingChallans(form.customerId)
      .then(r => {
        const list = Array.isArray(r) ? r : r?.content || []
        setChallans(list)
        // Auto-select challan if prefill was provided
        if (prefillChallanId) {
          const match = list.find(ch => String(ch.id) === String(prefillChallanId))
          if (match) {
            setAllocations([
              {
                challanId: match.id,
                challanNumber: match.challanNumber,
                challanDate: match.challanDate,
                totalAmount: match.totalAmount,
                totalCollected: match.totalCollected,
                amountAdjusted: (match.totalAmount || 0) - (match.totalCollected || 0)
              }
            ])
            setChallanSearch('')
          }
        }
      })
      .catch(() => setChallans([]))
      .finally(() => setChallansLoading(false))
  }, [form.customerId, form.type]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCustomerSelect = (c) => {
    setCustomerSearch(c.name)
    setCustomerDropdown(false)
    set('customerId', c.id)
    setAllocations([])
  }

  const handleChallanSelect = (ch) => {
    const exists = allocations.some(a => a.challanId === ch.id)
    if (!exists) {
      const remainingBalance = (ch.totalAmount || 0) - (ch.totalCollected || 0)
      setAllocations(prev => [
        ...prev,
        {
          challanId: ch.id,
          challanNumber: ch.challanNumber,
          challanDate: ch.challanDate,
          totalAmount: ch.totalAmount,
          totalCollected: ch.totalCollected,
          amountAdjusted: remainingBalance > 0 ? remainingBalance : 0
        }
      ])
    }
    setChallanSearch('')
    setChallanDropdown(false)
  }

  const handleAdjustAmountChange = (challanId, val) => {
    setAllocations(prev => prev.map(a => {
      if (a.challanId === challanId) {
        const outstanding = (a.totalAmount || 0) - (a.totalCollected || 0)
        let amt = Math.round(Number(val)) || 0
        if (amt < 0) amt = 0
        if (amt > outstanding) amt = outstanding
        return { ...a, amountAdjusted: amt }
      }
      return a
    }))
  }

  const handleRemoveAllocation = (challanId) => {
    setAllocations(prev => prev.filter(a => a.challanId !== challanId))
  }

  const filteredCustomers = customers.filter(c => !customerSearch || c.name?.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 20)
  const filteredChallans = challans.filter(ch => {
    const alreadySelected = allocations.some(a => a.challanId === ch.id)
    if (alreadySelected) return false
    return !challanSearch || ch.challanNumber?.toLowerCase().includes(challanSearch.toLowerCase())
  }).slice(0, 20)

  const totalAdjusted = allocations.reduce((sum, a) => sum + (a.amountAdjusted || 0), 0)

  const handleSubmit = async () => {
    const errs = {}
    if (!form.customerId) errs.customerId = 'Please select a customer.'
    
    const collectedAmt = Math.round(Number(form.collectedAmount))
    if (!form.collectedAmount || collectedAmt <= 0) {
      errs.collectedAmount = 'Enter a valid amount greater than 0.'
    }
    
    if (!form.collectedBy?.trim()) errs.collectedBy = 'Collected By is required.'
    
    if (form.type === 'AGAINST_DC') {
      if (allocations.length === 0) {
        errs.submit = 'Please select at least one delivery challan.'
      } else if (totalAdjusted !== collectedAmt) {
        errs.submit = `Sum of allocations (${fmtMoney(totalAdjusted)}) must equal collected amount (${fmtMoney(collectedAmt)}).`
      }
    }
    
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    
    try {
      await createCollection({
        customerId: form.customerId,
        collectionDate: form.collectionDate,
        amount: collectedAmt,
        collectedBy: form.collectedBy || undefined,
        type: form.type,
        notes: form.notes || undefined,
        allocations: form.type === 'AGAINST_DC'
          ? allocations.map(a => ({ challanId: a.challanId, amountAdjusted: a.amountAdjusted }))
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
    <Modal open title="Record Collection" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Collection Date *</label>
            <input type="date" value={form.collectionDate} onChange={e => set('collectionDate', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Type *</label>
            <select value={form.type} onChange={e => { set('type', e.target.value); setAllocations([]) }}
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
          <div className="space-y-3 p-4 bg-surface-50 rounded-xl border border-surface-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 flex items-center gap-2">
              Outstanding Challans Allocations
              {challansLoading && <Spinner className="h-3.5 w-3.5" />}
            </h4>
            
            {/* Search Challan Box */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-surface-400" />
              </div>
              <input
                value={challanSearch}
                onChange={e => { setChallanSearch(e.target.value); setChallanDropdown(true) }}
                onFocus={() => setChallanDropdown(true)}
                placeholder="Search outstanding delivery challan..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20"
              />
              {challanDropdown && filteredChallans.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
                  {filteredChallans.map(ch => {
                    const outstanding = (ch.totalAmount || 0) - (ch.totalCollected || 0)
                    return (
                      <li key={ch.id} className="px-3 py-2 hover:bg-bhoomi-50 cursor-pointer flex justify-between items-center"
                        onMouseDown={e => { e.preventDefault(); handleChallanSelect(ch) }}>
                        <div>
                          <span className="font-semibold text-bhoomi-700">{ch.challanNumber}</span>
                          <span className="ml-2 text-xs text-surface-500">{fmtDate(ch.challanDate)}</span>
                        </div>
                        <span className="text-xs font-medium text-red-600">O/S: {fmtMoney(outstanding)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Allocations List */}
            {allocations.length === 0 ? (
              <p className="text-xs text-surface-400 italic py-2">No challans selected. Search and add above.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {allocations.map(a => {
                  const outstanding = (a.totalAmount || 0) - (a.totalCollected || 0)
                  return (
                    <div key={a.challanId} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-lg border border-surface-200 text-sm">
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-semibold text-surface-900">{a.challanNumber}</div>
                        <div className="text-xs text-surface-500 flex gap-2 mt-0.5">
                          <span>Date: {fmtDate(a.challanDate)}</span>
                          <span>·</span>
                          <span>Total: {fmtMoney(a.totalAmount)}</span>
                          <span>·</span>
                          <span className="text-red-600 font-semibold">O/S: {fmtMoney(outstanding)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <label className="text-[10px] font-semibold text-surface-500 uppercase">Adjust Amount</label>
                          <input
                            type="number"
                            min={0}
                            max={outstanding}
                            value={a.amountAdjusted === 0 ? '' : a.amountAdjusted}
                            onChange={e => handleAdjustAmountChange(a.challanId, e.target.value)}
                            placeholder="₹ amount"
                            className="w-28 text-right px-2 py-1 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500 font-medium"
                          />
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveAllocation(a.challanId)}
                          className="text-surface-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer self-end"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* Show allocation total */}
            {allocations.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-surface-200">
                <span className="text-xs font-semibold text-surface-500">Total Adjusted:</span>
                <span className={`text-sm font-bold ${totalAdjusted === Math.round(Number(form.collectedAmount)) ? 'text-green-600' : 'text-red-500'}`}>
                  {fmtMoney(totalAdjusted)} / {form.collectedAmount ? fmtMoney(form.collectedAmount) : '₹0'}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Amount Collected *</label>
            <input
              type="number"
              min={1}
              step={1}
              value={form.collectedAmount}
              onChange={e => {
                set('collectedAmount', e.target.value)
                setErrors(v => ({ ...v, collectedAmount: undefined }))
              }}
              placeholder="₹ no decimals"
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 ${errors.collectedAmount ? 'border-red-400 bg-red-50' : 'border-surface-300'}`}
            />
            {errors.collectedAmount && <p className="mt-1 text-xs text-red-500">{errors.collectedAmount}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Collected By *</label>
            <input type="text" value={form.collectedBy} onChange={e => { set('collectedBy', e.target.value); setErrors(v => ({ ...v, collectedBy: undefined })) }}
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 ${errors.collectedBy ? 'border-red-400' : 'border-surface-300'}`} />
            {errors.collectedBy && <p className="mt-1 text-xs text-red-500">{errors.collectedBy}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-surface-600 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 resize-none bg-white" />
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
