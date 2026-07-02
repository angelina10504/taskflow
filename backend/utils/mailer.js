// Provider-agnostic mailer: works with any SMTP service (Gmail app password,
// Brevo, Mailtrap, …) configured purely through environment variables —
// same philosophy as aiClient. When SMTP env vars are missing or still
// placeholders, every send becomes a logged no-op so the app never breaks
// because email isn't configured.
const isPlaceholder = (v) => !v || /^your_.*_here$/.test(String(v).trim());

let nodemailer = null; // lazy require: keeps server boot fast
let transporter = null;

const isMailConfigured = () =>
  !isPlaceholder(process.env.SMTP_HOST) &&
  !isPlaceholder(process.env.SMTP_USER) &&
  !isPlaceholder(process.env.SMTP_PASS);

// nodemailer 8 resolves the SMTP host to BOTH A and AAAA records and picks one
// AT RANDOM per connection — on IPv4-only hosts (e.g. Render) every IPv6 pick
// dies with ENETUNREACH. Resolving to an IPv4 address ourselves sidesteps its
// resolver (IP literals pass straight through), while `tls.servername` keeps
// certificate validation pinned to the real hostname.
const resolveIPv4 = async (host) => {
  if (require('net').isIP(host)) return host;
  try {
    const addrs = await require('dns').promises.resolve4(host);
    if (addrs && addrs.length) return addrs[0];
  } catch (err) {
    console.warn(`[mailer] IPv4 resolution failed for ${host} (${err.code || err.message}) — using hostname`);
  }
  return host;
};

const getTransporter = async () => {
  if (!isMailConfigured()) return null;
  if (transporter) return transporter;
  if (!nodemailer) nodemailer = require('nodemailer');
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: await resolveIPv4(host),
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { servername: host },
  });
  return transporter;
};

const fromAddress = () => process.env.MAIL_FROM || `TaskFlow <${process.env.SMTP_USER}>`;

// Send an email. Never throws — failures are logged and reported in the result
// so callers can fire-and-forget without taking down a request.
const sendMail = async ({ to, subject, text, html, icalEvent }) => {
  const t = await getTransporter();
  if (!t) {
    console.log(`[mailer] SMTP not configured — skipped "${subject}" → ${to}`);
    return { skipped: true };
  }
  try {
    const info = await t.sendMail({
      from: fromAddress(),
      to,
      subject,
      text,
      html,
      ...(icalEvent ? { icalEvent } : {}),
    });
    console.log(`[mailer] sent → ${to} (id: ${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mailer] send failed → ${to}:`, err.message);
    // A network-level failure may mean the resolved IP went stale — drop the
    // cached transport so the next send re-resolves fresh.
    if (/ENETUNREACH|EHOSTUNREACH|ETIMEDOUT|ECONNREFUSED|ECONNRESET/i.test(err.message)) {
      transporter = null;
    }
    return { error: err.message };
  }
};

// Log mail configuration status once at startup so it's obvious whether
// assignment emails will actually send.
console.log(
  isMailConfigured()
    ? `[mailer] ✅ email ENABLED (host: ${process.env.SMTP_HOST}, user: ${process.env.SMTP_USER})`
    : '[mailer] ⚠️  email DISABLED — SMTP_* env vars missing/placeholder; assignment emails will be skipped'
);

module.exports = { sendMail, isMailConfigured };
