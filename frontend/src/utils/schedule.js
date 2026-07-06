// Deterministic time-blocking for the Today plan. The AI already chose WHAT
// to do (and why); this packs it into WHEN — plain interval math, no model,
// so the schedule is reproducible and explainable. Pure functions, no deps.

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
export const fmtTime = (min) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')}${ampm}`;
};

const BREAK_MIN = 10; // breather between blocks
const LUNCH_START = 13 * 60;
const LUNCH_MIN = 45;
const MIN_USEFUL = 20; // don't schedule slivers shorter than this

// picks: today-plan picks in rank order ({ task, reason, estimateMin }).
// hours: { start: 'HH:MM', end: 'HH:MM' } from the user's planning prefs.
// now:   Date (injectable for tests).
// Returns { blocks, overflow, dayOffset } — blocks carry minutes-of-day.
export const packSchedule = (picks, hours, now = new Date()) => {
  const start = toMin(hours?.start) ?? 9 * 60;
  const end = toMin(hours?.end) ?? 17 * 60;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Workday over (or nearly)? Lay out tomorrow instead of pretending.
  const dayOffset = nowMin >= end - MIN_USEFUL ? 1 : 0;
  let cursor = dayOffset === 1 ? start : Math.max(start, Math.ceil(nowMin / 5) * 5);

  const wantLunch = end - start >= 360 && cursor < LUNCH_START + LUNCH_MIN && end > LUNCH_START + LUNCH_MIN;
  let lunchDone = !wantLunch;

  const blocks = [];
  const overflow = [];

  for (const pick of picks) {
    const assumed = !pick.estimateMin;
    const dur = Math.min(Math.max(pick.estimateMin || 60, 15), 240);

    if (!lunchDone && cursor >= LUNCH_START) {
      blocks.push({ kind: 'lunch', start: cursor, end: cursor + LUNCH_MIN });
      cursor += LUNCH_MIN;
      lunchDone = true;
    } else if (!lunchDone && cursor + dur > LUNCH_START) {
      // Task would straddle lunch — take lunch first (early, from cursor).
      blocks.push({ kind: 'lunch', start: cursor, end: cursor + LUNCH_MIN });
      cursor += LUNCH_MIN;
      lunchDone = true;
    }

    if (cursor + dur > end) {
      // Fit what's meaningful, overflow the rest — never pretend it fits.
      if (end - cursor >= MIN_USEFUL && blocks.every((b) => !b.partial)) {
        const scheduled = end - cursor;
        blocks.push({ kind: 'task', partial: true, assumed, pick, start: cursor, end });
        cursor = end;
        overflow.push({ pick, remainingMin: dur - scheduled, remainder: true });
      } else {
        overflow.push({ pick, remainingMin: dur });
      }
      continue;
    }

    blocks.push({ kind: 'task', assumed, pick, start: cursor, end: cursor + dur });
    cursor += dur;

    if (cursor + BREAK_MIN <= end) {
      blocks.push({ kind: 'break', start: cursor, end: cursor + BREAK_MIN });
      cursor += BREAK_MIN;
    }
  }

  // A trailing break is noise.
  while (blocks.length && blocks[blocks.length - 1].kind === 'break') blocks.pop();

  return { blocks, overflow, dayOffset };
};

// Build a downloadable iCalendar file from the task blocks (breaks stay out
// of people's calendars). Floating local times — imports at wall-clock time.
const icsEscape = (s = '') =>
  String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export const buildPlanICS = (blocks, { dayOffset = 0, now = new Date() } = {}) => {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
  const d = (min) =>
    `${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, '0')}${String(day.getDate()).padStart(2, '0')}T${String(Math.floor(min / 60)).padStart(2, '0')}${String(min % 60).padStart(2, '0')}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const events = blocks
    .filter((b) => b.kind === 'task')
    .map((b, i) =>
      [
        'BEGIN:VEVENT',
        `UID:taskflow-plan-${day.getTime()}-${i}@taskflow`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${d(b.start)}`,
        `DTEND:${d(b.end)}`,
        `SUMMARY:${icsEscape(`${b.pick.task?.title}${b.partial ? ' (first pass)' : ''}`)}`,
        `DESCRIPTION:${icsEscape(
          [b.pick.reason, b.pick.task?.project?.name ? `Project: ${b.pick.task.project.name}` : null, 'Planned by TaskFlow']
            .filter(Boolean)
            .join('\n')
        )}`,
        'END:VEVENT',
      ].join('\r\n')
    );

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TaskFlow//Daily Plan//EN', 'METHOD:PUBLISH', ...events, 'END:VCALENDAR'].join(
    '\r\n'
  );
};
