import React from 'react';
import { Box, Text, Heading } from '@chakra-ui/react';
import { LuCalendar, LuLink } from 'react-icons/lu';
import useColors from '../../hooks/useColors';

const API_URL = process.env.REACT_APP_API_URL || '';

// One quiet dot per priority; only "urgent" earns a filled pill.
const PRIORITY = {
  low: { label: 'Low', dot: '#d1d5db' },
  medium: { label: 'Medium', dot: '#9ca3af' },
  high: { label: 'High', dot: '#f59e0b' },
  urgent: { label: 'Urgent', dot: '#ef4444' },
};

const TaskCard = ({ task, onClick, workspaceMemberCount }) => {
  const { dark, cardBg, border, hoverBg, textPrimary, textSecondary, textMuted } = useColors();
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const priority = PRIORITY[task.priority] || PRIORITY.medium;
  const isUrgent = task.priority === 'urgent';

  return (
    <Box
      bg={cardBg}
      p={4}
      borderRadius="xl"
      cursor="pointer"
      transition="border-color 0.15s ease, transform 0.15s ease"
      border="1px solid"
      borderColor={border}
      _hover={{ borderColor: '#818cf8', transform: 'translateY(-1px)' }}
      onClick={onClick}
    >
      <Heading
        size="sm"
        fontWeight="600"
        letterSpacing="-0.01em"
        mb={task.description ? 1 : 3}
        noOfLines={2}
        color={textPrimary}
      >
        {task.title}
      </Heading>

      {task.description && (
        <Text fontSize="sm" color={textSecondary} noOfLines={1} mb={3}>
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
              gap: '5px',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
          >
            <LuLink size={12} style={{ flexShrink: 0 }} />
            {task.link.replace(/^https?:\/\//, '')}
          </a>
        </Box>
      )}

      <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
        {/* Priority */}
        {isUrgent ? (
          <Box
            display="inline-flex"
            alignItems="center"
            gap="5px"
            px={2}
            py={0.5}
            bg={dark ? '#3b1212' : 'red.50'}
            color={dark ? 'red.300' : 'red.600'}
            borderRadius="full"
            fontSize="xs"
            fontWeight="medium"
          >
            <Box w="5px" h="5px" borderRadius="full" bg={priority.dot} />
            {priority.label}
          </Box>
        ) : (
          <Box display="inline-flex" alignItems="center" gap="6px" fontSize="xs" color={textSecondary}>
            <Box w="6px" h="6px" borderRadius="full" bg={priority.dot} />
            {priority.label}
          </Box>
        )}

        {/* Due date */}
        {task.dueDate && (
          <Box
            display="inline-flex"
            alignItems="center"
            gap="4px"
            fontSize="xs"
            color={isOverdue ? (dark ? 'red.300' : 'red.500') : textMuted}
            fontWeight={isOverdue ? 'medium' : 'normal'}
          >
            <LuCalendar size={12} />
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Box>
        )}

        {/* Assigned users — pinned right */}
        {task.assignedTo && task.assignedTo.length > 0 && (
          <Box display="flex" gap={1} ml="auto">
            {task.assignedTo.slice(0, 3).map((user) => {
              const initials =
                user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
              const hasRealAvatar = user.avatar && !user.avatar.includes('ui-avatars.com');
              const avatarSrc = hasRealAvatar
                ? user.avatar.startsWith('/uploads/')
                  ? `${API_URL}${user.avatar}`
                  : user.avatar
                : null;
              return (
                <Box
                  key={user._id}
                  w="22px"
                  h="22px"
                  borderRadius="full"
                  overflow="hidden"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="9px"
                  fontWeight="bold"
                  color="white"
                  title={user.name}
                  style={avatarSrc ? {} : { background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
                >
                  {avatarSrc ? (
                    <Box as="img" src={avatarSrc} alt={user.name} w="100%" h="100%" style={{ objectFit: 'cover' }} />
                  ) : (
                    initials
                  )}
                </Box>
              );
            })}
            {task.assignedTo.length > 3 && (
              <Box
                w="22px"
                h="22px"
                borderRadius="full"
                bg={hoverBg}
                color={textSecondary}
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="9px"
                fontWeight="bold"
              >
                +{task.assignedTo.length - 3}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Labels — neutral chips */}
      {task.labels && task.labels.length > 0 && (
        <Box display="flex" gap={1} mt={2} flexWrap="wrap">
          {task.labels.slice(0, 4).map((label, index) => (
            <Box
              key={index}
              px={2}
              py={0.5}
              bg={hoverBg}
              color={textSecondary}
              borderRadius="full"
              fontSize="xs"
            >
              {label}
            </Box>
          ))}
          {task.labels.length > 4 && (
            <Text fontSize="xs" color={textMuted} alignSelf="center">
              +{task.labels.length - 4}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export default TaskCard;
