import { useEffect, useState, useCallback } from 'react'
import {
  Search, Plus, Edit2, Trash2, X, ChevronLeft,
  ChevronRight, ChevronUp, ChevronDown, Eye,
} from 'lucide-react'
import { fetchCrops, fetchCropById, createCrop, updateCrop, deleteCrop } from '../services/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const FORM_FIELDS = [
  { key: 'crop',        label: 'Crop Name',      type: 'text',   min: '',  max: '',    step: '',    placeholder: 'e.g. rice' },
  { key: 'nitrogen',    label: 'Nitrogen (N)',    type: 'number', min: 0,   max: 200,   step: 1,     placeholder: '0 – 200' },
  { key: 'phosphorus',  label: 'Phosphorus (P)',  type: 'number', min: 0,   max: 200,   step: 1,     placeholder: '0 – 200' },
  { key: 'potassium',   label: 'Potassium (K)',   type: 'number', min: 0,   max: 210,   step: 1,     placeholder: '0 – 210' },
  { key: 'temperature', label: 'Temperature (°C)',type: 'number', min: 0,   max: 50,    step: 0.01,  placeholder: '0 – 50' },
  { key: 'humidity',    label: 'Humidity (%)',    type: 'number', min: 0,   max: 100,   step: 0.01,  placeholder: '0 – 100' },
  { key: 'ph',          label: 'pH',              type: 'number', min: 0,   max: 14,    step: 0.001, placeholder: '0 – 14' },
  { key: 'rainfall',    label: 'Rainfall (mm)',   type: 'number', min: 0,   max: 3000,  step: 0.01,  placeholder: '0 – 3000' },
]

const EMPTY_FORM = { crop: '', nitrogen: '', phosphorus: '', potassium: '', temperature: '', humidity: '', ph: '', rainfall: '' }

const COLUMNS = [
  { key: 'crop',        label: 'Crop',        sortable: true  },
  { key: 'nitrogen',    label: 'N',           sortable: true  },
  { key: 'phosphorus',  label: 'P',           sortable: true  },
  { key: 'potassium',   label: 'K',           sortable: true  },
  { key: 'temperature', label: 'Temp (°C)',   sortable: true  },
  { key: 'humidity',    label: 'Humidity (%)',sortable: true  },
  { key: 'ph',          label: 'pH',          sortable: true  },
  { key: 'rainfall',    label: 'Rainfall (mm)',sortable: true },
]

