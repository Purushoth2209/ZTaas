import { useAuth } from '../features/auth/context/AuthContext.jsx'

export default function Dashboard() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-6">Welcome to ZTaaS Admin Dashboard</p>
        <button
          onClick={logout}
          className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
