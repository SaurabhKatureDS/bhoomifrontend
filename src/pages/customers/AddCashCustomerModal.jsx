import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

/**
 * Add / Edit Cash Customer.
 * Mirrors the screenshot: NAME/SHOP, PHONE (10-digit), CLUSTER, ADDRESS (optional).
 */
export default function AddCashCustomerModal({
  open,
  onClose,
  onSubmit,
  clusters = [],
  customer = null,
  saving = false,
}) {
  const isEdit = Boolean(customer)
  const [form, setForm] = useState({ name: '', phone: '', clusterId: '', address: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm({
        name: customer?.name || '',
        phone: customer?.phone || customer?.mobilePhone || '',
        clusterId: customer?.clusterId ? String(customer.clusterId) : (clusters[0]?.id ? String(clusters[0].id) : ''),
        address: customer?.address || '',
      })
      setErrors({})
    }
  }, [open, customer, clusters])

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!/^\d{10}$/.test(form.phone)) e.phone = 'Enter a 10-digit phone'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    if (!validate()) return
    onSubmit({
      name: form.name.trim(),
      phone: form.phone,
      clusterId: form.clusterId ? Number(form.clusterId) : null,
      address: form.address || null,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Cash Customer' : 'Add Cash Customer'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-1.5">
            Name / Shop
          </label>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Party name"
            error={errors.name}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-1.5">
            Phone
          </label>
          <Input
            value={form.phone}
            onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit number"
            inputMode="numeric"
            error={errors.phone}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-1.5">
            Cluster
          </label>
          <select
            value={form.clusterId}
            onChange={(e) => update('clusterId', e.target.value)}
            className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 focus:border-bhoomi-500 focus:ring-2 focus:ring-bhoomi-500/20 focus:outline-none"
          >
            <option value="">— None —</option>
            {clusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-1.5">
            Address (optional)
          </label>
          <textarea
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:border-bhoomi-500 focus:ring-2 focus:ring-bhoomi-500/20 focus:outline-none resize-none"
          />
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="gap-1.5">
            {isEdit ? 'Save Changes' : '+ Add Customer'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
