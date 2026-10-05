import { useState } from 'react'
import { Sparkles, ChevronRight, RotateCcw, Info } from 'lucide-react'
import { getRecommendation } from '../services/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

const FIELDS = [
  { key: 'nitrogen',    label: 'Nitrogen (N)',   unit: 'units', min: 0,   max: 200,  step: 1,    placeholder: '0 – 200' },
  { key: 'phosphorus',  label: 'Phosphorus (P)', unit: 'units', min: 0,   max: 200,  step: 1,    placeholder: '0 – 200' },
  { key: 'potassium',   label: 'Potassium (K)',  unit: 'units', min: 0,   max: 210,  step: 1,    placeholder: '0 – 210' },
  { key: 'temperature', label: 'Temperature',    unit: '°C',    min: 0,   max: 50,   step: 0.1,  placeholder: '0 – 50' },
  { key: 'humidity',    label: 'Humidity',       unit: '%',     min: 0,   max: 100,  step: 0.1,  placeholder: '0 – 100' },
  { key: 'ph',          label: 'Soil pH',        unit: '',      min: 0,   max: 14,   step: 0.01, placeholder: '0 – 14' },
  { key: 'rainfall',    label: 'Rainfall',       unit: 'mm',    min: 0,   max: 3000, step: 0.1,  placeholder: '0 – 3000' },
]

const EXAMPLE_INPUTS = {
  rice:    { nitrogen: 79, phosphorus: 48, potassium: 40, temperature: 23, humidity: 82, ph: 6.4, rainfall: 236 },
  maize:   { nitrogen: 77, phosphorus: 49, potassium: 20, temperature: 22, humidity: 65, ph: 6.2, rainfall: 67  },
  cotton:  { nitrogen: 118, phosphorus: 46, potassium: 20, temperature: 24, humidity: 80, ph: 6.9, rainfall: 80 },
  coffee:  { nitrogen: 101, phosphorus: 28, potassium: 29, temperature: 25, humidity: 58, ph: 6.8, rainfall: 158 },
}

const ScoreBar = ({ pct }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: pct >= 80 ? '#166534' : pct >= 60 ? '#22c55e' : '#86efac',
        }}
      />
    </div>
    <span className="text-xs font-semibold text-gray-700 w-10 text-right">{pct}%</span>
  </div>
)

