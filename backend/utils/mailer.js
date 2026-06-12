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

const getTransporter = () => {
  if (!isMailConfigured()) return null;
  if (transporter) return transporter;
  if (!nodemailer) nodemailer = require('nodemailer');
  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
};

const fromAddress = () => process.env.MAIL_FROM || `TaskFlow <${process.env.SMTP_USER}>`;

// Send an email. Never throws — failures are logged and reported in the result
// so callers can fire-and-forget without taking down a request.
const sendMail = async ({ to, subject, text, html, icalEvent }) => {
  const t = getTransporter();
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
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mailer] send failed → ${to}:`, err.message);
    return { error: err.message };
  }
};

module.exports = { sendMail, isMailConfigured };
