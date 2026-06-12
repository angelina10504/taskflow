// Minimal iCalendar (.ics) builder for a task with a due date. Attached to
// assignment emails so Gmail/Outlook offer "Add to calendar" natively —
// no Google Calendar API/OAuth needed.
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

const buildTaskICS = ({ task, projectName, url }) => {
  if (!task.dueDate) return null;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  // All-day events: DTEND is exclusive, so it points at the day after the due date.
  const dayAfter = new Date(new Date(task.dueDate).getTime() + 86400000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaskFlow//Task Due Date//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:task-${task._id}@taskflow`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${fmtDate(task.dueDate)}`,
    `DTEND;VALUE=DATE:${fmtDate(dayAfter)}`,
    `SUMMARY:${icsEscape(`${task.title} (${projectName})`)}`,
    ...(task.description ? [`DESCRIPTION:${icsEscape(task.description)}`] : []),
    ...(url ? [`URL:${icsEscape(url)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
};

module.exports = { buildTaskICS };
