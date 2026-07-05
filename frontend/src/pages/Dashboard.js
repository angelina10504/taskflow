import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Heading, Text, Button, SimpleGrid, Spinner, Center } from '@chakra-ui/react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import * as workspaceService from '../services/workspaceService';
import * as taskService from '../services/taskService';
import * as projectService from '../services/projectService';
import useColors from '../hooks/useColors';

// One-screen dashboard: a clickable stat strip and three small analysis
// panels do the summarizing, so the task list can stay short. Everything
// colored is also a filter — click a donut segment, a priority bar or a
// stat card and the list below follows.

const PRIORITY = {
  urgent: { color: '#ef4444', label: 'Urgent', rank: 0 },
  high:   { color: '#f97316', label: 'High', rank: 1 },
  medium: { color: '#eab308', label: 'Medium', rank: 2 },
  low:    { color: '#64748b', label: 'Low', rank: 3 },
};
const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

const STATUS = {
  todo:        { color: '#9ca3af', darkColor: '#9ca3af', label: 'To Do' },
  in_progress: { color: '#3b82f6', darkColor: '#60a5fa', label: 'In Progress' },
  in_review:   { color: '#8b5cf6', darkColor: '#a78bfa', label: 'In Review' },
};
const STATUS_ORDER = ['todo', 'in_progress', 'in_review'];

const DAY = 86400000;

const formatDueDate = (date) => {
  const d = new Date(date);
  if (isToday(d))    return { label: 'Today', overdue: false };
  if (isTomorrow(d)) return { label: 'Tomorrow', overdue: false };
  if (isPast(d))     return { label: `Overdue · ${format(d, 'MMM d')}`, overdue: true };
  return               { label: format(d, 'MMM d'), overdue: false };
};

const isOverdue = (t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate));
const isDueThisWeek = (t) => {
  if (!t.dueDate || isOverdue(t)) return false;
  const diff = new Date(t.dueDate).getTime() - Date.now();
  return diff <= 7 * DAY;
};

// Filter state lives in the URL (?filter=overdue | week | status:in_review |
// priority:high | project:<id>) so sidebar smart views can deep-link here.
const parseFilter = (raw) => {
  if (!raw) return { kind: 'all' };
  if (raw === 'overdue' || raw === 'week') return { kind: raw };
  const [kind, value] = raw.split(':');
  if (kind === 'status' && STATUS[value]) return { kind, value };
  if (kind === 'priority' && PRIORITY[value]) return { kind, value };
  if (kind === 'project' && value) return { kind, value };
  return { kind: 'all' };
};
const encodeFilter = (f) => {
  if (f.kind === 'all') return null;
  if (f.kind === 'overdue' || f.kind === 'week') return f.kind;
  return `${f.kind}:${f.value}`;
};

// ── SVG donut: open tasks by status, segments are click-to-filter ──────────
const polar = (cx, cy, r, deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};
const arcPath = (cx, cy, r, a0, a1) => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
};

