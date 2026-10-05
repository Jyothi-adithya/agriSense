/**
 * ChartCard — consistent wrapper for every chart and data panel.
 *
 * Props:
 *   title        string   — card heading
 *   description  string   — optional subtitle
 *   action       node     — optional element rendered top-right (e.g. button)
 *   children     node     — chart or content
 *   className    string   — extra classes on the outer div
 */
export default function ChartCard({ title, description, action, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-gray-800 leading-tight">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
