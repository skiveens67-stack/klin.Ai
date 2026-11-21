import { NextResponse } from "next/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/[\r\n]+/g, " ").slice(0, max) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 10 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid support request." }, { status: 400 });
  }
  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["name", "email", "subject", "message", "website"].includes(key))) {
    return NextResponse.json({ error: "Unexpected support request field." }, { status: 400 });
  }
  // Honeypot: silently accept automated submissions without sending mail.
  if (typeof input.website === "string" && input.website.trim()) {
    return NextResponse.json({ sent: true }, { status: 200 });
  }
  const name = clean(input.name, 100);
  const email = clean(input.email, 254).toLowerCase();
  const subject = clean(input.subject, 140);
  const message = typeof input.message === "string" ? input.message.trim().slice(0, 5000) : "";
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || subject.length < 3 || message.length < 10) {
    return NextResponse.json({ error: "Enter your name, a valid email, a subject, and a message of at least 10 characters." }, { status: 400 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Klin Support email is temporarily unavailable. Please try again later." }, { status: 503 });
  const from = process.env.KLIN_SUPPORT_FROM || process.env.KLIN_EMAIL_FROM || "Klin Support <no-reply@klin.website>";
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": "klin-public-support-" + crypto.randomUUID(),
      },
      body: JSON.stringify({
        from,
        to: [process.env.KLIN_SUPPORT_EMAIL || "support@klin.help"],
        reply_to: [email],
        subject: "[Klin Support] " + subject,
        html: "<div style='font-family:Arial,sans-serif;white-space:normal'><h2>New public Klin support request</h2><p><b>Name:</b> " + safeName + "</p><p><b>Reply email:</b> " + safeEmail + "</p><p><b>Subject:</b> " + safeSubject + "</p><hr><p>" + safeMessage + "</p></div>",
        text: "New public Klin support request\nName: " + name + "\nReply email: " + email + "\nSubject: " + subject + "\n\n" + message,
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "Klin could not send your message right now. Please try again later." }, { status: 502 });
    return NextResponse.json({ sent: true, message: "Your message has been sent to Klin Support. The team can reply to the email address you provided." }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Klin Support is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