const StatusDonut = ({ counts, total, dark, activeStatus, onPick }) => {
  const { textPrimary, textMuted, border } = useColors();
  const size = 148;
  const c = size / 2;
  const r = 56;

  let angle = 0;
  const segs = STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => {
    const sweep = (counts[s] / total) * 360;
    const seg = { status: s, a0: angle, a1: angle + sweep };
    angle += sweep;
    return seg;
  });

  return (
    <Box display="flex" alignItems="center" gap={4}>
      <Box position="relative" w={`${size}px`} h={`${size}px`} flexShrink={0}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {total === 0 ? (
            <circle cx={c} cy={c} r={r} fill="none" stroke={dark ? '#2a3244' : '#e5e7eb'} strokeWidth="16" />
          ) : segs.length === 1 ? (
            <circle
              cx={c} cy={c} r={r} fill="none"
              stroke={dark ? STATUS[segs[0].status].darkColor : STATUS[segs[0].status].color}
              strokeWidth="16" style={{ cursor: 'pointer' }}
              onClick={() => onPick(segs[0].status)}
            />
          ) : (
            segs.map((seg) => (
              <path
                key={seg.status}
                d={arcPath(c, c, r, seg.a0 + 1.5, seg.a1 - 1.5)}
                fill="none"
                stroke={dark ? STATUS[seg.status].darkColor : STATUS[seg.status].color}
                strokeWidth={activeStatus === seg.status ? 20 : 16}
                strokeLinecap="round"
                opacity={activeStatus && activeStatus !== seg.status ? 0.35 : 1}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s, stroke-width 0.15s' }}
                onClick={() => onPick(seg.status)}
              >
                <title>{`${STATUS[seg.status].label}: ${counts[seg.status]}`}</title>
              </path>
            ))
          )}
        </svg>
        <Box position="absolute" inset={0} display="flex" flexDirection="column" alignItems="center" justifyContent="center" pointerEvents="none">
          <Text fontSize="2xl" fontWeight="bold" color={textPrimary} lineHeight={1}>{total}</Text>
          <Text fontSize="10px" color={textMuted}>open</Text>
        </Box>
      </Box>
      <Box display="flex" flexDirection="column" gap={1.5} minW={0}>
        {STATUS_ORDER.map((s) => (
          <Box
            key={s}
            as="button"
            onClick={() => onPick(s)}
            display="flex" alignItems="center" gap={2}
            bg="transparent" border="none" cursor="pointer" p={0}
            opacity={activeStatus && activeStatus !== s ? 0.45 : 1}
          >
            <Box w="8px" h="8px" borderRadius="2px" style={{ background: dark ? STATUS[s].darkColor : STATUS[s].color }} />
            <Text fontSize="xs" color={textMuted} whiteSpace="nowrap">
              {STATUS[s].label} · <Text as="span" fontWeight="700" color={textPrimary}>{counts[s] || 0}</Text>
            </Text>
          </Box>
        ))}
        <Box h="1px" bg={border} my={0.5} />
        <Text fontSize="10px" color={textMuted}>click to filter</Text>
      </Box>
    </Box>
  );
};

// ── Small building blocks ───────────────────────────────────────────────────
const Panel = ({ title, children, ...rest }) => {
  const { panelBg, border, textMuted } = useColors();
  return (
    <Box bg={panelBg} border="1px solid" borderColor={border} borderRadius="lg" px={4} py={3.5} {...rest}>
      <Text fontSize="10px" fontWeight="700" letterSpacing="0.12em" textTransform="uppercase" color={textMuted} mb={2.5}>
        {title}
      </Text>
      {children}
    </Box>
  );
};

const HBar = ({ label, count, max, color, active, dim, onClick, sub }) => {
  const { textPrimary, textMuted, border } = useColors();
  return (
    <Box
      as="button"
      onClick={onClick}
      display="flex" alignItems="center" gap={2.5} w="100%"
      bg="transparent" border="none" cursor="pointer" p={0}
      opacity={dim ? 0.4 : 1}
      transition="opacity 0.15s"
      title={sub}
    >
      <Text fontSize="xs" color={textMuted} w="64px" textAlign="left" flexShrink={0} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {label}
      </Text>
      <Box flex="1" h={active ? '10px' : '8px'} borderRadius="full" bg={border} overflow="hidden" transition="height 0.15s">
        <Box h="100%" w={`${max ? (count / max) * 100 : 0}%`} borderRadius="full" style={{ background: color }} />
      </Box>
      <Text fontSize="xs" fontWeight="700" color={textPrimary} w="24px" textAlign="right" flexShrink={0}>
        {count}
      </Text>
    </Box>
  );
};

const StatCard = ({ label, value, accent, active, onClick }) => {
  const { panelBg, border, textPrimary, textSecondary } = useColors();
  return (
    <Box
      as="button"
      onClick={onClick}
      bg={panelBg}
      px={4} py={3}
      borderRadius="lg"
      border="1px solid"
      borderColor={active ? 'brand.500' : border}
      boxShadow={active ? '0 0 0 1px var(--chakra-colors-brand-500)' : 'none'}
      borderLeft="3px solid"
      style={{ borderLeftColor: accent }}
      cursor="pointer"
      textAlign="left"
      transition="all 0.15s"
      _hover={{ borderColor: 'brand.500' }}
    >
      <Text fontSize="xl" fontWeight="bold" color={textPrimary} lineHeight={1.1}>{value}</Text>
      <Text fontSize="xs" color={textSecondary} whiteSpace="nowrap">{label}</Text>
    </Box>
  );
};

