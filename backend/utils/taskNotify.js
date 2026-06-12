const User = require('../models/User');
const { sendMail } = require('./mailer');
const { buildTaskICS } = require('./ics');

const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Email members who were just assigned a task. Fire-and-forget: callers do
// NOT await this — a slow/broken SMTP server must never slow down a request.
const notifyAssignment = async ({ task, project, assignerId, assignerName, addedIds }) => {
  try {
    // Never email someone about assigning a task to themselves.
    const ids = [...new Set((addedIds || []).map(String))].filter(
      (id) => id !== String(assignerId)
    );
    if (!ids.length) return;

    const users = await User.find({ _id: { $in: ids } }).select('name email emailNotifications');
    if (!users.length) return;

    const projectName = project?.name || 'a project';
    const url = `${process.env.CLIENT_URL || ''}/projects/${project?._id || task.project}`;
    const ics = buildTaskICS({ task, projectName, url });

    const due = task.dueDate ? new Date(task.dueDate).toDateString() : null;
    const metaBits = [
      `Priority: ${task.priority}`,
      ...(due ? [`Due: ${due}`] : []),
    ].join(' · ');

    const subject = `${assignerName} assigned you "${task.title}" in ${projectName}`;
    const text = [
      `${assignerName} assigned you a task in ${projectName}:`,
      '',
      `  ${task.title}`,
      `  ${metaBits}`,
      '',
      `Open the board: ${url}`,
      ...(ics ? ['', 'The attached calendar invite adds the due date to your calendar.'] : []),
    ].join('\n');

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto">
  <div style="background:linear-gradient(90deg,#6366f1,#a855f7);border-radius:10px 10px 0 0;padding:14px 20px;color:#ffffff;font-weight:bold;font-size:16px">TaskFlow</div>
  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px;color:#1f2937">
    <p style="margin:0 0 14px"><strong>${escapeHtml(assignerName)}</strong> assigned you a task in <strong>${escapeHtml(projectName)}</strong>:</p>
    <div style="border:1px solid #e5e7eb;border-left:4px solid #6366f1;border-radius:8px;padding:12px 16px;margin:0 0 18px">
      <div style="font-weight:600;margin-bottom:4px">${escapeHtml(task.title)}</div>
      <div style="font-size:13px;color:#6b7280">${escapeHtml(metaBits)}</div>
    </div>
    <a href="${url}" style="display:inline-block;background:linear-gradient(90deg,#6366f1,#a855f7);color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Open in TaskFlow</a>
    ${ics ? '<p style="font-size:12px;color:#9ca3af;margin:16px 0 0">The attached invite adds the due date to your calendar.</p>' : ''}
  </div>
</div>`;

    for (const u of users) {
      if (u.emailNotifications === false) continue; // user opted out
      sendMail({
        to: u.email,
        subject,
        text,
        html,
        icalEvent: ics ? { method: 'PUBLISH', filename: 'task.ics', content: ics } : undefined,
      });
    }
  } catch (err) {
    console.error('notifyAssignment error:', err.message);
  }
};

module.exports = { notifyAssignment };
