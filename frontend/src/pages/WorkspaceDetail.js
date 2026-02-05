import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectCard from '../components/project/ProjectCard';
import CreateProjectModal from '../components/project/CreateProjectModal';
import * as projectService from '../services/projectService';
import {
  Box,
  Heading,
  Text,
  Button,
  Spinner,
  Center,
  SimpleGrid,
} from '@chakra-ui/react';
import { toaster } from '../components/ui/toaster';
import { useAuth } from '../context/AuthContext';
import * as workspaceService from '../services/workspaceService';

const WorkspaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  useEffect(() => {
    fetchWorkspace();
  }, [id]);

  const fetchWorkspace = async () => {
    setIsLoading(true);
    try {
      const data = await workspaceService.getWorkspace(id);
      setWorkspace(data.workspace);
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to load workspace',
        type: 'error',
        duration: 5000,
      });
      navigate('/workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  if (workspace) {
    fetchProjects();
  }
}, [workspace]);

const fetchProjects = async () => {
  setProjectsLoading(true);
  try {
    const data = await projectService.getProjects(id);
    setProjects(data.projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
  } finally {
    setProjectsLoading(false);
  }
};

  const handleLeaveWorkspace = async () => {
    if (!window.confirm('Are you sure you want to leave this workspace?')) {
      return;
    }

    try {
      await workspaceService.leaveWorkspace(id);
      toaster.create({
        title: 'Success',
        description: 'You have left the workspace',
        type: 'success',
        duration: 3000,
      });
      navigate('/workspaces');
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to leave workspace',
        type: 'error',
        duration: 5000,
      });
    }
  };

  const isOwner = workspace?.owner._id === user?.id;

  const handleCreateProject = async (projectData) => {
  try {
    const data = await projectService.createProject(projectData);
    setProjects([data.project, ...projects]);
    setIsCreateProjectModalOpen(false);
    toaster.create({
      title: 'Success',
      description: 'Project created successfully',
      type: 'success',
      duration: 3000,
    });
  } catch (error) {
    toaster.create({
      title: 'Error',
      description: error.message || 'Failed to create project',
      type: 'error',
      duration: 5000,
    });
  }
};

const handleDeleteProject = async (projectId) => {
  if (!window.confirm('Are you sure you want to delete this project?')) {
    return;
  }

  try {
    await projectService.deleteProject(projectId);
    setProjects(projects.filter((p) => p._id !== projectId));
    toaster.create({
      title: 'Success',
      description: 'Project deleted successfully',
      type: 'success',
      duration: 3000,
    });
  } catch (error) {
    toaster.create({
      title: 'Error',
      description: error.message || 'Failed to delete project',
      type: 'error',
      duration: 5000,
    });
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

  const MemberAvatar = ({ name, size = 'md' }) => {
    const initials = name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

    const sizes = {
      sm: { w: '32px', h: '32px', fontSize: 'xs' },
      md: { w: '48px', h: '48px', fontSize: 'sm' },
      lg: { w: '64px', h: '64px', fontSize: 'md' },
    };

    return (
      <Box
        w={sizes[size].w}
        h={sizes[size].h}
        borderRadius="full"
        bg="purple.500"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontWeight="bold"
        fontSize={sizes[size].fontSize}
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

  if (!workspace) {
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
        <Box mb={6}>
          <Button variant="ghost" onClick={() => navigate('/workspaces')} size="sm">
            ← Back to Workspaces
          </Button>
        </Box>

        {/* Workspace Header */}
        <Box
          bg="white"
          p={6}
          borderRadius="lg"
          boxShadow="md"
          mb={6}
          display="flex"
          justifyContent="space-between"
          alignItems="start"
        >
          <Box flex={1}>
            <Heading size="2xl" mb={2}>
              {workspace.name}
            </Heading>
            {workspace.description && (
              <Text color="gray.600" fontSize="lg">
                {workspace.description}
              </Text>
            )}
            <Box mt={4} display="flex" gap={4} alignItems="center">
              <Text fontSize="sm" color="gray.500">
                👥 {workspace.members?.length} {workspace.members?.length === 1 ? 'member' : 'members'}
              </Text>
              {isOwner && (
                <Text fontSize="sm" fontWeight="medium" color="blue.600">
                  Owner
                </Text>
              )}
            </Box>
          </Box>

          {!isOwner && (
            <Button colorScheme="red" variant="outline" onClick={handleLeaveWorkspace}>
              Leave Workspace
            </Button>
          )}
        </Box>

        {/* Members Section */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="md" mb={6}>
          <Heading size="lg" mb={4}>
            Team Members
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {workspace.members?.map((member) => (
              <Box
                key={member._id}
                p={4}
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                display="flex"
                alignItems="center"
                gap={3}
              >
                <MemberAvatar name={member.user.name} size="md" />
                <Box flex={1}>
                  <Text fontWeight="medium">{member.user.name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {member.user.email}
                  </Text>
                  <Text fontSize="xs" color="gray.500" mt={1} textTransform="capitalize">
                    {member.role}
                  </Text>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* Projects Section */}
<Box bg="white" p={6} borderRadius="lg" boxShadow="md">
  <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
    <Heading size="lg">Projects</Heading>
    <Button colorScheme="blue" onClick={() => setIsCreateProjectModalOpen(true)}>
      + New Project
    </Button>
  </Box>

  {projectsLoading ? (
    <Center py={10}>
      <Spinner size="lg" color="blue.500" />
    </Center>
  ) : projects.length === 0 ? (
    <Box textAlign="center" py={10}>
      <Text fontSize="5xl" mb={3}>
        📊
      </Text>
      <Heading size="md" mb={2}>
        No projects yet
      </Heading>
      <Text color="gray.600" mb={4}>
        Create your first project to get started
      </Text>
      <Button colorScheme="blue" onClick={() => setIsCreateProjectModalOpen(true)}>
        Create Project
      </Button>
    </Box>
  ) : (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
      {projects.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          onClick={() => navigate(`/projects/${project._id}`)}
          onDelete={handleDeleteProject}
          canDelete={isOwner}
        />
      ))}
    </SimpleGrid>
  )}
</Box>

{/* Create Project Modal */}
<CreateProjectModal
  isOpen={isCreateProjectModalOpen}
  onClose={() => setIsCreateProjectModalOpen(false)}
  onCreate={handleCreateProject}
  workspaceId={id}
/>
      </Box>
    </Box>
  );
};

export default WorkspaceDetail;