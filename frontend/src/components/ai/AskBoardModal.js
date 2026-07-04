import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Heading, Text, Input } from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogCloseTrigger,
} from '../ui/dialog';
import { LuSearch, LuDiamond, LuCornerDownLeft } from 'react-icons/lu';
import { toaster } from '../ui/toaster';
import * as aiService from '../../services/aiService';
import useColors from '../../hooks/useColors';

const PRIORITY_DOT = {
  low: '#d1d5db',
  medium: '#9ca3af',
  high: '#f59e0b',
  urgent: '#ef4444',
};

const STATUS_LABEL = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
};

const EXAMPLES = ['What is overdue?', "What's in review right now?", 'What should we finish first?'];

// Grounded Q&A over the project's tasks (RAG): the question is embedded, the
// closest tasks are retrieved, and the model answers ONLY from them, citing
// [n]. With no AI key it degrades to pure semantic search — retrieval is local.
const AskBoardModal = ({ isOpen, onClose, projectId }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { answer, cited, sources, aiAvailable }
  const inputRef = useRef(null);
  const { cardBg, inputBg, border, hoverBg, textPrimary, textSecondary, textMuted } = useColors();

  useEffect(() => {
    if (isOpen) {
      setQuestion('');
      setResult(null);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const handleAsk = async (q) => {
    const text = (q ?? question).trim();
    if (!text || loading) return;
    setQuestion(text);
    setLoading(true);
    try {
      const res = await aiService.askBoard(projectId, text);
      setResult(res);
    } catch (error) {
      toaster.create({
        title: 'Ask failed',
        description: error.message || 'Something went wrong',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Answers cite tasks inline as [n] — render those as little indigo chips
  // that visually match the numbered source cards below.
  const renderAnswer = (answer) =>
    String(answer)
      .split(/(\[\d+\])/g)
      .map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
        return (
          <Box
            key={i}
            as="span"
            display="inline-block"
            px={1.5}
            mx={0.5}
            borderRadius="sm"
            fontSize="xs"
            fontWeight="700"
            bg="rgba(122,31,61,0.16)"
            color="#cd6785"
          >
            {m[1]}
          </Box>
        );
      });

  const citedSet = new Set(result?.cited || []);

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <DialogBackdrop />
      <DialogContent bg={cardBg} color={textPrimary} maxW="640px">
        <DialogHeader borderBottomColor={border}>
          <Box display="flex" alignItems="center" gap={2.5}>
            <Box color="#cda440" display="flex">
              <LuSearch size={18} />
            </Box>
            <Heading size="lg" color={textPrimary}>
              Ask your board
            </Heading>
          </Box>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <Text fontSize="sm" color={textSecondary} mb={3}>
            Search by meaning, or ask a question — answers come only from the tasks on this board
            and cite their sources.
          </Text>

          <Box display="flex" gap={2} mb={3}>
            <Input
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder='e.g. "payment bug" or "what is blocking the launch?"'
              bg={inputBg}
              color={textPrimary}
              borderColor={border}
              fontSize="sm"
              disabled={loading}
              _focus={{ borderColor: 'rgba(184,137,43,0.5)', boxShadow: '0 0 0 3px rgba(184,137,43,0.12)' }}
              _placeholder={{ color: textMuted }}
            />
            <Button
              onClick={() => handleAsk()}
              disabled={!question.trim() || loading}
              flexShrink={0}
              color="white"
              style={{ background: 'linear-gradient(to right, #06b6d4, #7a1f3d)' }}
              _hover={{ opacity: 0.9 }}
            >
              {loading ? 'Thinking…' : (
                <>
                  <LuCornerDownLeft size={14} /> Ask
                </>
              )}
            </Button>
          </Box>

          {!result && !loading && (
            <Box display="flex" gap={2} flexWrap="wrap">
              {EXAMPLES.map((ex) => (
                <Box
                  key={ex}
                  as="button"
                  onClick={() => handleAsk(ex)}
                  px={2.5}
                  py={1}
                  borderRadius="full"
                  border="1px solid"
                  borderColor={border}
                  bg="transparent"
                  color={textSecondary}
                  fontSize="xs"
                  cursor="pointer"
                  _hover={{ bg: hoverBg, color: textPrimary }}
                >
                  {ex}
                </Box>
              ))}
            </Box>
          )}

          {result && (
            <>
              {result.answer ? (
                <Box
                  px={4}
                  py={3}
                  mb={3}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="rgba(184,137,43,0.45)"
                  bg="rgba(184,137,43,0.07)"
                >
                  <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                    <LuDiamond size={12} color="#cda440" strokeWidth={2.5} />
                    <Text fontSize="xs" fontWeight="700" color="#b8892b" letterSpacing="0.08em">
                      ANSWER — grounded in {result.sources.length} task
                      {result.sources.length === 1 ? '' : 's'}
                    </Text>
                  </Box>
                  <Text fontFamily="ai" fontSize="sm" color={textPrimary} lineHeight="1.7">
                    {renderAnswer(result.answer)}
                  </Text>
                </Box>
              ) : (
                result.aiAvailable === false &&
                result.sources.length > 0 && (
                  <Text fontSize="xs" color={textMuted} mb={2}>
                    AI key not configured — showing semantic matches only.
                  </Text>
                )
              )}

              {result.sources.length === 0 ? (
                <Text fontSize="sm" color={textMuted}>
                  No matching tasks on this board yet — try different words, or add some tasks
                  first.
                </Text>
              ) : (
                <>
                  <Text fontSize="xs" fontWeight="600" color={textMuted} mb={1.5} letterSpacing="0.05em">
                    SOURCES · BEST MATCHES
                  </Text>
                  <Box display="flex" flexDirection="column" gap={1.5} maxH="300px" overflowY="auto">
                    {result.sources.map((s, idx) => {
                      const n = idx + 1;
                      const cited = citedSet.has(n);
                      return (
                        <Box
                          key={s._id}
                          display="flex"
                          gap={2.5}
                          px={3}
                          py={2}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={cited ? '#7a1f3d' : border}
                          bg={cited ? 'rgba(122,31,61,0.06)' : 'transparent'}
                        >
                          <Box
                            mt="1px"
                            w="18px"
                            h="18px"
                            flexShrink={0}
                            borderRadius="sm"
                            fontSize="xs"
                            fontWeight="700"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            bg={cited ? '#7a1f3d' : hoverBg}
                            color={cited ? 'white' : textMuted}
                          >
                            {n}
                          </Box>
                          <Box flex={1} minW={0}>
                            <Text fontSize="sm" fontWeight="500" color={textPrimary} lineClamp={1}>
                              {s.title}
                            </Text>
                            <Box display="flex" gap={2.5} mt={0.5} fontSize="xs" color={textMuted} flexWrap="wrap" alignItems="center">
                              <Text>{STATUS_LABEL[s.status] || s.status}</Text>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Box w="6px" h="6px" borderRadius="full" bg={PRIORITY_DOT[s.priority]} />
                                <Text>{s.priority}</Text>
                              </Box>
                              {s.dueDate && <Text>due {new Date(s.dueDate).toLocaleDateString()}</Text>}
                              {s.assignedTo?.some((u) => u.name) && (
                                <Text>→ {s.assignedTo.map((u) => u.name).filter(Boolean).join(', ')}</Text>
                              )}
                              <Text color="#cda440">{Math.round(s.score * 100)}% match</Text>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter borderTopColor={border}>
          <Button variant="outline" borderColor={border} color={textPrimary} _hover={{ bg: hoverBg }} onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default AskBoardModal;
