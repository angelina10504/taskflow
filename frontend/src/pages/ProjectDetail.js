import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import KanbanBoard from '../components/task/KanbanBoard';
import * as taskService from '../services/taskService';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { toaster } from '../components/ui/toaster';
import * as projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import socket from '../services/socketService';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    fetchProject();
  }, [id]);

  // Join/leave socket room for this project
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
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to load project',
        type: 'error',
        duration: 5000,
      });
      navigate('/workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (project) fetchTasks();
  }, [project]);

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

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  if (!project) return null;

  return (
    <Box py={8} px={8}>
      {/* Breadcrumb */}
      <Box mb={6} display="flex" gap={2} alignItems="center" fontSize="sm" color="gray.500">
        <Text
          cursor="pointer"
          _hover={{ color: 'blue.500' }}
          onClick={() => navigate('/workspaces')}
        >
          Workspaces
        </Text>
        <Text>›</Text>
        <Text
          cursor="pointer"
          _hover={{ color: 'blue.500' }}
          onClick={() =>
            navigate(`/workspaces/${project.workspace._id || project.workspace}`)
          }
        >
          {project.workspace.name || 'Workspace'}
        </Text>
        <Text>›</Text>
        <Text fontWeight="medium" color="gray.800">
          {project.name}
        </Text>
      </Box>

      {/* Project Header */}
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        boxShadow="md"
        mb={6}
        borderLeft="4px solid"
        borderLeftColor={project.color || 'blue.500'}
      >
        <Box display="flex" alignItems="center" gap={3} mb={3}>
          <Text fontSize="4xl">{project.icon || '📊'}</Text>
          <Heading size="2xl">{project.name}</Heading>
          {project.status === 'archived' && (
            <Box
              px={3}
              py={1}
              bg="orange.100"
              color="orange.700"
              borderRadius="md"
              fontSize="sm"
              fontWeight="medium"
            >
              📦 Archived
            </Box>
          )}
        </Box>

        {project.description && (
          <Text color="gray.600" fontSize="lg" mb={4}>
            {project.description}
          </Text>
        )}

        <Box display="flex" gap={6} fontSize="sm" color="gray.500">
          {project.deadline && (
            <Text>📅 Due: {new Date(project.deadline).toLocaleDateString()}</Text>
          )}
          <Text>Created by {project.createdBy?.name || 'Unknown'}</Text>
          <Text>{new Date(project.createdAt).toLocaleDateString()}</Text>
        </Box>
      </Box>

      {/* Tasks / Kanban */}
      <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
        <Heading size="lg" mb={6}>
          Tasks
        </Heading>
        {tasksLoading ? (
          <Center py={10}>
            <Spinner size="lg" color="blue.500" />
          </Center>
        ) : (
          <KanbanBoard
            projectId={id}
            workspaceId={project.workspace._id || project.workspace}
            initialTasks={tasks}
            onTasksUpdate={setTasks}
            workspaceMemberCount={project.workspace?.members?.length || 1}
            socket={socket}
            onlineUsers={onlineUsers}
            currentUser={user}
          />
        )}
      </Box>
    </Box>
  );
};

export default ProjectDetail;
