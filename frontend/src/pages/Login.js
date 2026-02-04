import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Input, Heading, Text } from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      navigate('/dashboard');
    } catch (error) {
      setErrors({ submit: error.message || 'Login failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box 
      minH="100vh" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
      bg="gray.50"
      p={4}
    >
      <Box 
        maxW="md" 
        w="full" 
        bg="white" 
        p={8} 
        borderRadius="lg" 
        boxShadow="lg"
      >
        <Heading 
          size="2xl" 
          mb={2} 
          textAlign="center"
          style={{
            background: 'linear-gradient(to right, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Welcome Back
        </Heading>
        <Text color="gray.600" textAlign="center" mb={6}>
          Sign in to continue to TaskFlow
        </Text>

        {errors.submit && (
          <Box 
            bg="red.50" 
            color="red.600" 
            p={3} 
            borderRadius="md" 
            mb={4}
            fontSize="sm"
          >
            {errors.submit}
          </Box>
        )}

        <form onSubmit={handleSubmit}>
          <Box mb={4}>
            <Text mb={2} fontWeight="medium" fontSize="sm">
              Email
            </Text>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              borderColor={errors.email ? 'red.500' : 'gray.200'}
            />
            {errors.email && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {errors.email}
              </Text>
            )}
          </Box>

          <Box mb={4}>
            <Text mb={2} fontWeight="medium" fontSize="sm">
              Password
            </Text>
            <Box position="relative">
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                borderColor={errors.password ? 'red.500' : 'gray.200'}
                pr="12"
              />
              <Box
                position="absolute"
                right={3}
                top="50%"
                transform="translateY(-50%)"
                cursor="pointer"
                onClick={() => setShowPassword(!showPassword)}
                fontSize="xl"
              >
                {showPassword ? '🙈' : '👁️'}
              </Box>
            </Box>
            {errors.password && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {errors.password}
              </Text>
            )}
          </Box>

          <Box 
            display="flex" 
            justifyContent="flex-end" 
            mb={6}
          >
            <Text
              color="blue.500"
              fontSize="sm"
              fontWeight="medium"
              cursor="pointer"
            >
              Forgot password?
            </Text>
          </Box>

          <Button
            type="submit"
            w="full"
            colorScheme="blue"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <Text textAlign="center" mt={6} color="gray.600">
          Don't have an account?{' '}
          <Text
            as="span"
            color="blue.500"
            fontWeight="medium"
            cursor="pointer"
            onClick={() => navigate('/register')}
          >
            Sign up
          </Text>
        </Text>
      </Box>
    </Box>
  );
};

export default Login;