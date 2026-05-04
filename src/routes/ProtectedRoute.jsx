import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Spinner'
import { ROUTES } from '@/utils/constants'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
  return children
}
