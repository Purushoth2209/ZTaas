import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

function ChartShell({ title, subtitle, children, empty }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4 flex-1 min-h-[220px]">
        {empty ? (
          <div className="h-full flex items-center justify-center text-center px-4">
            <div>
              <p className="text-gray-500 text-sm">No data in this window</p>
              <p className="text-gray-600 text-xs mt-1">Telemetry or ML activity will appear once traffic flows</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

const PIE_COLORS = ['#4ade80', '#f87171', '#94a3b8']

export function TrafficTrendChart({ series }) {
  const data = (series || []).map((p) => ({
    key: p.minute,
    label: new Date(p.minute).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    rpm: p.requestsPerMin,
  }))

  const empty = !data.length

  return (
    <ChartShell
      title="Telemetry trend"
      subtitle="Per-minute request counts from telemetry_logs — not the stored baseline doc (needs live gateway traffic)"
      empty={empty}
    >
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 12, left: -18, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label}
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e5e7eb' }}
            />
            <Line type="monotone" dataKey="rpm" name="Req/min" stroke="#818cf8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  )
}

export function MLInsightsPie({ labelCounts }) {
  const raw = labelCounts || {}
  const nNorm = raw.normal || 0
  const nAnom = raw.anomaly || 0
  const nOther = raw.other || 0
  const total = nNorm + nAnom + nOther
  const data = [
    { name: 'Normal', value: nNorm },
    { name: 'Anomaly', value: nAnom },
    { name: 'Other', value: nOther },
  ].filter((d) => d.value > 0)

  const empty = !data.length
  const countHint =
    total > 0
      ? `${total} ML rows in window: ${nNorm} normal, ${nAnom} anomaly${nOther ? `, ${nOther} other` : ''} — pie % is these counts (whole-number labels round)`
      : 'Labels in the selected time window'

  return (
    <ChartShell title="ML outcomes" subtitle={countHint} empty={empty}>
      <div className="h-56 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#1f2937" />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  )
}

export function RuleRiskBarSummary({ metrics }) {
  const data = [
    { name: 'Low', count: metrics?.low ?? 0, fill: '#4ade80' },
    { name: 'Medium', count: metrics?.medium ?? 0, fill: '#facc15' },
    { name: 'High', count: metrics?.high ?? 0, fill: '#f87171' },
  ]
  const empty = data.every((d) => d.count === 0) && (metrics?.total ?? 0) === 0

  return (
    <ChartShell title="Users by rule risk band" subtitle="From live rule-based risk (telemetry vs baseline)" empty={empty}>
      <div className="h-56 flex flex-col justify-center gap-4 px-2">
        {data.map((d) => (
          <div key={d.name}>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{d.name}</span>
              <span>{d.count}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${metrics?.total ? Math.min(100, (d.count / metrics.total) * 100) : 0}%`,
                  backgroundColor: d.fill,
                }}
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-gray-600 text-center pt-2">Total tracked users: {metrics?.total ?? 0}</p>
      </div>
    </ChartShell>
  )
}
