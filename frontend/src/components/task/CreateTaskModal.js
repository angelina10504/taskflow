import React, { useState } from 'react';
import { Box, Button, Input, Heading, Text } from '@chakra-ui/react';
import useColors from '../../hooks/useColors';

const CreateTaskModal = ({ isOpen, onClose, onCreate, projectId, workspaceId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { dark, cardBg, inputBg, border, textPrimary, textSecondary } = useColors();

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
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await onCreate({
        ...formData,
        project: projectId,
        workspace: workspaceId,
      });
      setFormData({ title: '', description: '', link: '', priority: 'medium', status: 'todo', dueDate: '' });
      onClose();
    } catch (error) {
      console.error('Create task error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '' });
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
          <Heading size="md" color={textPrimary}>Create New Task</Heading>
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
          <form onSubmit={handleSubmit} id="create-task-form">
            <Box mb={4}>
              <Text mb={1.5} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Task Title *
              </Text>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Design homepage mockup"
                bg={inputBg}
                color={textPrimary}
                borderColor={errors.title ? 'red.500' : border}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              />
              {errors.title && (
                <Text color="red.400" fontSize="sm" mt={1}>{errors.title}</Text>
              )}
            </Box>

            <Box mb={4}>
              <Text mb={1.5} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Description (optional)
              </Text>
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What needs to be done?"
                bg={inputBg}
                color={textPrimary}
                borderColor={border}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              />
            </Box>

            <Box mb={4}>
              <Text mb={1.5} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Link (optional)
              </Text>
              <Input
                name="link"
                value={formData.link}
                onChange={handleChange}
                placeholder="https://..."
                bg={inputBg}
                color={textPrimary}
                borderColor={border}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              />
            </Box>

            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={4} mb={4}>
              <Box>
                <Text mb={1.5} fontWeight="medium" fontSize="sm" color={textPrimary}>
                  Priority
                </Text>
                <select name="priority" value={formData.priority} onChange={handleChange} style={selectStyle}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </Box>
              <Box>
                <Text mb={1.5} fontWeight="medium" fontSize="sm" color={textPrimary}>
                  Status
                </Text>
                <select name="status" value={formData.status} onChange={handleChange} style={selectStyle}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </Box>
            </Box>

            <Box>
              <Text mb={1.5} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Due Date (optional)
              </Text>
              <Input
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
                bg={inputBg}
                color={textPrimary}
                borderColor={border}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              />
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
            _hover={{ bg: dark ? '#252c3d' : 'gray.50' }}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-task-form"
            style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
            color="white"
            _hover={{ opacity: 0.9 }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Task'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default CreateTaskModal;
