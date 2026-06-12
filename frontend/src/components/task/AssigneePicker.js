import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import useColors from '../../hooks/useColors';

const API_URL = process.env.REACT_APP_API_URL || '';

// Role-aware assignee chips:
//   owner/admin → can toggle anyone
//   member      → can only toggle themselves
//   viewer      → read-only (backend blocks writes anyway)
// members: workspace.members ([{ user: {_id,name,avatar}, role }])
// value: array of selected user id strings
const AssigneePicker = ({ members = [], value = [], onChange, currentUserId, currentUserRole }) => {
  const { border, hoverBg, textPrimary } = useColors();
  const canAssignOthers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const toggle = (id) => {
    if (!(canAssignOthers || id === String(currentUserId))) return;
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  if (!members.length) {
    return (
      <Text fontSize="sm" color="gray.500">
        No members to assign
      </Text>
    );
  }

  return (
    <Box display="flex" gap={2} flexWrap="wrap">
      {members.map((m) => {
        const u = m.user || {};
        const id = String(u._id || '');
        if (!id || !u.name) return null;
        const selected = value.includes(id);
        const isSelf = id === String(currentUserId);
        const allowed = canAssignOthers || isSelf;
        const initials =
          u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
        const hasRealAvatar = u.avatar && !u.avatar.includes('ui-avatars.com');
        const avatarSrc = hasRealAvatar
          ? u.avatar.startsWith('/uploads/')
            ? `${API_URL}${u.avatar}`
            : u.avatar
          : null;

        return (
          <Box
            key={id}
            onClick={() => toggle(id)}
            title={allowed ? '' : 'Only the workspace owner or admins can assign other members'}
            display="flex"
            alignItems="center"
            gap={2}
            pl={1}
            pr={3}
            py={1}
            borderRadius="full"
            border="1px solid"
            borderColor={selected ? '#6366f1' : border}
            bg={selected ? 'rgba(99,102,241,0.12)' : hoverBg}
            opacity={allowed ? 1 : 0.45}
            cursor={allowed ? 'pointer' : 'not-allowed'}
            transition="all 0.15s"
            _hover={allowed ? { borderColor: '#818cf8' } : {}}
          >
            <Box
              w="22px"
              h="22px"
              borderRadius="full"
              overflow="hidden"
              flexShrink={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="9px"
              fontWeight="bold"
              color="white"
              style={avatarSrc ? {} : { background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
            >
              {avatarSrc ? (
                <Box as="img" src={avatarSrc} alt={u.name} w="100%" h="100%" style={{ objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </Box>
            <Text fontSize="sm" color={textPrimary}>
              {u.name}
              {isSelf ? ' (you)' : ''}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};

export default AssigneePicker;
