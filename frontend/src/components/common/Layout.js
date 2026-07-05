import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { isPast, isToday } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { FiSun, FiMoon } from 'react-icons/fi';
import { LuKanban, LuHouse, LuFolders, LuLogOut, LuSearch, LuSunrise } from 'react-icons/lu';
import * as taskService from '../../services/taskService';
import GlobalSearchPalette from '../ai/GlobalSearchPalette';

const DAY = 86400000;
const isOverdueTask = (t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate));
const isDueThisWeek = (t) =>
  t.dueDate && !isOverdueTask(t) && new Date(t.dueDate).getTime() - Date.now() <= 7 * DAY;

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const toggleColorMode = () => setTheme(dark ? 'light' : 'dark');

  const [searchOpen, setSearchOpen] = useState(false);
  const [counts, setCounts] = useState({ overdue: 0, week: 0, review: 0 });
  const lastCountFetch = useRef(0);

  // Smart-view badges: refresh my-task counts on navigation, at most every 30s.
  useEffect(() => {
    if (Date.now() - lastCountFetch.current < 30000) return;
    lastCountFetch.current = Date.now();
    taskService
      .getMyTasks()
      .then(({ tasks }) =>
        setCounts({
          overdue: tasks.filter(isOverdueTask).length,
          week: tasks.filter(isDueThisWeek).length,
          review: tasks.filter((t) => t.status === 'in_review').length,
        })
      )
      .catch(() => {});
  }, [location.pathname]);

  // Route-aware tab title — small thing, but "Today · TaskFlow" beats a
  // static tab in a wall of browser tabs.
  useEffect(() => {
    const NAMES = { '/today': 'Today', '/dashboard': 'Dashboard', '/workspaces': 'Workspaces', '/profile': 'Profile' };
    const label =
      NAMES[location.pathname] ||
      (location.pathname.startsWith('/projects/') ? 'Board' : location.pathname.startsWith('/workspaces/') ? 'Workspace' : null);
    document.title = label ? `${label} · TaskFlow` : 'TaskFlow';
  }, [location.pathname]);

  // ⌘/Ctrl+Shift+K opens global semantic search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    { label: 'Today', path: '/today', icon: LuSunrise },
    { label: 'Dashboard', path: '/dashboard', icon: LuHouse },
    { label: 'Workspaces', path: '/workspaces', icon: LuFolders },
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
          <Box
            display="flex"
            alignItems="center"
            gap={2}
            cursor="pointer"
            onClick={() => navigate('/workspaces')}
          >
            <Box
              w="28px"
              h="28px"
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              flexShrink={0}
              style={{ background: 'linear-gradient(135deg, #7a1f3d, #a83a58)' }}
            >
              <LuKanban size={16} />
            </Box>
            <Text fontSize="lg" fontWeight="600" letterSpacing="-0.02em" color={textPrimary}>
              TaskFlow
            </Text>
          </Box>

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
              bg={isActive(item.path) ? (dark ? '#3a1526' : 'brand.50') : 'transparent'}
              color={isActive(item.path) ? 'brand.500' : textSecondary}
              fontWeight={isActive(item.path) ? 'semibold' : 'normal'}
              transition="all 0.15s"
              _hover={{
                bg: isActive(item.path)
                  ? dark ? '#3a1526' : 'brand.50'
                  : hoverBg,
                color: isActive(item.path) ? 'brand.500' : textPrimary,
              }}
              onClick={() => navigate(item.path)}
            >
              <item.icon size={16} />
              <Text fontSize="sm">{item.label}</Text>
            </Box>
          ))}

          {/* Global semantic search */}
          <Box
            display="flex"
            alignItems="center"
            gap={3}
            px={3}
            py={2}
            borderRadius="md"
            cursor="pointer"
            color={textSecondary}
            transition="all 0.15s"
            _hover={{ bg: hoverBg, color: textPrimary }}
            onClick={() => setSearchOpen(true)}
          >
            <LuSearch size={16} />
            <Text fontSize="sm" flex="1">Search</Text>
            <Text
              fontSize="10px"
              fontWeight="600"
              px={1.5}
              py="1px"
              borderRadius="md"
              border="1px solid"
              borderColor={dark ? '#2a3244' : 'gray.200'}
              color={dark ? 'gray.500' : 'gray.400'}
            >
              {typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac') ? '⌘⇧K' : 'Ctrl⇧K'}
            </Text>
          </Box>

          {/* Smart views — live slices of "my tasks" */}
          {(counts.overdue > 0 || counts.week > 0 || counts.review > 0) && (
            <>
              <Text
                fontSize="10px"
                fontWeight="700"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color={dark ? 'gray.600' : 'gray.400'}
                px={3}
                pt={4}
                pb={1}
              >
                Smart views
              </Text>
              {[
                { key: 'overdue', label: 'Overdue', dot: '#ef4444', count: counts.overdue, to: '/dashboard?filter=overdue' },
                { key: 'week', label: 'Due this week', dot: '#f97316', count: counts.week, to: '/dashboard?filter=week' },
                { key: 'review', label: 'In review', dot: dark ? '#a78bfa' : '#8b5cf6', count: counts.review, to: '/dashboard?filter=status:in_review' },
              ]
                .filter((v) => v.count > 0)
                .map((v) => {
                  const active =
                    location.pathname === '/dashboard' && location.search === `?${v.to.split('?')[1]}`;
                  return (
                    <Box
                      key={v.key}
                      display="flex"
                      alignItems="center"
                      gap={3}
                      px={3}
                      py={1.5}
                      borderRadius="md"
                      cursor="pointer"
                      bg={active ? (dark ? '#3a1526' : 'brand.50') : 'transparent'}
                      color={active ? 'brand.500' : textSecondary}
                      fontWeight={active ? 'semibold' : 'normal'}
                      transition="all 0.15s"
                      _hover={{ bg: active ? (dark ? '#3a1526' : 'brand.50') : hoverBg, color: active ? 'brand.500' : textPrimary }}
                      onClick={() => navigate(v.to)}
                    >
                      <Box w="8px" h="8px" borderRadius="full" flexShrink={0} style={{ background: v.dot }} />
                      <Text fontSize="sm" flex="1">{v.label}</Text>
                      <Text
                        fontSize="xs"
                        fontWeight="700"
                        px={1.5}
                        borderRadius="full"
                        color={v.key === 'overdue' ? '#ef4444' : textSecondary}
                      >
                        {v.count}
                      </Text>
                    </Box>
                  );
                })}
            </>
          )}
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
                  : { background: 'linear-gradient(to right, #7a1f3d, #a83a58)' }
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
            <LuLogOut size={15} />
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

      <GlobalSearchPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
};

export default Layout;
