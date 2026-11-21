# Klin support email integration

Klin's support integration uses the existing Resend Inbox and the Klin AI Gateway.

## Flow

1. Resend sends an inbox.email.received webhook to /api/webhooks/resend.
2. Klin verifies the Svix signature against the raw request body.
3. Klin fetches the exact message from the configured Resend inbox, thread, and email IDs.
4. Klin stores the message once in support_email_cases (Resend email ID is unique).
5. Klin AI classifies the request, summarizes it, and prepares a draft. Customer email content is treated as untrusted input.
6. Billing disputes, refund requests, account security, privacy, legal, and other high-risk cases are routed to human review.
7. A signed-in support administrator reviews and sends the reply from /admin/support. Replies are sent into the original Resend thread.

## Preview environment variables

Set these only on the chatgpt/backend-foundation Preview environment for the Klin preview project:

- RESEND_API_KEY: a server-only Resend API key with the Inbox API permissions required to read threads and send thread replies. Resend currently exposes full_access for full inbox API access; do not use a sending-only key for Inbox read/reply calls.
- RESEND_WEBHOOK_SECRET: signing secret returned when creating the Resend webhook.
- KLIN_SUPPORT_INBOX_ID: ID of the existing Klin Support inbox.
- AI_GATEWAY_API_KEY: server-only AI Gateway key, or use Vercel OIDC if enabled for the deployment.
- KLIN_SUPPORT_MODEL: model available i¶»§q«^