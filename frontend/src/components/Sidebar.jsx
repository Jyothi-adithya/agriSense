import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Sprout, FlaskConical, CloudRain,
  Sparkles, Table2, Info, Leaf, Database,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { path: '/crop-analytics',    label: 'Crop Analytics',    icon: Sprout },
      { path: '/soil-analytics',    label: 'Soil Analytics',    icon: FlaskConical },
      { path: '/climate-analytics', label: 'Climate Analytics', icon: CloudRain },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/recommendation', label: 'Recommendation', icon: Sparkles },
      { path: '/data-explorer',  label: 'Data Explorer',  icon: Table2 },
    ],
  },
  {
    label: 'Project',
    items: [
      { path: '/about', label: 'About Project', icon: Info },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-100
                      flex flex-col h-full select-none">

      {/* ── Logo ──────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-agri-green-700 rounded-lg flex items-center
                        justify-center flex-shrink-0 shadow-sm">
          <Leaf size={15} className="text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-gray-900 leading-tight tracking-tight">
            AgriSense
          </h1>
          <p className="text-[10px] text-gray-400 leading-tight">BDA Mini-Project</p>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-thin">
        {NAV_SECTIONS.map(({ label, items }) => (
          <div key={label}>
            <p className="px-2 pb-1.5 text-[10px] font-semibold text-gray-400
                          uppercase tracking-widest">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ path, label: itemLabel, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={15} className="flex-shrink-0" />
                  <span className="truncate">{itemLabel}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── MongoDB footer ────────────────────────────── */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-agri-green-50">
          <Database size={13} className="text-agri-green-700 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-agri-green-800 leading-tight">
              agrisense_db
            </p>
            <p className="text-[10px] text-agri-green-600 leading-tight truncate">
              crop_data · 4 indexes
            </p>
          </div>
        </div>
        <p className="text-[9px] text-gray-400 text-center mt-1.5">
          SDG 2 · SDG 12
        </p>
      </div>
    </aside>
  )
}
