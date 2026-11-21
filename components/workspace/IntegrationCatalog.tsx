type Props = { aiGatewayConfigured: boolean; stripeConfigured: boolean; mediaConfigured: boolean };

export default function IntegrationCatalog({ aiGatewayConfigured, stripeConfigured, mediaConfigured }: Props) {
  const groups = [
    { title: "AI model providers", description: aiGatewayConfigured ? "AI Gateway credentials and a model ID are present on the server. A live model request is still required to verify access and billing." : "Klinie is wired to Vercel AI Gateway, but the server still needs AI_GATEWAY_API_KEY (or Vercel OIDC) and KLINIE_MODEL.", status: aiGatewayConfigured ? "Server configuration present" : "Configuration required", examples: "Klinie text chat; image/video generation still separate", ready: aiGatewayConfigured },
    { title: "Messaging and communications", description: "OAuth callbacks, consent checks, provider credentials, and background delivery workers are not connected yet.", status: "Workers pending", examples: "Email, SMS, phone, WhatsApp, Discord, and Slack", ready: false },
    { title: "Private file storage", description: mediaConfigured ? "Supabase server credentials are present. Private bucket access and upload confirmation still need a live test." : "Supabase URL, publishable key, and server-only service-role key must be configured.", status: mediaConfigured ? "Server configuration present" : "Configuration required", examples: "Private images, video, audio, and PDF assets", ready: mediaConfigured },
    { title: "Payments", description: stripeConfigured ? "Stripe secret and webhook credentials are present. Products, prices, webhook delivery, and test transactions still need verification." : "Stripe secret and webhook credentials are required. Price IDs are configured separately for each plan and Gems pack.", status: stripeConfigured ? "Server configuration present" : "Configuration required", examples: "Subscriptions and Gems", ready: stripeConfigured },
    { title: "Developer and cloud services", description: "Provider OAuth, secure token storage, and integration job workers have not been connected to this workspace yet.", status: "Connection setup pending", examples: "Developer tools and external cloud services", ready: false },
  ];
  return (
    <main className="module-page">
      <header className="module-header"><div><div className="module-eyebrow">KLIN WORKSPACE</div><h1>Integrations</h1><p>Live configuration indicators for Klin\u2019s server-side providers. Secrets are never sent to this page.</p></div></header>
      <div className="module-note">A configured environment variable does not prove a successful provider connection. Live requests, webhook delivery, and OAuth callbacks must still be tested.</div>
      <section className="integration-grid">
        {groups.map((group) => <article className="integration-card" key={group.title}>
          <div className={group.ready ? "integration-card-top integration-ready" : "integration-card-top"}><span className="integration-indicator" /><span>{group.status}</span></div>
          <h2>{group.title}</h2><p>{group.description}</p><div className="integration-examples">{group.examples}</div>
        </article>)}
      </section>
    </main>
  );
}
