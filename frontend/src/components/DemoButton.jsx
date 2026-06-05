import { useState } from 'react'
import { runDemo } from '../utils/api'

export default function DemoButton({ onResult, onLoading, onError }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    onLoading(true)
    onError(null)
    try {
      const data = await runDemo()
      onResult(data)
    } catch (e) {
      onError(e?.message || 'Demo request failed')
    } finally {
      setLoading(false)
      onLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? 'Loading demo…' : 'Try India Demo Dataset'}
      </button>
      <p className="text-xs text-slate-400 mt-2 text-center">
        IHDS-II synthetic dataset · gender as protected attribute
      </p>
    </div>
  )
}
