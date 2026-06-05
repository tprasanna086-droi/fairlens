import { useState, useEffect } from 'react'
import { runAudit } from '../utils/api'

function readHeaders(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const firstLine = text.split(/\r?\n/)[0] || ''
      const headers = firstLine
        .split(',')
        .map((h) => h.trim().replace(/^"|"$/g, ''))
        .filter(Boolean)
      resolve(headers)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file.slice(0, 64 * 1024))
  })
}

export default function ColumnPicker({ file, onAuditResult, onLoading, onError }) {
  const [headers, setHeaders] = useState([])
  const [targetCol, setTargetCol] = useState('')
  const [protectedCol, setProtectedCol] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!file) {
      setHeaders([])
      setTargetCol('')
      setProtectedCol('')
      return
    }
    readHeaders(file)
      .then((h) => {
        if (!cancelled) setHeaders(h)
      })
      .catch(() => {
        if (!cancelled) setHeaders([])
      })
    return () => {
      cancelled = true
    }
  }, [file])

  const handleRun = async () => {
    if (!targetCol || !protectedCol) return
    setLoading(true)
    onLoading(true)
    onError(null)
    setLocalError(null)
    try {
      const data = await runAudit(file, targetCol, protectedCol)
      onAuditResult(data)
    } catch (e) {
      const msg = e?.message || 'Audit failed'
      setLocalError(msg)
      onError(msg)
    } finally {
      setLoading(false)
      onLoading(false)
    }
  }

  const canRun = Boolean(targetCol && protectedCol) && !loading

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">
          Outcome column (what the model predicts)
        </label>
        <select
          value={targetCol}
          onChange={(e) => setTargetCol(e.target.value)}
          className="w-full bg-slate-700 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select a column…</option>
          {headers.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">
          Protected attribute (gender, caste, etc.)
        </label>
        <select
          value={protectedCol}
          onChange={(e) => setProtectedCol(e.target.value)}
          className="w-full bg-slate-700 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select a column…</option>
          {headers.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleRun}
        disabled={!canRun}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? 'Running audit…' : 'Run Audit'}
      </button>

      {localError && (
        <p className="text-xs text-red-400">{localError}</p>
      )}
    </div>
  )
}
