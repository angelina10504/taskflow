// Golden dataset for the Quick-Add parser (one line of English → structured task).
//
// Expectation fields (all optional except title_has — omitted fields assert the default):
//   title_has:   keywords that MUST appear in the returned title (case-insensitive substring)
//   title_lacks: metadata words that must have been STRIPPED from the title
//   priority:    'low'|'medium'|'high'|'urgent'|null   (default: null = model must not set one)
//   due:         'YYYY-MM-DD'|null                     (default: null = model must not invent one)
//   assignees:   array of roster ids, compared as a set (default: [])
//   status:      'todo'|'in_progress'|'in_review'|'done'|null (default: null)
//
// Any of priority/due/status may be an ARRAY = "any of these passes" for
// genuinely ambiguous phrasings; assignees_oneOf works the same for assignee sets.
// Dates are literal because the eval clock is pinned — see roster.js for the
// 2026-07-01 (Wednesday) … 2026-07-10 calendar window.

module.exports = [
  // ── Title only: nothing else stated, nothing else may be invented ─────────
  { id: 'qa-title-01', category: 'title', text: 'fix the login button alignment', expect: { title_has: ['login'] } },
  { id: 'qa-title-02', category: 'title', text: 'write onboarding docs for new developers', expect: { title_has: ['onboarding'] } },
  { id: 'qa-title-03', category: 'title', text: 'refactor the payment webhook handler', expect: { title_has: ['webhook'] } },
  { id: 'qa-title-04', category: 'title', text: 'update project dependencies', expect: { title_has: ['dependencies'] } },
  { id: 'qa-title-05', category: 'title', text: 'research competitor pricing pages', expect: { title_has: ['pricing'] } },
  { id: 'qa-title-06', category: 'title', text: 'clean up unused CSS classes', expect: { title_has: ['css'] } },

  // ── Priority extraction (and stripping priority words from the title) ─────
  { id: 'qa-pri-01', category: 'priority', text: 'urgent: the server keeps crashing on file upload', expect: { title_has: ['crash'], title_lacks: ['urgent'], priority: 'urgent' } },
  { id: 'qa-pri-02', category: 'priority', text: 'fix the demo laptop asap', expect: { title_has: ['laptop'], title_lacks: ['asap'], priority: 'urgent' } },
  { id: 'qa-pri-03', category: 'priority', text: 'high priority - migrate the database to Atlas', expect: { title_has: ['atlas'], title_lacks: ['high'], priority: 'high' } },
  { id: 'qa-pri-04', category: 'priority', text: 'low priority: tweak the footer spacing', expect: { title_has: ['footer'], title_lacks: ['low'], priority: 'low' } },
  { id: 'qa-pri-05', category: 'priority', text: 'critical bug in the checkout flow', expect: { title_has: ['checkout'], title_lacks: ['critical'], priority: 'urgent' } },
  { id: 'qa-pri-06', category: 'priority', text: 'whenever you get a chance, reorder the sidebar links', expect: { title_has: ['sidebar'], priority: ['low', null] } },
  { id: 'qa-pri-07', category: 'priority', text: 'this is blocking the release - fix the auth token refresh', expect: { title_has: ['token'], priority: ['urgent', 'high'] } },
  { id: 'qa-pri-08', category: 'priority', text: 'nice to have: dark mode for the settings page', expect: { title_has: ['dark'], priority: ['low', null] } },

  // ── Dates: resolved by looking up the pinned calendar (today = Wed Jul 1) ─
  { id: 'qa-date-01', category: 'date', text: 'submit the expense report tomorrow', expect: { title_has: ['expense'], title_lacks: ['tomorrow'], due: '2026-07-02' } },
  { id: 'qa-date-02', category: 'date', text: 'pay the hosting bill today', expect: { title_has: ['hosting'], due: '2026-07-01' } },
  { id: 'qa-date-03', category: 'date', text: 'share the team retro notes by Friday', expect: { title_has: ['retro'], title_lacks: ['friday'], due: '2026-07-03' } },
  { id: 'qa-date-04', category: 'date', text: 'send the invoice on Monday', expect: { title_has: ['invoice'], due: '2026-07-06' } },
  { id: 'qa-date-05', category: 'date', text: 'prepare demo slides for Thursday', expect: { title_has: ['slides'], due: '2026-07-02' } },
  // Today IS Wednesday — "by Wednesday" must resolve to NEXT Wednesday per the prompt rule.
  { id: 'qa-date-06', category: 'date', text: 'review open PRs by Wednesday', expect: { title_has: ['pr'], due: '2026-07-08' } },
  // "next Friday" is genuinely ambiguous in English — either reading passes.
  { id: 'qa-date-07', category: 'date', text: 'call the venue vendor next Friday', expect: { title_has: ['vendor'], due: ['2026-07-10', '2026-07-03'] } },
  { id: 'qa-date-08', category: 'date', text: 'publish the blog post in 3 days', expect: { title_has: ['blog'], due: '2026-07-04' } },
  { id: 'qa-date-09', category: 'date', text: 'renew the SSL certificate in a week', expect: { title_has: ['ssl'], due: '2026-07-08' } },
  { id: 'qa-date-10', category: 'date', text: 'back up the database day after tomorrow', expect: { title_has: ['database'], due: '2026-07-03' } },
  { id: 'qa-date-11', category: 'date', text: 'book the venue by July 9', expect: { title_has: ['venue'], due: '2026-07-09' } },
  { id: 'qa-date-12', category: 'date', text: 'launch the newsletter on the 10th', expect: { title_has: ['newsletter'], due: '2026-07-10' } },
  { id: 'qa-date-13', category: 'date', text: 'plan the team offsite by end of week', expect: { title_has: ['offsite'], due: ['2026-07-03', '2026-07-04', '2026-07-05'] } },
  { id: 'qa-date-14', category: 'date', text: 'no rush, but sort the icon assets folder', expect: { title_has: ['icon'], priority: ['low', null], due: null } },
  // Stretch: absolute dates OUTSIDE the 10-day calendar window.
  { id: 'qa-date-15', category: 'date', text: 'file the GST return by July 20', expect: { title_has: ['gst'], due: '2026-07-20' } },
  { id: 'qa-date-16', category: 'date', text: 'draft the Q3 roadmap in two weeks', expect: { title_has: ['roadmap'], due: '2026-07-15' } },

  // ── Assignees: ids copied exactly from the roster; strangers ignored ──────
  { id: 'qa-asgn-01', category: 'assignee', text: 'assign the API documentation to Priya', expect: { title_has: ['api'], title_lacks: ['priya'], assignees: ['u_priya'] } },
  { id: 'qa-asgn-02', category: 'assignee', text: 'Rahul should fix the flaky integration tests', expect: { title_has: ['tests'], title_lacks: ['rahul'], assignees: ['u_rahul'] } },
  { id: 'qa-asgn-03', category: 'assignee', text: 'design review for Sam', expect: { title_has: ['design'], assignees: ['u_sam'] } },
  { id: 'qa-asgn-04', category: 'assignee', text: 'remind me to update the changelog', expect: { title_has: ['changelog'], assignees: ['u_angelina'] } },
  { id: 'qa-asgn-05', category: 'assignee', text: 'ask Zara to redo the homepage banner', expect: { title_has: ['banner'], assignees: [] } },
  { id: 'qa-asgn-06', category: 'assignee', text: 'Meera and Rahul to pair on the websocket bug', expect: { title_has: ['socket'], assignees: ['u_meera', 'u_rahul'] } },
  { id: 'qa-asgn-07', category: 'assignee', text: '@priya please check the staging environment', expect: { title_has: ['staging'], assignees: ['u_priya'] } },
  { id: 'qa-asgn-08', category: 'assignee', text: 'hand off the deployment runbook to Karan', expect: { title_has: ['runbook'], assignees: [] } },

  // ── Everything at once ─────────────────────────────────────────────────────
  { id: 'qa-mix-01', category: 'combined', text: 'urgent - Priya to fix the checkout crash by Friday', expect: { title_has: ['checkout'], title_lacks: ['urgent', 'friday', 'priya'], priority: 'urgent', due: '2026-07-03', assignees: ['u_priya'] } },
  { id: 'qa-mix-02', category: 'combined', text: 'low priority: Sam to archive the old boards next Monday', expect: { title_has: ['archive'], priority: 'low', due: '2026-07-06', assignees: ['u_sam'] } },
  { id: 'qa-mix-03', category: 'combined', text: "me and Meera to draft the pitch deck by tomorrow, it's critical", expect: { title_has: ['deck'], priority: 'urgent', due: '2026-07-02', assignees: ['u_angelina', 'u_meera'] } },
  { id: 'qa-mix-04', category: 'combined', text: 'high prio: migrate CI to GitHub Actions on Thursday', expect: { title_has: ['github'], priority: 'high', due: '2026-07-02' } },
  { id: 'qa-mix-05', category: 'combined', text: 'fix the signup email typo today asap', expect: { title_has: ['signup'], priority: 'urgent', due: '2026-07-01' } },
  { id: 'qa-mix-06', category: 'combined', text: 'Rahul to review the security headers by the 9th, medium priority', expect: { title_has: ['security'], title_lacks: ['rahul'], priority: 'medium', due: '2026-07-09', assignees: ['u_rahul'] } },

  // ── Status: only when explicitly stated ────────────────────────────────────
  { id: 'qa-status-01', category: 'status', text: 'mark the logo redesign as done', expect: { title_has: ['logo'], status: 'done' } },
  { id: 'qa-status-02', category: 'status', text: 'the auth PR is already in review', expect: { title_has: ['auth'], status: 'in_review' } },
  // "started working on X" fairly implies both in-progress and "I am the one working on it".
  { id: 'qa-status-03', category: 'status', text: 'started working on the analytics dashboard', expect: { title_has: ['analytics'], status: ['in_progress', null], assignees_oneOf: [[], ['u_angelina']] } },

  // ── Traps: content words that look like metadata ───────────────────────────
  // "high-fidelity" and "low-bandwidth" are content, not priorities.
  { id: 'qa-trap-01', category: 'trap', text: 'create high-fidelity mockups for the low-bandwidth mode', expect: { title_has: ['mockups'], priority: null } },
  // "Friday's Diner" is a client name, not a due date.
  { id: 'qa-trap-02', category: 'trap', text: "create a landing page for our new client Friday's Diner", expect: { title_has: ['landing'], due: null } },
  // Panic prose: urgency implied, but no date and no assignee anywhere.
  { id: 'qa-trap-03', category: 'trap', text: 'everything is on fire, customers cannot log in!!!', expect: { title_has: ['log'], priority: 'urgent', due: null } },
];
