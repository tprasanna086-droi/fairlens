import { useState } from 'react'

const STATUS_STYLES = {
  fair: { border: 'border-l-green-500', badge: 'bg-green-100 text-green-700' },
  borderline: { border: 'border-l-yellow-400', badge: 'bg-yellow-100 text-yellow-800' },
  biased: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700' },
}

function getMainValue(data) {
  if (!data) return 0
  if (typeof data.score === 'number') return data.score
  if (typeof data.ratio === 'number') return data.ratio
  if (typeof data.tpr_diff === 'number') return data.tpr_diff
  return 0
}

function humanizeGroupLabels(text) {
  if (!text) return text
  return text.replace(/Group 0/g, 'Men').replace(/Group 1/g, 'Women')
}

export default function MetricCard({ name, data, description, humanize = false }) {
  const [open, setOpen] = useState(false)
  const style = STATUS_STYLES[data?.status] || STATUS_STYLES.fair
  const mainValue = getMainValue(data)

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-slate-200 border-l-4 ${style.border}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="min-w-0">
            {description && (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {description}
              </p>
            )}
            <h3 className="text-base font-semibold text-slate-900 truncate">
              {name}
            </h3>
          </div>
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${style.badge}`}
          >
            {data?.status || 'unknown'}
          </span>
        </div>

        <div className="text-3xl font-bold text-slate-900 my-3 tabular-nums">
          {Number.isFinite(mainValue) ? mainValue.toFixed(3) : '—'}
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          {humanize ? humanizeGroupLabels(data?.plain_english) : data?.plain_english}
        </p>

        <button
          onClick={() => setOpen(!open)}
          className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {open ? 'Hide the math ▲' : 'See the math ▼'}
        </button>

        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            open ? 'max-h-96 mt-3 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <pre className="text-[11px] bg-slate-50 border border-slate-200 rounded p-3 overflow-x-auto text-slate-700 leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
