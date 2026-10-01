import { Navigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';

// Only lets `role` in. Logged-out -> /login. Wrong role -> their own dashboard.
export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;
  return children;
}
