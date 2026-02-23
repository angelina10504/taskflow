import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import * as workspaceService from '../services/workspaceService';
import * as taskService from '../services/taskService';
import * as projectService from '../services/projectService';
import useColors from '../hooks/useColors';

const PRIORITY = {
  urgent: { color: '#ef4444', bg: '#fef2f2', darkBg: '#3b1212', label: 'Urgent' },
  high:   { color: '#f97316', bg: '#fff7ed', darkBg: '#3b1f0a', label: 'High' },
  medium: { color: '#eab308', bg: '#fefce8', darkBg: '#332d00', label: 'Medium' },
  low:    { color: '#6366f1', bg: '#eef2ff', darkBg: '#1e1d3b', label: 'Low' },
};

const STATUS = {
  todo:        { bg: '#f3f4f6', darkBg: '#1e2535', color: '#6b7280', label: 'To Do' },
  in_progress: { bg: '#dbeafe', darkBg: '#1e3a5f', color: '#1d4ed8', darkColor: '#93c5fd', label: 'In Progress' },
  in_review:   { bg: '#fef3c7', darkBg: '#3b2d00', color: '#92400e', darkColor: '#fcd34d', label: 'In Review' },
};

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

const formatDueDate = (date) => {
  const d = new Date(date);
  if (isToday(d))    return { label: 'Today',                           overdue: false };
  if (isTomorrow(d)) return { label: 'Tomorrow',                        overdue: false };
  if (isPast(d))     return { label: `Overdue · ${format(d, 'MMM d')}`, overdue: true  };
  return               { label: format(d, 'MMM d'),                     overdue: false };
};

