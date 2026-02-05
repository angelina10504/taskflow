import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Button,
  Avatar,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="white" boxShadow="sm" py={4} px={6}>
        <Box 
          maxW="1200px" 
          mx="auto" 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center"
        >
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
              <Avatar.Root size="sm">
                <Avatar.Fallback>{user?.name?.slice(0, 2).toUpperCase()}</Avatar.Fallback>
              </Avatar.Root>
              <Text fontWeight="medium">{user?.name}</Text>
            </Box>
            <Button colorScheme="red" variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box maxW="1200px" mx="auto" py={8} px={6}>
        <Box mb={8}>
          <Heading size="3xl" mb={2}>
            Welcome back, {user?.name}! 👋
          </Heading>
          <Text fontSize="lg" color="gray.600">
            You're successfully logged in to TaskFlow
          </Text>
        </Box>

        {/* Account Info Card */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="md" mb={6}>
          <Heading size="lg" mb={4}>Your Account</Heading>
          <Box mb={3}>
            <Text fontWeight="medium" mb={1}>Email:</Text>
            <Text color="gray.600">{user?.email}</Text>
          </Box>
          <Box>
            <Text fontWeight="medium" mb={1}>Member since:</Text>
            <Text color="gray.600">Today</Text>
          </Box>
        </Box>

        {/* Coming Soon Card */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
          <Heading size="lg" mb={4}>Coming Soon</Heading>
          <Text color="gray.600" mb={4}>
            We're building amazing features for you:
          </Text>
          <Box pl={4}>
            <Text mb={2}>• Create and manage workspaces</Text>
            <Text mb={2}>• Collaborate with team members</Text>
            <Text mb={2}>• Track tasks and projects</Text>
            <Text mb={2}>• Real-time updates</Text>
            <Text>• Time tracking</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;