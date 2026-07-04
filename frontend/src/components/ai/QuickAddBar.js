import React, { useState } from 'react';
import { Box, Input, Spinner } from '@chakra-ui/react';
import { LuDiamond, LuCornerDownLeft } from 'react-icons/lu';
import { toaster } from '../ui/toaster';
import * as aiService from '../../services/aiService';
import useColors from '../../hooks/useColors';
import { gold } from './primitives';

// One-line natural-language task input: "Fix login bug, urgent, due Friday, assign to Angelina"
const QuickAddBar = ({ projectId, onTaskCreated }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const { dark, inputBg, border, textPrimary, textMuted } = useColors();
  const g = gold(dark);

  const submit = async () => {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    try {
      const res = await aiService.quickAddTask(projectId, value);

      const bits = [];
      if (res.parsed?.priority) bits.push(`${res.parsed.priority} priority`);
      if (res.parsed?.dueDate) bits.push(`due ${new Date(res.parsed.dueDate).toLocaleDateString()}`);
      if (res.parsed?.assignees?.length) bits.push(`→ ${res.parsed.assignees.join(', ')}`);
      if (res.parsed?.status) bits.push(`in ${res.parsed.status.replace('_', ' ')}`);
      if (res.aiAvailable === false) bits.push('AI parsing unavailable — added as typed');

      toaster.create({
        title: `Added "${res.task.title}"`,
        description: bits.length ? bits.join(' · ') : undefined,
        type: 'success',
        duration: 4000,
      });
      setText('');
      onTaskCreated?.(res.task);
    } catch (error) {
      toaster.create({
        title: 'Quick add failed',
        description: error.message || 'Something went wrong',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box position="relative" flex="1" maxW="560px">
      <Box
        position="absolute"
        left="12px"
        top="50%"
        transform="translateY(-50%)"
        color={g.base}
        pointerEvents="none"
        display="flex"
        zIndex={1}
      >
        <LuDiamond size={13} strokeWidth={2.5} />
      </Box>
      <Input
        size="sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        placeholder='Quick add — try "Fix login bug, urgent, due Friday, assign to me"'
        pl="34px"
        pr="34px"
        bg={inputBg}
        color={textPrimary}
        borderColor={border}
        borderRadius="lg"
        disabled={loading}
        _focus={{ borderColor: g.ring, boxShadow: `0 0 0 3px ${g.tint}` }}
        _placeholder={{ color: textMuted }}
      />
      <Box
        position="absolute"
        right="12px"
        top="50%"
        transform="translateY(-50%)"
        color={textMuted}
        display="flex"
        alignItems="center"
        pointerEvents="none"
      >
        {loading ? (
          <Spinner size="xs" color="brand.500" />
        ) : text.trim() ? (
          <LuCornerDownLeft size={13} />
        ) : null}
      </Box>
    </Box>
  );
};

export default QuickAddBar;
