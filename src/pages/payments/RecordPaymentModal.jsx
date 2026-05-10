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

export default function RecordPaymentModal({ onClose, onSuccess, prefillPartyId, prefillTransactionId }) {
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    partyId: prefillPartyId || '',
    paidAmount: '',
    paidBy: '',
    type: prefillTransactionId ? 'AGAINST_INVOICE' : 'AGAINST_INVOICE',
    unbilledTransactionId: prefillTransactionId || '',
    notes: '',
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
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  useEffect(() => {
    listBillingParties({ size: 200 }).then(r => setParties(r?.content || r || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.partyId || form.type !== 'AGAINST_INVOICE') { setInvoices([]); return }
    setInvoicesLoading(true)
    getOutstandingInvoices(form.partyId)
      .then(r => setInvoices(Array.isArray(r) ? r : r?.content || []))
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false))
  }, [form.partyId, form.type])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filteredParties = parties.filter(p => !partySearch || p.name?.toLowerCase().includes(partySearch.toLowerCase())).slice(0, 20)
  const filteredInvoices = invoices.filter(i => !invoiceSearch || i.zohoInvoiceRef?.toLowerCase().includes(invoiceSearch.toLowerCase())).slice(0, 20)

  const handleSubmit = async () => {
    if (!form.partyId) { alert('Select a billing party.'); return }
    if (!form.paidAmount || Number(form.paidAmount) <= 0) { alert('Enter a valid amount.'); return }
    if (form.type === 'AGAINST_INVOICE' && !form.unbilledTransactionId) { alert('Select an invoice.'); return }
    setSaving(true)
    try {
      await createPayment({
        billingPartyId: form.partyId,
        unbilledTransactionId: form.type === 'AGAINST_INVOICE' ? form.unbilledTransactionId : undefined,
        paymentDate: form.paymentDate,
        paidAmount: Math.round(Number(form.paidAmount)),
        paidBy: form.paidBy || undefined,
        type: form.type,
        notes: form.notes || undefined,
      })
      onSuccess()
    } catch (e) {
      alert(e.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Record Payment" onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Payment Date *</label>
            <input type="date" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Type *</label>
            <select value={form.type} onChange={e => { set('type', e.target.value); set('unbilledTransactionId', ''); setSelectedInvoice(null); setInvoiceSearch('') }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500">
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold text-surface-600 mb-1">Billing Party *</label>
          <input value={partySearch} onChange={e => { setPartySearch(e.target.value); setPartyDropdown(true) }}
            onFocus={() => setPartyDropdown(true)} placeholder="Search billing party..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
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

        {form.type === 'AGAINST_INVOICE' && form.partyId && (
          <div className="relative">
            <label className="block text-xs font-semibold text-surface-600 mb-1">
              Invoice *{invoicesLoading && <Spinner className="h-3 w-3 inline ml-2" />}
            </label>
            <input value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setInvoiceDropdown(true) }}
              onFocus={() => setInvoiceDropdown(true)} placeholder="Search invoice ref..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 bg-white focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
            {invoiceDropdown && filteredInvoices.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
                {filteredInvoices.map(inv => (
                  <li key={inv.id} className="px-3 py-2 hover:bg-bhoomi-50 cursor-pointer"
                    onMouseDown={e => { e.preventDefault(); setSelectedInvoice(inv); setInvoiceSearch(inv.zohoInvoiceRef || `#${inv.id}`); setInvoiceDropdown(false); set('unbilledTransactionId', inv.id) }}>
                    <span className="font-medium">{inv.zohoInvoiceRef || `#${inv.id}`}</span>
                    <span className="ml-2 text-xs text-red-600">O/S: {fmtMoney(inv.outstandingBalance)}</span>
                  </li>
                ))}
              </ul>
            )}
            {selectedInvoice && (
              <div className="mt-1 text-xs">
                <span className="text-red-600">Outstanding: <strong>{fmtMoney(selectedInvoice.outstandingBalance)}</strong></span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Amount Paid *</label>
            <input type="number" min={1} step={1} value={form.paidAmount} onChange={e => set('paidAmount', e.target.value)} placeholder="₹ no decimals"
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-bhoomi-500/20 focus:border-bhoomi-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Paid By</label>
            <input type="text" value={form.paidBy} onChange={e => set('paidBy', e.target.value)}
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
          Save Payment
        </Button>
      </ModalFooter>
    </Modal>
  )
}
