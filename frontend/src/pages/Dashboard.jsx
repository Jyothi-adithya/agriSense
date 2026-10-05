import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Database, Sprout, Droplets, CloudRain,
  ArrowRight, TrendingUp,
} from 'lucide-react'
import KpiCard from '../components/KpiCard'
import ChartCard from '../components/ChartCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { fetchDashboard } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'

const GREEN_SHADES = [
  '#166534','#15803d','#16a34a','#22c55e','#4ade80',
  '#86efac','#bbf7d0','#14532d','#052e16','#1a7a3c',
  '#2d9a52','#3db868','#50d681','#125c2d','#0e4622',
  '#1d8c42','#2aaa5a','#0a3018','#063011','#041f0a',
  '#238c4a','#35b060',
]

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs">
        <p className="font-semibold text-gray-800 capitalize">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.fill }} className="mt-0.5">
            {p.name}: <span className="font-medium">{p.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await fetchDashboard()
      setStats(data)
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      {/* ── KPI row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Records"
          value={loading ? '…' : (stats?.total_records ?? 0).toLocaleString()}
          icon={Database}
          iconBg="bg-agri-green-100"
          iconColor="text-agri-green-700"
          sub="Agricultural observations"
        />
        <KpiCard
          title="Crop Types"
          value={loading ? '…' : (stats?.crop_count ?? 0).toString()}
          icon={Sprout}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-700"
          sub="Distinct crop varieties"
        />
        <KpiCard
          title="Avg Soil pH"
          value={loading ? '…' : stats?.avg_ph ?? '—'}
          icon={Droplets}
          iconBg="bg-blue-100"
          iconColor="text-blue-700"
          sub="Across all records"
        />
        <KpiCard
          title="Avg Rainfall"
          value={loading ? '…' : `${stats?.avg_rainfall ?? '—'} mm`}
          icon={CloudRain}
          iconBg="bg-sky-100"
          iconColor="text-sky-700"
          sub="Annual average"
        />
      </div>

      {loading ? (
        <LoadingState message="Loading dashboard data…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          {/* Quick action card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6
                          flex flex-col sm:flex-row items-start sm:items-center
                          justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-agri-green-700 uppercase tracking-wide mb-1">
                Crop Recommendation
              </p>
              <h3 className="text-lg font-bold text-gray-900">
                Find the right crop for your soil
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                Enter your soil and climate conditions to get a data-driven crop
                recommendation based on similarity with{' '}
                <span className="font-medium text-gray-700">
                  {(stats?.total_records ?? 0).toLocaleString()}
                </span>{' '}
                agricultural records stored in MongoDB.
              </p>
            </div>
            <button
              onClick={() => navigate('/recommendation')}
              className="btn-primary flex-shrink-0"
            >
              Start Recommendation
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Summary KPIs row 2 */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Avg Nitrogen',    value: `${stats?.avg_nitrogen ?? '—'} units`,   color: 'text-green-700',  bg: 'bg-green-50'  },
              { label: 'Avg Phosphorus',  value: `${stats?.avg_phosphorus ?? '—'} units`, color: 'text-blue-700',   bg: 'bg-blue-50'   },
              { label: 'Avg Potassium',   value: `${stats?.avg_potassium ?? '—'} units`,  color: 'text-purple-700', bg: 'bg-purple-50' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl border border-transparent px-4 py-3`}>
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className={`text-lg font-bold ${color} mt-0.5`}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Charts ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Crop Distribution bar chart */}
            <ChartCard
              title="Crop Distribution"
              description="Number of records per crop type in the dataset"
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats?.crop_distribution ?? []}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="crop"
                    type="category"
                    tick={{ fontSize: 10 }}
                    width={60}
                    tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Records" radius={[0, 3, 3, 0]}>
                    {(stats?.crop_distribution ?? []).map((_, i) => (
                      <Cell key={i} fill={GREEN_SHADES[i % GREEN_SHADES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Average NPK overview */}
            <ChartCard
              title="Dataset Overview"
              description="Key averages across all 2,200 agricultural records"
            >
              <div className="space-y-3 pt-2">
                {[
                  { label: 'Avg Temperature', value: stats?.avg_temperature, unit: '°C',  color: '#f97316', bg: '#fff7ed' },
                  { label: 'Avg Humidity',    value: stats?.avg_humidity,    unit: '%',   color: '#3b82f6', bg: '#eff6ff' },
                  { label: 'Avg Rainfall',    value: stats?.avg_rainfall,    unit: 'mm',  color: '#06b6d4', bg: '#ecfeff' },
                  { label: 'Avg pH',          value: stats?.avg_ph,          unit: '',    color: '#8b5cf6', bg: '#f5f3ff' },
                  { label: 'Avg Nitrogen',    value: stats?.avg_nitrogen,    unit: '',    color: '#22c55e', bg: '#f0fdf4' },
                  { label: 'Avg Phosphorus',  value: stats?.avg_phosphorus,  unit: '',    color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Avg Potassium',   value: stats?.avg_potassium,   unit: '',    color: '#15803d', bg: '#f0fdf4' },
                ].map(({ label, value, unit, color, bg }) => (
                  <div key={label} className="flex items-center justify-between
                                              rounded-lg px-3 py-2"
                    style={{ backgroundColor: bg }}>
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                    <span className="text-sm font-bold" style={{ color }}>
                      {value ?? '—'}{unit}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* MongoDB info strip */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3
                          flex items-center gap-3 text-xs text-gray-500">
            <TrendingUp size={14} className="text-agri-green-600 flex-shrink-0" />
            <span>
              Analytics powered by{' '}
              <span className="font-semibold text-gray-700">MongoDB Aggregation Pipelines</span>
              {' '}on{' '}
              <span className="font-semibold text-gray-700">agrisense_db.crop_data</span>
              {' '}· 4 indexes active (crop, ph, rainfall, temperature)
            </span>
          </div>
        </>
      )}
    </div>
  )
}