const TaskCard = ({ task, navigate, dark, cardBg, border, textSecondary, textMuted }) => {
  const p   = PRIORITY[task.priority] || PRIORITY.medium;
  const s   = STATUS[task.status]     || STATUS.todo;
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <Box
      bg={cardBg}
      borderRadius="lg"
      boxShadow="sm"
      border="1px solid"
      borderColor={border}
      display="flex"
      alignItems="stretch"
      overflow="hidden"
      cursor="pointer"
      transition="all 0.15s"
      _hover={{ boxShadow: 'md' }}
      onClick={() => navigate(`/projects/${task.project?._id}`)}
    >
      <Box w="4px" flexShrink={0} style={{ background: p.color }} />
      <Box
        flex="1" px={4} py={3}
        display="flex" alignItems="center" justifyContent="space-between" gap={4} minW={0}
      >
        <Box flex="1" minW={0}>
          <Text fontWeight="medium" fontSize="sm" noOfLines={1} mb={1}>
            {task.title}
          </Text>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Text fontSize="xs" color={textMuted}>
              {task.project?.icon} {task.project?.name}
            </Text>
            {task.workspace?.name && (
              <>
                <Text fontSize="xs" color={textMuted}>·</Text>
                <Text fontSize="xs" color={textMuted}>{task.workspace.name}</Text>
              </>
            )}
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexShrink={0}>
          {due && (
            <Box px={2} py="2px" bg={due.overdue ? (dark ? '#3b1212' : '#fef2f2') : (dark ? '#1e2535' : '#f9fafb')} borderRadius="full">
              <Text fontSize="xs" color={due.overdue ? '#ef4444' : textSecondary} whiteSpace="nowrap">
                📅 {due.label}
              </Text>
            </Box>
          )}
          <Box px={2} py="2px" borderRadius="full" bg={dark ? s.darkBg : s.bg}>
            <Text fontSize="xs" color={dark ? (s.darkColor || s.color) : s.color} whiteSpace="nowrap" fontWeight="medium">
              {s.label}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dark, cardBg, panelBg, border, borderLight, textPrimary, textSecondary, textMuted } = useColors();

  const [workspaces,      setWorkspaces]      = useState([]);
  const [myTasks,         setMyTasks]         = useState([]);
  const [myProjects,      setMyProjects]      = useState([]);
  const [wsLoading,       setWsLoading]       = useState(true);
  const [tasksLoading,    setTasksLoading]    = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [priorityFilter,  setPriorityFilter]  = useState('all');

  useEffect(() => {
    workspaceService.getWorkspaces()
      .then(d => setWorkspaces(d.workspaces))
      .catch(() => {})
      .finally(() => setWsLoading(false));

    taskService.getMyTasks()
      .then(d => setMyTasks(d.tasks))
      .catch(() => {})
      .finally(() => setTasksLoading(false));

    projectService.getMyProjects()
      .then(d => setMyProjects(d.projects))
      .catch(() => {})
      .finally(() => setProjectsLoading(false));
  }, []);

  const filteredTasks = priorityFilter === 'all'
    ? myTasks
    : myTasks.filter(t => t.priority === priorityFilter);

  const groupedTasks = PRIORITY_ORDER.reduce((acc, p) => {
    const tasks = myTasks.filter(t => t.priority === p);
    if (tasks.length) acc[p] = tasks;
    return acc;
  }, {});

  return (
    <Box py={8} px={8}>

      {/* Welcome */}
      <Box mb={8}>
        <Heading size="2xl" mb={1} color={textPrimary}>Welcome back, {user?.name}! 👋</Heading>
        <Text fontSize="lg" color={textSecondary}>
          Here's what's happening across your workspaces.
        </Text>
      </Box>

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={5} mb={10}>
        <Box bg={panelBg} p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid #6366f1">
          <Text fontSize="sm" color={textSecondary} mb={1}>Total Workspaces</Text>
          <Heading size="2xl" color={textPrimary}>{wsLoading ? '—' : workspaces.length}</Heading>
        </Box>
        <Box bg={panelBg} p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid #a855f7">
          <Text fontSize="sm" color={textSecondary} mb={1}>My Open Tasks</Text>
          <Heading size="2xl" color={textPrimary}>{tasksLoading ? '—' : myTasks.length}</Heading>
        </Box>
        <Box bg={panelBg} p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid #10b981">
          <Text fontSize="sm" color={textSecondary} mb={1}>Active Projects</Text>
          <Heading size="2xl" color={textPrimary}>{projectsLoading ? '—' : myProjects.length}</Heading>
        </Box>
      </SimpleGrid>

      {/* My Tasks */}
      <Box mb={12}>
        <Box display="flex" alignItems="center" gap={3} mb={4}>
          <Heading size="lg" color={textPrimary}>My Tasks</Heading>
          {!tasksLoading && myTasks.length > 0 && (
            <Box bg={dark ? '#2d2060' : '#ede9fe'} color={dark ? '#c4b5fd' : '#6d28d9'} px={2} py="1px" borderRadius="full" fontSize="sm" fontWeight="semibold">
              {myTasks.length}
            </Box>
          )}
        </Box>

        {/* Priority filter pills */}
        <Box display="flex" gap={2} mb={5} flexWrap="wrap">
          {['all', ...PRIORITY_ORDER].map((p) => {
            const active = priorityFilter === p;
            const activeBg = p === 'all' ? '#6366f1' : PRIORITY[p]?.color;
            return (
              <Box
                key={p}
                as="button"
                onClick={() => setPriorityFilter(p)}
                px={4} py="6px"
                borderRadius="full"
                fontSize="sm"
                fontWeight="medium"
                cursor="pointer"
                transition="all 0.15s"
                style={{ background: active ? activeBg : (dark ? '#1e2535' : 'white') }}
                color={active ? 'white' : textSecondary}
                border="1px solid"
                borderColor={active ? 'transparent' : border}
              >
                {p === 'all' ? 'All' : PRIORITY[p].label}
              </Box>
            );
          })}
        </Box>

        {tasksLoading ? (
          <Center py={10}><Spinner color="purple.500" /></Center>
        ) : myTasks.length === 0 ? (
          <Box bg={panelBg} borderRadius="xl" p={10} textAlign="center" boxShadow="sm">
            <Text fontSize="3xl" mb={2}>🎉</Text>
            <Text fontWeight="medium" mb={1} color={textPrimary}>You're all caught up!</Text>
            <Text color={textSecondary} fontSize="sm">No open tasks assigned to you.</Text>
          </Box>
        ) : filteredTasks.length === 0 ? (
          <Box bg={panelBg} borderRadius="lg" p={6} textAlign="center" boxShadow="sm">
            <Text color={textSecondary} fontSize="sm">No {PRIORITY[priorityFilter]?.label} priority tasks.</Text>
          </Box>
        ) : priorityFilter === 'all' ? (
          <Box display="flex" flexDirection="column" gap={7}>
            {Object.entries(groupedTasks).map(([priority, tasks]) => (
              <Box key={priority}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Box w="10px" h="10px" borderRadius="full" style={{ background: PRIORITY[priority].color }} />
                  <Text fontWeight="semibold" fontSize="xs" color={textSecondary} textTransform="uppercase" letterSpacing="wider">
                    {PRIORITY[priority].label}
                  </Text>
                  <Text fontSize="xs" color={textMuted}>({tasks.length})</Text>
                </Box>
                <Box display="flex" flexDirection="column" gap={2}>
                  {tasks.map(task => (
                    <TaskCard
                      key={task._id} task={task} navigate={navigate}
                      dark={dark} cardBg={cardBg} border={border}
                      textSecondary={textSecondary} textMuted={textMuted}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            {filteredTasks.map(task => (
              <TaskCard
                key={task._id} task={task} navigate={navigate}
                dark={dark} cardBg={cardBg} border={border}
                textSecondary={textSecondary} textMuted={textMuted}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Active Projects */}
      <Box mb={12}>
        <Box display="flex" alignItems="center" gap={3} mb={4}>
          <Heading size="lg" color={textPrimary}>Active Projects</Heading>
          {!projectsLoading && myProjects.length > 0 && (
            <Box bg={dark ? '#1e1d3b' : '#eef2ff'} color={dark ? '#a5b4fc' : '#4338ca'} px={2} py="1px" borderRadius="full" fontSize="sm" fontWeight="semibold">
              {myProjects.length}
            </Box>
          )}
        </Box>

        {projectsLoading ? (
          <Center py={8}><Spinner color="purple.500" /></Center>
        ) : myProjects.length === 0 ? (
          <Box bg={panelBg} borderRadius="xl" p={8} textAlign="center" boxShadow="sm">
            <Text fontSize="3xl" mb={2}>📂</Text>
            <Text color={textSecondary} fontSize="sm">No active projects yet.</Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
            {myProjects.map(project => {
              const due = project.deadline ? formatDueDate(project.deadline) : null;
              return (
                <Box
                  key={project._id}
                  bg={cardBg}
                  borderRadius="lg" boxShadow="sm"
                  border="1px solid" borderColor={borderLight}
                  overflow="hidden" cursor="pointer" transition="all 0.2s"
                  _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  <Box h="4px" style={{ background: project.color || '#6366f1' }} />
                  <Box p={4}>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <Text fontSize="lg">{project.icon}</Text>
                      <Text fontWeight="semibold" fontSize="sm" noOfLines={1} color={textPrimary}>{project.name}</Text>
                    </Box>
                    <Text fontSize="xs" color={textMuted} mb={due ? 2 : 0}>
                      {project.workspace?.name}
                    </Text>
                    {due && (
                      <Box display="inline-flex" alignItems="center" gap={1} px={2} py="2px"
                        bg={due.overdue ? (dark ? '#3b1212' : '#fef2f2') : (dark ? '#1e2535' : '#f9fafb')} borderRadius="full"
                      >
                        <Text fontSize="xs" color={due.overdue ? '#ef4444' : textMuted}>
                          📅 {due.label}
                        </Text>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}
          </SimpleGrid>
        )}
      </Box>

      {/* Recent Workspaces */}
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Heading size="lg" color={textPrimary}>Recent Workspaces</Heading>
        <Button size="sm" variant="ghost" colorScheme="purple" onClick={() => navigate('/workspaces')}>
          View all →
        </Button>
      </Box>

      {wsLoading ? (
        <Center py={10}><Spinner size="lg" color="purple.500" /></Center>
      ) : workspaces.length === 0 ? (
        <Box bg={panelBg} borderRadius="lg" boxShadow="sm" p={10} textAlign="center">
          <Text fontSize="4xl" mb={3}>📁</Text>
          <Heading size="md" mb={2} color={textPrimary}>No workspaces yet</Heading>
          <Text color={textSecondary} mb={4}>Create your first workspace to get started</Text>
          <Button colorScheme="blue" onClick={() => navigate('/workspaces')}>Go to Workspaces</Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={5}>
          {workspaces.slice(0, 3).map((workspace) => (
            <Box
              key={workspace._id}
              bg={panelBg} p={5} borderRadius="lg" boxShadow="sm"
              border="1px solid" borderColor={borderLight}
              cursor="pointer" transition="all 0.2s"
              _hover={{ boxShadow: 'md', borderColor: 'purple.400' }}
              onClick={() => navigate(`/workspaces/${workspace._id}`)}
            >
              <Heading size="md" mb={1} noOfLines={1} color={textPrimary}>{workspace.name}</Heading>
              {workspace.description && (
                <Text fontSize="sm" color={textSecondary} noOfLines={2} mb={3}>
                  {workspace.description}
                </Text>
              )}
              <Text fontSize="xs" color={textMuted}>
                👥 {workspace.members?.length}{' '}
                {workspace.members?.length === 1 ? 'member' : 'members'}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default Dashboard;
