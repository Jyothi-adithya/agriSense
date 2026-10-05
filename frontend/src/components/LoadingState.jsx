import { Loader2 } from 'lucide-react'

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[200px]">
      <Loader2 size={32} className="text-agri-green-500 animate-spin mb-4" />
      <p className="text-sm font-medium text-gray-500 animate-pulse">{message}</p>
    </div>
  )
}
