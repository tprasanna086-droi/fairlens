import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts'

const STATUS_COLORS = {
  fair: '#22c55e',
  borderline: '#facc15',
  biased: '#ef4444',
}

const LABELS = {
  demographic_parity: 'Dem. Parity',
  disparate_impact: 'Disp. Impact',
  equal_opportunity: 'Equal Opp.',
  equalized_odds: 'Equal Odds',
}

function getDisplayValue(key, data) {
  if (!data) return 0
  if (key === 'disparate_impact') {
    return Math.min(Math.max(data.ratio ?? 0, 0), 1.0)
  }
  if (key === 'equalized_odds') {
    return data.tpr_diff ?? 0
  }
  return data.score ?? 0
}

export default function GaugeChart({ metrics }) {
  if (!metrics) return null
  const keys = ['demographic_parity', 'disparate_impact', 'equal_opportunity', 'equalized_odds']
  const items = keys.map((k) => {
    const raw = getDisplayValue(k, metrics[k])
    const pct = Math.max(0, Math.min(100, raw * 100))
    return {
      name: LABELS[k],
      key: k,
      value: pct,
      fill: STATUS_COLORS[metrics[k]?.status] || '#94a3b8',
    }
  })

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        Metric Overview
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {items.map((d) => (
          <div key={d.key} className="flex flex-col items-center">
            <div className="w-full h-28">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="70%"
                  outerRadius="100%"
                  data={[d]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    tick={false}
                  />
                  <RadialBar
                    background={{ fill: '#e2e8f0' }}
                    dataKey="value"
                    cornerRadius={6}
                    fill={d.fill}
                    isAnimationActive={false}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm font-medium text-slate-700 mt-1">{d.name}</p>
            <p className="text-xs text-slate-500 tabular-nums">
              {d.value.toFixed(0)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
