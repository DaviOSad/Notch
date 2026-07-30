import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { COLORS } from '../../lib/constants'
import { formatCurrency } from '../../lib/formatters'

const renderSliceLabel = ({ cx, cy, midAngle, outerRadius, value, name }) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 15
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#cbd5e1" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="11" fontWeight="500">
      <tspan x={x} dy="-0.5em">{name}</tspan><tspan x={x} dy="1.2em">{formatCurrency(value)}</tspan>
    </text>
  )
}

export default function ExpensesChart({ data, colorMap }) {
  if (data.length === 0) return null

  return (
    <section className="w-full h-fit rounded-3xl bg-slate-900/50 border border-white/5 p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-6">Despesas Macro</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" labelLine={{ stroke: '#64748b', strokeWidth: 1 }} label={renderSliceLabel}>
              {data.map((entry, i) => <Cell key={`cell-${i}`} fill={colorMap[entry.name] || COLORS[i % COLORS.length]} style={{ outline: 'none' }} />)}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#e2e8f0' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
