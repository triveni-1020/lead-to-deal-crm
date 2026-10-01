const ROLES = [
  { value: 'customer', label: 'Customer', hint: 'Track your requests' },
  { value: 'salesperson', label: 'Salesperson', hint: 'Manage your pipeline' },
];

export default function RoleSelector({ value, onChange }) {
  return (
    <div className="role-selector" role="radiogroup" aria-label="Login as">
      {ROLES.map((r) => (
        <button type="button" key={r.value} role="radio" aria-checked={value === r.value}
          className={`role-card ${value === r.value ? 'active' : ''}`} onClick={() => onChange(r.value)}>
          <strong>{r.label}</strong><span>{r.hint}</span>
        </button>
      ))}
    </div>
  );
}
