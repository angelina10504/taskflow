import React from 'react';
import { Box, Heading, Text, Button } from '@chakra-ui/react';

const WorkspaceCard = ({ workspace, currentUserId, onDelete, onClick }) => {
  const isOwner = workspace.owner._id === currentUserId;
  const memberCount = workspace.members?.length || 0;

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      boxShadow="md"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        boxShadow: 'xl',
        transform: 'translateY(-2px)',
      }}
      onClick={onClick}
    >
      <Box display="flex" justifyContent="space-between" alignItems="start" mb={3}>
        <Box flex={1}>
          <Heading size="md" mb={2} noOfLines={1}>
            {workspace.name}
          </Heading>
          {workspace.description && (
            <Text color="gray.600" fontSize="sm" noOfLines={2} mb={3}>
              {workspace.description}
            </Text>
          )}
        </Box>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" gap={4} fontSize="sm" color="gray.600">
          <Text>👥 {memberCount} {memberCount === 1 ? 'member' : 'members'}</Text>
          {isOwner && <Text fontWeight="medium" color="blue.600">Owner</Text>}
        </Box>

        {isOwner && (
          <Button
            size="sm"
            colorScheme="red"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(workspace._id);
            }}
          >
            Delete
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default WorkspaceCard;