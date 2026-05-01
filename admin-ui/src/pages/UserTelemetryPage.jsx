import { useState } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { fetchUserTelemetry, fetchUserRiskDetail } from '../features/admin/admin.api.js'
import { IconTelemetry, IconAlert, IconChevronLeft, IconChevronRight } from '../components/ui/Icons.jsx'

function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-600">—</span>
  const color =
    status >= 500 ? 'bg-red-500/15 text-red-400 border-red-500/30' :
    status >= 400 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                   'bg-green-500/15 text-green-400 border-green-500/30'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      {status}
    </span>
  )
}

function AuthBadge({ result }) {
  if (!result) return <span className="text-gray-600">—</span>
  const color = result === 'denied'
    ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : 'bg-green-500/15 text-green-400 border-green-500/30'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      {result}
    </span>
  )
}

const COLS = ['Endpoint', 'Method', 'Status', 'Auth', 'IP Address', 'Duration', 'Timestamp']

export default function UserTelemetryPage() {
  const [userId, setUserId]   = useState('')
  const [input, setInput]     = useState('')
  const [records, setRecords] = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [riskDetail, setRiskDetail] = useState(null)
  const [riskError, setRiskError]   = useState('')

  async function search(p = 1) {
    if (!input.trim()) return
    setLoading(true); setError(''); setRiskError('')
    try {
      const uid = input.trim()
      const data = await fetchUserTelemetry(uid, p, 50)
      setRecords(data.records ?? [])
      setTotal(data.count ?? 0)
      setUserId(uid)
      setPage(p)
      try {
        const detail = await fetchUserRiskDetail(uid, 'default')
        setRiskDetail(detail)
      } catch (re) {
        setRiskDetail(null)
        setRiskError(re.message || 'Could not load risk snapshot')
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">

        <div>
          <h2 className="text-xl font-bold text-white">User Telemetry</h2>
          <p className="text-sm text-gray-500 mt-0.5">Inspect request logs for a specific user</p>
        </div>

        {/* Search bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <IconTelemetry className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(1)}
              placeholder="Enter user ID (e.g. ryan)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => search(1)}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-red-400">
            <IconAlert className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {riskError && (
          <div className="text-xs text-amber-500/90 border border-amber-500/20 rounded-lg px-4 py-2">
            Risk snapshot: {riskError}
          </div>
        )}

        {userId && riskDetail && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Risk snapshot — <span className="font-mono text-indigo-400">{riskDetail.userId}</span></h3>
            <p className="text-xs text-gray-500">
              Rule score from telemetry vs baseline; ML from latest <span className="font-mono text-gray-400">risk_scores</span> row; final = 0.5×rule + 0.5×ML when ML exists (same as gateway).
            </p>
            {riskDetail.rule?.isColdStart ? (
              <p className="text-sm text-amber-400/90">Cold start: {riskDetail.rule.reason ?? 'No recent behavioral data'} — rule score {riskDetail.rule.riskScore}, level {riskDetail.rule.riskLevel}. Fusion not applied.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-gray-500 font-medium">Rule</p>
                  <p className="text-xl font-bold text-white mt-1 tabular-nums">{Math.round((riskDetail.rule?.riskScore ?? 0) * 100)}%</p>
                  <p className="text-xs text-gray-400 mt-0.5">{riskDetail.rule?.riskLevel ?? '—'}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-gray-500 font-medium">ML (latest)</p>
                  {riskDetail.ml?.score != null ? (
                    <>
                      <p className="text-xl font-bold text-white mt-1 tabular-nums">{Math.round(riskDetail.ml.score * 100)}%</p>
                      <p className="text-xs text-gray-400 mt-0.5">{riskDetail.ml.label ?? '—'}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">No row in risk_scores for this user yet</p>
                  )}
                </div>
                <div className="bg-gray-800/50 border border-indigo-500/30 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-indigo-400/80 font-medium">Final (enforcement)</p>
                  <p className="text-xl font-bold text-indigo-300 mt-1 tabular-nums">{Math.round((riskDetail.finalRiskScore ?? 0) * 100)}%</p>
                  <p className="text-xs text-gray-400 mt-0.5">{riskDetail.finalRiskLevel ?? '—'}</p>
                </div>
              </div>
            )}
            {!riskDetail.rule?.isColdStart && riskDetail.rule?.breakdown && (
              <div className="text-xs text-gray-500 font-mono space-y-0.5">
                <p>Breakdown — requests: {(riskDetail.rule.breakdown.requestsScore ?? 0).toFixed(3)} · failure: {(riskDetail.rule.breakdown.failureScore ?? 0).toFixed(3)} · ip: {(riskDetail.rule.breakdown.ipScore ?? 0).toFixed(3)} · latency: {(riskDetail.rule.breakdown.responseTimeScore ?? 0).toFixed(3)}</p>
                <p>Policy thresholds — medium ≥ {(riskDetail.policy?.mediumThreshold ?? 0) * 100}% · high ≥ {(riskDetail.policy?.highThreshold ?? 0) * 100}%</p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {userId && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Logs for <span className="text-indigo-400 font-mono">{userId}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{total} record{total !== 1 ? 's' : ''} found</p>
              </div>

              {total > 50 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => search(page - 1)}
                    disabled={page === 1 || loading}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-gray-700 px-2.5 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                  >
                    <IconChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <span className="text-xs text-gray-500 px-1">Page {page}</span>
                  <button
                    onClick={() => search(page + 1)}
                    disabled={records.length < 50 || loading}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-gray-700 px-2.5 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                  >
                    Next
                    <IconChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {records.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-gray-500 text-sm">No records found for this user</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-800/30">
                      {COLS.map(c => (
                        <th key={c} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr
                        key={r.requestId ?? i}
                        className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i % 2 ? 'bg-gray-800/10' : ''}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-300 max-w-[200px] truncate" title={r.endpoint}>
                          {r.endpoint}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
                            {r.method}
                          </span>
                        </td>
                        <td className="px-4 py-2.5"><StatusBadge status={r.responseStatus} /></td>
                        <td className="px-4 py-2.5"><AuthBadge result={r.authorizationResult} /></td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.ipAddress ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 tabular-nums">
                          {r.requestDuration != null ? `${r.requestDuration} ms` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap tabular-nums">
                          {r.timestamp
                            ? new Date(r.timestamp).toLocaleString(undefined, {
                                month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
