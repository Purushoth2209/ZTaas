import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/AuthContext.jsx'
import {
  IconShield, IconDashboard, IconPolicy, IconRisk,
  IconConfig, IconTelemetry, IconBaseline, IconLogout,
} from '../ui/Icons.jsx'

const NAV = [
  { to: '/dashboard',     label: 'Dashboard',      Icon: IconDashboard  },
  { to: '/policies',      label: 'Auth Policies',  Icon: IconPolicy     },
  { to: '/risk-policy',   label: 'Risk Policy',    Icon: IconRisk       },
  { to: '/system-config', label: 'System Config',  Icon: IconConfig     },
  { to: '/user-telemetry',label: 'User Telemetry', Icon: IconTelemetry  },
  { to: '/baseline',      label: 'Baseline',       Icon: IconBaseline   },
]

export default function AppLayout({ children }) {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="shrink-0 bg-gray-900 border-b border-gray-800 z-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4 px-4 sm:px-5 py-3 max-w-screen-2xl mx-auto w-full">
          <div className="flex items-center justify-between gap-3 md:justify-start shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <IconShield className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">ZTaaS Admin</p>
                <p className="text-[10px] text-gray-500 leading-tight">Zero Trust Gateway</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="md:hidden flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-800"
            >
              <IconLogout className="w-3.5 h-3.5 shrink-0" />
              Sign out
            </button>
          </div>

          <nav
            className="flex items-center gap-0.5 overflow-x-auto pb-0.5 md:pb-0 -mx-1 px-1 md:flex-1 md:justify-center"
            aria-label="Main"
          >
            {NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 whitespace-nowrap px-2.5 py-2 rounded-lg text-xs sm:text-sm transition-colors shrink-0 ${
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

          <div className="hidden md:flex shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
            >
              <IconLogout className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
