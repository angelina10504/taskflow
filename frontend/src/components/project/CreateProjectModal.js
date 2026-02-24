import React, { useState } from 'react';
import { Box, Button, Input, Heading, Text } from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogCloseTrigger,
} from '../ui/dialog';
import useColors from '../../hooks/useColors';

const COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Teal', value: '#14b8a6' },
];

const ICONS = ['📊', '🎯', '🚀', '💼', '🎨', '⚡', '🔥', '✨', '📱', '💻', '🏆', '📈'];

const CreateProjectModal = ({ isOpen, onClose, onCreate, workspaceId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    icon: '📊',
    deadline: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { dark, cardBg, inputBg, border, textPrimary, hoverBg } = useColors();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Project name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await onCreate({ ...formData, workspace: workspaceId });
      setFormData({ name: '', description: '', color: '#6366f1', icon: '📊', deadline: '' });
      onClose();
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', color: '#6366f1', icon: '📊', deadline: '' });
    setErrors({});
    onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <DialogBackdrop />
      <DialogContent bg={cardBg} color={textPrimary}>
        <DialogHeader borderBottomColor={border}>
          <Heading size="lg" color={textPrimary}>Create New Project</Heading>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} id="create-project-form">
            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Project Name *
              </Text>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Website Redesign"
                bg={inputBg}
                color={textPrimary}
                borderColor={errors.name ? 'red.500' : border}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              />
              {errors.name && (
                <Text color="red.400" fontSize="sm" mt={1}>{errors.name}</Text>
              )}
            </Box>

            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Description (optional)
              </Text>
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What's this project about?"
                bg={inputBg}
                color={textPrimary}
                borderColor={border}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              />
            </Box>

            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Icon
              </Text>
              <Box display="flex" gap={2} flexWrap="wrap">
                {ICONS.map((icon) => (
                  <Box
                    key={icon}
                    w="40px" h="40px"
                    display="flex" alignItems="center" justifyContent="center"
                    fontSize="xl"
                    borderRadius="md"
                    border="2px solid"
                    borderColor={formData.icon === icon ? 'purple.400' : border}
                    bg={formData.icon === icon ? (dark ? '#2d1a5e' : 'purple.50') : inputBg}
                    cursor="pointer"
                    transition="all 0.15s"
                    _hover={{ borderColor: 'purple.400' }}
                    onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                  >
                    {icon}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Color
              </Text>
              <Box display="flex" gap={2} flexWrap="wrap">
                {COLORS.map((color) => (
                  <Box
                    key={color.value}
                    w="40px" h="40px"
                    borderRadius="md"
                    bg={color.value}
                    border="3px solid"
                    borderColor={formData.color === color.value ? 'white' : 'transparent'}
                    cursor="pointer"
                    transition="all 0.15s"
                    _hover={{ transform: 'scale(1.1)' }}
                    onClick={() => setFormData((prev) => ({ ...prev, color: color.value }))}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Text mb={2} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Deadline (optional)
              </Text>
              <Input
                name="deadline"
                type="date"
                value={formData.deadline}
                onChange={handleChange}
                bg={inputBg}
                color={textPrimary}
                borderColor={border}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              />
            </Box>
          </form>
        </DialogBody>

        <DialogFooter borderTopColor={border}>
          <Button
            variant="outline"
            borderColor={border}
            color={textPrimary}
            _hover={{ bg: hoverBg }}
            onClick={handleClose}
            mr={3}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-project-form"
            style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
            color="white"
            _hover={{ opacity: 0.9 }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default CreateProjectModal;
