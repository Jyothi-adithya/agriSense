import { SearchX } from 'lucide-react'

export default function EmptyState({ title = 'No results found', description = 'Try adjusting your filters or search terms.' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[250px] bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3 shadow-inner">
        <SearchX size={24} />
      </div>
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 max-w-sm">{description}</p>
    </div>
  )
}
