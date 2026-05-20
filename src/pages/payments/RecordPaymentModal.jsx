import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { createPayment, getOutstandingInvoices } from '@/api/payments'
import { listBillingParties } from '@/api/billingParties'

const TYPES = [
  { value: 'ADVANCE', label: 'Advance' },
  { value: 'ON_ACCOUNT', label: 'On Account' },
  { value: 'AGAINST_INVOICE', label: 'Against Invoice' },
]

const fmtMoney = (v) => v == null ? '—' : '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v))

export default function RecordPaymentModal({ onClose, onSuccess, prefillPartyId, prefillTransactionId, prefillPayment }) {
  const isEdit = !!prefillPayment
  
  const [form, setForm] = useState({
    paymentDate: prefillPayment?.paymentDate || new Date().toISOString().slice(0, 10),
    partyId: prefillPayment?.billingPartyId || prefillPayment?.billingParty?.id || prefillPartyId || '',
    paidAmount: prefillPayment?.amount || '',
    paidBy: prefillPayment?.paidBy || '',
    type: prefillPayment?.type || (prefillTransactionId ? 'AGAINST_INVOICE' : 'AGAINST_INVOICE'),
    notes: prefillPayment?.notes || '',
  })
  
  const [saving, setSaving] = useState(false)
  const [parties, setParties] = useState([])
  const [partySearch, setPartySearch] = useState('')
  const [partyDropdown, setPartyDropdown] = useState(false)
  const [selectedParty, setSelectedParty] = useState(null)
  
  const [invoices, setInvoices] = useState([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceDropdown, setInvoiceDropdown] = useState(false)
  
  const [selectedInvoices, setSelectedInvoices] = useState([])
  const [isModified, setIsModified] = useState(false)

  const SUGGESTIONS = ['Sanjay Jain', 'Anil Mehta', 'Self', 'Company Account', 'Cashier']

  useEffect(() => {
    listBillingParties({ size: 200 }).then(r => {
      const list = r?.content || r || []
      setParties(list)
      const currentPartyId = form.partyId
      if (currentPartyId) {
        const found = list.find(p => String(p.id) === String(currentPartyId))
        if (found) {
          setSelectedParty(found)
          setPartySearch(found.name)
        }
      }
    }).catch(() => {})
  }, [form.partyId])

  useEffect(() => {
    if (!form.partyId || form.type !== 'AGAINST_INVOICE') { setInvoices([]); return }
    setInvoicesLoading(true)
    getOutstandingInvoices(form.partyId)
      .then(r => {
        const list = Array.isArray(r) ? r : r?.content || []
        setInvoices(list)

        // If editing or prefilling transaction, select those immediately
        if (isEdit && prefillPayment?.allocations) {
          const matched = prefillPayment.allocations.map(alloc => {
            const inv = list.find(i => String(i.id) === String(alloc.unbilledTransactionId))
            return {
              ...(inv || { id: alloc.unbilledTransactionId, zohoInvoiceRef: alloc.invoiceNumber || `TXN-${alloc.unbilledTransactionId}`, outstandingBalance: alloc.amountAdjusted }),
              allocatedAmount: alloc.amountAdjusted
            }
          })
          setSelectedInvoices(matched)
        } else if (prefillTransactionId) {
          const found = list.find(i => String(i.id) === String(prefillTransactionId))
          if (found) {
            setSelectedInvoices([{ ...found, allocatedAmount: form.paidAmount || found.outstandingBalance || 0 }])
          }
        }
      })
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false))
  }, [form.partyId, form.type])

  const set = (k, v) => {
    setIsModified(true)
    setForm(f => ({ ...f, [k]: v }))
  }

  const handleCancel = () => {
    if (isModified) {
      if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  const toggleInvoiceSelection = (inv) => {
    setIsModified(true)
    setSelectedInvoices(prev => {
      const exists = prev.find(i => i.id === inv.id)
      if (exists) {
        return prev.filter(i => i.id !== inv.id)
      } else {
        const defaultAlloc = Math.min(
          Number(inv.outstandingBalance) || 0,
          Math.max(0, (Number(form.paidAmount) || 0) - prev.reduce((sum, item) => sum + (Number(item.allocatedAmount) || 0), 0))
        )
        return [...prev, { ...inv, allocatedAmount: defaultAlloc || '' }]
      }
    })
  }

  const updateAllocationAmount = (invId, amt) => {
    setIsModified(true)
    setSelectedInvoices(prev => prev.map(inv => inv.id === invId ? { ...inv, allocatedAmount: amt } : inv))
  }

  const autoAllocateTotal = () => {
    let remaining = Number(form.paidAmount) || 0
    setSelectedInvoices(prev => prev.map(inv => {
      const outstanding = Number(inv.outstandingBalance) || 0
      const allocated = Math.min(outstanding, remaining)
      remaining -= allocated
      return { ...inv, allocatedAmount: allocated || '' }
    }))
  }

  const filteredParties = parties.filter(p => !partySearch || p.name?.toLowerCase().includes(partySearch.toLowerCase())).slice(0, 20)
  const filteredInvoices = invoices.filter(i => {
    const isSelected = selectedInvoices.some(sel => sel.id === i.id)
    if (isSelected) return false
    return !invoiceSearch || i.zohoInvoiceRef?.toLowerCase().includes(invoiceSearch.toLowerCase())
  }).slice(0, 20)

  const allocatedSum = selectedInvoices.reduce((s, i) => s + (Number(i.allocatedAmount) || 0), 0)
  const totalPaidNum = Number(form.paidAmount) || 0
  const isAllocationMatch = form.type !== 'AGAINST_INVOICE' || allocatedSum === totalPaidNum

  const handleSubmit = async () => {
    if (!form.partyId) { alert('Select a billing party.'); return }
    if (!form.paidAmount || Number(form.paidAmount) <= 0) { alert('Enter a valid amount.'); return }
    if (form.type === 'AGAINST_INVOICE') {
      if (selectedInvoices.length === 0) { alert('Please select at least one outstanding invoice.'); return }
      if (!isAllocationMatch) { alert(`Allocated total (${fmtMoney(allocatedSum)}) must match Amount Paid (${fmtMoney(totalPaidNum)})`); return }
    }
    
    setSaving(true)
    try {
      const payload = {
        billingPartyId: form.partyId,
        paymentDate: form.paymentDate,
        paidAmount: Math.round(totalPaidNum),
        paidBy: form.paidBy || undefined,
        type: form.type,
        notes: form.notes || undefined,
        allocations: form.type === 'AGAINST_INVOICE' ? selectedInvoices.map(inv => ({
          unbilledTransactionId: inv.id,
          amountAdjusted: Math.round(Number(inv.allocatedAmount) || 0)
        })) : []
      }

      if (isEdit) {
        // Send PUT request to update existing payment
        await apiGet(`/api/v1/payments/${prefillPayment.id}`, {}, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        await createPayment(payload)
      }
      onSuccess()
    } catch (e) {
      alert(e.message || 'Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Payment' : 'Record Payment'} onClose={handleCancel} size="md">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Payment Date *</label>
            <input type="date" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Type *</label>
            <select value={form.type} onChange={e => { set('type', e.target.value); setSelectedInvoices([]) }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" disabled={isEdit}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold text-surface-600 mb-1">Billing Party *</label>
          <input value={partySearch} onChange={e => { setPartySearch(e.target.value); setPartyDropdown(true) }}
            onFocus={() => setPartyDropdown(true)} placeholder="Search billing party..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" disabled={isEdit} />
          {partyDropdown && filteredParties.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
              {filteredParties.map(p => (
                <li key={p.id} className="px-3 py-2 hover:bg-bhoomi-50 cursor-pointer"
                  onMouseDown={e => { e.preventDefault(); setSelectedParty(p); setPartySearch(p.name); setPartyDropdown(false); set('partyId', p.id) }}>
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Amount Paid (₹) *</label>
            <input type="number" min={1} step={1} value={form.paidAmount} onChange={e => set('paidAmount', e.target.value)} placeholder="₹ no decimals"
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Paid By</label>
            <input type="text" value={form.paidBy} onChange={e => set('paidBy', e.target.value)} placeholder="Name"
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button key={s} type="button" onClick={() => set('paidBy', s)}
                  className="px-2 py-0.5 text-[10px] font-medium rounded bg-surface-100 hover:bg-surface-200 text-surface-600 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {form.type === 'AGAINST_INVOICE' && form.partyId && (
          <div className="border border-surface-200 rounded-xl p-3 bg-surface-50/50 space-y-3">
            <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider">Invoice Allocation Details</h4>
            
            {/* Search Dropdown */}
            <div className="relative">
              <input value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setInvoiceDropdown(true) }}
                onFocus={() => setInvoiceDropdown(true)} placeholder="Search and select outstanding invoices to allocate..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
              {invoiceDropdown && filteredInvoices.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-xs">
                  {filteredInvoices.map(inv => (
                    <li key={inv.id} className="px-3 py-2 hover:bg-bhoomi-50 cursor-pointer flex justify-between items-center"
                      onMouseDown={e => { e.preventDefault(); toggleInvoiceSelection(inv); setInvoiceSearch(''); setInvoiceDropdown(false) }}>
                      <span className="font-semibold">{inv.zohoInvoiceRef || `TXN-${inv.id}`}</span>
                      <span className="text-red-600 font-medium">O/S: {fmtMoney(inv.outstandingBalance)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Selected Invoices Table */}
            {selectedInvoices.length > 0 ? (
              <div className="overflow-hidden border border-surface-200 rounded-lg bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-surface-50 border-b border-surface-150">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold text-surface-600">Invoice Ref</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-surface-600">Outstanding</th>
                      <th className="px-3 py-1.5 text-right font-semibold text-surface-600">Amount Adjusted</th>
                      <th className="px-2 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {selectedInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-surface-50/50">
                        <td className="px-3 py-2 font-medium text-surface-800">{inv.zohoInvoiceRef || `TXN-${inv.id}`}</td>
                        <td className="px-3 py-2 text-right text-surface-600">{fmtMoney(inv.outstandingBalance)}</td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" min={0} value={inv.allocatedAmount} onChange={e => updateAllocationAmount(inv.id, e.target.value)}
                            placeholder="₹ amount" className="w-24 px-2 py-1 text-right text-xs rounded border border-surface-300 focus:outline-none focus:ring-1 focus:ring-bhoomi-500 font-semibold" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => toggleInvoiceSelection(inv)} className="text-red-500 hover:text-red-700 font-medium text-sm">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-50 font-semibold border-t border-surface-150">
                      <td className="px-3 py-2 text-surface-700">Allocated Sum</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={autoAllocateTotal} className="text-[10px] text-bhoomi-600 hover:text-bhoomi-700 hover:underline">Auto Fill</button>
                      </td>
                      <td className="px-3 py-2 text-right text-surface-900">{fmtMoney(allocatedSum)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-surface-400 bg-white rounded-lg border border-dashed border-surface-300">
                No invoices selected. Search above and select to adjust payment against outstanding.
              </div>
            )}

            {/* Warning Message */}
            {!isAllocationMatch && (
              <div className="px-3 py-2 text-[11px] rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex justify-between items-center">
                <span>⚠️ Allocated Sum does not match the Total Amount Paid ({fmtMoney(totalPaidNum)}).</span>
                <span className="font-bold">Diff: {fmtMoney(totalPaidNum - allocatedSum)}</span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-surface-600 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500 resize-none" placeholder="Receipt details, transaction ID, bank info..." />
        </div>
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : null}
          {isEdit ? 'Update Payment' : 'Save Payment'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
