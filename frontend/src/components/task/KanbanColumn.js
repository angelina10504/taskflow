import React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTaskCard from './SortableTaskCard';

const COLUMN_CONFIG = {
  todo: { title: 'To Do', icon: '📝', color: 'gray.500' },
  in_progress: { title: 'In Progress', icon: '🔄', color: 'blue.500' },
  in_review: { title: 'In Review', icon: '👀', color: 'purple.500' },
  done: { title: 'Done', icon: '✅', color: 'green.500' },
};

const KanbanColumn = ({ status, tasks, onTaskClick }) => {
  const { setNodeRef } = useDroppable({ id: status });
  const config = COLUMN_CONFIG[status];

  return (
    <Box flex={1} minW="280px">
      <Box
        bg="gray.50"
        p={4}
        borderRadius="lg"
        minH="600px"
        border="2px solid"
        borderColor="gray.200"
      >
        {/* Column Header */}
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Text fontSize="xl">{config.icon}</Text>
            <Heading size="md" color={config.color}>
              {config.title}
            </Heading>
          </Box>
          <Box
            bg={`${config.color}.100`}
            color={config.color}
            px={2}
            py={1}
            borderRadius="full"
            fontSize="sm"
            fontWeight="bold"
          >
            {tasks.length}
          </Box>
        </Box>

        {/* Droppable Area */}
        <SortableContext
          items={tasks.map((task) => task._id)}
          strategy={verticalListSortingStrategy}
        >
          <Box ref={setNodeRef} minH="500px">
            <Box display="flex" flexDirection="column" gap={3}>
              {tasks.map((task) => (
                <SortableTaskCard
                  key={task._id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </Box>
          </Box>
        </SortableContext>

        {tasks.length === 0 && (
          <Box textAlign="center" py={10} color="gray.400">
            <Text fontSize="sm">No tasks</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default KanbanColumn;