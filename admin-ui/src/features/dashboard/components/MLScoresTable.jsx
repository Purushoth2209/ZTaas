function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function LabelBadge({ label }) {
  const isAnomaly = (label || '').toLowerCase() === 'anomaly'
  const cls = isAnomaly
    ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : 'bg-green-500/15 text-green-400 border-green-500/30'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${cls}`}>
      {label ?? '—'}
    </span>
  )
}

function ScoreCell({ value }) {
  if (value === undefined || value === null) return <span className="text-gray-600">—</span>
  const pct = Math.min(Math.round(Number(value) * 100), 100)
  return <span className="text-gray-300 font-mono text-xs">{pct}%</span>
}

const COLS = ['User', 'Tenant', 'ML score', 'Label', 'Time']

export default function MLScoresTable({ records }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">ML anomaly scores</h2>
          <p className="text-xs text-gray-500 mt-0.5">Latest Isolation Forest outputs from risk_scores</p>
        </div>
        <span className="text-xs text-gray-500">{records.length} shown</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {COLS.map((c) => (
                <th
                  key={c}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-gray-500 text-sm">No ML assessments yet</p>
                  <p className="text-gray-600 text-xs mt-1">Run the ML consumer and enqueue features to populate risk_scores</p>
                </td>
              </tr>
            ) : (
              records.map((r, i) => (
                <tr
                  key={r.requestId || `${r.userId}-${i}`}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${
                    i % 2 === 0 ? '' : 'bg-gray-800/20'
                  }`}
                >
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs truncate max-w-[140px]">{r.userId}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.tenantId ?? 'default'}</td>
                  <td className="px-4 py-3">
                    <ScoreCell value={r.score} />
                  </td>
                  <td className="px-4 py-3">
                    <LabelBadge label={r.label} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatTime(r.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
