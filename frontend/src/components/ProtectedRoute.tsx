import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Spinner'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
