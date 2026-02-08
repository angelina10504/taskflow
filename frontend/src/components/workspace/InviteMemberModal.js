import React, { useState } from 'react';
import { Box, Button, Input, Heading, Text } from '@chakra-ui/react';

const InviteMemberModal = ({ isOpen, onClose, onInvite, workspaceId }) => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await onInvite(formData);
      setFormData({ email: '', role: 'member' });
      onClose();
    } catch (error) {
      console.error('Invite error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ email: '', role: 'member' });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="rgba(0, 0, 0, 0.5)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex="1000"
      onClick={handleClose}
    >
      <Box
        bg="white"
        borderRadius="lg"
        boxShadow="xl"
        maxW="500px"
        w="full"
        mx={4}
        onClick={(e) => e.stopPropagation()}
      >
        <Box p={6} borderBottom="1px" borderColor="gray.200" display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="lg">Invite Team Member</Heading>
          <Button variant="ghost" size="sm" onClick={handleClose} fontSize="xl">
            ×
          </Button>
        </Box>

        <Box p={6}>
          <form onSubmit={handleSubmit} id="invite-member-form">
            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm">
                Email Address *
              </Text>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="colleague@example.com"
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
                Role
              </Text>
              <Box
                as="select"
                name="role"
                value={formData.role}
                onChange={handleChange}
                w="full"
                p={2}
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <option value="viewer">Viewer (Read only)</option>
                <option value="member">Member (Can edit)</option>
                <option value="admin">Admin (Can manage)</option>
              </Box>
              <Text fontSize="xs" color="gray.500" mt={1}>
                {formData.role === 'viewer' && 'Can view projects and tasks'}
                {formData.role === 'member' && 'Can create and edit projects and tasks'}
                {formData.role === 'admin' && 'Can manage workspace and invite members'}
              </Text>
            </Box>
          </form>
        </Box>

        <Box p={6} borderTop="1px" borderColor="gray.200" display="flex" justifyContent="flex-end" gap={3}>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="invite-member-form" colorScheme="blue" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default InviteMemberModal;