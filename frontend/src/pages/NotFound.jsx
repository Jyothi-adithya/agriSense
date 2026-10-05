import { Link } from 'react-router-dom'
import { SearchX, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4 shadow-inner">
        <SearchX size={32} />
      </div>
      <h2 className="text-xl font-bold text-gray-900 leading-tight">Page Not Found</h2>
      <p className="text-sm text-gray-500 mt-2 max-w-sm">
        The page you are looking for doesn't exist, has been moved, or is temporarily unavailable.
      </p>
      <Link to="/" className="btn-primary mt-6">
        <Home size={16} />
        Back to Dashboard
      </Link>
    </div>
  )
}
