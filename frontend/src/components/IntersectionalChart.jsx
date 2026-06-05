import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'

function colorFor(ratePct) {
  if (ratePct < 40) return '#ef4444'
  if (ratePct <= 55) return '#facc15'
  return '#22c55e'
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-slate-900 mb-1">{d.label}</p>
      <p className="text-slate-600">
        Approval rate:{' '}
        <span className="font-semibold text-slate-900">
          {(d.approval_rate * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-slate-600">
        Sample size:{' '}
        <span className="font-semibold text-slate-900">n = {d.n}</span>
      </p>
    </div>
  )
}

export default function IntersectionalChart({ data, title, subtitle }) {
  if (!data || !data.groups || data.groups.length === 0) return null

  // Backend sorts ascending (most disadvantaged first).
  // Reverse so least disadvantaged appears at the top of the horizontal chart.
  const chartData = [...data.groups].reverse().map((g) => ({
    ...g,
    ratePct: g.approval_rate * 100,
  }))

  const totalN = data.groups.reduce((s, g) => s + g.n, 0)
  const overall = totalN > 0
    ? (data.groups.reduce((s, g) => s + g.approval_rate * g.n, 0) / totalN) * 100
    : 0

  const first = data.groups[0]
  const last = data.groups[data.groups.length - 1]

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900">
        {title || 'Intersectional Analysis'}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {subtitle || 'Approval rates by combined demographic group'}
      </p>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              dataKey="label"
              type="category"
              stroke="#475569"
              fontSize={11}
              width={160}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
            />
            <ReferenceLine
              x={overall}
              stroke="#64748b"
              strokeDasharray="4 4"
              label={{
                value: `Avg ${overall.toFixed(0)}%`,
                position: 'top',
                fontSize: 10,
                fill: '#64748b',
              }}
            />
            <Bar dataKey="ratePct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {chartData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={colorFor(entry.ratePct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Most disadvantaged
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {data.most_disadvantaged}
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            {(first.approval_rate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Least disadvantaged
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {data.least_disadvantaged}
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            {(last.approval_rate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Compounding gap
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {(data.max_gap * 100).toFixed(1)} pp
          </p>
        </div>
      </div>

      {data.intersectional_insight && (
        <p className="text-sm text-slate-500 italic mt-4">
          {data.intersectional_insight}
        </p>
      )}
    </div>
  )
}
