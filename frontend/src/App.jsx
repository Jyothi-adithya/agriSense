import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import CropAnalytics from './pages/CropAnalytics'
import SoilAnalytics from './pages/SoilAnalytics'
import ClimateAnalytics from './pages/ClimateAnalytics'
import Recommendation from './pages/Recommendation'
import DataExplorer from './pages/DataExplorer'
import About from './pages/About'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <Sidebar />

        {/* ── Main content area ──────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-gray-50/50">
          <Header />

          <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <div className="max-w-7xl mx-auto h-full">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/crop-analytics" element={<CropAnalytics />} />
                <Route path="/soil-analytics" element={<SoilAnalytics />} />
                <Route path="/climate-analytics" element={<ClimateAnalytics />} />
                <Route path="/recommendation" element={<Recommendation />} />
                <Route path="/data-explorer" element={<DataExplorer />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