// ── Small reusable modal ──────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Record form (add / edit) ──────────────────────────────────────────────────
function RecordForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm]   = useState(initial)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.crop?.trim()) e.crop = 'Required'
    FORM_FIELDS.filter(f => f.type === 'number').forEach(({ key, min, max }) => {
      const v = parseFloat(form[key])
      if (form[key] === '' || isNaN(v)) e[key] = 'Required'
      else if (v < min || v > max) e[key] = `${min}–${max}`
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const payload = { crop: form.crop.trim().toLowerCase() }
    FORM_FIELDS.filter(f => f.type === 'number').forEach(({ key }) => {
      payload[key] = parseFloat(form[key])
    })
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {FORM_FIELDS.map(({ key, label, type, min, max, step, placeholder }) => (
          <div key={key} className={key === 'crop' ? 'col-span-2' : ''}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
              type={type}
              step={step || undefined}
              min={min !== '' ? min : undefined}
              max={max !== '' ? max : undefined}
              placeholder={placeholder}
              value={form[key]}
              onChange={(e) => {
                setForm(f => ({ ...f, [key]: e.target.value }))
                setErrors(er => ({ ...er, [key]: undefined }))
              }}
              className={`input-field text-xs ${errors[key] ? 'border-red-300' : ''}`}
            />
            {errors[key] && <p className="text-xs text-red-500 mt-0.5">{errors[key]}</p>}
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1 justify-center text-xs" disabled={saving}>
          {saving ? 'Saving…' : 'Save Record'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-xs">Cancel</button>
      </div>
    </form>
  )
}

// ── Main DataExplorer ─────────────────────────────────────────────────────────
export default function DataExplorer() {
  const [records, setRecords]     = useState([])
  const [total, setTotal]         = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]           = useState(1)
  const [pageSize]                = useState(20)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Filters
  const [search, setSearch]       = useState('')
  const [cropFilter, setCropFilter] = useState('')
  const [cropNames, setCropNames] = useState([])
  const [phMin, setPhMin]         = useState('')
  const [phMax, setPhMax]         = useState('')
  const [rainMin, setRainMin]     = useState('')
  const [rainMax, setRainMax]     = useState('')

  // Sort
  const [sortBy, setSortBy]       = useState('crop')
  const [sortDir, setSortDir]     = useState('asc')

  // Modals
  const [addModal, setAddModal]   = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [viewRecord, setViewRecord] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Operation state
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [toast, setToast]         = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page, page_size: pageSize,
        sort_by: sortBy, sort_dir: sortDir,
      }
      if (search)     params.search   = search
      if (cropFilter) params.crop     = cropFilter
      if (phMin)      params.ph_min   = phMin
      if (phMax)      params.ph_max   = phMax
      if (rainMin)    params.rain_min = rainMin
      if (rainMax)    params.rain_max = rainMax

      const { data } = await fetchCrops(params)
      setRecords(data.data)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch {
      setError('Failed to load records.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortBy, sortDir, search, cropFilter, phMin, phMax, rainMin, rainMax])

  // Load crop names once
  useEffect(() => {
    axios.get(`${BASE}/crops/names`).then(r => setCropNames(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(1)
  }

  const handleAdd = async (payload) => {
    setSaving(true)
    try {
      await createCrop(payload)
      setAddModal(false)
      showToast('Record added successfully.')
      loadData()
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to add record.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (payload) => {
    setSaving(true)
    try {
      await updateCrop(editRecord._id, payload)
      setEditRecord(null)
      showToast('Record updated successfully.')
      loadData()
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to update record.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCrop(deleteTarget._id)
      setDeleteTarget(null)
      showToast('Record deleted.')
      loadData()
    } catch {
      showToast('Failed to delete record.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronUp size={12} className="text-gray-300" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-agri-green-700" /> : <ChevronDown size={12} className="text-agri-green-700" />
  }

  return (
    <div className="space-y-4">

      {/* ── Toast ──────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-agri-green-700'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Filter bar ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-8 text-xs"
              placeholder="Search crop name…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          {/* Crop filter */}
          <select
            className="select-field text-xs w-36"
            value={cropFilter}
            onChange={e => { setCropFilter(e.target.value); setPage(1) }}
          >
            <option value="">All Crops</option>
            {cropNames.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          {/* pH range */}
          <div className="flex gap-1 items-center">
            <span className="text-xs text-gray-500">pH</span>
            <input type="number" placeholder="Min" className="input-field text-xs w-16" value={phMin}
              onChange={e => { setPhMin(e.target.value); setPage(1) }} />
            <span className="text-xs text-gray-400">–</span>
            <input type="number" placeholder="Max" className="input-field text-xs w-16" value={phMax}
              onChange={e => { setPhMax(e.target.value); setPage(1) }} />
          </div>
          {/* Rainfall range */}
          <div className="flex gap-1 items-center">
            <span className="text-xs text-gray-500">Rain (mm)</span>
            <input type="number" placeholder="Min" className="input-field text-xs w-16" value={rainMin}
              onChange={e => { setRainMin(e.target.value); setPage(1) }} />
            <span className="text-xs text-gray-400">–</span>
            <input type="number" placeholder="Max" className="input-field text-xs w-16" value={rainMax}
              onChange={e => { setRainMax(e.target.value); setPage(1) }} />
          </div>
          {/* Reset */}
          <button className="btn-secondary text-xs" onClick={() => {
            setSearch(''); setCropFilter(''); setPhMin(''); setPhMax(''); setRainMin(''); setRainMax(''); setPage(1)
          }}>
            <X size={13} /> Reset
          </button>
          {/* Add */}
          <button className="btn-primary text-xs ml-auto" onClick={() => setAddModal(true)}>
            <Plus size={14} /> Add Record
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Showing {records.length} of {total.toLocaleString()} records
        </p>
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={loadData} /> : records.length === 0 ? (
          <EmptyState title="No records match your filters" description="Try adjusting the search or filters above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.key}
                      className="px-3 py-3 text-left font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && <SortIcon col={col.key} />}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((rec) => (
                  <tr key={rec._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-gray-800 capitalize">{rec.crop}</td>
                    <td className="px-3 py-2.5 text-gray-600">{Number(rec.nitrogen).toFixed(0)}</td>
                    <td className="px-3 py-2.5 text-gray-600">{Number(rec.phosphorus).toFixed(0)}</td>
                    <td className="px-3 py-2.5 text-gray-600">{Number(rec.potassium).toFixed(0)}</td>
                    <td className="px-3 py-2.5 text-gray-600">{Number(rec.temperature).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-600">{Number(rec.humidity).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-600">{Number(rec.ph).toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-gray-600">{Number(rec.rainfall).toFixed(2)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => setViewRecord(rec)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="View">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => setEditRecord(rec)}
                          className="p-1 text-gray-400 hover:text-agri-green-700 transition-colors" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget(rec)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(1)}
                className="btn-secondary text-xs px-2 py-1 disabled:opacity-40">«</button>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-xs px-2 py-1 disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-xs px-2 py-1 disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                className="btn-secondary text-xs px-2 py-1 disabled:opacity-40">»</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Modal ─────────────────────────────────── */}
      {addModal && (
        <Modal title="Add New Record" onClose={() => setAddModal(false)}>
          <RecordForm onSave={handleAdd} onCancel={() => setAddModal(false)} saving={saving} />
        </Modal>
      )}

      {/* ── Edit Modal ────────────────────────────────── */}
      {editRecord && (
        <Modal title="Edit Record" onClose={() => setEditRecord(null)}>
          <RecordForm
            initial={{ ...editRecord }}
            onSave={handleEdit}
            onCancel={() => setEditRecord(null)}
            saving={saving}
          />
        </Modal>
      )}

      {/* ── View Modal ────────────────────────────────── */}
      {viewRecord && (
        <Modal title={`Record — ${viewRecord.crop.charAt(0).toUpperCase() + viewRecord.crop.slice(1)}`}
          onClose={() => setViewRecord(null)}>
          <dl className="space-y-2">
            {[
              ['ID',          viewRecord._id],
              ['Crop',        viewRecord.crop],
              ['Nitrogen',    viewRecord.nitrogen],
              ['Phosphorus',  viewRecord.phosphorus],
              ['Potassium',   viewRecord.potassium],
              ['Temperature', `${viewRecord.temperature}°C`],
              ['Humidity',    `${viewRecord.humidity}%`],
              ['pH',          viewRecord.ph],
              ['Rainfall',    `${viewRecord.rainfall} mm`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <dt className="text-xs text-gray-500 font-medium">{k}</dt>
                <dd className="text-xs text-gray-800 font-semibold capitalize">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}

      {/* ── Delete Confirmation ───────────────────────── */}
      {deleteTarget && (
        <Modal title="Delete Record" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to delete this <span className="font-semibold capitalize text-gray-800">{deleteTarget.crop}</span> record?
            This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={deleting}
              className="btn-danger flex-1 justify-center text-xs">
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </button>
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary text-xs">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
