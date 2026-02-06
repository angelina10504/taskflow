import React from 'react';
import { Box, Text, Heading } from '@chakra-ui/react';

const PRIORITY_COLORS = {
  low: 'gray.500',
  medium: 'blue.500',
  high: 'orange.500',
  urgent: 'red.500',
};

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const TaskCard = ({ task, onClick }) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <Box
      bg="white"
      p={4}
      borderRadius="md"
      boxShadow="sm"
      cursor="pointer"
      transition="all 0.2s"
      border="1px solid"
      borderColor="gray.200"
      _hover={{
        boxShadow: 'md',
        borderColor: 'blue.300',
      }}
      onClick={onClick}
    >
      <Heading size="sm" mb={2} noOfLines={2}>
        {task.title}
      </Heading>

      {task.description && (
        <Text fontSize="sm" color="gray.600" noOfLines={2} mb={3}>
          {task.description}
        </Text>
      )}

      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
        {/* Priority Badge */}
        <Box
          px={2}
          py={1}
          bg={`${PRIORITY_COLORS[task.priority]}.50`}
          color={PRIORITY_COLORS[task.priority]}
          borderRadius="md"
          fontSize="xs"
          fontWeight="medium"
        >
          {PRIORITY_LABELS[task.priority]}
        </Box>

        {/* Due Date */}
        {task.dueDate && (
          <Box
            px={2}
            py={1}
            bg={isOverdue ? 'red.50' : 'gray.50'}
            color={isOverdue ? 'red.600' : 'gray.600'}
            borderRadius="md"
            fontSize="xs"
          >
            📅 {new Date(task.dueDate).toLocaleDateString()}
          </Box>
        )}

        {/* Assigned Users */}
        {task.assignedTo && task.assignedTo.length > 0 && (
          <Box display="flex" gap={1}>
            {task.assignedTo.slice(0, 3).map((user) => {
              const initials = user.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'U';

              return (
                <Box
                  key={user._id}
                  w="24px"
                  h="24px"
                  borderRadius="full"
                  bg="purple.500"
                  color="white"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="10px"
                  fontWeight="bold"
                >
                  {initials}
                </Box>
              );
            })}
            {task.assignedTo.length > 3 && (
              <Box
                w="24px"
                h="24px"
                borderRadius="full"
                bg="gray.300"
                color="gray.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="10px"
                fontWeight="bold"
              >
                +{task.assignedTo.length - 3}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <Box display="flex" gap={1} mt={2} flexWrap="wrap">
          {task.labels.map((label, index) => (
            <Box
              key={index}
              px={2}
              py={0.5}
              bg="blue.100"
              color="blue.700"
              borderRadius="sm"
              fontSize="xs"
            >
              {label}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TaskCard;