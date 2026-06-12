import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import KanbanBoard from '../components/task/KanbanBoard';
import VelocityInsights from '../components/ai/VelocityInsights';
import CommandBoard from '../components/ai/CommandBoard';
import RiskBanner from '../components/ai/RiskBanner';
import QuickAddBar from '../components/ai/QuickAddBar';
import MeetingNotesModal from '../components/ai/MeetingNotesModal';
import EditProjectModal from '../components/project/EditProjectModal';
import * as taskService from '../services/taskService';
import { Box, Button, Heading, Text, Spinner, Center } from '@chakra-ui/react';
import { toaster } from '../components/ui/toaster';
import * as projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import socket from '../services/socketService';
import useColors from '../hooks/useColors';
import { LuZap, LuSparkles, LuPencil, LuFileText } from 'react-icons/lu';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { panelBg, border, hoverBg, textPrimary, textSecondary, textMuted } = useColors();

  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

  const handleProjectSave = async (data) => {
    try {
      const res = await projectService.updateProject(id, data);
      // Keep the populated workspace from the existing state — the update
      // response returns it as a plain id, which would break the breadcrumb.
      setProject((prev) => ({ ...res.project, workspace: prev.workspace }));
      toaster.create({ title: 'Project updated', type: 'success', duration: 3000 });
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to update project',
        type: 'error',
        duration: 5000,
      });
      throw error;
    }
  };

  const handleCommandTasks = (updatedTasks) => {
    setTasks(updatedTasks);
    setBoardKey((k) => k + 1); // remount the board so it reflects bulk changes
  };

  const handleQuickAddTask = (task) => {
    setTasks((prev) => [...prev, task]);
    setBoardKey((k) => k + 1);
  };

  const handleNotesTasksCreated = (newTasks) => {
    setTasks((prev) => [...prev, ...newTasks]);
    setBoardKey((k) => k + 1);
  };

  useEffect(() => { fetchProject(); }, [id]);

  useEffect(() => {
    if (!user) return;
    socket.emit('join-project', {
      projectId: id,
      user: { id: user.id, name: user.name, avatar: user.avatar || null },
    });
    socket.on('online-users', setOnlineUsers);
    return () => {
      socket.emit('leave-project', { projectId: id });
      socket.off('online-users', setOnlineUsers);
    };
  }, [id, user]);

  const fetchProject = async () => {
    setIsLoading(true);
    try {
      const data = await projectService.getProject(id);
      setProject(data.project);
    } catch (error) {
      toaster.create({ title: 'Error', description: error.message || 'Failed to load project', type: 'error', duration: 5000 });
      navigate('/workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (project) fetchTasks(); }, [project]);

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const data = await taskService.getTasks(id);
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  if (isLoading) return <Center h="100vh"><Spinner size="xl" color="blue.500" /></Center>;
  if (!project) return null;

  return (
    <Box h="100vh" display="flex" flexDirection="column" overflow="hidden" px={6} pt={5} pb={5}>
      {/* Breadcrumb */}
      <Box mb={3} display="flex" gap={2} alignItems="center" fontSize="sm" color={textMuted} flexShrink={0}>
        <Text cursor="pointer" _hover={{ color: 'purple.400' }} onClick={() => navigate('/workspaces')}>
          Workspaces
        </Text>
        <Text>›</Text>
        <Text cursor="pointer" _hover={{ color: 'purple.400' }}
          onClick={() => navigate(`/workspaces/${project.workspace._id || project.workspace}`)}
        >
          {project.workspace.name || 'Workspace'}
        </Text>
        <Text>›</Text>
        <Text fontWeight="medium" color={textPrimary}>{project.name}</Text>
      </Box>

      {/* Project Header */}
      <Box
        bg={panelBg} px={5} py={4} borderRadius="lg" mb={4} flexShrink={0}
        border="1px solid" borderColor={border}
        borderLeft="4px solid" borderLeftColor={project.color || 'purple.500'}
      >
        <Box display="flex" alignItems="center" gap={3} mb={1}>
          <Text fontSize="2xl">{project.icon || '📊'}</Text>
          <Heading size="lg" color={textPrimary}>{project.name}</Heading>
          {project.status === 'archived' && (
            <Box px={3} py={1} bg="orange.100" color="orange.700" borderRadius="md" fontSize="sm" fontWeight="medium">
              📦 Archived
            </Box>
          )}
          <Box ml="auto" display="flex" gap={2}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditOpen(true)}
              color={textSecondary}
              _hover={{ bg: hoverBg, color: textPrimary }}
              _active={{ transform: 'scale(0.98)' }}
              aria-label="Edit project"
            >
              <LuPencil size={14} />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNotesOpen(true)}
              color={textSecondary}
              _hover={{ bg: hoverBg, color: textPrimary }}
              _active={{ transform: 'scale(0.98)' }}
              aria-label="Extract tasks from meeting notes"
            >
              <LuFileText size={14} />
              Notes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCommandOpen(true)}
              color={textSecondary}
              _hover={{ bg: hoverBg, color: textPrimary }}
              _active={{ transform: 'scale(0.98)' }}
            >
              <LuZap size={15} />
              Command
            </Button>
            <Button
              size="sm"
              onClick={() => setInsightsOpen(true)}
              style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
              color="white"
              _hover={{ opacity: 0.9 }}
              _active={{ transform: 'scale(0.98)' }}
            >
              <LuSparkles size={15} />
              AI Insights
            </Button>
          </Box>
        </Box>
        {project.description && (
          <Text color={textSecondary} fontSize="sm" mb={2}>{project.description}</Text>
        )}
        <Box display="flex" gap={4} fontSize="xs" color={textMuted}>
          {project.deadline && <Text>📅 Due: {new Date(project.deadline).toLocaleDateString()}</Text>}
          <Text>Created by {project.createdBy?.name || 'Unknown'}</Text>
          <Text>{new Date(project.createdAt).toLocaleDateString()}</Text>
        </Box>
      </Box>

      {/* Risk Radar health banner */}
      <RiskBanner
        projectId={id}
        socket={socket}
        onOpenDetails={() => setInsightsOpen(true)}
      />

      {/* Tasks / Kanban — fills remaining height */}
      <Box
        flex={1}
        overflow="hidden"
        display="flex"
        flexDirection="column"
        bg={panelBg}
        px={5}
        pt={4}
        pb={4}
        borderRadius="lg"
        border="1px solid"
        borderColor={border}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={4} mb={4} flexShrink={0}>
          <Heading size="md" color={textPrimary} flexShrink={0}>Tasks</Heading>
          <QuickAddBar projectId={id} onTaskCreated={handleQuickAddTask} />
        </Box>
        {tasksLoading ? (
          <Center flex={1}><Spinner size="lg" color="purple.400" /></Center>
        ) : (
          <Box flex={1} overflow="hidden">
            <KanbanBoard
              key={boardKey}
              projectId={id}
              workspaceId={project.workspace._id || project.workspace}
              initialTasks={tasks}
              onTasksUpdate={setTasks}
              workspaceMemberCount={project.workspace?.members?.length || 1}
              socket={socket}
              onlineUsers={onlineUsers}
              currentUser={user}
            />
          </Box>
        )}
      </Box>

      <VelocityInsights
        isOpen={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        projectId={id}
      />

      <CommandBoard
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        projectId={id}
        onTasksChanged={handleCommandTasks}
      />

      <MeetingNotesModal
        isOpen={notesOpen}
        onClose={() => setNotesOpen(false)}
        projectId={id}
        onTasksCreated={handleNotesTasksCreated}
      />

      <EditProjectModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleProjectSave}
        project={project}
      />
    </Box>
  );
};

export default ProjectDetail;
