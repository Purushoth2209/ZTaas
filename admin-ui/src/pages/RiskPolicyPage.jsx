import { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { fetchRiskPolicy, saveRiskPolicy } from '../features/admin/admin.api.js'
import { IconAlert, IconCheck, IconRefresh } from '../components/ui/Icons.jsx'

function Alert({ type, message }) {
  const styles = type === 'error'
    ? 'bg-red-500/10 border-red-500/20 text-red-400'
    : 'bg-green-500/10 border-green-500/20 text-green-400'
  const Icon = type === 'error' ? IconAlert : IconCheck
  return (
    <div className={`flex items-center gap-2.5 border rounded-lg px-4 py-2.5 text-sm ${styles}`}>
      <Icon className="w-4 h-4 shrink-0" />
      {message}
    </div>
  )
}

export default function RiskPolicyPage() {
  const [tenantId, setTenantId] = useState('default')
  const [high, setHigh]         = useState('')
  const [medium, setMedium]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const data   = await fetchRiskPolicy(tenantId)
      const policy = data[tenantId] ?? data['_default'] ?? data
      setHigh(policy.highThreshold ?? '')
      setMedium(policy.mediumThreshold ?? '')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    const h = parseFloat(high)
    const m = parseFloat(medium)
    if (isNaN(h) || isNaN(m) || h <= 0 || h > 1 || m <= 0 || m > 1)
      return setError('Thresholds must be between 0 and 1.')
    if (m >= h)
      return setError('Medium threshold must be less than high threshold.')
    setSaving(true); setError(''); setSuccess('')
    try {
      await saveRiskPolicy(tenantId, h, m)
      setSuccess('Risk policy updated successfully.')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const highPct   = Math.round((parseFloat(high)   || 0) * 100)
  const mediumPct = Math.round((parseFloat(medium) || 0) * 100)

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-2xl mx-auto">

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Risk Policy</h2>
            <p className="text-sm text-gray-500 mt-0.5">Configure risk score thresholds that classify users as Low, Medium, or High risk</p>
          </div>
        </div>

        {/* Tenant selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400 shrink-0">Tenant ID</label>
          <input
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
          />
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            Load
          </button>
        </div>

        {error   && <Alert type="error"   message={error}   />}
        {success && <Alert type="success" message={success} />}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading policy…</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">

            {/* Visual score band */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Score Band Preview</label>
              <div className="h-8 rounded-lg overflow-hidden flex text-xs font-medium">
                <div
                  className="bg-green-600/50 border-r border-gray-900 flex items-center justify-center text-green-200"
                  style={{ width: `${mediumPct}%` }}
                >
                  {mediumPct > 10 ? 'LOW' : ''}
                </div>
                <div
                  className="bg-yellow-600/50 border-r border-gray-900 flex items-center justify-center text-yellow-200"
                  style={{ width: `${Math.max(highPct - mediumPct, 0)}%` }}
                >
                  {highPct - mediumPct > 10 ? 'MEDIUM' : ''}
                </div>
                <div className="bg-red-600/50 flex-1 flex items-center justify-center text-red-200">
                  {100 - highPct > 10 ? 'HIGH' : ''}
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 px-0.5">
                <span>0.0</span>
                <span className="text-yellow-600">{(mediumPct / 100).toFixed(2)}</span>
                <span className="text-red-600">{(highPct / 100).toFixed(2)}</span>
                <span>1.0</span>
              </div>
            </div>

            {/* Threshold inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Medium Threshold</label>
                <input
                  type="number" step="0.01" min="0.01" max="0.99"
                  value={medium}
                  onChange={e => setMedium(e.target.value)}
                  className="w-full bg-gray-800 border border-yellow-700/40 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                />
                <p className="text-xs text-gray-600">Score ≥ value → classified as MEDIUM</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">High Threshold</label>
                <input
                  type="number" step="0.01" min="0.01" max="1"
                  value={high}
                  onChange={e => setHigh(e.target.value)}
                  className="w-full bg-gray-800 border border-red-700/40 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
                <p className="text-xs text-gray-600">Score ≥ value → classified as HIGH</p>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Low Risk',    range: `0.00 – ${(mediumPct / 100).toFixed(2)}`, color: 'text-green-400  bg-green-500/10  border-green-500/20'  },
                { label: 'Medium Risk', range: `${(mediumPct / 100).toFixed(2)} – ${(highPct / 100).toFixed(2)}`, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
                { label: 'High Risk',   range: `${(highPct / 100).toFixed(2)} – 1.00`, color: 'text-red-400    bg-red-500/10    border-red-500/20'    },
              ].map(({ label, range, color }) => (
                <div key={label} className={`rounded-lg border px-3 py-2.5 ${color}`}>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[11px] font-mono mt-0.5 opacity-80">{range}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save Policy'}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
