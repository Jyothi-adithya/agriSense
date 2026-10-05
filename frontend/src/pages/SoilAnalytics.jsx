import { useEffect, useState } from 'react'
import { fetchSoilAnalytics } from '../services/api'
import ChartCard from '../components/ChartCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const NUTRIENT_COLORS = { avg_nitrogen: '#166534', avg_phosphorus: '#2563eb', avg_potassium: '#7c3aed' }
const PH_COLORS = ['#f97316', '#22c55e', '#6366f1']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs">
      <p className="font-semibold text-gray-800 capitalize mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill || p.color }} className="mt-0.5">
          {p.name}: <span className="font-bold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

const InsightCard = ({ text }) => (
  <div className="bg-agri-green-50 border border-agri-green-200 rounded-lg px-4 py-3 text-sm text-agri-green-800">
    💡 {text}
  </div>
)

export default function SoilAnalytics() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [activeNutrient, setActiveNutrient] = useState('avg_nitrogen')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchSoilAnalytics()
      setData(res.data)
    } catch (e) {
      setError('Failed to load soil analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <LoadingState message="Running soil analytics aggregation…" />
  if (error)   return <ErrorState message={error} onRetry={load} />
  if (!data)   return null

  const { npk_by_crop, ph_distribution, rainfall_by_crop } = data
  const phCategories = ph_distribution?.categories ?? []
  const phInsight    = ph_distribution?.insight ?? ''

  // Find dominant nutrient stats for insights
  const highNitrogen  = [...npk_by_crop].sort((a, b) => b.avg_nitrogen - a.avg_nitrogen)[0]
  const highRainfall  = [...(rainfall_by_crop || [])].sort((a, b) => b.avg_rainfall - a.avg_rainfall)[0]

  const nutrientLabel = { avg_nitrogen: 'Nitrogen (N)', avg_phosphorus: 'Phosphorus (P)', avg_potassium: 'Potassium (K)' }

  return (
    <div className="space-y-6">

      {/* ── Data-driven insights ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {phInsight && <InsightCard text={phInsight} />}
        {highNitrogen && (
          <InsightCard text={`${highNitrogen.crop.charAt(0).toUpperCase() + highNitrogen.crop.slice(1)} requires the highest average nitrogen (${highNitrogen.avg_nitrogen} units) among all crops in the dataset.`} />
        )}
      </div>

      {/* ── pH Distribution ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Soil pH Distribution" description="Records categorised by standard soil science thresholds">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={phCategories}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ label, percentage }) => `${label} ${percentage}%`}
                labelLine={false}
              >
                {phCategories.map((_, i) => (
                  <Cell key={i} fill={PH_COLORS[i % PH_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [v, name]} />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {phCategories.map((cat, i) => (
              <div key={cat.label} className="text-center p-2 rounded-lg" style={{ backgroundColor: PH_COLORS[i] + '18' }}>
                <p className="text-xs font-semibold" style={{ color: PH_COLORS[i] }}>{cat.label}</p>
                <p className="text-xs text-gray-500">{cat.range}</p>
                <p className="text-lg font-bold text-gray-800">{cat.count.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{cat.percentage}%</p>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* NPK selector chart */}
        <ChartCard
          title={`Average ${nutrientLabel[activeNutrient]} by Crop`}
          description="Aggregated from MongoDB — select nutrient to switch"
        >
          <div className="flex gap-2 mb-3">
            {Object.entries(nutrientLabel).map(([key, lbl]) => (
              <button
                key={key}
                onClick={() => setActiveNutrient(key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeNutrient === key
                    ? 'bg-agri-green-700 text-white border-agri-green-700'
                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={npk_by_crop} layout="vertical"
              margin={{ top: 0, right: 10, left: 65, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="crop" type="category" tick={{ fontSize: 9 }} width={65}
                tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={activeNutrient} name={nutrientLabel[activeNutrient]}
                fill={NUTRIENT_COLORS[activeNutrient]} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── All three NPK side by side ─────────────────── */}
      <ChartCard
        title="NPK Comparison Across All Crops"
        description="Grouped bar chart — average Nitrogen, Phosphorus and Potassium per crop"
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={npk_by_crop} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="crop" tick={{ fontSize: 9, angle: -40, textAnchor: 'end' }}
              tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="square" iconSize={10} />
            <Bar dataKey="avg_nitrogen"   name="Nitrogen (N)"   fill="#166534" radius={[2, 2, 0, 0]} />
            <Bar dataKey="avg_phosphorus" name="Phosphorus (P)" fill="#2563eb" radius={[2, 2, 0, 0]} />
            <Bar dataKey="avg_potassium"  name="Potassium (K)"  fill="#7c3aed" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Average Rainfall per crop ──────────────────── */}
      {rainfall_by_crop && (
        <ChartCard
          title="Average Rainfall by Crop"
          description="Annual rainfall (mm) — min, average, max per crop from MongoDB aggregation"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rainfall_by_crop} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="crop" tick={{ fontSize: 9, angle: -40, textAnchor: 'end' }}
                tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
              <YAxis tick={{ fontSize: 10 }} unit=" mm" />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="square" iconSize={10} />
              <Bar dataKey="avg_rainfall" name="Avg Rainfall (mm)" fill="#06b6d4" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}
