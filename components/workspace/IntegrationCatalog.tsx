const groups = [
  {
    title: "AI model providers",
    description: "Model selection, server-side API credentials, streaming responses, and usage accounting.",
    status: "Runtime pending",
    examples: "Klinie chat and future image/video generation",
  },
  {
    title: "Messaging and communications",
    description: "OAuth callbacks, consent checks, provider credentials, and background delivery workers.",
    status: "Workers pending",
    examples: "Email, SMS, phone, WhatsApp, Discord, and Slack",
  },
  {
    title: "Private file storage",
    description: "Klin's private media bucket and signed upload flow are available in Creative Studio.",
    status: "Private uploads available",
    examples: "Images, video, audio, and PDF assets",
  },
  {
    title: "Payments",
    description: "Server-side checkout and webhook routes exist. Product prices, webhook credentials, and test transactions must be configured before checkout can run.",
    status: "Configuration pending",
    examples: "Subscriptions and Gems",
  },
  {
    title: "Developer and cloud services",
    description: "Provider OAuth, secure token storage, and integration job workers have not been connected to this workspace yet.",
    status: "Connection setup pending",
    examples: "Developer tools and external cloud services",
  },
];

export default function IntegrationCatalog() {
  return (
    <main className="module-page">
      <header className="module-header">
        <div><div className="module-eyebrow">KLIN WORKSPACE</div><h1>Integrations</h1><p>Review the systems Klin is designed to connect. Connection controls will appear when their secure OAuth and provider workers are implemented.</p></div>
      </header>
      <div className="module-note">This is an informational dashboard. It does not claim that external providers are connected, and it does not expose or store provider secrets in the browser.</div>
      <section className="integration-grid">
        {groups.map((group) => (
          <article className="integration-card" key={group.title}>
            <div className="integration-card-top"><span className="integration-indicator" /><span>{group.status}</span></div>
            <h2>{group.title}</h2>
            <p>{group.description}</p>
            <div className="integration-examples">{group.examples}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
