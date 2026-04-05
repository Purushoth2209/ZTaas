import { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { fetchSystemConfig, saveBackendUrl, saveEnforcement } from '../features/admin/admin.api.js'
import { IconObserve, IconEnforce, IconAlert, IconCheck, IconRefresh } from '../components/ui/Icons.jsx'

function Section({ title, description, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

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

export default function SystemConfigPage() {
  const [config, setConfig]           = useState(null)
  const [backendUrl, setBackendUrl]   = useState('')
  const [enforcement, setEnforcement] = useState('observe')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState('')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await fetchSystemConfig()
      setConfig(data)
      setBackendUrl(data.backendUrl ?? '')
      setEnforcement(data.enforcementMode ?? 'observe')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleSaveBackend() {
    setSaving('backend'); setError(''); setSuccess('')
    try {
      await saveBackendUrl(backendUrl)
      setSuccess('Backend URL updated successfully.')
      load()
    } catch (e) { setError(e.message) }
    finally { setSaving('') }
  }

  async function handleSaveEnforcement() {
    setSaving('enforcement'); setError(''); setSuccess('')
    try {
      await saveEnforcement(enforcement)
      setSuccess(`Enforcement mode set to "${enforcement}".`)
      load()
    } catch (e) { setError(e.message) }
    finally { setSaving('') }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-2xl mx-auto">

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">System Configuration</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage gateway runtime settings</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {error   && <Alert type="error"   message={error}   />}
        {success && <Alert type="success" message={success} />}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading configuration…</p>
        ) : (
          <div className="space-y-4">

            {/* Live snapshot */}
            <Section title="Current Configuration" description="Live values loaded from the gateway">
              <div className="divide-y divide-gray-800">
                {[
                  ['Backend URL',      config?.backendUrl],
                  ['Enforcement Mode', config?.enforcementMode],
                  ['JWT Issuer',       config?.jwt?.issuer],
                  ['JWT Audience',     config?.jwt?.audience],
                  ['JWT Algorithms',   config?.jwt?.algorithms?.join(', ')],
                  ['JWKS URI',         config?.jwt?.jwksUri],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-4 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{k}</span>
                    <span className="text-xs font-mono text-gray-300 break-all">{v ?? '—'}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Backend URL */}
            <Section title="Backend Service URL" description="The upstream service the gateway proxies requests to">
              <div className="flex gap-3">
                <input
                  value={backendUrl}
                  onChange={e => setBackendUrl(e.target.value)}
                  placeholder="http://localhost:5001"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  onClick={handleSaveBackend}
                  disabled={saving === 'backend'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors shrink-0"
                >
                  {saving === 'backend' ? 'Saving…' : 'Update'}
                </button>
              </div>
            </Section>

            {/* Enforcement mode */}
            <Section
              title="Enforcement Mode"
              description="Observe mode logs policy violations without blocking. Enforce mode actively blocks unauthorized requests."
            >
              <div className="grid grid-cols-2 gap-3">
                {[
                  { mode: 'observe', Icon: IconObserve, label: 'Observe', desc: 'Log only, no blocking' },
                  { mode: 'enforce', Icon: IconEnforce, label: 'Enforce', desc: 'Block unauthorized requests' },
                ].map(({ mode, Icon, label, desc }) => (
                  <button
                    key={mode}
                    onClick={() => setEnforcement(mode)}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-colors ${
                      enforcement === mode
                        ? mode === 'enforce'
                          ? 'bg-red-600/10 border-red-500/40 text-red-300'
                          : 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                      enforcement === mode
                        ? mode === 'enforce' ? 'text-red-400' : 'text-indigo-400'
                        : 'text-gray-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleSaveEnforcement}
                disabled={saving === 'enforcement'}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {saving === 'enforcement' ? 'Applying…' : 'Apply Mode'}
              </button>
            </Section>

          </div>
        )}
      </div>
    </AppLayout>
  )
}
