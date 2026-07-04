import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { LuDiamond } from 'react-icons/lu';
import useColors from '../../hooks/useColors';

// ── Shared AI identity ──────────────────────────────────────────────────────
// One treatment for every AI surface in TaskFlow: a gold accent (reserved for
// AI only), a small-caps hallmark instead of sparkle emoji, a hairline "gold
// thread" seam that glints while the model works, and a serif voice
// (fontFamily="ai") for anything the model *says*. Use these — never invent
// per-feature colors again.

export const WINE = '#7a1f3d'; // brand.700 — primary brand
export const CLARET = '#a83a58'; // gradient partner
export const BRAND_GRADIENT = `linear-gradient(135deg, ${WINE}, ${CLARET})`;

// Gold reads differently on parchment vs. charcoal — pick per color mode.
export const gold = (dark) => ({
  text: dark ? '#dcbd68' : '#9a6f23', // small text / icons
  base: dark ? '#cda440' : '#b8892b', // borders, larger marks
  tint: dark ? 'rgba(205,164,64,0.10)' : 'rgba(184,137,43,0.08)', // fills
  ring: dark ? 'rgba(205,164,64,0.35)' : 'rgba(184,137,43,0.35)', // focus/borders
});

// The hallmark: ◆ TASKFLOW INTELLIGENCE — a maker's mark, stamped on every
// AI surface so the pattern becomes recognizable at a glance.
export const AIHallmark = ({ label = 'Intelligence', size = 'sm', ...rest }) => {
  const { dark } = useColors();
  const g = gold(dark);
  const compact = size === 'xs';
  return (
    <Box display="inline-flex" alignItems="center" gap={1.5} userSelect="none" {...rest}>
      <LuDiamond size={compact ? 9 : 11} color={g.base} strokeWidth={2.5} />
      <Text
        as="span"
        fontSize={compact ? '9px' : '10px'}
        fontWeight="700"
        letterSpacing="0.14em"
        textTransform="uppercase"
        color={g.text}
        lineHeight={1}
      >
        {label}
      </Text>
    </Box>
  );
};

// The gold thread: wraps a surface, draws the seam along its top edge, and
// animates a traveling glint while `thinking` (static under reduced motion —
// see index.css `.ai-thread`).
export const AIThread = ({ thinking = false, children, ...rest }) => (
  <Box className="ai-thread" data-thinking={thinking ? 'true' : 'false'} {...rest}>
    {children}
  </Box>
);

// Honest-mode chip: shown when the narrative is rule-based because no AI key
// is configured. Never dress the fallback up as an AI opinion.
export const RuleBasedChip = (props) => {
  const { dark, border, textSecondary } = useColors();
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      px={2}
      py={0.5}
      borderRadius="full"
      border="1px solid"
      borderColor={border}
      bg={dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}
      title="No AI key is configured on the server, so this summary comes from fixed rules, not a language model."
      {...props}
    >
      <Text fontSize="10px" fontWeight="600" letterSpacing="0.06em" color={textSecondary} textTransform="uppercase">
        Rule-based · AI narrative off
      </Text>
    </Box>
  );
};
