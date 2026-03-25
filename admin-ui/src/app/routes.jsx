import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext.jsx'
import Login from '../features/auth/pages/Login.jsx'
import Dashboard from '../pages/Dashboard.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
