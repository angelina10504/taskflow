import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Input, Heading, Text, Spinner } from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogBackdrop,
  DialogCloseTrigger,
} from '../ui/dialog';
import useColors from '../../hooks/useColors';
import * as aiService from '../../services/aiService';

const EXAMPLES = [
  'Move everything in review to done',
  'Set all urgent tasks to high priority',
  'Assign every unassigned task to me',
  'Create a task "Write release notes" due Friday',
];

const CommandBoard = ({ isOpen, onClose, projectId, onTasksChanged }) => {
  const { cardBg, panelBg, inputBg, border, textPrimary, textSecondary, textMuted, hoverBg } = useColors();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]); // { role, text, actions? }
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, sending]);

  const run = async (text) => {
    const command = (text ?? input).trim();
    if (!command || sending) return;
    setInput('');
    setHistory((h) => [...h, { role: 'user', text: command }]);
    setSending(true);
    try {
      const res = await aiService.sendCommand(projectId, command);
      setHistory((h) => [...h, { role: 'assistant', text: res.reply, actions: res.actions || [], aiAvailable: res.aiAvailable }]);
      if (res.tasks && onTasksChanged) onTasksChanged(res.tasks);
    } catch (err) {
      setHistory((h) => [...h, { role: 'assistant', text: err.message || 'Command failed', error: true }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      run();
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="lg" scrollBehavior="inside">
      <DialogBackdrop />
      <DialogContent bg={cardBg} color={textPrimary} maxW="640px">
        <DialogHeader borderBottomColor={border}>
          <Box display="flex" alignItems="center" gap={2}>
            <Text fontSize="xl">⚡</Text>
            <Box>
              <Heading size="lg" color={textPrimary}>Command the Board</Heading>
              <Text fontSize="xs" color={textMuted}>Tell the assistant what to change in plain language.</Text>
            </Box>
          </Box>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody pb={5}>
          {/* History / empty state */}
          <Box
            ref={scrollRef}
            maxH="340px"
            minH="120px"
            overflowY="auto"
            mb={4}
            display="flex"
            flexDirection="column"
            gap={3}
          >
            {history.length === 0 && (
              <Box>
                <Text fontSize="sm" color={textSecondary} mb={2}>Try one of these:</Text>
                <Box display="flex" flexDirection="column" gap={2}>
                  {EXAMPLES.map((ex) => (
                    <Box
                      key={ex}
                      px={3}
                      py={2}
                      borderRadius="md"
                      bg={panelBg}
                      border="1px solid"
                      borderColor={border}
                      fontSize="sm"
                      color={textSecondary}
                      cursor="pointer"
                      _hover={{ borderColor: 'purple.400', color: textPrimary }}
                      onClick={() => run(ex)}
                    >
                      {ex}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {history.map((m, i) =>
              m.role === 'user' ? (
                <Box key={i} alignSelf="flex-end" maxW="85%">
                  <Box
                    px={3}
                    py={2}
                    borderRadius="lg"
                    fontSize="sm"
                    color="white"
                    style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
                  >
                    {m.text}
                  </Box>
                </Box>
              ) : (
                <Box key={i} alignSelf="flex-start" maxW="90%">
                  <Box
                    px={3}
                    py={2}
                    borderRadius="lg"
                    bg={panelBg}
                    border="1px solid"
                    borderColor={m.error ? '#ef4444' : border}
                    fontSize="sm"
                    color={m.error ? '#ef4444' : textPrimary}
                  >
                    {m.text}
                    {m.aiAvailable === false && (
                      <Text fontSize="xs" color={textMuted} mt={1}>
                        Set AI_API_KEY (Gemini) to enable command mode.
                      </Text>
                    )}
                    {m.actions?.length > 0 && (
                      <Box mt={2} display="flex" flexDirection="column" gap={1}>
                        {m.actions.map((a, j) => (
                          <Box key={j} display="flex" gap={2} alignItems="flex-start">
                            <Text color="#10b981" fontSize="xs">✓</Text>
                            <Text fontSize="xs" color={textSecondary}>{a}</Text>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              )
            )}

            {sending && (
              <Box alignSelf="flex-start" display="flex" alignItems="center" gap={2} px={3} py={2}>
                <Spinner size="sm" color="purple.400" />
                <Text fontSize="sm" color={textMuted}>Working on it…</Text>
              </Box>
            )}
          </Box>

          {/* Input */}
          <Box display="flex" gap={2}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Move Tom's urgent tasks to in progress"
              bg={inputBg}
              color={textPrimary}
              borderColor={border}
              _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              disabled={sending}
            />
            <Button
              onClick={() => run()}
              disabled={sending || !input.trim()}
              style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
              color="white"
              _hover={{ opacity: 0.9 }}
              px={6}
            >
              Send
            </Button>
          </Box>
          <Text fontSize="xs" color={textMuted} mt={2} _hover={{ color: textSecondary }} cursor="default">
            The assistant changes your board directly. Review the actions it reports.
          </Text>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};

export default CommandBoard;
