export function Loading({ label }: { label: string }) {
  return (
    <div className="app-shell app-shell--center">
      <div className="loading">
        <p className="loading__label">{label}</p>
        <div className="loading__bar" />
      </div>
    </div>
  );
}
