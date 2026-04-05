import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext.jsx'
import Login from '../features/auth/pages/Login.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import PoliciesPage from '../pages/PoliciesPage.jsx'
import RiskPolicyPage from '../pages/RiskPolicyPage.jsx'
import SystemConfigPage from '../pages/SystemConfigPage.jsx'
import UserTelemetryPage from '../pages/UserTelemetryPage.jsx'
import BaselinePage from '../pages/BaselinePage.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const protect = (el) => <ProtectedRoute>{el}</ProtectedRoute>

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"          element={<Login />} />
      <Route path="/dashboard"      element={protect(<Dashboard />)} />
      <Route path="/policies"       element={protect(<PoliciesPage />)} />
      <Route path="/risk-policy"    element={protect(<RiskPolicyPage />)} />
      <Route path="/system-config"  element={protect(<SystemConfigPage />)} />
      <Route path="/user-telemetry" element={protect(<UserTelemetryPage />)} />
      <Route path="/baseline"       element={protect(<BaselinePage />)} />
      <Route path="*"               element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
