import { useEffect, useState } from 'react'
import { fetchCropDistribution, fetchCropProfile } from '../services/api'
import ChartCard from '../components/ChartCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const GREEN_SHADES = [
  '#166534','#15803d','#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0',
  '#14532d','#052e16','#1a7a3c','#2d9a52','#3db868','#50d681',
  '#125c2d','#0e4622','#0a3018','#06200e','#021408','#1d8c42',
  '#2aaa5a','#238c4a','#35b060',
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs">
      <p className="font-semibold text-gray-800 capitalize mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || p.fill }} className="mt-0.5">
          {p.name}: <span className="font-bold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

const StatPill = ({ label, value, color = 'text-agri-green-700', bg = 'bg-agri-green-50' }) => (
  <div className={`${bg} rounded-lg px-3 py-2 text-center`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-sm font-bold ${color}`}>{value ?? '—'}</p>
  </div>
)

export default function CropAnalytics() {
  const [distribution, setDistribution] = useState([])
  const [cropNames, setCropNames]       = useState([])
  const [selectedCrop, setSelectedCrop] = useState('rice')
  const [profile, setProfile]           = useState(null)
  const [loadingDist, setLoadingDist]   = useState(true)
  const [loadingProf, setLoadingProf]   = useState(false)
  const [errorDist, setErrorDist]       = useState(null)
  const [errorProf, setErrorProf]       = useState(null)

  // Load distribution + crop names once
  useEffect(() => {
    const load = async () => {
      setLoadingDist(true)
      try {
        const [distRes, namesRes] = await Promise.all([
          fetchCropDistribution(),
          axios.get(`${BASE}/crops/names`),
        ])
        setDistribution(distRes.data.data)
        setCropNames(namesRes.data.data)
      } catch (e) {
        setErrorDist('Failed to load crop distribution.')
      } finally {
        setLoadingDist(false)
      }
    }
    load()
  }, [])

  // Load profile whenever selectedCrop changes
  useEffect(() => {
    const load = async () => {
      if (!selectedCrop) return
      setLoadingProf(true)
      setErrorProf(null)
      try {
        const { data } = await fetchCropProfile(selectedCrop)
        setProfile(data.data)
      } catch {
        setErrorProf(`No profile found for "${selectedCrop}".`)
        setProfile(null)
      } finally {
        setLoadingProf(false)
      }
    }
    load()
  }, [selectedCrop])

  // Build radar data from profile
  const radarData = profile ? [
    { subject: 'Nitrogen',    value: profile.avg_nitrogen,    fullMark: 140 },
    { subject: 'Phosphorus',  value: profile.avg_phosphorus,  fullMark: 145 },
    { subject: 'Potassium',   value: profile.avg_potassium,   fullMark: 205 },
    { subject: 'Temperature', value: profile.avg_temperature, fullMark: 50  },
    { subject: 'Humidity',    value: profile.avg_humidity,    fullMark: 100 },
    { subject: 'pH × 10',    value: (profile.avg_ph * 10).toFixed(1), fullMark: 140 },
    { subject: 'Rainfall/10', value: (profile.avg_rainfall / 10).toFixed(1), fullMark: 30 },
  ] : []

  return (
    <div className="space-y-6">

      {/* ── Crop Distribution ───────────────────────────── */}
      <ChartCard
        title="Crop Distribution"
        description="Number of records per crop type in the dataset (22 crops, 100 records each)"
      >
        {loadingDist ? <LoadingState /> : errorDist ? <ErrorState message={errorDist} /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribution} layout="vertical"
              margin={{ top: 0, right: 20, left: 70, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 110]} />
              <YAxis dataKey="crop" type="category" tick={{ fontSize: 10 }} width={70}
                tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Records" radius={[0, 3, 3, 0]}>
                {distribution.map((_, i) => (
                  <Cell key={i} fill={GREEN_SHADES[i % GREEN_SHADES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Crop Selector ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Crop Profile Explorer</h3>
            <p className="text-xs text-gray-500 mt-0.5">Select a crop to view its average soil and climate requirements</p>
          </div>
          <div className="ml-auto">
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="select-field w-44"
            >
              {cropNames.map((c) => (
                <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingProf ? <LoadingState /> : errorProf ? <ErrorState message={errorProf} /> : profile ? (
          <>
            {/* Stat pills row */}
            <div className="grid grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
              <StatPill label="Nitrogen"    value={profile.avg_nitrogen} />
              <StatPill label="Phosphorus"  value={profile.avg_phosphorus} bg="bg-blue-50"   color="text-blue-700" />
              <StatPill label="Potassium"   value={profile.avg_potassium}  bg="bg-purple-50" color="text-purple-700" />
              <StatPill label="Temp °C"     value={profile.avg_temperature} bg="bg-orange-50" color="text-orange-700" />
              <StatPill label="Humidity %"  value={profile.avg_humidity}   bg="bg-sky-50"    color="text-sky-700" />
              <StatPill label="pH"          value={profile.avg_ph}         bg="bg-amber-50"  color="text-amber-700" />
              <StatPill label="Rainfall mm" value={profile.avg_rainfall}   bg="bg-cyan-50"   color="text-cyan-700" />
            </div>

            {/* Min / Avg / Max bars */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* NPK bar chart */}
              <ChartCard title="NPK Averages" description={`Nitrogen, Phosphorus, Potassium for ${selectedCrop}`}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={[
                      { name: 'Nitrogen',   value: profile.avg_nitrogen },
                      { name: 'Phosphorus', value: profile.avg_phosphorus },
                      { name: 'Potassium',  value: profile.avg_potassium },
                    ]}
                    margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Average" fill="#166534" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Min/Max/Avg table */}
              <ChartCard title="Full Parameter Range" description="Min, average, max across all records">
                <table className="w-full text-xs mt-1">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-1.5 font-medium">Parameter</th>
                      <th className="text-right pb-1.5 font-medium">Min</th>
                      <th className="text-right pb-1.5 font-medium">Avg</th>
                      <th className="text-right pb-1.5 font-medium">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[
                      ['Nitrogen',     profile.min_nitrogen,    profile.avg_nitrogen,    profile.max_nitrogen],
                      ['Phosphorus',   profile.min_phosphorus,  profile.avg_phosphorus,  profile.max_phosphorus],
                      ['Potassium',    profile.min_potassium,   profile.avg_potassium,   profile.max_potassium],
                      ['Temp (°C)',    profile.min_temperature, profile.avg_temperature, profile.max_temperature],
                      ['Humidity (%)', profile.min_humidity,    profile.avg_humidity,    profile.max_humidity],
                      ['pH',           profile.min_ph,          profile.avg_ph,          profile.max_ph],
                      ['Rainfall(mm)', profile.min_rainfall,    profile.avg_rainfall,    profile.max_rainfall],
                    ].map(([name, mn, avg, mx]) => (
                      <tr key={name}>
                        <td className="py-1.5 text-gray-600 font-medium">{name}</td>
                        <td className="py-1.5 text-right text-gray-400">{mn}</td>
                        <td className="py-1.5 text-right text-agri-green-700 font-semibold">{avg}</td>
                        <td className="py-1.5 text-right text-gray-400">{mx}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ChartCard>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
