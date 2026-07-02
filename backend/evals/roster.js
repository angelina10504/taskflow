// Shared fixtures for the eval harness.
//
// The clock is PINNED so every date expectation in the datasets can be a
// literal "YYYY-MM-DD" string — runs are reproducible on any machine, any day.
// buildCalendar(10, PINNED_NOW) then yields exactly this window:
//
//   2026-07-01 Wednesday (today)     2026-07-06 Monday
//   2026-07-02 Thursday (tomorrow)   2026-07-07 Tuesday
//   2026-07-03 Friday                2026-07-08 Wednesday
//   2026-07-04 Saturday              2026-07-09 Thursday
//   2026-07-05 Sunday                2026-07-10 Friday
//
// (Pinned at noon UTC so the weekday names, which are computed in the local
// timezone, agree with the UTC dates for any timezone within ±11 hours.)
const PINNED_NOW = Date.parse('2026-07-01T12:00:00Z');

// A fake workspace roster with stable ids. Production sends Mongo ObjectIds;
// the ids here are fake on purpose — the prompt's contract is "copy ids
// EXACTLY from the member list", and that is exactly what we test.
const CURRENT_USER = { id: 'u_angelina', name: 'Angelina' };

const MEMBERS = [
  { id: 'u_angelina', name: 'Angelina', email: 'angelina@taskflow.dev' },
  { id: 'u_priya', name: 'Priya', email: 'priya@taskflow.dev' },
  { id: 'u_rahul', name: 'Rahul', email: 'rahul@taskflow.dev' },
  { id: 'u_sam', name: 'Sam', email: 'sam@taskflow.dev' },
  { id: 'u_meera', name: 'Meera', email: 'meera@taskflow.dev' },
];

const MEMBER_IDS = MEMBERS.map((m) => m.id);

module.exports = { PINNED_NOW, CURRENT_USER, MEMBERS, MEMBER_IDS };
