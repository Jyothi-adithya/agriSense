import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorState({ message = 'An error occurred.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center h-full min-h-[200px] bg-red-50/50 rounded-xl border border-red-100/50">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-3 shadow-inner">
        <AlertCircle size={24} />
      </div>
      <p className="text-sm font-medium text-red-800 mb-1">Failed to load data</p>
      <p className="text-xs text-red-600 mb-4 max-w-sm">{message}</p>
      
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors shadow-sm"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      )}
    </div>
  )
}
