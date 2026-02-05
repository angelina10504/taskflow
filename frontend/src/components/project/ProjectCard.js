import React from 'react';
import { Box, Heading, Text, Button } from '@chakra-ui/react';

const ProjectCard = ({ project, onClick, onDelete, canDelete }) => {
  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      boxShadow="md"
      cursor="pointer"
      transition="all 0.2s"
      borderLeft="4px solid"
      borderLeftColor={project.color || 'blue.500'}
      _hover={{
        boxShadow: 'xl',
        transform: 'translateY(-2px)',
      }}
      onClick={onClick}
    >
      <Box display="flex" justifyContent="space-between" alignItems="start" mb={3}>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Text fontSize="2xl">{project.icon || '📊'}</Text>
            <Heading size="md" noOfLines={1}>
              {project.name}
            </Heading>
          </Box>
          {project.description && (
            <Text color="gray.600" fontSize="sm" noOfLines={2} mb={3}>
              {project.description}
            </Text>
          )}
        </Box>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box fontSize="sm" color="gray.600">
          {project.status === 'archived' && (
            <Text fontWeight="medium" color="orange.600">
              📦 Archived
            </Text>
          )}
          {project.deadline && (
            <Text>
              📅 Due: {new Date(project.deadline).toLocaleDateString()}
            </Text>
          )}
        </Box>

        {canDelete && (
          <Button
            size="sm"
            colorScheme="red"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project._id);
            }}
          >
            Delete
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ProjectCard;