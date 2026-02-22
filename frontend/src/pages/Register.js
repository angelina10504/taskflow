import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Input, Heading, Text } from '@chakra-ui/react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse.credential);
      navigate('/workspaces');
    } catch (error) {
      setErrors({ submit: error.message || 'Google login failed' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('Form submitted'); // Debug log

    if (!validate()) {
      console.log('Validation failed'); // Debug log
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting to register:', { name: formData.name, email: formData.email }); // Debug log
      
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      
      console.log('Registration successful'); // Debug log
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error); // Debug log
      setErrors({ submit: error.message || 'Registration failed' });
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
          Create Account
        </Heading>
        <Text color="gray.600" textAlign="center" mb={6}>
          Join TaskFlow and start collaborating
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
              Name
            </Text>
            <Input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              borderColor={errors.name ? 'red.500' : 'gray.200'}
            />
            {errors.name && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {errors.name}
              </Text>
            )}
          </Box>

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

          <Box mb={6}>
            <Text mb={2} fontWeight="medium" fontSize="sm">
              Confirm Password
            </Text>
            <Box position="relative">
              <Input
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                borderColor={errors.confirmPassword ? 'red.500' : 'gray.200'}
                pr="12"
              />
              <Box
                position="absolute"
                right={3}
                top="50%"
                transform="translateY(-50%)"
                cursor="pointer"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                fontSize="xl"
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </Box>
            </Box>
            {errors.confirmPassword && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {errors.confirmPassword}
              </Text>
            )}
          </Box>

          <Button
            type="submit"
            w="full"
            colorScheme="blue"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <Box display="flex" alignItems="center" my={6}>
          <Box flex="1" h="1px" bg="gray.200" />
          <Text px={4} color="gray.500" fontSize="sm">or</Text>
          <Box flex="1" h="1px" bg="gray.200" />
        </Box>

        <Box display="flex" justifyContent="center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrors({ submit: 'Google login failed' })}
          />
        </Box>

        <Text textAlign="center" mt={6} color="gray.600">
          Already have an account?{' '}
          <Text
            as="span"
            color="blue.500"
            fontWeight="medium"
            cursor="pointer"
            onClick={() => navigate('/login')}
          >
            Sign in
          </Text>
        </Text>
      </Box>
    </Box>
  );
};

export default Register;