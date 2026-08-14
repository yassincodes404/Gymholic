import { Resend } from "resend";

/**
 * Thin Resend wrapper. Requires `RESEND_API_KEY` (sign up at resend.com) —
 * without it, sends no-op with a clear console warning instead of silently
 * pretending an email went out. `FROM_EMAIL` should be a verified sender
 * on your Resend domain; falls back to Resend's shared test address so
 * local dev doesn't need a domain configured, but real delivery to real
 * customers needs a verified domain.
 */
let client: Resend | null = null;
let warned = false;

function getClient(): Resend | null {
  if (client) return client;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!warned) {
      console.warn(
        "[email] RESEND_API_KEY not set — no emails are being sent. Set " +
          "it (see .env.local.example) to enable real delivery."
      );
      warned = true;
    }
    return null;
  }

  client = new Resend(apiKey);
  return client;
}

const FROM = process.env.FROM_EMAIL || "Gymholic <onboarding@resend.dev>";

async function send(to: string, subject: string, html: string) {
  const c = getClient();
  if (!c) return { sent: false as const };
  const result = await c.emails.send({ from: FROM, to, subject, html });
  return { sent: !result.error, error: result.error };
}

function shell(title: string, bodyHtml: string) {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p style="text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; color: #ff6a00; margin-bottom: 8px;">Gymholic</p>
      <h1 style="font-size: 22px; margin: 0 0 20px;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #888;">Gymholic — gym business consulting for Egypt, the UAE, the GCC, and worldwide.</p>
    </div>
  `;
}

export async function sendOrderReceiptEmail(params: {
  to: string;
  name: string;
  orderId: string;
  items: { title: string; price: number }[];
  total: number;
}) {
  const rows = params.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;">${i.title}</td><td style="padding:6px 0; text-align:right;">$${i.price}</td></tr>`
    )
    .join("");

  const html = shell(
    "Your Blueprint order is confirmed.",
    `
      <p>Hi ${params.name},</p>
      <p>Thanks for your order. Your Blueprints are ready to download from your order page.</p>
      <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
        ${rows}
        <tr><td style="padding-top:10px; font-weight:600;">Total</td><td style="padding-top:10px; text-align:right; font-weight:600;">$${params.total}</td></tr>
      </table>
      <p style="font-size: 13px; color: #666;">Order reference: ${params.orderId}</p>
    `
  );

  return send(params.to, "Your Gymholic Blueprint order", html);
}

export async function sendBookingConfirmationEmail(params: {
  to: string;
  name: string;
  serviceName: string;
  date: string;
  time: string;
  duration: string;
  meetingType: "Online" | "In Person";
  price: string;
  bookingRef: string;
  meetingLink?: string;
  location?: string;
}) {
  const meetingDetail =
    params.meetingType === "Online"
      ? `<p><strong>Meeting link:</strong> ${params.meetingLink || "Will be sent before your session."}</p>`
      : `<p><strong>Location:</strong> ${params.location || "Details will be sent before your session."}</p>`;

  const html = shell(
    "Your session is confirmed.",
    `
      <p>Hi ${params.name},</p>
      <p>Your consultation with Gymholic has been booked.</p>
      <table style="width:100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr><td style="padding:4px 0; color:#666;">Consultation</td><td style="padding:4px 0; text-align:right;">${params.serviceName}</td></tr>
        <tr><td style="padding:4px 0; color:#666;">Date</td><td style="padding:4px 0; text-align:right;">${params.date}</td></tr>
        <tr><td style="padding:4px 0; color:#666;">Time</td><td style="padding:4px 0; text-align:right;">${params.time}</td></tr>
        <tr><td style="padding:4px 0; color:#666;">Duration</td><td style="padding:4px 0; text-align:right;">${params.duration}</td></tr>
        <tr><td style="padding:4px 0; color:#666;">Price</td><td style="padding:4px 0; text-align:right;">${params.price}</td></tr>
      </table>
      ${meetingDetail}
      <p style="font-size: 13px; color: #666;">Booking reference: ${params.bookingRef}</p>
    `
  );

  return send(params.to, "Your Gymholic consultation is booked", html);
}

export async function sendBookingReminderEmail(params: {
  to: string;
  name: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  const html = shell(
    "Your session is coming up.",
    `<p>Hi ${params.name},</p><p>Reminder — your ${params.serviceName} with Gymholic is on ${params.date} at ${params.time}.</p>`
  );
  return send(params.to, "Reminder: your Gymholic session is coming up", html);
}
