const levelStyles = {
  LOW:    'bg-green-500/15 text-green-400 border-green-500/30',
  MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  HIGH:   'bg-red-500/15 text-red-400 border-red-500/30',
}

const barColors = {
  LOW:    'bg-green-500',
  MEDIUM: 'bg-yellow-500',
  HIGH:   'bg-red-500',
}

function RiskBadge({ level }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${levelStyles[level] ?? levelStyles.LOW}`}>
      {level ?? 'LOW'}
    </span>
  )
}

function ScoreBar({ score }) {
  const pct = Math.min(Math.round((score ?? 0) * 100), 100)
  const level = pct >= 70 ? 'HIGH' : pct >= 40 ? 'MEDIUM' : 'LOW'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColors[level]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  )
}

const COLS = ['User', 'Tenant', 'Score', 'Level']

export default function RiskTable({ users }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Top Risky Users</h2>
        <span className="text-xs text-gray-500">Top {users.length}</span>
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <p className="text-gray-500 text-sm">No real risk data yet</p>
                  <p className="text-gray-600 text-xs mt-1">Users need recent activity for risk scores to be computed</p>
                </td>
              </tr>
            ) : users.map((u, i) => (
              <tr
                key={u.userId ?? i}
                className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-800/20'}`}
              >
                <td className="px-4 py-3 text-gray-300 font-mono text-xs truncate max-w-[130px]">
                  {u.userId}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {u.tenantId ?? 'default'}
                </td>
                <td className="px-4 py-3 w-36">
                  <ScoreBar score={u.riskScore} />
                </td>
                <td className="px-4 py-3">
                  <RiskBadge level={u.riskLevel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
