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
import ConfirmDialog from '../components/common/ConfirmDialog';
import useColors from '../hooks/useColors';

const Workspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { textPrimary, textSecondary } = useColors();

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

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;
    try {
      await workspaceService.deleteWorkspace(workspaceToDelete);
      setWorkspaces(workspaces.filter((w) => w._id !== workspaceToDelete));
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
    } finally {
      setWorkspaceToDelete(null);
    }
  };

  return (
    <Box py={8} px={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={8}>
        <Box>
          <Heading size="2xl" mb={1} color={textPrimary}>
            My Workspaces
          </Heading>
          <Text color={textSecondary}>Manage your workspaces and collaborate with teams</Text>
        </Box>
        <Button
          size="lg"
          style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)', color: 'white' }}
          _hover={{ opacity: 0.9 }}
          onClick={() => setIsCreateModalOpen(true)}
        >
          + New Workspace
        </Button>
      </Box>

      {isLoading ? (
        <Center py={20}>
          <Spinner size="xl" color="purple.400" />
        </Center>
      ) : workspaces.length === 0 ? (
        <Box textAlign="center" py={20}>
          <Text fontSize="6xl" mb={4}>📁</Text>
          <Heading size="lg" mb={2} color={textPrimary}>
            No workspaces yet
          </Heading>
          <Text color={textSecondary} mb={6}>
            Create your first workspace to get started
          </Text>
          <Button
            style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)', color: 'white' }}
            _hover={{ opacity: 0.9 }}
            onClick={() => setIsCreateModalOpen(true)}
          >
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
              onDelete={(id) => setWorkspaceToDelete(id)}
              onClick={() => navigate(`/workspaces/${workspace._id}`)}
            />
          ))}
        </SimpleGrid>
      )}

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />

      <ConfirmDialog
        isOpen={!!workspaceToDelete}
        onClose={() => setWorkspaceToDelete(null)}
        onConfirm={handleDeleteWorkspace}
        title="Delete Workspace"
        message="Are you sure you want to delete this workspace? All projects and tasks inside will be permanently lost."
        confirmLabel="Delete Workspace"
      />
    </Box>
  );
};

export default Workspaces;
