import { useState } from 'react'

export default function ConflictBanner({ conflict }) {
  const [open, setOpen] = useState(false)
  if (!conflict?.has_conflict) return null

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-yellow-900 font-medium">
            {conflict.message}
          </p>
          <button
            onClick={() => setOpen(!open)}
            className="text-xs text-yellow-800 hover:text-yellow-900 underline mt-1 font-medium"
          >
            {open ? 'Hide explanation' : 'What is the fairness impossibility theorem?'}
          </button>
          {open && (
            <p className="text-sm text-yellow-800 mt-2 leading-relaxed">
              Chouldechova (2017) proved that when base rates differ between
              groups, it is mathematically impossible to satisfy demographic
              parity, equalized odds, and calibration simultaneously.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
