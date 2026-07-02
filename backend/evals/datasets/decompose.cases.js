// Golden dataset for Epic Decomposition ("Plan with AI").
//
// Plans are creative output, so scoring is STRUCTURAL (instruction-following)
// rather than semantic:
//   - 5-10 subtasks, unique non-empty titles of sane length
//   - every item carries a valid priority (the prompt requires one)
//   - estimated_minutes is null or within the prompt's 30-960 range
//   - at least one item is high/urgent (foundational work exists)
//   - at least `min_keyword_hits` of the goal-domain `keywords` appear
//     somewhere across titles+descriptions (the plan is actually on-topic)

module.exports = [
  {
    id: 'dc-01-stripe',
    goal: 'Add Stripe subscription billing to our SaaS (React frontend, Node backend)',
    keywords: ['stripe', 'webhook', 'subscription', 'billing', 'payment', 'plan'],
    min_keyword_hits: 2,
  },
  {
    id: 'dc-02-beta-launch',
    goal: 'Launch a public beta of our mobile app by the end of the month',
    keywords: ['beta', 'test', 'launch', 'feedback', 'store', 'crash', 'onboard'],
    min_keyword_hits: 2,
  },
  {
    id: 'dc-03-atlas-migration',
    goal: 'Migrate our self-hosted MongoDB to Atlas with zero downtime',
    keywords: ['atlas', 'migrat', 'backup', 'index', 'monitor', 'cutover', 'restore'],
    min_keyword_hits: 2,
  },
  {
    id: 'dc-04-notifications',
    goal: 'Build email and .ics calendar notifications for task assignments',
    keywords: ['email', 'smtp', 'ics', 'calendar', 'template', 'notif'],
    min_keyword_hits: 2,
  },
  {
    id: 'dc-05-cicd',
    goal: 'Set up CI/CD with GitHub Actions including tests and preview deploys',
    keywords: ['github', 'action', 'test', 'deploy', 'workflow', 'pipeline', 'lint'],
    min_keyword_hits: 2,
  },
  {
    id: 'dc-06-rbac',
    goal: 'Add role-based access control (owner/admin/member/viewer) across the API',
    keywords: ['role', 'permission', 'middleware', 'viewer', 'admin', 'access'],
    min_keyword_hits: 2,
  },
];
