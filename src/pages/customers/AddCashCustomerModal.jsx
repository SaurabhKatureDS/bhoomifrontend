import { useState, useEffect, useRef } from 'react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createCluster, updateCluster } from '@/api/clusters'

/**
 * Add / Edit Cash Customer.
 * Fields: Name*, Address (optional), City (default: Mumbai)*, Cluster*, Phone*
 */
export default function AddCashCustomerModal({
  open,
  onClose,
  onSubmit,
  clusters = [],
  onClusterAdded,
  onClusterUpdated,
  customer = null,
  saving = false,
}) {
  const isEdit = Boolean(customer)
  const [form, setForm] = useState({ name: '', address: '', city: 'Mumbai', clusterId: '', phone: '' })
  const [errors, setErrors] = useState({})

  // Cluster inline add/edit state
  const [clusterMode, setClusterMode] = useState(null) // null | 'add' | 'edit'
  const [clusterInputVal, setClusterInputVal] = useState('')
  const [clusterSaving, setClusterSaving] = useState(false)
  const [clusterError, setClusterError] = useState('')
  const clusterInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm({
        name: customer?.name || '',
        address: customer?.address || '',
        city: customer?.city || 'Mumbai',
        clusterId: customer?.clusterId ? String(customer.clusterId) : '',
        phone: customer?.phone || customer?.mobilePhone || '',
      })
      setErrors({})
      setClusterMode(null)
      setClusterInputVal('')
      setClusterError('')
    }
  }, [open, customer])

  useEffect(() => {
    if (clusterMode) clusterInputRef.current?.focus()
  }, [clusterMode])

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const selectedCluster = clusters.find((c) => String(c.id) === String(form.clusterId))

  const openAddCluster = () => {
    setClusterInputVal('')
    setClusterError('')
    setClusterMode('add')
  }

  const openEditCluster = () => {
    setClusterInputVal(selectedCluster?.name || '')
    setClusterError('')
    setClusterMode('edit')
  }

  const cancelClusterMode = () => {
    setClusterMode(null)
    setClusterInputVal('')
    setClusterError('')
  }

  const handleSaveCluster = async () => {
    const name = clusterInputVal.trim()
    if (!name) { setClusterError('Enter a cluster name'); return }
    setClusterSaving(true)
    setClusterError('')
    try {
      if (clusterMode === 'add') {
        const created = await createCluster(name)
        onClusterAdded?.(created)
        update('clusterId', String(created.id))
      } else {
        const updated = await updateCluster(Number(form.clusterId), name)
        onClusterUpdated?.(updated)
      }
      setClusterMode(null)
      setClusterInputVal('')
    } catch (err) {
      setClusterError(err.message || 'Failed to save cluster')
    } finally {
      setClusterSaving(false)
    }
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.clusterId) e.clusterId = 'Select a cluster'
    if (!/^\d{10}$/.test(form.phone)) e.phone = 'Enter a 10-digit phone number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    if (!validate()) return
    onSubmit({
      name: form.name.trim(),
      address: form.address || null,
      city: form.city.trim(),
      clusterId: Number(form.clusterId),
      phone: form.phone,
    })
  }

  const inputCls = 'w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:border-bhoomi-500 focus:ring-2 focus:ring-bhoomi-500/20 focus:outline-none'
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-1.5'
  const errCls = 'mt-1 text-xs text-red-500'

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Cash Customer' : 'Add Cash Customer'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* NAME */}
        <div>
          <label className={labelCls}>Name <span className="text-red-500">*</span></label>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Party name / shop name"
            error={errors.name}
            autoFocus
          />
        </div>

        {/* ADDRESS */}
        <div>
          <label className={labelCls}>Address <span className="text-surface-400 font-normal normal-case tracking-normal">(optional)</span></label>
          <textarea
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            rows={2}
            placeholder="Street, area…"
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* CITY */}
        <div>
          <label className={labelCls}>City <span className="text-red-500">*</span></label>
          <Input
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="Mumbai"
            error={errors.city}
          />
          {errors.city && <p className={errCls}>{errors.city}</p>}
        </div>

        {/* CLUSTER */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={`${labelCls} mb-0`}>
              Cluster <span className="text-red-500">*</span>
            </label>
            {clusterMode === null && (
              <div className="flex items-center gap-3">
                {selectedCluster && (
                  <button
                    type="button"
                    onClick={openEditCluster}
                    className="text-[11px] font-semibold text-surface-500 hover:text-bhoomi-700 transition-colors"
                    title="Edit selected cluster name"
                  >
                    ✎ Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={openAddCluster}
                  className="flex items-center gap-0.5 text-[11px] font-semibold text-bhoomi-600 hover:text-bhoomi-800 transition-colors"
                  title="Add new cluster"
                >
                  <span className="text-base leading-none">+</span> New
                </button>
              </div>
            )}
          </div>

          {clusterMode ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  ref={clusterInputRef}
                  value={clusterInputVal}
                  onChange={(e) => setClusterInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleSaveCluster() }
                    if (e.key === 'Escape') cancelClusterMode()
                  }}
                  placeholder={clusterMode === 'add' ? 'New cluster name' : 'Edit cluster name'}
                  className="flex-1 rounded-lg border border-bhoomi-400 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:border-bhoomi-500 focus:ring-2 focus:ring-bhoomi-500/20 focus:outline-none"
                  disabled={clusterSaving}
                />
                <Button type="button" onClick={handleSaveCluster} loading={clusterSaving} className="shrink-0 px-3 py-2 text-xs">
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={cancelClusterMode} disabled={clusterSaving} className="shrink-0 px-3 py-2 text-xs">
                  Cancel
                </Button>
              </div>
              {clusterError && <p className="text-xs text-red-500">{clusterError}</p>}
            </div>
          ) : (
            <>
              <select
                value={form.clusterId}
                onChange={(e) => update('clusterId', e.target.value)}
                className={`${inputCls}${errors.clusterId ? ' border-red-400' : ''}`}
              >
                <option value="">— Select cluster —</option>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.clusterId && <p className={errCls}>{errors.clusterId}</p>}
            </>
          )}
        </div>

        {/* PHONE */}
        <div>
          <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
          <Input
            value={form.phone}
            onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit number"
            inputMode="numeric"
            error={errors.phone}
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

