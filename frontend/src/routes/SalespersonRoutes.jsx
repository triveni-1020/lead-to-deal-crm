import { Routes, Route, Navigate } from 'react-router-dom';
import SalespersonDashboard from '../pages/salesperson/SalespersonDashboard.jsx';
import LeadsList from '../pages/salesperson/LeadsList.jsx';
import AddLead from '../pages/salesperson/AddLead.jsx';
import LeadDetails from '../pages/salesperson/LeadDetails.jsx';
import Pipeline from '../pages/salesperson/Pipeline.jsx';
import Activities from '../pages/salesperson/Activities.jsx';
import Analytics from '../pages/salesperson/Analytics.jsx';
import Settings from '../pages/salesperson/Settings.jsx';

export default function SalespersonRoutes() {
  return (
    <Routes>
      <Route index element={<SalespersonDashboard />} />
      <Route path="leads" element={<LeadsList />} />
      <Route path="leads/new" element={<AddLead />} />
      <Route path="leads/:id" element={<LeadDetails />} />
      <Route path="pipeline" element={<Pipeline />} />
      <Route path="activities" element={<Activities />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/sales" replace />} />
    </Routes>
  );
}
