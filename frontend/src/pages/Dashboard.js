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
import { useAuth } from '../context/AuthContext';
import * as workspaceService from '../services/workspaceService';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const data = await workspaceService.getWorkspaces();
        setWorkspaces(data.workspaces);
      } catch (error) {
        // silently fail on dashboard
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  const recentWorkspaces = workspaces.slice(0, 3);

  return (
    <Box py={8} px={8}>
      {/* Welcome */}
      <Box mb={8}>
        <Heading size="2xl" mb={1}>
          Welcome back, {user?.name}! 👋
        </Heading>
        <Text fontSize="lg" color="gray.500">
          Here's what's happening across your workspaces.
        </Text>
      </Box>

      {/* Stats row */}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={5} mb={8}>
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid #6366f1">
          <Text fontSize="sm" color="gray.500" mb={1}>
            Total Workspaces
          </Text>
          <Heading size="2xl">{isLoading ? '—' : workspaces.length}</Heading>
        </Box>
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid #a855f7">
          <Text fontSize="sm" color="gray.500" mb={1}>
            Total Members
          </Text>
          <Heading size="2xl">
            {isLoading
              ? '—'
              : workspaces.reduce((sum, w) => sum + (w.members?.length || 0), 0)}
          </Heading>
        </Box>
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid #10b981">
          <Text fontSize="sm" color="gray.500" mb={1}>
            Account
          </Text>
          <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
            {user?.email}
          </Text>
        </Box>
      </SimpleGrid>

      {/* Recent Workspaces */}
      <Box mb={6} display="flex" justifyContent="space-between" alignItems="center">
        <Heading size="lg">Recent Workspaces</Heading>
        <Button
          size="sm"
          variant="ghost"
          colorScheme="purple"
          onClick={() => navigate('/workspaces')}
        >
          View all →
        </Button>
      </Box>

      {isLoading ? (
        <Center py={10}>
          <Spinner size="lg" color="purple.500" />
        </Center>
      ) : workspaces.length === 0 ? (
        <Box
          bg="white"
          borderRadius="lg"
          boxShadow="sm"
          p={10}
          textAlign="center"
        >
          <Text fontSize="4xl" mb={3}>
            📁
          </Text>
          <Heading size="md" mb={2}>
            No workspaces yet
          </Heading>
          <Text color="gray.500" mb={4}>
            Create your first workspace to get started
          </Text>
          <Button colorScheme="blue" onClick={() => navigate('/workspaces')}>
            Go to Workspaces
          </Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={5}>
          {recentWorkspaces.map((workspace) => (
            <Box
              key={workspace._id}
              bg="white"
              p={5}
              borderRadius="lg"
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.100"
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ boxShadow: 'md', borderColor: 'purple.200' }}
              onClick={() => navigate(`/workspaces/${workspace._id}`)}
            >
              <Heading size="md" mb={1} noOfLines={1}>
                {workspace.name}
              </Heading>
              {workspace.description && (
                <Text fontSize="sm" color="gray.500" noOfLines={2} mb={3}>
                  {workspace.description}
                </Text>
              )}
              <Text fontSize="xs" color="gray.400">
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
