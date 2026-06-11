import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTaskCard from './SortableTaskCard';
import useColors from '../../hooks/useColors';

// Status is signalled by a small dot, not a colored border — keeps the board calm.
const COLUMN_CONFIG = {
  todo: { title: 'To Do', dot: '#9ca3af' },
  in_progress: { title: 'In Progress', dot: '#f59e0b' },
  in_review: { title: 'In Review', dot: '#a78bfa' },
  done: { title: 'Done', dot: '#34d399' },
};

const KanbanColumn = ({ status, tasks, onTaskClick, workspaceMemberCount }) => {
  const { setNodeRef } = useDroppable({ id: status });
  const config = COLUMN_CONFIG[status];
  const { dark, border, textSecondary, textMuted } = useColors();

  const columnBg = dark ? '#151d2e' : 'gray.50';

  return (
    <Box flex={1} minW="0" display="flex" flexDirection="column">
      <Box
        bg={columnBg}
        p={3}
        borderRadius="xl"
        h="100%"
        display="flex"
        flexDirection="column"
        border="1px solid"
        borderColor={border}
      >
        {/* Column Header */}
        <Box mb={3} px={1} flexShrink={0} display="flex" alignItems="center" gap={2}>
          <Box w="8px" h="8px" borderRadius="full" bg={config.dot} flexShrink={0} />
          <Text
            fontSize="xs"
            fontWeight="600"
            letterSpacing="0.06em"
            textTransform="uppercase"
            color={textSecondary}
          >
            {config.title}
          </Text>
          <Text fontSize="xs" color={textMuted}>
            {tasks.length}
          </Text>
        </Box>

        {/* Droppable Area — scrolls vertically */}
        <SortableContext items={tasks.map((task) => task._id)} strategy={verticalListSortingStrategy}>
          <Box ref={setNodeRef} flex={1} overflowY="auto" pr={1}>
            {tasks.length === 0 ? (
              <Box
                minH="120px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="1px dashed"
                borderColor={border}
                borderRadius="xl"
              >
                <Text fontSize="xs" color={textMuted}>
                  Drop tasks here
                </Text>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={2.5} pb={2}>
                {tasks.map((task) => (
                  <SortableTaskCard
                    key={task._id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    workspaceMemberCount={workspaceMemberCount}
                  />
                ))}
              </Box>
            )}
          </Box>
        </SortableContext>
      </Box>
    </Box>
  );
};

export default KanbanColumn;
