import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Box, Heading, Text, Button, Badge, VStack } from '@chakra-ui/react';
import { testConnection } from './services/api';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [backendMessage, setBackendMessage] = useState('');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const data = await testConnection();
        setBackendStatus('connected');
        setBackendMessage(data.message);
      } catch (error) {
        setBackendStatus('error');
        setBackendMessage('Cannot connect to backend');
      }
    };

    checkBackend();
  }, []);

  return (
    <Router>
      <Box 
        minH="100vh" 
        bg="gray.50" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        p={4}
      >
        <VStack spacing={6}>
          <Heading 
            size="4xl" 
            style={{
              background: 'linear-gradient(to right, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            🚀 TaskFlow
          </Heading>
          
          <Text fontSize="lg" color="gray.600" textAlign="center">
            Your project management platform is coming to life!
          </Text>

          <Badge 
            colorScheme={
              backendStatus === 'connected' ? 'green' : 
              backendStatus === 'checking' ? 'yellow' : 'red'
            }
            fontSize="md"
            px={3}
            py={1}
            borderRadius="md"
          >
            Backend: {backendStatus === 'connected' ? '✅ Connected' : 
                     backendStatus === 'checking' ? '⏳ Checking...' : '❌ Error'}
          </Badge>

          {backendMessage && (
            <Text fontSize="sm" color="gray.500" fontStyle="italic">
              "{backendMessage}"
            </Text>
          )}
          
          <Button 
            colorScheme="blue" 
            size="lg"
            px={8}
            py={6}
            fontSize="lg"
          >
            Get Started
          </Button>
        </VStack>
      </Box>
    </Router>
  );
}

export default App;