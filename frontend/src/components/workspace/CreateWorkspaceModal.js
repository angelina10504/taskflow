import React, { useState } from 'react';
import {
  Box,
  Button,
  Input,
  Heading,
  Text,
} from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogCloseTrigger,
} from '../ui/dialog';

const CreateWorkspaceModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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
    if (!formData.name.trim()) {
      newErrors.name = 'Workspace name is required';
    }
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
      <DialogContent>
        <DialogHeader>
          <Heading size="lg">Create New Workspace</Heading>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} id="create-workspace-form">
            <Box mb={4}>
              <Text mb={2} fontWeight="medium" fontSize="sm">
                Workspace Name *
              </Text>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., My Team, Personal Projects"
                borderColor={errors.name ? 'red.500' : 'gray.200'}
              />
              {errors.name && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {errors.name}
                </Text>
              )}
            </Box>

            <Box>
              <Text mb={2} fontWeight="medium" fontSize="sm">
                Description (optional)
              </Text>
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What's this workspace for?"
              />
            </Box>
          </form>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} mr={3}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-workspace-form"
            colorScheme="blue"
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