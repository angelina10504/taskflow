import React, { useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { LuListTree, LuFileText, LuZap, LuSparkles, LuSearch } from 'react-icons/lu';
import useColors from '../../hooks/useColors';

// The project's AI feature dock: a gradient-ringed pill grouping the four AI
// tools, each with its own accent color and a hover tooltip describing it.
const TOOLS = [
  {
    key: 'plan',
    label: 'Plan',
    icon: LuListTree,
    color: '#818cf8',
    tint: 'rgba(99,102,241,0.14)',
    desc: 'Turn a big goal into board-ready subtasks',
  },
  {
    key: 'notes',
    label: 'Notes',
    icon: LuFileText,
    color: '#34d399',
    tint: 'rgba(52,211,153,0.14)',
    desc: 'Paste meeting notes — extract the action items',
  },
  {
    key: 'command',
    label: 'Command',
    icon: LuZap,
    color: '#fbbf24',
    tint: 'rgba(251,191,36,0.14)',
    desc: 'Tell the board what to do in plain English',
  },
  {
    key: 'ask',
    label: 'Ask',
    icon: LuSearch,
    color: '#22d3ee',
    tint: 'rgba(34,211,238,0.14)',
    desc: 'Search by meaning & ask questions about this board',
  },
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
  const handlers = { plan: onPlan, notes: onNotes, command: onCommand, ask: onAsk };

  return (
    <Box
      ml="auto"
      flexShrink={0}
      p="1px"
      borderRadius="full"
      style={{
        background: dark
          ? 'linear-gradient(135deg, rgba(99,102,241,0.55), rgba(168,85,247,0.55))'
          : 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(168,85,247,0.35))',
      }}
    >
      <Box display="flex" alignItems="center" gap={0.5} pl={3} pr={1} py={1} borderRadius="full" bg={panelBg}>
        {/* Section badge */}
        <Box display="flex" alignItems="center" gap={1.5} mr={1.5} userSelect="none">
          <LuSparkles size={13} color="#a855f7" />
          <Text
            fontSize="xs"
            fontWeight="800"
            letterSpacing="0.1em"
            style={{
              background: 'linear-gradient(90deg, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AI
          </Text>
        </Box>
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
              bg={hovered === t.key ? t.tint : 'transparent'}
              color={hovered === t.key ? textPrimary : textSecondary}
              transition="all 0.15s"
            >
              <t.icon size={14} color={t.color} />
              <Text fontSize="sm" fontWeight="500">
                {t.label}
              </Text>
            </Box>
            {hovered === t.key && <Tooltip text={t.desc} dark={dark} />}
          </Box>
        ))}

        {/* Insights — the hero action */}
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
            style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
            opacity={hovered === 'insights' ? 0.92 : 1}
            transition="all 0.15s"
          >
            <LuSparkles size={14} />
            <Text fontSize="sm" fontWeight="600">
              Insights
            </Text>
          </Box>
          {hovered === 'insights' && <Tooltip text="Velocity, risk & forecast for this project" dark={dark} />}
        </Box>
      </Box>
    </Box>
  );
};

export default AIToolbar;
