import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/AuthContext.jsx'
import {
  IconShield, IconDashboard, IconPolicy, IconRisk,
  IconConfig, IconTelemetry, IconBaseline, IconLogout,
} from '../ui/Icons.jsx'

const NAV = [
  { to: '/dashboard',     label: 'Dashboard',      Icon: IconDashboard  },
  { to: '/policies',      label: 'Auth Policies',   Icon: IconPolicy     },
  { to: '/risk-policy',   label: 'Risk Policy',     Icon: IconRisk       },
  { to: '/system-config', label: 'System Config',   Icon: IconConfig     },
  { to: '/user-telemetry',label: 'User Telemetry',  Icon: IconTelemetry  },
  { to: '/baseline',      label: 'Baseline',        Icon: IconBaseline   },
]

export default function AppLayout({ children }) {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">

        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-800 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <IconShield className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">ZTaaS Admin</p>
            <p className="text-[10px] text-gray-500">Zero Trust Gateway</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <IconLogout className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
