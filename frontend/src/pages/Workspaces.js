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
import { toaster } from '../components/ui/toaster';
import { useAuth } from '../context/AuthContext';
import * as workspaceService from '../services/workspaceService';
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal';
import WorkspaceCard from '../components/workspace/WorkspaceCard';

const Workspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const data = await workspaceService.getWorkspaces();
      setWorkspaces(data.workspaces);
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to load workspaces',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkspace = async (workspaceData) => {
    try {
      const data = await workspaceService.createWorkspace(workspaceData);
      setWorkspaces([data.workspace, ...workspaces]);
      setIsCreateModalOpen(false);
      toaster.create({
        title: 'Success',
        description: 'Workspace created successfully',
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to create workspace',
        type: 'error',
        duration: 5000,
      });
    }
  };

  const handleDeleteWorkspace = async (id) => {
    if (!window.confirm('Are you sure you want to delete this workspace?')) {
      return;
    }

    try {
      await workspaceService.deleteWorkspace(id);
      setWorkspaces(workspaces.filter((w) => w._id !== id));
      toaster.create({
        title: 'Success',
        description: 'Workspace deleted successfully',
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to delete workspace',
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
          >
            🚀 TaskFlow
          </Heading>
          <Box display="flex" gap={4} alignItems="center">
            <Box display="flex" gap={2} alignItems="center">
              <UserAvatar name={user?.name} />
              <Text fontWeight="medium">{user?.name}</Text>
            </Box>
            <Button colorScheme="red" variant="outline" onClick={() => { logout(); navigate('/login'); }}>
              Logout
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box maxW="1200px" mx="auto" py={8} px={6}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={8}>
          <Box>
            <Heading size="2xl" mb={2}>
              My Workspaces
            </Heading>
            <Text color="gray.600">Manage your workspaces and collaborate with teams</Text>
          </Box>
          <Button colorScheme="blue" size="lg" onClick={() => setIsCreateModalOpen(true)}>
            + New Workspace
          </Button>
        </Box>

        {isLoading ? (
          <Center py={20}>
            <Spinner size="xl" color="blue.500" />
          </Center>
        ) : workspaces.length === 0 ? (
          <Box textAlign="center" py={20}>
            <Text fontSize="6xl" mb={4}>
              📁
            </Text>
            <Heading size="lg" mb={2}>
              No workspaces yet
            </Heading>
            <Text color="gray.600" mb={6}>
              Create your first workspace to get started
            </Text>
            <Button colorScheme="blue" onClick={() => setIsCreateModalOpen(true)}>
              Create Workspace
            </Button>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {workspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace._id}
                workspace={workspace}
                currentUserId={user?.id}
                onDelete={handleDeleteWorkspace}
                onClick={() => navigate(`/workspaces/${workspace._id}`)}
              />
            ))}
          </SimpleGrid>
        )}
      </Box>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />
    </Box>
  );
};

export default Workspaces;