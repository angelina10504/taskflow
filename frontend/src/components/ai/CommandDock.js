import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Button, Text, Spinner } from '@chakra-ui/react';
import { LuCornerDownLeft } from 'react-icons/lu';
import useColors from '../../hooks/useColors';
import * as aiService from '../../services/aiService';
import { AIHallmark, AIThread, BRAND_GRADIENT, gold } from './primitives';

// Command the Board, promoted: a docked command line under the board.
// Always visible, Cmd/Ctrl+K focuses it, and every run ends in a visible
// action log — the board never changes silently.

const EXAMPLES = [
  'Move everything in review to done',
  'Assign every unassigned task to me',
  'Set all urgent tasks to high priority',
  'Create a task "Write release notes" due Friday',
];

const CommandDock = ({ projectId, onTasksChanged, focusRef, readOnly = false }) => {
  const { dark, panelBg, border, textPrimary, textSecondary, textMuted, hoverBg } = useColors();
  const g = gold(dark);

  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false); // examples / result flyout
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { reply, actions, aiAvailable, error }
  const [runCount, setRunCount] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Let the page (Cmd+K handler, AI toolbar) summon the dock.
  useEffect(() => {
    if (!focusRef) return;
    focusRef.current = () => {
      setOpen(true);
      inputRef.current?.focus();
    };
    return () => { focusRef.current = null; };
  }, [focusRef]);

  // Click outside closes the flyout.
  useEffect(() => {
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Native focus/blur listeners: React's delegated onFocus can be swallowed
  // by focus-tracking libraries and skips programmatic .focus() edge cases —
  // the flyout must open however focus arrives (click, Tab, ⌘K).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onF = () => { setFocused(true); setOpen(true); };
    const onB = () => setFocused(false);
    el.addEventListener('focus', onF);
    el.addEventListener('blur', onB);
    return () => {
      el.removeEventListener('focus', onF);
      el.removeEventListener('blur', onB);
    };
  }, []);

  const run = useCallback(
    async (text) => {
      const command = (text ?? input).trim();
      if (!command || sending || readOnly) return;
      setInput('');
      setSending(true);
      setOpen(true);
      try {
        const res = await aiService.sendCommand(projectId, command);
        setResult({ command, reply: res.reply, actions: res.actions || [], aiAvailable: res.aiAvailable });
        if (res.tasks && onTasksChanged) onTasksChanged(res.tasks);
      } catch (err) {
        setResult({ command, error: err.message || 'Command failed' });
      } finally {
        setSending(false);
        setRunCount((c) => c + 1);
      }
    },
    [input, sending, readOnly, projectId, onTasksChanged]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      run();
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showExamples = open && !sending && !result;
  const showResult = open && !sending && !!result;

  return (
    <Box ref={containerRef} position="relative" flexShrink={0} mt={4} zIndex={20}>
      {/* ── Flyout above the bar: examples → thinking → action log ── */}
      {(showExamples || showResult || sending) && (
        <Box
          position="absolute"
          bottom="calc(100% + 8px)"
          left={0}
          right={0}
          bg={panelBg}
          border="1px solid"
          borderColor={border}
          borderRadius="lg"
          boxShadow={dark ? '0 12px 32px rgba(0,0,0,0.5)' : '0 12px 32px rgba(46,10,24,0.14)'}
          px={4}
          py={3}
          maxH="38vh"
          overflowY="auto"
          aria-live="polite"
        >
          {sending && (
            <Box display="flex" alignItems="center" gap={3} py={1}>
              <Spinner size="sm" color={g.base} />
              <Text fontFamily="ai" fontStyle="italic" fontSize="sm" color={textSecondary}>
                Working on the board…
              </Text>
            </Box>
          )}

          {showExamples && (
            <Box>
              <Text fontSize="xs" color={textMuted} mb={2}>
                Plain English in, board changes out — it knows your teammates, statuses and priorities. Try:
              </Text>
              <Box display="flex" flexWrap="wrap" gap={2}>
                {EXAMPLES.map((ex) => (
                  <Box
                    key={ex}
                    as="button"
                    type="button"
                    onMouseDown={(e) => e.preventDefault() /* keep input focus */}
                    onClick={() => run(ex)}
                    px={3}
                    py={1.5}
                    borderRadius="full"
                    border="1px solid"
                    borderColor={border}
                    bg="transparent"
                    fontSize="xs"
                    color={textSecondary}
                    cursor="pointer"
                    transition="all 0.15s"
                    _hover={{ borderColor: g.base, color: textPrimary, bg: g.tint }}
                  >
                    {ex}
                  </Box>
                ))}
              </Box>
              <Text fontSize="10px" color={textMuted} mt={2.5}>
                Changes are applied immediately and every one is listed back to you. Deletes only happen when you ask for them explicitly.
              </Text>
            </Box>
          )}

          {showResult && (
            <Box>
              <Text fontSize="xs" color={textMuted} mb={1.5}>
                › {result.command}
              </Text>
              {result.error ? (
                <Text fontSize="sm" color="#ef4444">{result.error}</Text>
              ) : (
                <>
                  <Text fontFamily="ai" fontSize="sm" color={textPrimary} lineHeight={1.55}>
                    {result.reply}
                  </Text>
                  {result.aiAvailable === false && (
                    <Text fontSize="xs" color={textMuted} mt={1.5}>
                      The server has no AI key configured, so command mode is off — nothing on the board was changed.
                    </Text>
                  )}
                  {result.actions?.length > 0 && (
                    <Box mt={2.5} pt={2.5} borderTop="1px dashed" borderColor={border}>
                      <Text fontSize="10px" fontWeight="700" letterSpacing="0.12em" textTransform="uppercase" color={textMuted} mb={1.5}>
                        {result.actions.length} change{result.actions.length === 1 ? '' : 's'} applied
                      </Text>
                      <Box display="flex" flexDirection="column" gap={1}>
                        {result.actions.map((a, j) => (
                          <Box key={j} display="flex" gap={2} alignItems="flex-start">
                            <Text color="#10b981" fontSize="xs" lineHeight="18px">✓</Text>
                            <Text fontSize="xs" color={textSecondary}>{a}</Text>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </>
              )}
              <Box display="flex" alignItems="center" gap={2} mt={2.5}>
                {runCount > 1 && (
                  <Text fontSize="10px" color={textMuted}>{runCount} commands this session</Text>
                )}
                <Text fontSize="10px" color={textMuted} ml="auto">
                  Esc to dismiss
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* ── The bar itself: gold thread + hallmark = not an ordinary input ── */}
      <AIThread
        thinking={sending}
        display="flex"
        alignItems="center"
        gap={3}
        px={4}
        py={2.5}
        bg={panelBg}
        border="1px solid"
        borderColor={focused ? g.ring : border}
        borderRadius="lg"
        boxShadow={focused ? `0 0 0 3px ${g.tint}` : 'none'}
        transition="border-color 0.15s, box-shadow 0.15s"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        cursor="text"
      >
        <AIHallmark label="Command" flexShrink={0} />
        <Box
          as="input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            readOnly
              ? 'Viewers can watch the board, not command it'
              : 'Tell the board what to do — "move everything in review to done"'
          }
          disabled={readOnly || sending}
          aria-label="Command the board"
          flex="1"
          minW="80px"
          bg="transparent"
          border="none"
          outline="none"
          fontSize="sm"
          color={textPrimary}
          _placeholder={{ color: textMuted }}
          _disabled={{ cursor: 'not-allowed', opacity: 0.7 }}
        />
        <Box
          display={{ base: 'none', md: 'flex' }}
          alignItems="center"
          gap={1}
          px={1.5}
          py={0.5}
          borderRadius="md"
          border="1px solid"
          borderColor={border}
          bg={hoverBg}
          flexShrink={0}
          title="Focus the command bar"
        >
          <Text fontSize="10px" color={textMuted} fontWeight="600">
            {navigator.platform?.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'} K
          </Text>
        </Box>
        {!readOnly && (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); run(); }}
            disabled={sending || !input.trim()}
            style={{ background: BRAND_GRADIENT }}
            color="white"
            _hover={{ opacity: 0.9 }}
            px={4}
            flexShrink={0}
          >
            <LuCornerDownLeft size={13} style={{ marginRight: 6 }} />
            Run
          </Button>
        )}
      </AIThread>
    </Box>
  );
};

export default CommandDock;
