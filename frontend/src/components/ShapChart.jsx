import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts'

export default function ShapChart({ shap }) {
  if (!shap || shap.length === 0) return null
  const data = [...shap].reverse()
  const maxVal = Math.max(...data.map((d) => d.mean_abs_shap), 0.0001)

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900">
        What drives the model's decisions
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Mean absolute SHAP values — higher = more influential
      </p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              dataKey="feature"
              type="category"
              stroke="#475569"
              fontSize={12}
              width={110}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
              formatter={(v) => (typeof v === 'number' ? v.toFixed(4) : v)}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="mean_abs_shap" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((entry, i) => {
                const intensity = 0.35 + 0.65 * (entry.mean_abs_shap / maxVal)
                return (
                  <Cell
                    key={`cell-${i}`}
                    fill={`rgba(99, 102, 241, ${intensity})`}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
