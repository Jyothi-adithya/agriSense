import { ExternalLink, Leaf, Database, Code2, Globe } from 'lucide-react'

const TECH_STACK = [
  { layer: 'Frontend',       items: 'React 18, Vite, Tailwind CSS, Recharts, Lucide React' },
  { layer: 'Backend',        items: 'Python 3.13, Flask 3, Flask-CORS, PyMongo' },
  { layer: 'Database',       items: 'MongoDB 8.3 (NoSQL document store)' },
  { layer: 'Data Analytics', items: 'Pandas, NumPy, MongoDB Aggregation Pipeline' },
]

const SDG_ITEMS = [
  {
    code: 'SDG 2',
    title: 'Zero Hunger',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    desc:
      'AgriSense supports data-driven agricultural decision-making. By analysing soil and environmental conditions, it helps farmers select suitable crops — contributing to improved food production and food security.',
  },
  {
    code: 'SDG 12',
    title: 'Responsible Consumption and Production',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    desc:
      'Informed crop selection leads to more efficient use of agricultural inputs such as fertilizers and water. AgriSense promotes responsible resource use by aligning crop choices with actual soil conditions.',
  },
]

export default function About() {
  return (
    <div className="max-w-3xl space-y-6">

      {/* ── Project overview ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-agri-green-700 rounded-lg flex items-center justify-center">
            <Leaf size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">AgriSense</h2>
            <p className="text-xs text-gray-500">Agricultural Crop & Soil Analytics and Recommendation System</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Problem Statement</h3>
            <p>
              Farmers need to consider multiple soil and environmental conditions — nitrogen, phosphorus,
              potassium levels, pH, temperature, humidity and rainfall — when selecting suitable crops.
              Without data-driven tools, crop selection relies heavily on experience and trial-and-error,
              which can lead to poor yields and inefficient use of agricultural resources.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Solution</h3>
            <p>
              AgriSense stores agricultural soil and environmental data in <strong>MongoDB</strong>,
              performs analytics using <strong>MongoDB aggregation pipelines</strong> and Python,
              and provides crop recommendations using a <strong>rule/similarity-based scoring system</strong> —
              without machine learning. The system compares user input against historical crop profiles
              and ranks crops by dataset similarity score.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Methodology</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Agricultural data is loaded from the Kaggle Crop Recommendation Dataset.</li>
              <li>Data is validated and cleaned using a preprocessing pipeline.</li>
              <li>Cleaned records are imported into MongoDB (<code className="text-xs bg-gray-100 px-1 rounded">agrisense_db.crop_data</code>).</li>
              <li>MongoDB aggregation pipelines compute crop profiles (avg N, P, K, temperature, humidity, pH, rainfall).</li>
              <li>For recommendation, user input is compared to each crop profile using normalised similarity scoring.</li>
              <li>Crops are ranked by weighted suitability score (equal weights across all 7 parameters).</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── SDG alignment ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-agri-green-700" />
          <h3 className="text-sm font-semibold text-gray-800">SDG Alignment</h3>
        </div>
        <div className="space-y-3">
          {SDG_ITEMS.map(({ code, title, color, desc }) => (
            <div key={code} className={`rounded-lg border p-4 ${color}`}>
              <p className="text-xs font-bold mb-0.5">{code} — {title}</p>
              <p className="text-xs leading-relaxed opacity-90">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dataset ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-agri-green-700" />
          <h3 className="text-sm font-semibold text-gray-800">Dataset</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <span className="font-medium text-gray-800">Crop Recommendation Dataset</span> by Atharva Ingle
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['Records', '2,200'],
              ['Crop Types', '22'],
              ['Features', 'N, P, K, Temperature, Humidity, pH, Rainfall'],
              ['Source', 'Kaggle'],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg p-2">
                <p className="font-medium text-gray-500">{k}</p>
                <p className="text-gray-800">{v}</p>
              </div>
            ))}
          </div>
          <a
            href="https://www.kaggle.com/atharvaingle/crop-recommendation-dataset"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-agri-green-700 hover:text-agri-green-900 font-medium text-xs mt-1"
          >
            <ExternalLink size={12} />
            View on Kaggle
          </a>
        </div>
      </div>

      {/* ── Tech stack ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code2 size={16} className="text-agri-green-700" />
          <h3 className="text-sm font-semibold text-gray-800">Technology Stack</h3>
        </div>
        <div className="space-y-2">
          {TECH_STACK.map(({ layer, items }) => (
            <div key={layer} className="flex gap-3 text-sm">
              <span className="w-28 text-xs font-semibold text-gray-500 flex-shrink-0 pt-0.5 uppercase tracking-wide">
                {layer}
              </span>
              <span className="text-gray-700">{items}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-xs text-red-700 font-medium">
            ✗ No machine learning — scikit-learn, TensorFlow, PyTorch, Random Forest, Decision Trees,
            KNN and all ML models are explicitly excluded from this project.
          </p>
        </div>
      </div>

    </div>
  )
}
