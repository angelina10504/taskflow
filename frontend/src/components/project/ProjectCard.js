import React from 'react';
import { Box, Heading, Text, Button } from '@chakra-ui/react';
import useColors from '../../hooks/useColors';

const ProjectCard = ({ project, onClick, onDelete, canDelete }) => {
  const { cardBg, border, textPrimary, textSecondary, textMuted } = useColors();

  return (
    <Box
      bg={cardBg}
      p={6}
      borderRadius="lg"
      boxShadow="md"
      cursor="pointer"
      transition="all 0.2s"
      borderLeft="4px solid"
      borderLeftColor={project.color || 'blue.500'}
      border="1px solid"
      borderColor={border}
      _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }}
      onClick={onClick}
    >
      <Box display="flex" justifyContent="space-between" alignItems="start" mb={3}>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Text fontSize="2xl">{project.icon || '📊'}</Text>
            <Heading size="md" noOfLines={1} color={textPrimary}>
              {project.name}
            </Heading>
          </Box>
          {project.description && (
            <Text color={textSecondary} fontSize="sm" noOfLines={2} mb={3}>
              {project.description}
            </Text>
          )}
        </Box>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box fontSize="sm" color={textSecondary}>
          {project.status === 'archived' && (
            <Text fontWeight="medium" color="orange.400">📦 Archived</Text>
          )}
          {project.deadline && (
            <Text>📅 Due: {new Date(project.deadline).toLocaleDateString()}</Text>
          )}
        </Box>

        {canDelete && (
          <Button
            size="sm" colorScheme="red" variant="ghost"
            onClick={(e) => { e.stopPropagation(); onDelete(project._id); }}
          >
            Delete
          </Button>
        )}
      </Box>

      {project.createdAt && (
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Text fontSize="xs" color={textMuted}>
            {project.createdBy?.name ? `${project.createdBy.name} · ` : ''}
            {new Date(project.createdAt).toLocaleDateString()}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ProjectCard;