// Dense single-line task row — replaces the old tall cards.
const TaskRow = ({ task, navigate }) => {
  const { dark, cardBg, border, hoverBg, textPrimary, textSecondary, textMuted } = useColors();
  const p = PRIORITY[task.priority] || PRIORITY.medium;
  const s = STATUS[task.status] || STATUS.todo;
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;
  return (
    <Box
      display="flex" alignItems="center" gap={3}
      px={3} py={2}
      bg={cardBg}
      border="1px solid" borderColor={border}
      borderRadius="md"
      cursor="pointer"
      transition="all 0.12s"
      _hover={{ bg: hoverBg, borderColor: 'brand.500' }}
      onClick={() => navigate(`/projects/${task.project?._id}`)}
    >
      <Box w="8px" h="8px" borderRadius="full" flexShrink={0} style={{ background: p.color }} title={`${p.label} priority`} />
      <Text fontSize="sm" fontWeight="500" color={textPrimary} flex="1" minW="120px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {task.title}
      </Text>
      <Text fontSize="xs" color={textMuted} flexShrink={0} display={{ base: 'none', md: 'block' }} maxW="180px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {task.project?.icon} {task.project?.name}
      </Text>
      {due && (
        <Text fontSize="xs" fontWeight={due.overdue ? '700' : '400'} color={due.overdue ? '#ef4444' : textSecondary} flexShrink={0} whiteSpace="nowrap">
          {due.label}
        </Text>
      )}
      <Text
        fontSize="10px" fontWeight="600" flexShrink={0}
        px={2} py="2px" borderRadius="full"
        color={dark ? s.darkColor : s.color}
        style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
        whiteSpace="nowrap"
      >
        {s.label}
      </Text>
    </Box>
  );
};

