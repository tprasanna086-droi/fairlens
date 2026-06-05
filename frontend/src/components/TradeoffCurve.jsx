import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from 'recharts'

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const point = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-slate-900 mb-1">{point.label}</p>
      <p className="text-blue-600">
        Accuracy: <span className="font-semibold">{(point.accuracy * 100).toFixed(1)}%</span>
      </p>
      <p className="text-red-600">
        Parity Gap: <span className="font-semibold">{(point.demographic_parity * 100).toFixed(1)}%</span>
      </p>
    </div>
  )
}

export default function TradeoffCurve({ data, title, subtitle }) {
  const [sliderIdx, setSliderIdx] = useState(0)

  if (!data || !data.curve || data.curve.length === 0) return null

  const curve = data.curve
  const selected = curve[Math.max(0, Math.min(sliderIdx, curve.length - 1))]
  const isFair = selected.demographic_parity < 0.05

  const accValues = curve.map((p) => p.accuracy)
  const parValues = curve.map((p) => p.demographic_parity)
  const leftDomain = [
    Math.max(0, Math.min(...accValues) - 0.03),
    Math.min(1, Math.max(...accValues) + 0.02),
  ]
  const rightDomain = [0, Math.max(0.1, Math.max(...parValues) + 0.02)]

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900">
        {title || 'The Fairness-Accuracy Tradeoff'}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {subtitle || 'What does it cost to make this model fair?'}
      </p>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={curve}
            margin={{ top: 8, right: 24, left: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="constraint"
              type="number"
              domain={[0, 0.9]}
              ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]}
              tickFormatter={(v) => v.toFixed(1)}
              stroke="#64748b"
              fontSize={11}
            />
            <YAxis
              yAxisId="left"
              domain={leftDomain}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              stroke="#3b82f6"
              fontSize={11}
              orientation="left"
            />
            <YAxis
              yAxisId="right"
              domain={rightDomain}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              stroke="#ef4444"
              fontSize={11}
              orientation="right"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine
              yAxisId="right"
              y={0.05}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{
                value: 'Fair (5%)',
                position: 'right',
                fontSize: 10,
                fill: '#94a3b8',
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="accuracy"
              name="Model Accuracy"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="demographic_parity"
              name="Parity Gap"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, fill: '#ef4444' }}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={selected.constraint}
              y={selected.accuracy}
              yAxisId="left"
              r={6}
              fill="#3b82f6"
              stroke="white"
              strokeWidth={2}
            />
            <ReferenceDot
              x={selected.constraint}
              y={selected.demographic_parity}
              yAxisId="right"
              r={6}
              fill="#ef4444"
              stroke="white"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-[11px] text-slate-500 mt-1">
        Fairness Constraint Strength
      </p>

      <div className="mt-5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Drag to explore tradeoff
        </label>
        <input
          type="range"
          min={0}
          max={9}
          value={sliderIdx}
          onChange={(e) => setSliderIdx(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>No constraint</span>
          <span>Strong constraint</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Accuracy
          </p>
          <p className="text-lg font-semibold text-blue-600 mt-1">
            {(selected.accuracy * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Parity Gap
          </p>
          <p className="text-lg font-semibold text-red-600 mt-1">
            {(selected.demographic_parity * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Status
          </p>
          <p
            className={`text-lg font-semibold mt-1 ${
              isFair ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isFair ? 'FAIR' : 'BIASED'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Accuracy cost of fairness
          </p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {(data.accuracy_cost * 100).toFixed(1)} pp
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Baseline parity gap
          </p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {(data.baseline_parity * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {data.insight && (
        <p className="text-sm text-slate-500 italic mt-4">{data.insight}</p>
      )}
    </div>
  )
}
