import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Text, Spinner } from '@chakra-ui/react';
import { LuSearch, LuCornerDownLeft } from 'react-icons/lu';
import useColors from '../../hooks/useColors';
import * as aiService from '../../services/aiService';
import { AIHallmark, AIThread, gold } from './primitives';

// Global semantic search: a ⌘⇧K command palette over every board the user
// belongs to. Runs on the local embedding index — matches by meaning, no
// LLM call, so it's fast and free.

const STATUS_LABEL = { todo: 'To do', in_progress: 'In progress', in_review: 'In review', done: 'Done' };
const PRIORITY_DOT = { low: '#94a3b8', medium: '#eab308', high: '#f97316', urgent: '#ef4444' };

const EXAMPLES = ['login bug', 'calendar invites', 'things due for the demo'];

const GlobalSearchPalette = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { dark, panelBg, border, hoverBg, textPrimary, textSecondary, textMuted } = useColors();
  const g = gold(dark);

  const [q, setQ] = useState('');
  const [results, setResults] = useState(null); // null = untouched, [] = no hits
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const seqRef = useRef(0);

  // Reset per open + grab focus.
  useEffect(() => {
    if (isOpen) {
      setQ('');
      setResults(null);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const runSearch = useCallback(async (text) => {
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const res = await aiService.globalSearch(text);
      if (seq === seqRef.current) {
        setResults(res.results || []);
        setActive(0);
      }
    } catch {
      if (seq === seqRef.current) setResults([]);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  // Debounced search-as-you-type.
  useEffect(() => {
    if (!isOpen) return;
    clearTimeout(debounceRef.current);
    const text = q.trim();
    if (text.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(text), 350);
    return () => clearTimeout(debounceRef.current);
  }, [q, isOpen, runSearch]);

  const openResult = useCallback(
    (r) => {
      if (!r?.project?._id) return;
      onClose();
      navigate(`/projects/${r.project._id}`);
    },
    [navigate, onClose]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown' && results?.length) {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results?.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results?.length) {
      e.preventDefault();
      openResult(results[active]);
    }
  };

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={1500}
      bg="rgba(10,6,10,0.55)"
      style={{ backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      display="flex"
      alignItems="flex-start"
      justifyContent="center"
      pt="14vh"
      px={4}
    >
      <AIThread
        thinking={loading}
        w="100%"
        maxW="620px"
        bg={panelBg}
        border="1px solid"
        borderColor={g.ring}
        borderRadius="xl"
        boxShadow={dark ? '0 24px 64px rgba(0,0,0,0.6)' : '0 24px 64px rgba(46,10,24,0.25)'}
        overflow="hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Input row */}
        <Box display="flex" alignItems="center" gap={3} px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <LuSearch size={16} color={g.base} strokeWidth={2.5} />
          <Box
            as="input"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search every board by meaning…"
            aria-label="Search all boards"
            flex="1"
            bg="transparent"
            border="none"
            outline="none"
            fontSize="md"
            color={textPrimary}
            _placeholder={{ color: textMuted }}
          />
          {loading ? (
            <Spinner size="sm" color={g.base} />
          ) : (
            <AIHallmark label="Semantic" size="xs" />
          )}
        </Box>

        {/* Body */}
        <Box maxH="52vh" overflowY="auto">
          {results === null && (
            <Box px={4} py={5}>
              <Text fontSize="sm" color={textSecondary} mb={3}>
                Finds tasks by what they <Text as="span" fontStyle="italic">mean</Text>, not just the words —
                across all your workspaces. Try:
              </Text>
              <Box display="flex" gap={2} flexWrap="wrap">
                {EXAMPLES.map((ex) => (
                  <Box
                    key={ex}
                    as="button"
                    onClick={() => setQ(ex)}
                    px={3}
                    py={1.5}
                    borderRadius="full"
                    border="1px solid"
                    borderColor={border}
                    bg="transparent"
                    fontSize="xs"
                    color={textSecondary}
                    cursor="pointer"
                    _hover={{ borderColor: g.base, color: textPrimary, bg: g.tint }}
                  >
                    {ex}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {results !== null && results.length === 0 && !loading && (
            <Text px={4} py={6} fontSize="sm" color={textSecondary} textAlign="center">
              No matches across your boards — try describing it differently.
            </Text>
          )}

          {results?.map((r, i) => (
            <Box
              key={r._id}
              onClick={() => openResult(r)}
              onMouseEnter={() => setActive(i)}
              display="flex"
              alignItems="center"
              gap={3}
              px={4}
              py={2.5}
              cursor="pointer"
              bg={i === active ? hoverBg : 'transparent'}
              borderLeft="2px solid"
              style={{ borderLeftColor: i === active ? g.base : 'transparent' }}
            >
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                flexShrink={0}
                style={{ background: PRIORITY_DOT[r.priority] || '#94a3b8' }}
                title={`${r.priority} priority`}
              />
              <Box flex="1" minW={0}>
                <Text fontSize="sm" fontWeight="500" color={textPrimary} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {r.title}
                </Text>
                <Text fontSize="xs" color={textMuted} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {r.project?.icon} {r.project?.name}
                  {r.workspace?.name ? ` · ${r.workspace.name}` : ''}
                  {' · '}
                  {STATUS_LABEL[r.status] || r.status}
                </Text>
              </Box>
              <Text fontSize="xs" fontWeight="600" color={g.text} flexShrink={0}>
                {Math.round((r.score || 0) * 100)}%
              </Text>
              {i === active && <LuCornerDownLeft size={13} color={g.base} style={{ flexShrink: 0 }} />}
            </Box>
          ))}
        </Box>

        {/* Footer hints */}
        <Box display="flex" gap={4} px={4} py={2} borderTop="1px solid" borderColor={border}>
          <Text fontSize="10px" color={textMuted}>↑↓ navigate</Text>
          <Text fontSize="10px" color={textMuted}>↵ open board</Text>
          <Text fontSize="10px" color={textMuted}>esc close</Text>
          <Text fontSize="10px" color={textMuted} ml="auto">matches by meaning · local embeddings</Text>
        </Box>
      </AIThread>
    </Box>
  );
};

export default GlobalSearchPalette;
