function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-600">—</span>
  const color =
    status >= 500 ? 'bg-red-500/15 text-red-400 border-red-500/30' :
    status >= 400 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                   'bg-green-500/15 text-green-400 border-green-500/30'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${color}`}>
      {status}
    </span>
  )
}

const COLS = ['User', 'Endpoint', 'Method', 'Status', 'Time']

export default function ActivityTable({ records }) {
  const rows = [...records].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 10)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
        <span className="text-xs text-gray-500">{records.length} total records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {COLS.map((c) => (
                <th key={c} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">
                  No activity recorded yet
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr
                key={r.requestId ?? i}
                className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-800/20'}`}
              >
                <td className="px-4 py-3 text-gray-300 font-mono text-xs truncate max-w-[120px]">
                  {r.userId ?? <span className="text-gray-600">anonymous</span>}
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[160px]" title={r.endpoint}>
                  {r.endpoint ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    {r.method ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.responseStatus} />
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {formatTime(r.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