export default function Recommendation() {
  const [form, setForm]       = useState({ nitrogen: '', phosphorus: '', potassium: '', temperature: '', humidity: '', ph: '', rainfall: '' })
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [errors, setErrors]   = useState({})

  const validate = () => {
    const e = {}
    FIELDS.forEach(({ key, min, max }) => {
      const v = parseFloat(form[key])
      if (form[key] === '' || isNaN(v)) e[key] = 'Required'
      else if (v < min || v > max) e[key] = `Must be ${min}–${max}`
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const payload = {}
      FIELDS.forEach(({ key }) => { payload[key] = parseFloat(form[key]) })
      const { data } = await getRecommendation(payload)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Recommendation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setForm({ nitrogen: '', phosphorus: '', potassium: '', temperature: '', humidity: '', ph: '', rainfall: '' })
    setResult(null)
    setError(null)
    setErrors({})
  }

  const loadExample = (crop) => {
    setForm(Object.fromEntries(Object.entries(EXAMPLE_INPUTS[crop]).map(([k, v]) => [k, String(v)])))
    setResult(null)
    setErrors({})
  }

  return (
    <div className="max-w-5xl space-y-6">

      {/* Info banner */}
      <div className="bg-agri-green-50 border border-agri-green-200 rounded-xl p-4 flex gap-3">
        <Info size={16} className="text-agri-green-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-agri-green-800">
          <span className="font-semibold">How it works: </span>
          Enter your soil and climate conditions. The system compares them against the average profile of all 22 crops in the MongoDB dataset and ranks crops by <em>dataset similarity score</em> — not machine learning.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Input form ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Soil & Climate Conditions</h3>
            <p className="text-xs text-gray-500 mb-4">Fill in all 7 parameters for your field.</p>

            {/* Quick load examples */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Load example:</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(EXAMPLE_INPUTS).map((crop) => (
                  <button
                    key={crop}
                    onClick={() => loadExample(crop)}
                    className="text-xs px-2.5 py-1 rounded-full border border-agri-green-200
                               text-agri-green-700 hover:bg-agri-green-50 transition-colors capitalize"
                  >
                    {crop}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {FIELDS.map(({ key, label, unit, min, max, step, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {label} {unit && <span className="text-gray-400">({unit})</span>}
                  </label>
                  <input
                    type="number"
                    step={step}
                    min={min}
                    max={max}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                      setErrors((er) => ({ ...er, [key]: undefined }))
                    }}
                    className={`input-field ${errors[key] ? 'border-red-300 ring-1 ring-red-300' : ''}`}
                  />
                  {errors[key] && <p className="text-xs text-red-500 mt-0.5">{errors[key]}</p>}
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
                  <Sparkles size={15} />
                  {loading ? 'Analysing…' : 'Get Recommendation'}
                </button>
                <button type="button" onClick={handleReset} className="btn-secondary px-3">
                  <RotateCcw size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Results panel ─────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {loading && <LoadingState message="Comparing against 22 crop profiles in MongoDB…" />}

          {error && <ErrorState message={error} />}

          {!loading && !error && !result && (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <Sparkles size={32} className="mx-auto text-agri-green-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">Enter conditions and click</p>
              <p className="text-sm text-gray-400">"Get Recommendation" to see results</p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Top recommended crop */}
              <div className="bg-agri-green-800 text-white rounded-xl p-5">
                <p className="text-xs font-semibold text-agri-green-300 uppercase tracking-wide mb-1">
                  Top Recommended Crop
                </p>
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-3xl font-bold capitalize">
                      🌾 {result.top_crop}
                    </h2>
                    <p className="text-agri-green-200 text-sm mt-1">
                      Dataset similarity score
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-agri-green-300">
                      {result.top_score_pct}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Disclaimer note */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Note: </span>{result.note}
                </p>
              </div>

              {/* Alternative crops */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">All Ranked Crops</h3>
                <div className="space-y-2.5">
                  {result.recommendations.map((rec, i) => (
                    <div key={rec.crop} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${i === 0 ? 'bg-agri-green-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-700 capitalize w-28 flex-shrink-0">{rec.crop}</span>
                      <ScoreBar pct={rec.score_pct} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Why <span className="capitalize text-agri-green-700">{result.top_crop}</span> scored highest
                </h3>
                <ul className="space-y-1.5">
                  {result.explanation.map((line, i) => (
                    <li key={i} className={`text-xs flex gap-2 ${
                      line.startsWith('✓') ? 'text-agri-green-700' :
                      line.startsWith('~') ? 'text-amber-700' : 'text-gray-500'
                    }`}>
                      <span className="flex-shrink-0">{line.slice(0, 1)}</span>
                      <span>{line.slice(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Comparison table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Parameter Comparison — Your Input vs <span className="capitalize text-agri-green-700">{result.top_crop}</span> Average
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-100">
                        <th className="pb-2 font-medium">Parameter</th>
                        <th className="pb-2 font-medium text-right">Your Input</th>
                        <th className="pb-2 font-medium text-right">Crop Average</th>
                        <th className="pb-2 font-medium text-right">Similarity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.recommendations[0].comparison.map((row) => (
                        <tr key={row.parameter}>
                          <td className="py-2 font-medium text-gray-700">
                            {row.parameter} {row.unit && <span className="text-gray-400">({row.unit})</span>}
                          </td>
                          <td className="py-2 text-right text-gray-900 font-semibold">{row.user_value}</td>
                          <td className="py-2 text-right text-gray-500">{row.crop_average}</td>
                          <td className="py-2 text-right">
                            <span className={`font-semibold ${
                              row.similarity >= 80 ? 'text-agri-green-700' :
                              row.similarity >= 55 ? 'text-amber-600' : 'text-red-400'
                            }`}>
                              {row.similarity}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
