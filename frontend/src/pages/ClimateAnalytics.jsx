import { useEffect, useState } from 'react'
import { fetchClimateAnalytics } from '../services/api'
import ChartCard from '../components/ChartCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis,
} from 'recharts'

const BASE = import.meta.env.VITE_API_URL || '/api'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs">
      <p className="font-semibold text-gray-800 capitalize mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill || p.color || '#166534' }} className="mt-0.5">
          {p.name}: <span className="font-bold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

const InsightCard = ({ text }) => (
  <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-3 text-sm text-sky-800">
    💡 {text}
  </div>
)

export default function ClimateAnalytics() {
  const [data, setData]           = useState(null)
  const [cropNames, setCropNames] = useState([])
  const [cropFilter, setCropFilter] = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const load = async (filter = '') => {
    setLoading(true)
    setError(null)
    try {
      const url   = filter ? `${BASE}/analytics/climate?crop=${filter}` : `${BASE}/analytics/climate`
      const [climRes, namesRes] = await Promise.all([
        axios.get(url),
        cropNames.length === 0 ? axios.get(`${BASE}/crops/names`) : Promise.resolve({ data: { data: cropNames } }),
      ])
      setData(climRes.data)
      if (cropNames.length === 0) setCropNames(namesRes.data.data)
    } catch {
      setError('Failed to load climate analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleFilterChange = (val) => {
    setCropFilter(val)
    load(val)
  }

  if (loading) return <LoadingState message="Running climate analytics aggregation…" />
  if (error)   return <ErrorState message={error} onRetry={() => load(cropFilter)} />
  if (!data)   return null

  const { temperature_by_crop, humidity_by_crop, rainfall_by_crop } = data

  // Data-driven insights
  const hottest  = [...(temperature_by_crop || [])].sort((a, b) => b.avg_temperature - a.avg_temperature)[0]
  const rainiest = [...(rainfall_by_crop    || [])].sort((a, b) => b.avg_rainfall - a.avg_rainfall)[0]
  const mostHumid = [...(humidity_by_crop   || [])].sort((a, b) => b.avg_humidity  - a.avg_humidity)[0]

  return (
    <div className="space-y-6">

      {/* Crop filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">Filter by Crop</p>
          <p className="text-xs text-gray-500">Show climate data for one crop or all crops</p>
        </div>
        <select
          value={cropFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="select-field w-44 ml-auto"
        >
          <option value="">All Crops</option>
          {cropNames.map((c) => (
            <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Data-driven insights */}
      {!cropFilter && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {hottest   && <InsightCard text={`${hottest.crop.charAt(0).toUpperCase() + hottest.crop.slice(1)} grows at the highest average temperature (${hottest.avg_temperature}°C).`} />}
          {rainiest  && <InsightCard text={`${rainiest.crop.charAt(0).toUpperCase() + rainiest.crop.slice(1)} requires the most rainfall on average (${rainiest.avg_rainfall} mm).`} />}
          {mostHumid && <InsightCard text={`${mostHumid.crop.charAt(0).toUpperCase() + mostHumid.crop.slice(1)} thrives at the highest average humidity (${mostHumid.avg_humidity}%).`} />}
        </div>
      )}

      {/* Temperature chart */}
      <ChartCard
        title="Average Temperature by Crop"
        description="Mean temperature (°C) from MongoDB aggregation"
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={temperature_by_crop} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="crop" tick={{ fontSize: 9, angle: -40, textAnchor: 'end' }}
              tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
            <YAxis tick={{ fontSize: 10 }} unit="°C" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avg_temperature" name="Avg Temperature (°C)" fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Humidity chart */}
        <ChartCard
          title="Average Humidity by Crop"
          description="Mean humidity (%) — min and max range shown"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={humidity_by_crop} layout="vertical"
              margin={{ top: 0, right: 10, left: 65, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 105]} />
              <YAxis dataKey="crop" type="category" tick={{ fontSize: 9 }} width={65}
                tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_humidity" name="Avg Humidity (%)" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Rainfall chart */}
        <ChartCard
          title="Average Rainfall by Crop"
          description="Annual rainfall (mm) per crop"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rainfall_by_crop} layout="vertical"
              margin={{ top: 0, right: 10, left: 65, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} unit=" mm" />
              <YAxis dataKey="crop" type="category" tick={{ fontSize: 9 }} width={65}
                tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_rainfall" name="Avg Rainfall (mm)" fill="#06b6d4" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Min / Max / Avg summary table */}
      <ChartCard
        title="Temperature — Min / Average / Max by Crop"
        description="Full temperature range derived from MongoDB aggregation"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Crop</th>
                <th className="text-right pb-2 font-medium">Min °C</th>
                <th className="text-right pb-2 font-medium text-agri-green-700">Avg °C</th>
                <th className="text-right pb-2 font-medium">Max °C</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {temperature_by_crop.map((row) => (
                <tr key={row.crop}>
                  <td className="py-1.5 text-gray-700 font-medium capitalize">{row.crop}</td>
                  <td className="py-1.5 text-right text-blue-500">{row.min_temperature}</td>
                  <td className="py-1.5 text-right text-agri-green-700 font-semibold">{row.avg_temperature}</td>
                  <td className="py-1.5 text-right text-red-400">{row.max_temperature}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
