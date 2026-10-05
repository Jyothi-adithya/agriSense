/**
 * KpiCard — displays a single KPI metric with icon, value and label.
 *
 * Props:
 *   title      string   — metric label
 *   value      string   — formatted metric value
 *   icon       element  — Lucide icon component
 *   iconBg     string   — Tailwind bg class for icon background
 *   iconColor  string   — Tailwind text class for icon color
 *   sub        string   — optional subtitle text
 */
export default function KpiCard({ title, value, icon: Icon, iconBg = 'bg-agri-green-100', iconColor = 'text-agri-green-700', sub }) {
  return (
    <div className="kpi-card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {Icon && <Icon size={20} className={iconColor} />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
