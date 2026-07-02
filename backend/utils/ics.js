// Minimal iCalendar (.ics) builder for a task with a due date. Attached to
// assignment emails so calendar apps can add the due date natively — no
// Google Calendar API/OAuth needed.
//
// With an `attendee` it emits a METHOD:REQUEST invite — that is what makes
// Gmail/Outlook render the interactive "Add to calendar" / RSVP card instead
// of a bare file attachment. Without one it falls back to a PUBLISH event.
const icsEscape = (s = '') =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

// All-day date in UTC: YYYYMMDD
const fmtDate = (d) => {
  const dt = new Date(d);
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`;
};

const buildTaskICS = ({ task, projectName, url, organizerEmail, attendee }) => {
  if (!task.dueDate) return null;
  const method = attendee && attendee.email ? 'REQUEST' : 'PUBLISH';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  // All-day events: DTEND is exclusive, so it points at the day after the due date.
  const dayAfter = new Date(new Date(task.dueDate).getTime() + 86400000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaskFlow//Task Due Date//EN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:task-${task._id}@taskflow`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${fmtDate(task.dueDate)}`,
    `DTEND;VALUE=DATE:${fmtDate(dayAfter)}`,
    `SUMMARY:${icsEscape(`${task.title} (${projectName})`)}`,
    ...(task.description ? [`DESCRIPTION:${icsEscape(task.description)}`] : []),
    ...(url ? [`URL:${icsEscape(url)}`] : []),
    ...(method === 'REQUEST'
      ? [
          `ORGANIZER;CN=TaskFlow:mailto:${organizerEmail || 'no-reply@taskflow.app'}`,
          `ATTENDEE;CN=${icsEscape(attendee.name || attendee.email)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee.email}`,
          'STATUS:CONFIRMED',
          'SEQUENCE:0',
        ]
      : []),
    // A due date shouldn't block the assignee's free/busy time.
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
};

// One-click "Add to Google Calendar" link (all-day event on the due date).
// Put in the email body as a button — it works even when the mail client
// hides or rewrites .ics attachments.
const buildGoogleCalendarLink = ({ task, projectName, url }) => {
  if (!task.dueDate) return null;
  const start = fmtDate(task.dueDate);
  const end = fmtDate(new Date(new Date(task.dueDate).getTime() + 86400000));
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${task.title} (${projectName})`,
    dates: `${start}/${end}`,
    details: [task.description, url ? `Open in TaskFlow: ${url}` : null].filter(Boolean).join('\n\n'),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

module.exports = { buildTaskICS, buildGoogleCalendarLink };
