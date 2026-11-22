"use client";

export default function KlinLoading({ title = "Loading Klin", subtitle = "Getting your workspace ready." }: { title?: string; subtitle?: string }) {
  return (
    <div className="klin-loading-screen" role="status" aria-live="polite">
      <div className="klin-loading-card">
        <div className="klin-loading-stage">
          <div className="klin-loading-wordmark" aria-label="Klin"><span>K</span><span>l</span><span>i</span><span>n</span></div>
          <img className="klin-loading-walker" src="/klin-mascot.svg" alt="" />
        </div>
        <p className="klin-loading-title">{title}</p>
        <p className="klin-loading-subtitle">{subtitle}</p>
        <div className="klin-loading-progress"><span /></div>
      </div>
    </div>
  );
}
