import React from 'react';
import { Box, Text, Heading } from '@chakra-ui/react';
import useColors from '../../hooks/useColors';

const API_URL = process.env.REACT_APP_API_URL || '';

const PRIORITY_COLORS = {
  low: 'gray.500',
  medium: 'blue.500',
  high: 'orange.500',
  urgent: 'red.500',
};

const PRIORITY_BORDER = {
  low: '#d1d5db',
  medium: '#facc15',
  high: '#fb923c',
  urgent: '#ef4444',
};

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const TaskCard = ({ task, onClick, workspaceMemberCount }) => {
  const { dark, cardBg, border, textSecondary, textMuted } = useColors();
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <Box
      bg={cardBg}
      p={4}
      borderRadius="md"
      boxShadow="sm"
      cursor="pointer"
      transition="all 0.2s"
      border="1px solid"
      borderColor={border}
      borderLeft="4px solid"
      style={{ borderLeftColor: PRIORITY_BORDER[task.priority] || PRIORITY_BORDER.medium }}
      _hover={{ boxShadow: 'md' }}
      onClick={onClick}
    >
      <Heading size="sm" mb={2} noOfLines={2} color={dark ? 'gray.100' : 'gray.800'}>
        {task.title}
      </Heading>

      {task.description && (
        <Text fontSize="sm" color={textSecondary} noOfLines={2} mb={2}>
          {task.description}
        </Text>
      )}

      {task.link && (
        <Box mb={3}>
          <a
            href={task.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: '12px',
              color: '#818cf8',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
          >
            🔗 {task.link}
          </a>
        </Box>
      )}

      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
        {/* Priority Badge */}
        <Box
          px={2} py={1}
          bg={dark ? '#1e2535' : `${PRIORITY_COLORS[task.priority]}.50`}
          color={PRIORITY_COLORS[task.priority]}
          borderRadius="md" fontSize="xs" fontWeight="medium"
        >
          {PRIORITY_LABELS[task.priority]}
        </Box>

        {/* Due Date */}
        {task.dueDate && (
          <Box
            px={2} py={1}
            bg={isOverdue ? (dark ? '#3b1212' : 'red.50') : (dark ? '#1e2535' : 'gray.50')}
            color={isOverdue ? 'red.400' : textSecondary}
            borderRadius="md" fontSize="xs"
          >
            📅 {new Date(task.dueDate).toLocaleDateString()}
          </Box>
        )}

        {/* Assigned Users */}
        {task.assignedTo && task.assignedTo.length > 0 && (
          <Box display="flex" gap={1}>
            {task.assignedTo.slice(0, 3).map((user) => {
              const initials = user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
              const hasRealAvatar = user.avatar && !user.avatar.includes('ui-avatars.com');
              const avatarSrc = hasRealAvatar
                ? user.avatar.startsWith('/uploads/') ? `${API_URL}${user.avatar}` : user.avatar
                : null;
              return (
                <Box
                  key={user._id}
                  w="24px" h="24px" borderRadius="full" overflow="hidden"
                  display="flex" alignItems="center" justifyContent="center"
                  fontSize="10px" fontWeight="bold" color="white"
                  style={avatarSrc ? {} : { background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
                >
                  {avatarSrc
                    ? <Box as="img" src={avatarSrc} alt={user.name} w="100%" h="100%" style={{ objectFit: 'cover' }} />
                    : initials}
                </Box>
              );
            })}
            {task.assignedTo.length > 3 && (
              <Box
                w="24px" h="24px" borderRadius="full"
                bg={dark ? '#2a3244' : 'gray.300'}
                color={dark ? 'gray.300' : 'gray.700'}
                display="flex" alignItems="center" justifyContent="center"
                fontSize="10px" fontWeight="bold"
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
              key={index} px={2} py={0.5}
              bg={dark ? '#1e3a5f' : 'blue.100'}
              color={dark ? '#93c5fd' : 'blue.700'}
              borderRadius="sm" fontSize="xs"
            >
              {label}
            </Box>
          ))}
        </Box>
      )}

      {/* Created date / creator */}
      {task.createdAt && (
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Text fontSize="xs" color={textMuted}>
            {workspaceMemberCount > 1 && task.createdBy?.name ? `${task.createdBy.name} · ` : ''}
            {new Date(task.createdAt).toLocaleDateString()}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default TaskCard;
