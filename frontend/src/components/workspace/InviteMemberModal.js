import React, { useState } from 'react';
import { Box, Button, Input, Heading, Text } from '@chakra-ui/react';
import useColors from '../../hooks/useColors';

const InviteMemberModal = ({ isOpen, onClose, onInvite, workspaceId }) => {
  const [formData, setFormData] = useState({ email: '', role: 'member' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { dark, cardBg, inputBg, border, textPrimary, textSecondary, textMuted, hoverBg } = useColors();

  const selectStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: `1px solid ${dark ? '#2a3244' : '#e2e8f0'}`,
    background: dark ? '#1a2030' : 'white',
    color: dark ? '#f1f5f9' : '#1a202c',
    cursor: 'pointer',
    outline: 'none',
    fontSize: '14px',
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
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
      top="0" left="0" right="0" bottom="0"
      bg="rgba(0,0,0,0.6)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex="1000"
      onClick={handleClose}
    >
      <Box
        bg={cardBg}
        borderRadius="lg"
        boxShadow="xl"
        border="1px solid"
        borderColor={border}
        maxW="500px"
        w="full"
        mx={4}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box
          px={6} py={4}
          borderBottom="1px solid"
          borderColor={border}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size="md" color={textPrimary}>Invite Team Member</Heading>
          <Box
            as="button"
            onClick={handleClose}
            fontSize="2xl"
            lineHeight={1}
            color={textSecondary}
            bg="transparent"
            border="none"
            cursor="pointer"
            _hover={{ color: textPrimary }}
          >
            ×
          </Box>
        </Box>

        {/* Body */}
        <Box px={6} py={5}>
          <form onSubmit={handleSubmit} id="invite-member-form">
            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Email Address *
              </Text>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="colleague@example.com"
                bg={inputBg}
                color={textPrimary}
                borderColor={errors.email ? 'red.500' : border}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              />
              {errors.email && (
                <Text color="red.400" fontSize="sm" mt={1}>{errors.email}</Text>
              )}
            </Box>

            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Role
              </Text>
              <select name="role" value={formData.role} onChange={handleChange} style={selectStyle}>
                <option value="viewer">Viewer (Read only)</option>
                <option value="member">Member (Can edit)</option>
                <option value="admin">Admin (Can manage)</option>
              </select>
              <Text fontSize="xs" color={textMuted} mt={1}>
                {formData.role === 'viewer' && 'Can view projects and tasks'}
                {formData.role === 'member' && 'Can create and edit projects and tasks'}
                {formData.role === 'admin' && 'Can manage workspace and invite members'}
              </Text>
            </Box>
          </form>
        </Box>

        {/* Footer */}
        <Box
          px={6} py={4}
          borderTop="1px solid"
          borderColor={border}
          display="flex"
          justifyContent="flex-end"
          gap={3}
        >
          <Button
            variant="outline"
            borderColor={border}
            color={textPrimary}
            _hover={{ bg: hoverBg }}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="invite-member-form"
            style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
            color="white"
            _hover={{ opacity: 0.9 }}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default InviteMemberModal;
