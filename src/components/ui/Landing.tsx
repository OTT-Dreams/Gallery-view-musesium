export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="app-shell app-shell--center">
      <div className="panel panel--left">
        <p className="eyebrow">Atelier</p>
        <h1 className="panel__title">A Virtual Museum</h1>
        <p className="panel__subtitle">Soft light. Quiet halls. Works held in care.</p>
        <p className="panel__body">
          Enter a photorealistic gallery built for slow looking. Move freely through elegant
          galleries, take in the details, and view each framed work up close.
        </p>
        <button className="button" onClick={onEnter}>
          Enter the Gallery
        </button>
      </div>
    </div>
  );
}
