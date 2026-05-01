function MiniStat({ label, avg, std, decimals = 2 }) {
  const a = avg ?? 0
  const s = std ?? 0
  return (
    <div className="bg-gray-800/40 border border-gray-700/80 rounded-lg px-3 py-2.5">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-white tabular-nums mt-1">
        {Number(a).toFixed(decimals)}
        <span className="text-gray-500 font-normal text-xs ml-1">± {Number(s).toFixed(decimals)}</span>
      </p>
    </div>
  )
}

export default function BaselineSnapshotPanel({ baseline, tenantId }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Baseline analytics</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Stored averages &amp; std devs in <span className="font-mono text-gray-400">baselines</span> — used by the{' '}
            <strong className="text-gray-400">rule-based</strong> risk engine (tenant:{' '}
            <span className="font-mono text-indigo-400">{tenantId}</span>)
          </p>
        </div>
        {baseline?.createdAt && (
          <span className="text-[10px] text-gray-600">
            Updated {new Date(baseline.createdAt).toLocaleString()}
          </span>
        )}
      </div>
      <div className="p-5">
        {!baseline ? (
          <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950/50 px-4 py-6 text-center">
            <p className="text-sm text-gray-400">No baseline document for this tenant yet</p>
            <p className="text-xs text-gray-600 mt-2 max-w-xl mx-auto leading-relaxed">
              The hourly job computes baselines from <span className="font-mono text-gray-500">telemetry_logs</span>.
              If the gateway has not recorded proxy traffic (or telemetry is empty), the job skips and{' '}
              <span className="font-mono text-gray-500">GET /admin/baseline</span> returns 404 — so nothing appears here.
              Generate traffic through the gateway or run <span className="font-mono text-gray-500">seed-users-telemetry</span>.
            </p>
            <p className="text-xs text-gray-600 mt-3">
              Detailed charts live under <strong className="text-gray-500">Baseline</strong> in the sidebar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Requests / min" avg={baseline.avgRequestsPerMin} std={baseline.stdRequestsPerMin} />
            <MiniStat label="Failure rate" avg={baseline.avgFailureRate} std={baseline.stdFailureRate} />
            <MiniStat label="Unique IPs" avg={baseline.avgUniqueIPs} std={baseline.stdUniqueIPs} />
            <MiniStat label="Avg response (ms)" avg={baseline.avgResponseTime} std={baseline.stdResponseTime} decimals={0} />
          </div>
        )}
      </div>
    </div>
  )
}
