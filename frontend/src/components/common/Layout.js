import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/workspaces') {
      return (
        location.pathname.startsWith('/workspaces') ||
        location.pathname.startsWith('/projects')
      );
    }
    return location.pathname === path;
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
    { label: 'Workspaces', path: '/workspaces', icon: '📁' },
  ];

  return (
    <Box display="flex" minH="100vh">
      {/* Sidebar */}
      <Box
        w="240px"
        minH="100vh"
        bg="white"
        borderRight="1px solid"
        borderColor="gray.200"
        display="flex"
        flexDirection="column"
        position="fixed"
        top={0}
        left={0}
        zIndex={100}
      >
        {/* Logo */}
        <Box px={6} py={5} borderBottom="1px solid" borderColor="gray.100">
          <Text
            fontSize="xl"
            fontWeight="bold"
            cursor="pointer"
            onClick={() => navigate('/workspaces')}
            style={{
              background: 'linear-gradient(to right, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            🚀 TaskFlow
          </Text>
        </Box>

        {/* Nav Links */}
        <VStack gap={1} px={3} py={4} flex="1" align="stretch">
          {navItems.map((item) => (
            <Box
              key={item.path}
              display="flex"
              alignItems="center"
              gap={3}
              px={3}
              py={2}
              borderRadius="md"
              cursor="pointer"
              bg={isActive(item.path) ? 'purple.50' : 'transparent'}
              color={isActive(item.path) ? 'purple.700' : 'gray.600'}
              fontWeight={isActive(item.path) ? 'semibold' : 'normal'}
              transition="all 0.15s"
              _hover={{
                bg: isActive(item.path) ? 'purple.50' : 'gray.50',
                color: isActive(item.path) ? 'purple.700' : 'gray.800',
              }}
              onClick={() => navigate(item.path)}
            >
              <Text fontSize="lg">{item.icon}</Text>
              <Text fontSize="sm">{item.label}</Text>
            </Box>
          ))}
        </VStack>

        {/* User Section */}
        <Box px={3} py={4} borderTop="1px solid" borderColor="gray.100">
          <Box
            display="flex"
            alignItems="center"
            gap={3}
            px={3}
            py={2}
            mb={1}
            borderRadius="md"
            cursor="pointer"
            transition="all 0.15s"
            _hover={{ bg: 'gray.50' }}
            onClick={() => navigate('/profile')}
          >
            <Box
              w="32px"
              h="32px"
              borderRadius="full"
              color="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="bold"
              fontSize="xs"
              flexShrink={0}
              overflow="hidden"
              style={
                user?.avatar && !user.avatar.includes('ui-avatars.com')
                  ? {}
                  : { background: 'linear-gradient(to right, #6366f1, #a855f7)' }
              }
            >
              {user?.avatar && !user.avatar.includes('ui-avatars.com') ? (
                <Box
                  as="img"
                  src={
                    user.avatar.startsWith('/uploads/')
                      ? `${process.env.REACT_APP_API_URL}${user.avatar}`
                      : user.avatar
                  }
                  alt="avatar"
                  w="100%"
                  h="100%"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </Box>
            <Box flex={1} overflow="hidden">
              <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                {user?.name}
              </Text>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {user?.email}
              </Text>
            </Box>
          </Box>
          <Box
            px={3}
            py={2}
            borderRadius="md"
            cursor="pointer"
            color="red.500"
            fontSize="sm"
            display="flex"
            alignItems="center"
            gap={2}
            transition="all 0.15s"
            _hover={{ bg: 'red.50' }}
            onClick={handleLogout}
          >
            <Text>🚪</Text>
            <Text>Logout</Text>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box flex="1" ml="240px" bg="gray.50" minH="100vh">
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