const VISIBLE_ROWS = 8;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dark, panelBg, border, textPrimary, textSecondary, textMuted } = useColors();

  const [workspaces, setWorkspaces] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = useMemo(() => parseFilter(searchParams.get('filter')), [searchParams]);
  const setFilter = (f) => {
    const enc = encodeFilter(f);
    setSearchParams(enc ? { filter: enc } : {}, { replace: true });
  };
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      workspaceService.getWorkspaces().then((d) => setWorkspaces(d.workspaces)),
      taskService.getMyTasks().then((d) => setMyTasks(d.tasks)),
      projectService.getMyProjects().then((d) => setMyProjects(d.projects)),
    ]).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const statusCounts = {};
    const priorityCounts = {};
    const projectCounts = new Map();
    let overdue = 0;
    let week = 0;
    for (const t of myTasks) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      if (isOverdue(t)) overdue++;
      else if (isDueThisWeek(t)) week++;
      if (t.project?._id) {
        const cur = projectCounts.get(t.project._id) || { project: t.project, count: 0 };
        cur.count++;
        projectCounts.set(t.project._id, cur);
      }
    }
    const projectLoad = [...projectCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    return { statusCounts, priorityCounts, overdue, week, projectLoad };
  }, [myTasks]);

  // toggle: clicking the active filter again clears it
  const pick = (kind, value) =>
    setFilter((f) => (f.kind === kind && f.value === value ? { kind: 'all' } : { kind, value }));

  const filtered = useMemo(() => {
    let list = myTasks;
    if (filter.kind === 'status') list = list.filter((t) => t.status === filter.value);
    if (filter.kind === 'priority') list = list.filter((t) => t.priority === filter.value);
    if (filter.kind === 'overdue') list = list.filter(isOverdue);
    if (filter.kind === 'week') list = list.filter(isDueThisWeek);
    if (filter.kind === 'project') list = list.filter((t) => t.project?._id === filter.value);
    // urgent stuff first: overdue → priority rank → nearest due date
    return [...list].sort((a, b) => {
      const od = isOverdue(b) - isOverdue(a);
      if (od) return od;
      const pr = (PRIORITY[a.priority]?.rank ?? 9) - (PRIORITY[b.priority]?.rank ?? 9);
      if (pr) return pr;
      return (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity);
    });
  }, [myTasks, filter]);

  const filterLabel = {
    all: null,
    status: STATUS[filter.value]?.label,
    priority: `${PRIORITY[filter.value]?.label} priority`,
    overdue: 'Overdue',
    week: 'Due this week',
    project: stats.projectLoad.find((p) => p.project._id === filter.value)?.project.name,
  }[filter.kind];

  const visibleTasks = showAll ? filtered : filtered.slice(0, VISIBLE_ROWS);
  const maxPriority = Math.max(...PRIORITY_ORDER.map((p) => stats.priorityCounts[p] || 0), 1);
  const maxLoad = stats.projectLoad[0]?.count || 1;

  if (loading) return <Center h="60vh"><Spinner size="xl" color="brand.600" /></Center>;

  return (
    <Box py={6} px={{ base: 4, md: 8 }} maxW="1280px" mx="auto">
      {/* Header — one line */}
      <Box display="flex" alignItems="baseline" gap={3} mb={5} flexWrap="wrap">
        <Heading size="xl" color={textPrimary}>
          Welcome back, {(user?.name || '').split(' ')[0]}! 👋
        </Heading>
        <Text fontSize="sm" color={textMuted} ml="auto">
          {format(new Date(), 'EEEE, MMM d')} · {workspaces.length} workspaces · {myProjects.length} projects
        </Text>
      </Box>

      {myTasks.length === 0 ? (
        <Box bg={panelBg} border="1px solid" borderColor={border} borderRadius="xl" p={10} textAlign="center">
          <Text fontSize="3xl" mb={2}>🎉</Text>
          <Text fontWeight="medium" mb={1} color={textPrimary}>You're all caught up!</Text>
          <Text color={textSecondary} fontSize="sm" mb={4}>No open tasks assigned to you.</Text>
          <Button colorPalette="brand" size="sm" onClick={() => navigate('/workspaces')}>Go to Workspaces</Button>
        </Box>
      ) : (
        <>
          {/* Stat strip — every card is a filter */}
          <SimpleGrid columns={{ base: 2, sm: 3, md: 5 }} gap={2.5} mb={4}>
            <StatCard label="Open tasks" value={myTasks.length} accent="#7a1f3d" active={filter.kind === 'all'} onClick={() => setFilter({ kind: 'all' })} />
            <StatCard label="Overdue" value={stats.overdue} accent="#ef4444" active={filter.kind === 'overdue'} onClick={() => pick('overdue')} />
            <StatCard label="Due this week" value={stats.week} accent="#f97316" active={filter.kind === 'week'} onClick={() => pick('week')} />
            <StatCard label="In progress" value={stats.statusCounts.in_progress || 0} accent={dark ? '#60a5fa' : '#3b82f6'} active={filter.kind === 'status' && filter.value === 'in_progress'} onClick={() => pick('status', 'in_progress')} />
            <StatCard label="In review" value={stats.statusCounts.in_review || 0} accent={dark ? '#a78bfa' : '#8b5cf6'} active={filter.kind === 'status' && filter.value === 'in_review'} onClick={() => pick('status', 'in_review')} />
          </SimpleGrid>

          {/* Analysis strip */}
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={2.5} mb={5}>
            <Panel title="By status">
              <StatusDonut
                counts={stats.statusCounts}
                total={myTasks.length}
                dark={dark}
                activeStatus={filter.kind === 'status' ? filter.value : null}
                onPick={(s) => pick('status', s)}
              />
            </Panel>
            <Panel title="By priority">
              <Box display="flex" flexDirection="column" gap={2.5} pt={1}>
                {PRIORITY_ORDER.map((p) => (
                  <HBar
                    key={p}
                    label={PRIORITY[p].label}
                    count={stats.priorityCounts[p] || 0}
                    max={maxPriority}
                    color={PRIORITY[p].color}
                    active={filter.kind === 'priority' && filter.value === p}
                    dim={filter.kind === 'priority' && filter.value !== p}
                    onClick={() => pick('priority', p)}
                  />
                ))}
              </Box>
            </Panel>
            <Panel title="Where the work is">
              <Box display="flex" flexDirection="column" gap={2.5} pt={1}>
                {stats.projectLoad.map(({ project, count }) => (
                  <HBar
                    key={project._id}
                    label={`${project.icon || ''} ${project.name}`}
                    count={count}
                    max={maxLoad}
                    color={project.color || '#7a1f3d'}
                    active={filter.kind === 'project' && filter.value === project._id}
                    dim={filter.kind === 'project' && filter.value !== project._id}
                    onClick={() => pick('project', project._id)}
                    sub={`${count} open in ${project.name} — click to filter, open from a task row`}
                  />
                ))}
              </Box>
            </Panel>
          </SimpleGrid>

          {/* Task list — dense rows, capped with expander */}
          <Box mb={6}>
            <Box display="flex" alignItems="center" gap={2.5} mb={2.5}>
              <Heading size="md" color={textPrimary}>My Tasks</Heading>
              <Text fontSize="sm" color={textMuted}>
                {filtered.length}{filterLabel ? ` · ${filterLabel}` : ''}
              </Text>
              {filterLabel && (
                <Box
                  as="button"
                  onClick={() => setFilter({ kind: 'all' })}
                  px={2} py="2px"
                  borderRadius="full"
                  border="1px solid" borderColor={border}
                  bg="transparent"
                  fontSize="xs" color={textSecondary}
                  cursor="pointer"
                  _hover={{ borderColor: 'brand.500', color: textPrimary }}
                >
                  Clear ✕
                </Box>
              )}
            </Box>

            {filtered.length === 0 ? (
              <Box bg={panelBg} border="1px solid" borderColor={border} borderRadius="lg" p={6} textAlign="center">
                <Text color={textSecondary} fontSize="sm">Nothing matches this filter.</Text>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={1.5}>
                {visibleTasks.map((task) => (
                  <TaskRow key={task._id} task={task} navigate={navigate} />
                ))}
              </Box>
            )}

            {filtered.length > VISIBLE_ROWS && (
              <Box
                as="button"
                onClick={() => setShowAll((v) => !v)}
                w="100%" mt={1.5} py={2}
                bg="transparent"
                border="1px dashed" borderColor={border}
                borderRadius="md"
                fontSize="xs" fontWeight="600" color={textSecondary}
                cursor="pointer"
                _hover={{ borderColor: 'brand.500', color: textPrimary }}
              >
                {showAll ? '↑ Show less' : `↓ Show all ${filtered.length}`}
              </Box>
            )}
          </Box>

          {/* Workspaces — one compact row */}
          <Box display="flex" alignItems="center" gap={2.5} flexWrap="wrap">
            <Text fontSize="xs" fontWeight="700" letterSpacing="0.1em" textTransform="uppercase" color={textMuted} mr={1}>
              Workspaces
            </Text>
            {workspaces.slice(0, 4).map((ws) => (
              <Box
                key={ws._id}
                as="button"
                onClick={() => navigate(`/workspaces/${ws._id}`)}
                px={3} py={1.5}
                bg={panelBg}
                border="1px solid" borderColor={border}
                borderRadius="full"
                fontSize="xs" color={textSecondary}
                cursor="pointer"
                transition="all 0.15s"
                _hover={{ borderColor: 'brand.500', color: textPrimary }}
              >
                {ws.name} <Text as="span" color={textMuted}>· {ws.members?.length || 1}</Text>
              </Box>
            ))}
            <Button size="xs" variant="ghost" colorPalette="brand" onClick={() => navigate('/workspaces')}>
              View all →
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Dashboard;
