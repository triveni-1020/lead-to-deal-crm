import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Settings() {
  const { user } = useAuth();

  return (
    <DashboardLayout
      title="Salesperson Settings"
      subtitle="Account details, territory preferences, and profile configuration."
      roleLabel="Salesperson"
    >
      <div style={{ maxWidth: '720px' }}>
        {/* Profile Card */}
        <div className="crm-card crm-section-box">
          <div className="crm-card-header">
            <div>
              <h2 className="crm-card-title">Sales Representative Profile</h2>
              <p className="crm-card-subtitle">Authenticated user credentials and assignment details</p>
            </div>
          </div>

          <div className="crm-settings-profile-card">
            <div className="crm-settings-avatar-large">
              {user?.name
                ? user.name
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'SP'}
            </div>
            <div className="crm-settings-profile-fields">
              <div className="crm-settings-field-row">
                <span className="crm-settings-field-label">Full Name</span>
                <strong>{user?.name || 'Sales Representative'}</strong>
              </div>
              <div className="crm-settings-field-row">
                <span className="crm-settings-field-label">Email Address</span>
                <span>{user?.email || 'sales@demo.com'}</span>
              </div>
              <div className="crm-settings-field-row">
                <span className="crm-settings-field-label">System Role</span>
                <span className="crm-stage-pill stage-qualified">Salesperson</span>
              </div>
              <div className="crm-settings-field-row">
                <span className="crm-settings-field-label">Territory</span>
                <span>{user?.territory || 'Enterprise Global'}</span>
              </div>
              <div className="crm-settings-field-row">
                <span className="crm-settings-field-label">Specialized Skills</span>
                <span>{user?.skills ? (Array.isArray(user.skills) ? user.skills.join(', ') : user.skills) : 'B2B Software, Consumer Tech, Enterprise Licensing'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
