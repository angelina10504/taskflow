import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import KanbanBoard from '../components/task/KanbanBoard';
import * as taskService from '../services/taskService';
import {
  Box,
  Heading,
  Text,
  Button,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { toaster } from '../components/ui/toaster';
import { useAuth } from '../context/AuthContext';
import * as projectService from '../services/projectService';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

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
  if (project) {
    fetchTasks();
  }
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

  const UserAvatar = ({ name }) => {
    const initials = name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

    return (
      <Box
        w="32px"
        h="32px"
        borderRadius="full"
        bg="blue.500"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontWeight="bold"
        fontSize="xs"
      >
        {initials}
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="white" boxShadow="sm" py={4} px={6}>
        <Box maxW="1200px" mx="auto" display="flex" justifyContent="space-between" alignItems="center">
          <Heading
            size="xl"
            style={{
              background: 'linear-gradient(to right, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            cursor="pointer"
            onClick={() => navigate('/workspaces')}
          >
            🚀 TaskFlow
          </Heading>
          <Box display="flex" gap={4} alignItems="center">
            <Box display="flex" gap={2} alignItems="center">
              <UserAvatar name={user?.name} />
              <Text fontWeight="medium">{user?.name}</Text>
            </Box>
            <Button
              colorScheme="red"
              variant="outline"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box maxW="1200px" mx="auto" py={8} px={6}>
        {/* Breadcrumb */}
        <Box mb={6} display="flex" gap={2} alignItems="center" fontSize="sm" color="gray.600">
          <Text cursor="pointer" onClick={() => navigate('/workspaces')} _hover={{ color: 'blue.500' }}>
            Workspaces
          </Text>
          <Text>›</Text>
          <Text
            cursor="pointer"
            onClick={() => navigate(`/workspaces/${project.workspace._id || project.workspace}`)}
            _hover={{ color: 'blue.500' }}
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
              <Text
                px={3}
                py={1}
                bg="orange.100"
                color="orange.700"
                borderRadius="md"
                fontSize="sm"
                fontWeight="medium"
              >
                📦 Archived
              </Text>
            )}
          </Box>

          {project.description && (
            <Text color="gray.600" fontSize="lg" mb={4}>
              {project.description}
            </Text>
          )}

          <Box display="flex" gap={6} fontSize="sm" color="gray.600">
            {project.deadline && (
              <Text>
                📅 Due: {new Date(project.deadline).toLocaleDateString()}
              </Text>
            )}
            <Text>
              Created by {project.createdBy?.name || 'Unknown'}
            </Text>
            <Text>
              {new Date(project.createdAt).toLocaleDateString()}
            </Text>
          </Box>
        </Box>

        {/* Tasks Section */}
<Box bg="white" p={6} borderRadius="lg" boxShadow="md">
  <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
    <Heading size="lg">Tasks</Heading>
  </Box>

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
    />
  )}
</Box>
      </Box>
    </Box>
  );
};

export default ProjectDetail;