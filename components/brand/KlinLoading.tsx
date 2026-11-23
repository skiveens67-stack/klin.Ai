"use client";

export default function KlinLoading({ title = "Loading Klin", subtitle = "Getting your workspace ready." }: { title?: string; subtitle?: string }) {
  return (
    <div className="klin-loading-screen" role="status" aria-live="polite">
      <div className="klin-loading-card">
        <div className="klin-loading-stage">
          <img className="klin-loading-logo" src="/klin-logo.svg" alt="Klin" />
        </div>
        <p className="klin-loading-title">{title}</p>
        <p className="klin-loading-subtitle">{subtitle}</p>
        <div className="klin-loading-progress"><span /></div>
      </div>
    </div>
  );
}
