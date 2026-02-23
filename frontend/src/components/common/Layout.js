import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '../../context/AuthContext';
import { FiSun, FiMoon } from 'react-icons/fi';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const toggleColorMode = () => setTheme(dark ? 'light' : 'dark');

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

  // Color aliases
  const sidebarBg    = dark ? '#1a1f2e' : 'white';
  const borderColor  = dark ? '#2a3244' : 'gray.200';
  const dividerColor = dark ? '#2a3244' : 'gray.100';
  const textPrimary  = dark ? 'gray.100' : 'gray.800';
  const textSecondary= dark ? 'gray.400' : 'gray.500';
  const hoverBg      = dark ? '#252c3d' : 'gray.50';
  const contentBg    = dark ? '#0f1624' : 'gray.50';

  return (
    <Box display="flex" minH="100vh">
      {/* Sidebar */}
      <Box
        w="240px"
        minH="100vh"
        bg={sidebarBg}
        borderRight="1px solid"
        borderColor={borderColor}
        display="flex"
        flexDirection="column"
        position="fixed"
        top={0}
        left={0}
        zIndex={100}
        transition="background 0.2s"
      >
        {/* Logo + Theme Toggle */}
        <Box
          px={6}
          py={5}
          borderBottom="1px solid"
          borderColor={dividerColor}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
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

          {/* Theme toggle */}
          <Box
            as="button"
            onClick={toggleColorMode}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="28px"
            h="28px"
            borderRadius="md"
            bg={dark ? '#2a3244' : 'gray.100'}
            color={dark ? 'yellow.300' : 'gray.600'}
            border="none"
            cursor="pointer"
            transition="all 0.15s"
            _hover={{ bg: dark ? '#33405a' : 'gray.200' }}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <FiSun size={14} /> : <FiMoon size={14} />}
          </Box>
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
              bg={isActive(item.path) ? (dark ? '#2d2060' : 'purple.50') : 'transparent'}
              color={isActive(item.path) ? 'purple.400' : textSecondary}
              fontWeight={isActive(item.path) ? 'semibold' : 'normal'}
              transition="all 0.15s"
              _hover={{
                bg: isActive(item.path)
                  ? dark ? '#2d2060' : 'purple.50'
                  : hoverBg,
                color: isActive(item.path) ? 'purple.400' : textPrimary,
              }}
              onClick={() => navigate(item.path)}
            >
              <Text fontSize="lg">{item.icon}</Text>
              <Text fontSize="sm">{item.label}</Text>
            </Box>
          ))}
        </VStack>

        {/* User Section */}
        <Box px={3} py={4} borderTop="1px solid" borderColor={dividerColor}>
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
            _hover={{ bg: hoverBg }}
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
              <Text fontSize="sm" fontWeight="medium" color={textPrimary} noOfLines={1}>
                {user?.name}
              </Text>
              <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                {user?.email}
              </Text>
            </Box>
          </Box>

          <Box
            px={3}
            py={2}
            borderRadius="md"
            cursor="pointer"
            color="red.400"
            fontSize="sm"
            display="flex"
            alignItems="center"
            gap={2}
            transition="all 0.15s"
            _hover={{ bg: dark ? '#3d1f1f' : 'red.50' }}
            onClick={handleLogout}
          >
            <Text>🚪</Text>
            <Text>Logout</Text>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        flex="1"
        ml="240px"
        bg={contentBg}
        minH="100vh"
        transition="background 0.2s"
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
