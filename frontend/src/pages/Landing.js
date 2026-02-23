import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Heading, Text, SimpleGrid } from '@chakra-ui/react';
import { useTheme } from 'next-themes';
import { FiSun, FiMoon } from 'react-icons/fi';
import useColors from '../hooks/useColors';

const features = [
  {
    icon: '🗂️',
    title: 'Workspaces',
    description: 'Organise work into dedicated spaces for each team or project.',
  },
  {
    icon: '✅',
    title: 'Task Tracking',
    description: 'Create, assign, and track tasks with priorities and due dates.',
  },
  {
    icon: '👥',
    title: 'Team Collaboration',
    description: 'Invite members, set roles, and work together in real time.',
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const toggleColorMode = () => setTheme(dark ? 'light' : 'dark');
  const { pageBg, cardBg, border, textPrimary, textSecondary } = useColors();

  return (
    <Box minH="100vh" bg={pageBg} transition="background 0.2s">
      {/* Navbar */}
      <Box
        px={8}
        py={4}
        bg={cardBg}
        borderBottom="1px solid"
        borderColor={border}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        transition="background 0.2s"
      >
        <Heading
          size="lg"
          style={{
            background: 'linear-gradient(to right, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          🚀 TaskFlow
        </Heading>

        <Box display="flex" alignItems="center" gap={3}>
          {/* Theme toggle */}
          <Box
            as="button"
            onClick={toggleColorMode}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="32px"
            h="32px"
            borderRadius="md"
            bg={dark ? '#2a3244' : 'gray.100'}
            color={dark ? 'yellow.300' : 'gray.600'}
            border="none"
            cursor="pointer"
            transition="all 0.15s"
            _hover={{ bg: dark ? '#33405a' : 'gray.200' }}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <FiSun size={15} /> : <FiMoon size={15} />}
          </Box>

          <Button
            variant="ghost"
            color={textPrimary}
            _hover={{ bg: dark ? '#252c3d' : 'gray.100' }}
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
          <Button
            onClick={() => navigate('/register')}
            style={{
              background: 'linear-gradient(to right, #6366f1, #a855f7)',
              color: 'white',
            }}
            _hover={{ opacity: 0.9 }}
          >
            Get Started
          </Button>
        </Box>
      </Box>

      {/* Hero */}
      <Box
        textAlign="center"
        py={{ base: 20, md: 32 }}
        px={4}
        maxW="3xl"
        mx="auto"
      >
        <Text
          fontSize="sm"
          fontWeight="semibold"
          letterSpacing="widest"
          textTransform="uppercase"
          color="purple.400"
          mb={4}
        >
          Project Management, Simplified
        </Text>
        <Heading
          size={{ base: '3xl', md: '5xl' }}
          mb={6}
          lineHeight="1.15"
          style={{
            background: 'linear-gradient(to right, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Your team's work,
          <br />
          all in one place.
        </Heading>
        <Text fontSize="lg" color={textSecondary} mb={10} maxW="xl" mx="auto">
          TaskFlow helps teams organise projects, track progress, and collaborate
          seamlessly — from kickoff to completion.
        </Text>
        <Box display="flex" gap={4} justifyContent="center" flexWrap="wrap">
          <Button
            size="lg"
            px={8}
            onClick={() => navigate('/register')}
            style={{
              background: 'linear-gradient(to right, #6366f1, #a855f7)',
              color: 'white',
            }}
            _hover={{ opacity: 0.9 }}
          >
            Get Started for Free
          </Button>
          <Button
            size="lg"
            px={8}
            variant="outline"
            borderColor={dark ? '#6366f1' : 'purple.500'}
            color={dark ? 'purple.300' : 'purple.600'}
            _hover={{ bg: dark ? '#1e1a3d' : 'purple.50' }}
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        </Box>
      </Box>

      {/* Features */}
      <Box maxW="5xl" mx="auto" px={6} pb={24}>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
          {features.map((f) => (
            <Box
              key={f.title}
              bg={cardBg}
              p={8}
              borderRadius="xl"
              border="1px solid"
              borderColor={border}
              textAlign="center"
              transition="background 0.2s"
            >
              <Text fontSize="4xl" mb={4}>{f.icon}</Text>
              <Heading size="md" mb={2} color={textPrimary}>{f.title}</Heading>
              <Text color={textSecondary} fontSize="sm">{f.description}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      {/* Footer */}
      <Box borderTop="1px solid" borderColor={border} py={6} textAlign="center">
        <Text color={textSecondary} fontSize="sm">
          © {new Date().getFullYear()} TaskFlow. Built for teams that move fast.
        </Text>
      </Box>
    </Box>
  );
};

export default Landing;
