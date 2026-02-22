import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Heading, Text, SimpleGrid } from '@chakra-ui/react';

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

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Navbar */}
      <Box
        px={8}
        py={4}
        bg="white"
        boxShadow="sm"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <Heading
          size="lg"
          style={{
            background: 'linear-gradient(to right, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          TaskFlow
        </Heading>
        <Box display="flex" gap={3}>
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Sign In
          </Button>
          <Button
            onClick={() => navigate('/register')}
            style={{
              background: 'linear-gradient(to right, #6366f1, #a855f7)',
              color: 'white',
            }}
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
          color="purple.500"
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
        <Text fontSize="lg" color="gray.600" mb={10} maxW="xl" mx="auto">
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
          >
            Get Started for Free
          </Button>
          <Button
            size="lg"
            px={8}
            variant="outline"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        </Box>
      </Box>

      {/* Features */}
      <Box
        maxW="5xl"
        mx="auto"
        px={6}
        pb={24}
      >
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
          {features.map((f) => (
            <Box
              key={f.title}
              bg="white"
              p={8}
              borderRadius="xl"
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.100"
              textAlign="center"
            >
              <Text fontSize="4xl" mb={4}>{f.icon}</Text>
              <Heading size="md" mb={2}>{f.title}</Heading>
              <Text color="gray.500" fontSize="sm">{f.description}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      {/* Footer */}
      <Box borderTop="1px solid" borderColor="gray.200" py={6} textAlign="center">
        <Text color="gray.400" fontSize="sm">
          © {new Date().getFullYear()} TaskFlow. Built for teams that move fast.
        </Text>
      </Box>
    </Box>
  );
};

export default Landing;
