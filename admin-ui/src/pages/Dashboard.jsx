import { useState, useEffect, useCallback } from 'react'
import {
  fetchTelemetry,
  fetchUsersRiskSummary,
  computeMetrics,
  fetchMLScoresStats,
  fetchMLScoresRecent,
  fetchBaselineTimeseries,
  fetchBaselineSnapshot,
} from '../features/dashboard/services/dashboard.api.js'
import MetricCard from '../features/dashboard/components/MetricCard.jsx'
import ActivityTable from '../features/dashboard/components/ActivityTable.jsx'
import RiskTable from '../features/dashboard/components/RiskTable.jsx'
import MLScoresTable from '../features/dashboard/components/MLScoresTable.jsx'
import { TrafficTrendChart, MLInsightsPie, RuleRiskBarSummary } from '../features/dashboard/components/DashboardCharts.jsx'
import BaselineSnapshotPanel from '../features/dashboard/components/BaselineSnapshotPanel.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'
import {
  IconUsers,
  IconCheckCircle,
  IconExclamationTriangle,
  IconXCircle,
  IconArchiveBox,
  IconTrendingUp,
  IconBolt,
  IconShield,
} from '../components/ui/Icons.jsx'

const METRIC_CONFIG = [
  { key: 'total',  title: 'Total users (rule)',    accent: 'default', icon: IconUsers },
  { key: 'low',    title: 'Low risk (rule)',       accent: 'low',     icon: IconCheckCircle },
  { key: 'medium', title: 'Medium risk (rule)',    accent: 'medium',  icon: IconExclamationTriangle },
  { key: 'high',   title: 'High risk (rule)',      accent: 'high',    icon: IconXCircle },
]

const ML_METRIC_CONFIG = [
  { pick: 'totalAllTime', title: 'ML records (all time)', accent: 'default', icon: IconArchiveBox },
  { pick: 'totalInWindow', title: 'ML assessments (24h)', accent: 'medium', icon: IconTrendingUp },
  { pick: 'anomalies', title: 'ML anomalies (24h)', accent: 'high', icon: IconBolt },
  { pick: 'normalLabels', title: 'ML normal (24h)', accent: 'low', icon: IconShield },
]

function normalizeMlStats(raw) {
  if (!raw) {
    return {
      totalAllTime: 0,
      totalInWindow: 0,
      anomalies: 0,
      normalLabels: 0,
      labelCountsInWindow: { normal: 0, anomaly: 0, other: 0 },
    }
  }
  const lc = raw.labelCountsInWindow || {}
  return {
    totalAllTime: raw.totalAllTime ?? 0,
    totalInWindow: raw.totalInWindow ?? 0,
    anomalies: lc.anomaly ?? 0,
    normalLabels: lc.normal ?? 0,
    labelCountsInWindow: {
      normal: lc.normal ?? 0,
      anomaly: lc.anomaly ?? 0,
      other: lc.other ?? 0,
    },
  }
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <p className="text-sm text-red-400">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="text-xs text-red-400 border border-red-500/40 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

export default function Dashboard() {
  const [telemetry, setTelemetry]     = useState([])
  const [metrics, setMetrics]         = useState({ total: 0, low: 0, medium: 0, high: 0 })
  const [topUsers, setTopUsers]       = useState([])
  const [mlStats, setMlStats]         = useState(null)
  const [mlRecent, setMlRecent]       = useState([])
  const [trafficSeries, setTrafficSeries] = useState([])
  const [baselineDoc, setBaselineDoc] = useState(null)
  const [baselineTenant] = useState('default')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [records, userSummary] = await Promise.all([
        fetchTelemetry(),
        fetchUsersRiskSummary(),
      ])
      const computed = computeMetrics(userSummary)

      setTelemetry(records)
      setMetrics(computed)
      setTopUsers(userSummary.slice(0, 8))

      const [statsRaw, recentRows, series, baselineSnapshot] = await Promise.all([
        fetchMLScoresStats(86400000).catch(() => null),
        fetchMLScoresRecent(35).catch(() => []),
        fetchBaselineTimeseries(baselineTenant, 86400000).catch(() => []),
        fetchBaselineSnapshot(baselineTenant),
      ])
      setMlStats(normalizeMlStats(statsRaw))
      setMlRecent(recentRows)
      setTrafficSeries(series)
      setBaselineDoc(baselineSnapshot)

      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [baselineTenant])

  useEffect(() => { loadData() }, [loadData])

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Dashboard</h2>
            <p className="text-sm text-gray-500 mt-0.5">Telemetry, rule-based risk, and ML anomaly scores</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-600 hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {error && <ErrorBanner message={error} onRetry={loadData} />}

        {loading ? <Spinner /> : (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rule-based exposure</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {METRIC_CONFIG.map(({ key, title, accent, icon }) => (
                  <MetricCard
                    key={key}
                    title={title}
                    value={metrics[key]}
                    accent={accent}
                    icon={icon}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ML pipeline (risk_scores)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {ML_METRIC_CONFIG.map(({ pick, title, accent, icon }) => (
                  <MetricCard
                    key={pick}
                    title={title}
                    value={mlStats?.[pick] ?? 0}
                    accent={accent}
                    icon={icon}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Stored baseline (rule engine)
              </h3>
              <BaselineSnapshotPanel baseline={baselineDoc} tenantId={baselineTenant} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <TrafficTrendChart series={trafficSeries} />
              <MLInsightsPie labelCounts={mlStats?.labelCountsInWindow} />
              <RuleRiskBarSummary metrics={metrics} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActivityTable records={telemetry} />
              <RiskTable users={topUsers} />
            </div>

            <MLScoresTable records={mlRecent} />
          </>
        )}
      </div>
    </AppLayout>
  )
}
