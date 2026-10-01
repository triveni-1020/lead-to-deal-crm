import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, homePathFor } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import CustomerRoutes from './routes/CustomerRoutes.jsx';
import SalespersonRoutes from './routes/SalespersonRoutes.jsx';
import Login from './pages/auth/Login.jsx';

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homePathFor(user.role)} replace /> : <Login />} />
      <Route path="/customer/*" element={<ProtectedRoute role="customer"><CustomerRoutes /></ProtectedRoute>} />
      <Route path="/sales/*" element={<ProtectedRoute role="salesperson"><SalespersonRoutes /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? homePathFor(user.role) : '/login'} replace />} />
    </Routes>
  );
}
