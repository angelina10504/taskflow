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

const CreateWorkspaceModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
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
    if (!formData.name.trim()) newErrors.name = 'Workspace name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await onCreate(formData);
      setFormData({ name: '', description: '' });
      onClose();
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '' });
    setErrors({});
    onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <DialogBackdrop />
      <DialogContent bg={cardBg} color={textPrimary}>
        <DialogHeader borderBottomColor={border}>
          <Heading size="lg" color={textPrimary}>Create New Workspace</Heading>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} id="create-workspace-form">
            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Workspace Name *
              </Text>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., My Team, Personal Projects"
                bg={inputBg}
                color={textPrimary}
                borderColor={errors.name ? 'red.500' : border}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              />
              {errors.name && (
                <Text color="red.400" fontSize="sm" mt={1}>{errors.name}</Text>
              )}
            </Box>

            <Box>
              <Text mb={2} fontWeight="medium" fontSize="sm" color={textPrimary}>
                Description (optional)
              </Text>
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What's this workspace for?"
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
            form="create-workspace-form"
            style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
            color="white"
            _hover={{ opacity: 0.9 }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default CreateWorkspaceModal;
