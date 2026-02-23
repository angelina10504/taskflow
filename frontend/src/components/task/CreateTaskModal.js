import React, { useState } from 'react';
import { Box, Button, Input, Heading, Text } from '@chakra-ui/react';

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
      setFormData({
        title: '',
        description: '',
        link: '',
        priority: 'medium',
        status: 'todo',
        dueDate: '',
      });
      onClose();
    } catch (error) {
      console.error('Create task error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      dueDate: '',
    });
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
        {/* Header */}
        <Box
          p={6}
          borderBottom="1px"
          borderColor="gray.200"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size="lg">Create New Task</Heading>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            fontSize="xl"
          >
            ×
          </Button>
        </Box>

        {/* Body */}
        <Box p={6}>
          <form onSubmit={handleSubmit} id="create-task-form">
            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm">
                Task Title *
              </Text>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Design homepage mockup"
                borderColor={errors.title ? 'red.500' : 'gray.200'}
              />
              {errors.title && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {errors.title}
                </Text>
              )}
            </Box>

            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm">
                Description (optional)
              </Text>
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What needs to be done?"
              />
            </Box>

            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm">
                Link (optional)
              </Text>
              <Input
                name="link"
                value={formData.link}
                onChange={handleChange}
                placeholder="https://..."
              />
            </Box>

            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm">
                Priority
              </Text>
              <Box
                as="select"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                w="full"
                p={2}
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
                cursor="pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Box>
            </Box>

            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm">
                Status
              </Text>
              <Box
                as="select"
                name="status"
                value={formData.status}
                onChange={handleChange}
                w="full"
                p={2}
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
                cursor="pointer"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </Box>
            </Box>

            <Box>
              <Text mb={2} fontWeight="medium" fontSize="sm">
                Due Date (optional)
              </Text>
              <Input
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </Box>
          </form>
        </Box>

        {/* Footer */}
        <Box
          p={6}
          borderTop="1px"
          borderColor="gray.200"
          display="flex"
          justifyContent="flex-end"
          gap={3}
        >
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-task-form"
            colorScheme="blue"
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