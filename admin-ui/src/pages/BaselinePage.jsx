import { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { fetchBaseline, fetchBaselineTimeseries } from '../features/admin/admin.api.js'
import { IconAlert, IconRefresh } from '../components/ui/Icons.jsx'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtMinute(ms) {
  const d = new Date(ms)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const WINDOWS = [
  { label: '1 h',  ms: 3600000   },
  { label: '3 h',  ms: 10800000  },
  { label: '6 h',  ms: 21600000  },
  { label: '24 h', ms: 86400000  },
]

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, valueClass = 'text-white' }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1.5 tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function MetricBar({ label, avg, std, unit = '', color = 'indigo', max }) {
  const avgPct = Math.min(((avg ?? 0) / max) * 100, 100)
  const stdPct = Math.min(((std ?? 0) / max) * 100, 100)
  const palette = {
    indigo: { bar: 'bg-indigo-500', band: 'bg-indigo-400/20', text: 'text-indigo-400' },
    green:  { bar: 'bg-green-500',  band: 'bg-green-400/20',  text: 'text-green-400'  },
    yellow: { bar: 'bg-yellow-500', band: 'bg-yellow-400/20', text: 'text-yellow-400' },
    red:    { bar: 'bg-red-500',    band: 'bg-red-400/20',    text: 'text-red-400'    },
  }
  const c = palette[color]
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-300">{label}</span>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-semibold tabular-nums ${c.text}`}>{(avg ?? 0).toFixed(2)}{unit}</span>
          <span className="text-xs text-gray-600 tabular-nums">± {(std ?? 0).toFixed(2)}{unit}</span>
        </div>
      </div>
      <div className="relative h-2.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`absolute h-full ${c.band}`} style={{ left: `${Math.max(avgPct - stdPct, 0)}%`, width: `${Math.min(stdPct * 2, 100 - Math.max(avgPct - stdPct, 0))}%` }} />
        <div className={`absolute h-full rounded-full ${c.bar}`} style={{ width: `${avgPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600 tabular-nums">
        <span>0</span><span>{max}{unit}</span>
      </div>
    </div>
  )
}

const tooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid #1f2937',
  borderRadius: '8px',
  fontSize: '11px',
  color: '#d1d5db',
}

function TimeseriesChart({ data, dataKey, label, color, unit = '', baseline, stdKey }) {
  const avg = baseline?.[`avg${dataKey.charAt(0).toUpperCase() + dataKey.slice(1)}`]
  const std = baseline?.[`std${dataKey.charAt(0).toUpperCase() + dataKey.slice(1)}`]

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-300">{label}</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="minute"
            tickFormatter={fmtMinute}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#1f2937' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}${unit}`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={fmtMinute}
            formatter={v => [`${v}${unit}`, label]}
          />
          {avg != null && (
            <ReferenceLine y={avg} stroke={color} strokeDasharray="4 2" strokeOpacity={0.5}
              label={{ value: 'avg', position: 'insideTopRight', fontSize: 9, fill: color }} />
          )}
          {avg != null && std != null && (
            <>
              <ReferenceLine y={avg + std} stroke={color} strokeDasharray="2 4" strokeOpacity={0.25} />
              <ReferenceLine y={Math.max(avg - std, 0)} stroke={color} strokeDasharray="2 4" strokeOpacity={0.25} />
            </>
          )}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function BaselinePage() {
  const [tenantId, setTenantId]   = useState('default')
  const [windowMs, setWindowMs]   = useState(3600000)
  const [baseline, setBaseline]   = useState(null)
  const [series, setSeries]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const [b, t] = await Promise.all([
        fetchBaseline(tenantId),
        fetchBaselineTimeseries(tenantId, windowMs),
      ])
      setBaseline(b)
      setSeries(t.series ?? [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tenantId, windowMs])

  const ageMin = baseline?.createdAt
    ? Math.round((Date.now() - new Date(baseline.createdAt).getTime()) / 60000)
    : null

  // derive failureRate series as percentage
  const seriesPct = series.map(d => ({ ...d, failureRatePct: +(d.failureRate * 100).toFixed(1) }))

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Baseline Profile</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Normal behaviour profile used to compute per-user risk deviation scores
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400 shrink-0">Tenant</label>
            <input
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {WINDOWS.map(w => (
              <button
                key={w.ms}
                onClick={() => setWindowMs(w.ms)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  windowMs === w.ms
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors ml-auto"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-red-400">
            <IconAlert className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading baseline…</p>
        ) : !baseline ? (
          <p className="text-gray-500 text-sm">No baseline data found for this tenant.</p>
        ) : (
          <div className="space-y-5">

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Window"
                value={`${Math.round((baseline.windowMs ?? 3600000) / 60000)} min`}
                sub="Computation window"
                valueClass="text-indigo-400"
              />
              <StatCard
                label="Last Computed"
                value={ageMin !== null ? `${ageMin}m ago` : '—'}
                sub={baseline.createdAt ? new Date(baseline.createdAt).toLocaleTimeString() : ''}
                valueClass="text-gray-300"
              />
              <StatCard
                label="Avg Req / min"
                value={(baseline.avgRequestsPerMin ?? 0).toFixed(1)}
                sub={`± ${(baseline.stdRequestsPerMin ?? 0).toFixed(1)}`}
                valueClass="text-indigo-400"
              />
              <StatCard
                label="Avg Failure Rate"
                value={`${((baseline.avgFailureRate ?? 0) * 100).toFixed(1)}%`}
                sub={`± ${((baseline.stdFailureRate ?? 0) * 100).toFixed(1)}%`}
                valueClass="text-yellow-400"
              />
            </div>

            {/* Timeseries charts */}
            {series.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Activity Timeseries</h3>
                  <p className="text-xs text-gray-600">
                    {series.length} minute buckets · dashed lines = baseline avg ± 1σ
                  </p>
                </div>
                <TimeseriesChart
                  data={seriesPct}
                  dataKey="requestsPerMin"
                  label="Requests per Minute"
                  color="#6366f1"
                  baseline={{ avgRequestsPerMin: baseline.avgRequestsPerMin, stdRequestsPerMin: baseline.stdRequestsPerMin }}
                />
                <TimeseriesChart
                  data={seriesPct}
                  dataKey="failureRatePct"
                  label="Failure Rate"
                  color="#eab308"
                  unit="%"
                  baseline={{ avgFailureRatePct: (baseline.avgFailureRate ?? 0) * 100, stdFailureRatePct: (baseline.stdFailureRate ?? 0) * 100 }}
                />
                <TimeseriesChart
                  data={seriesPct}
                  dataKey="uniqueIPs"
                  label="Unique IPs per Minute"
                  color="#22c55e"
                  baseline={{ avgUniqueIPs: baseline.avgUniqueIPs, stdUniqueIPs: baseline.stdUniqueIPs }}
                />
                <TimeseriesChart
                  data={seriesPct}
                  dataKey="avgResponseTime"
                  label="Avg Response Time"
                  color="#ef4444"
                  unit=" ms"
                  baseline={{ avgAvgResponseTime: baseline.avgResponseTime, stdAvgResponseTime: baseline.stdResponseTime }}
                />
              </div>
            )}

            {/* Static metric bars */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Metric Distribution</h3>
                <p className="text-xs text-gray-600">Shaded band = ± 1 std deviation</p>
              </div>
              <MetricBar label="Requests per Minute" avg={baseline.avgRequestsPerMin} std={baseline.stdRequestsPerMin} max={200} color="indigo" />
              <MetricBar label="Failure Rate" avg={(baseline.avgFailureRate ?? 0) * 100} std={(baseline.stdFailureRate ?? 0) * 100} unit="%" max={100} color="yellow" />
              <MetricBar label="Unique IPs per Minute" avg={baseline.avgUniqueIPs} std={baseline.stdUniqueIPs} max={20} color="green" />
              <MetricBar label="Avg Response Time" avg={baseline.avgResponseTime} std={baseline.stdResponseTime} unit=" ms" max={2000} color="red" />
            </div>

            {/* Raw values */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-white">Raw Values</h3>
              </div>
              <div className="divide-y divide-gray-800">
                {[
                  ['avgRequestsPerMin',  baseline.avgRequestsPerMin?.toFixed(4)],
                  ['stdRequestsPerMin',  baseline.stdRequestsPerMin?.toFixed(4)],
                  ['avgFailureRate',     baseline.avgFailureRate?.toFixed(4)],
                  ['stdFailureRate',     baseline.stdFailureRate?.toFixed(4)],
                  ['avgUniqueIPs',       baseline.avgUniqueIPs?.toFixed(4)],
                  ['stdUniqueIPs',       baseline.stdUniqueIPs?.toFixed(4)],
                  ['avgResponseTime',    `${baseline.avgResponseTime?.toFixed(2)} ms`],
                  ['stdResponseTime',    `${baseline.stdResponseTime?.toFixed(2)} ms`],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-6 px-5 py-2.5">
                    <span className="text-xs font-mono text-gray-500 w-48 shrink-0">{k}</span>
                    <span className="text-xs font-mono text-gray-300 tabular-nums">{v ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  )
}
