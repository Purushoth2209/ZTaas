import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext.jsx'
import {
  fetchTelemetry,
  fetchUsersRiskSummary,
  computeMetrics,
} from '../features/dashboard/services/dashboard.api.js'
import MetricCard from '../features/dashboard/components/MetricCard.jsx'
import ActivityTable from '../features/dashboard/components/ActivityTable.jsx'
import RiskTable from '../features/dashboard/components/RiskTable.jsx'

const METRIC_CONFIG = [
  { key: 'total',  title: 'Total Users',        accent: 'default', icon: '👥' },
  { key: 'low',    title: 'Low Risk Users',      accent: 'low',     icon: '✅' },
  { key: 'medium', title: 'Medium Risk Users',   accent: 'medium',  icon: '⚠️' },
  { key: 'high',   title: 'High Risk Users',     accent: 'high',    icon: '🔴' },
]

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
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [telemetry, setTelemetry]   = useState([])
  const [metrics, setMetrics]       = useState({ total: 0, low: 0, medium: 0, high: 0 })
  const [topUsers, setTopUsers]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
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
      setTopUsers(userSummary.slice(0, 5))
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">ZTaaS Admin</h1>
              <p className="text-xs text-gray-500">Zero Trust Gateway</p>
            </div>
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
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-500/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Page title */}
        <div>
          <h2 className="text-xl font-bold text-white">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">System activity and risk overview</p>
        </div>

        {error && <ErrorBanner message={error} onRetry={loadData} />}

        {loading ? <Spinner /> : (
          <>
            {/* Metric Cards */}
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

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActivityTable records={telemetry} />
              <RiskTable users={topUsers} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
