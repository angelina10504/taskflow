import React, { useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { LuListTree, LuFileText, LuZap, LuDiamond, LuSearch } from 'react-icons/lu';
import useColors from '../../hooks/useColors';
import { AIHallmark, BRAND_GRADIENT, gold } from './primitives';

// The AI dock in the project header. One identity, not five colors: every
// tool wears the gold accent, the hallmark marks the zone, and Intelligence
// (the flagship) gets the wine treatment.
const TOOLS = [
  { key: 'plan', label: 'Plan', icon: LuListTree, desc: 'Turn a big goal into board-ready subtasks' },
  { key: 'notes', label: 'Notes', icon: LuFileText, desc: 'Paste meeting notes — extract the action items' },
  { key: 'ask', label: 'Ask', icon: LuSearch, desc: 'Search by meaning & ask questions about this board' },
  { key: 'command', label: 'Command', icon: LuZap, desc: 'Focus the command bar — tell the board what to do (⌘K)' },
];

const Tooltip = ({ text, dark }) => (
  <Box
    position="absolute"
    top="calc(100% + 9px)"
    left="50%"
    transform="translateX(-50%)"
    px={2.5}
    py={1.5}
    borderRadius="md"
    fontSize="xs"
    whiteSpace="nowrap"
    pointerEvents="none"
    zIndex={40}
    bg={dark ? '#0b101c' : '#111827'}
    color="#e5e7eb"
    boxShadow="0 6px 16px rgba(0,0,0,0.35)"
    border="1px solid"
    borderColor={dark ? '#2a3244' : 'transparent'}
  >
    {text}
    <Box
      position="absolute"
      top="-4px"
      left="50%"
      transform="translateX(-50%) rotate(45deg)"
      w="8px"
      h="8px"
      bg={dark ? '#0b101c' : '#111827'}
      borderLeft="1px solid"
      borderTop="1px solid"
      borderColor={dark ? '#2a3244' : 'transparent'}
    />
  </Box>
);

const AIToolbar = ({ onPlan, onNotes, onCommand, onAsk, onInsights }) => {
  const [hovered, setHovered] = useState(null);
  const { dark, panelBg, textSecondary, textPrimary } = useColors();
  const g = gold(dark);
  const handlers = { plan: onPlan, notes: onNotes, command: onCommand, ask: onAsk };

  return (
    <Box
      ml="auto"
      flexShrink={0}
      display="flex"
      alignItems="center"
      gap={0.5}
      pl={3}
      pr={1}
      py={1}
      borderRadius="full"
      bg={panelBg}
      border="1px solid"
      borderColor={g.ring}
    >
      <AIHallmark label="AI" size="xs" mr={1.5} />
      <Box w="1px" h="18px" bg={dark ? '#2a3244' : '#e5e7eb'} mr={1} />

      {TOOLS.map((t) => (
        <Box key={t.key} position="relative">
          <Box
            as="button"
            onClick={handlers[t.key]}
            onMouseEnter={() => setHovered(t.key)}
            onMouseLeave={() => setHovered(null)}
            display="flex"
            alignItems="center"
            gap={1.5}
            px={2.5}
            py={1.5}
            borderRadius="full"
            border="none"
            cursor="pointer"
            bg={hovered === t.key ? g.tint : 'transparent'}
            color={hovered === t.key ? textPrimary : textSecondary}
            transition="all 0.15s"
          >
            <t.icon size={14} color={g.text} />
            <Text fontSize="sm" fontWeight="500">
              {t.label}
            </Text>
          </Box>
          {hovered === t.key && <Tooltip text={t.desc} dark={dark} />}
        </Box>
      ))}

      {/* Intelligence — the flagship, in wine */}
      <Box position="relative" ml={1}>
        <Box
          as="button"
          onClick={onInsights}
          onMouseEnter={() => setHovered('insights')}
          onMouseLeave={() => setHovered(null)}
          display="flex"
          alignItems="center"
          gap={1.5}
          px={3.5}
          py={1.5}
          borderRadius="full"
          border="none"
          cursor="pointer"
          color="white"
          style={{ background: BRAND_GRADIENT }}
          opacity={hovered === 'insights' ? 0.92 : 1}
          transition="all 0.15s"
        >
          <LuDiamond size={13} strokeWidth={2.5} />
          <Text fontSize="sm" fontWeight="600">
            Intelligence
          </Text>
        </Box>
        {hovered === 'insights' && <Tooltip text="Open the analysis — velocity, risk & forecast" dark={dark} />}
      </Box>
    </Box>
  );
};

export default AIToolbar;
