import { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { fetchPolicies, savePolicies, clearPolicies } from '../features/admin/admin.api.js'
import { IconPlus, IconTrash, IconRefresh, IconAlert, IconCheck } from '../components/ui/Icons.jsx'

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
const ROLES   = ['admin', 'analyst', 'user']
const empty   = () => ({ path: '', methods: [], roles: [] })

function Toggle({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
        active
          ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
          : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
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

export default function PoliciesPage() {
  const [tenantId, setTenantId] = useState('default')
  const [policies, setPolicies] = useState([])
  const [newRule, setNewRule]   = useState(empty())
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await fetchPolicies(tenantId)
      setPolicies(data.policies ?? [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tenantId])

  function toggleItem(field, value) {
    setNewRule(r => ({
      ...r,
      [field]: r[field].includes(value)
        ? r[field].filter(x => x !== value)
        : [...r[field], value],
    }))
  }

  async function addRule() {
    if (!newRule.path || !newRule.methods.length || !newRule.roles.length)
      return setError('Path, at least one method, and one role are required.')
    setSaving(true); setError(''); setSuccess('')
    try {
      const updated = [...policies, newRule]
      await savePolicies(tenantId, updated)
      setPolicies(updated)
      setNewRule(empty())
      setSuccess('Policy rule added successfully.')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function deleteRule(idx) {
    setSaving(true); setError(''); setSuccess('')
    try {
      const updated = policies.filter((_, i) => i !== idx)
      await savePolicies(tenantId, updated)
      setPolicies(updated)
      setSuccess('Policy rule removed.')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleClear() {
    if (!confirm(`Clear all policies for tenant "${tenantId}"?`)) return
    setSaving(true); setError(''); setSuccess('')
    try {
      await clearPolicies(tenantId)
      setPolicies([])
      setSuccess('All policies cleared.')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Authorization Policies</h2>
            <p className="text-sm text-gray-500 mt-0.5">Define which roles can access which endpoints per tenant</p>
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
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            Reload
          </button>
        </div>

        {error   && <Alert type="error"   message={error}   />}
        {success && <Alert type="success" message={success} />}

        {/* Add rule form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">New Rule</h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Endpoint Path</label>
              <input
                placeholder="/api/users"
                value={newRule.path}
                onChange={e => setNewRule(r => ({ ...r, path: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">HTTP Methods</label>
              <div className="flex gap-2 flex-wrap">
                {METHODS.map(m => (
                  <Toggle key={m} label={m} active={newRule.methods.includes(m)} onClick={() => toggleItem('methods', m)} />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Allowed Roles</label>
              <div className="flex gap-2 flex-wrap">
                {ROLES.map(r => (
                  <Toggle key={r} label={r} active={newRule.roles.includes(r)} onClick={() => toggleItem('roles', r)} />
                ))}
              </div>
            </div>

            <button
              onClick={addRule}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              {saving ? 'Saving…' : 'Add Rule'}
            </button>
          </div>
        </div>

        {/* Policy table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Active Policies</h3>
              <p className="text-xs text-gray-500 mt-0.5">{policies.length} rule{policies.length !== 1 ? 's' : ''} for tenant <span className="font-mono text-gray-400">{tenantId}</span></p>
            </div>
            {policies.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <IconTrash className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-gray-600 text-sm">Loading policies…</div>
          ) : policies.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-gray-500 text-sm">No policies defined for this tenant</p>
              <p className="text-gray-600 text-xs mt-1">Add a rule above to get started</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-800/30">
                  {['Path', 'Methods', 'Roles', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map((p, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-300">{p.path}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.methods.map(m => (
                          <span key={m} className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs rounded border border-indigo-500/20 font-mono">{m}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.roles.map(r => (
                          <span key={r} className="px-1.5 py-0.5 bg-gray-700/80 text-gray-300 text-xs rounded border border-gray-600">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteRule(i)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
