import { useLocation } from 'react-router-dom'
import { Database } from 'lucide-react'
import { useState, useEffect } from 'react'
import { fetchHealth } from '../services/api'

const PAGE_META = {
  '/dashboard':         { title: 'Dashboard',            description: 'Overview of agricultural data and key metrics from MongoDB' },
  '/crop-analytics':    { title: 'Crop Analytics',       description: 'Crop distribution and per-crop condition analysis via aggregation pipeline' },
  '/soil-analytics':    { title: 'Soil Analytics',       description: 'Nitrogen, Phosphorus, Potassium, and pH analysis from crop_data collection' },
  '/climate-analytics': { title: 'Climate Analytics',    description: 'Temperature, humidity, and rainfall patterns across all 22 crop types' },
  '/recommendation':    { title: 'Crop Recommendation',  description: 'Data-similarity-based crop recommendation — no machine learning' },
  '/data-explorer':     { title: 'Data Explorer',        description: 'Browse, filter, search, and manage all 2,200 agricultural records (CRUD)' },
  '/about':             { title: 'About AgriSense',      description: 'Project overview, methodology, SDG alignment, and technology stack' },
}

export default function Header() {
  const { pathname }                    = useLocation()
  const meta                            = PAGE_META[pathname] ?? { title: 'AgriSense', description: '' }
  const [dbStatus, setDbStatus]         = useState('checking')
  const [recordCount, setRecordCount]   = useState(null)

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await fetchHealth()
        setDbStatus(data.mongodb?.status === 'connected' ? 'connected' : 'disconnected')
        setRecordCount(data.mongodb?.record_count ?? 0)
      } catch {
        setDbStatus('disconnected')
      }
    }
    check()
  }, [])

  const statusColor =
    dbStatus === 'connected'    ? 'text-green-600 bg-green-50 border-green-200' :
    dbStatus === 'disconnected' ? 'text-red-600 bg-red-50 border-red-200' :
                                  'text-yellow-600 bg-yellow-50 border-yellow-200'

  const dotColor =
    dbStatus === 'connected'    ? 'bg-green-500' :
    dbStatus === 'disconnected' ? 'bg-red-500'   : 'bg-yellow-400'

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex-shrink-0
                       flex items-center justify-between gap-4">
      {/* Page title + description */}
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-gray-900 leading-tight">{meta.title}</h2>
        {meta.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{meta.description}</p>
        )}
      </div>

      {/* MongoDB live status pill */}
      <div className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-medium
                       px-3 py-1.5 rounded-full border ${statusColor}`}>
        <Database size={11} />
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        {dbStatus === 'connected'
          ? `${(recordCount ?? 0).toLocaleString()} records`
          : dbStatus === 'checking'
          ? 'Connecting…'
          : 'Disconnected'}
      </div>
    </header>
  )
}
