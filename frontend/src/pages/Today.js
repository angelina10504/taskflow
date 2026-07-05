import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Text, Button, Spinner } from '@chakra-ui/react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { LuRefreshCw, LuClock } from 'react-icons/lu';
import * as aiService from '../services/aiService';
import useColors from '../hooks/useColors';
import { AIHallmark, AIThread, RuleBasedChip, gold } from '../components/ai/primitives';

// Today: the AI-planned focus page. Features are computed in code (urgency,
// deadlines, staleness, throughput-based capacity), the model only selects
// and explains, and the plan is cached server-side for the day.

const PRIORITY_DOT = { low: '#94a3b8', medium: '#eab308', high: '#f97316', urgent: '#ef4444' };
const STATUS_LABEL = { todo: 'To do', in_progress: 'In progress', in_review: 'In review' };

const dueLabel = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isToday(d)) return { text: 'due today', overdue: false };
  if (isTomorrow(d)) return { text: 'due tomorrow', overdue: false };
  if (isPast(d)) return { text: `overdue · ${format(d, 'MMM d')}`, overdue: true };
  return { text: `due ${format(d, 'MMM d')}`, overdue: false };
};

const fmtEffort = (min) => (min >= 60 ? `~${Math.round((min / 60) * 10) / 10}h` : `~${min}m`);

const Today = () => {
  const navigate = useNavigate();
  const { dark, panelBg, cardBg, border, textPrimary, textSecondary, textMuted } = useColors();
  const g = gold(dark);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      setData(await aiService.getTodayPlan(refresh));
    } catch (err) {
      setError(err.message || 'Could not load the plan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Box py={6} px={{ base: 4, md: 8 }} maxW="860px" mx="auto">
      <Box display="flex" alignItems="center" gap={3} mb={1} flexWrap="wrap">
        <Heading size="xl" color={textPrimary}>Today</Heading>
        <AIHallmark label="Planned" />
        {data?.aiAvailable === false && <RuleBasedChip />}
        <Text fontSize="sm" color={textMuted} ml="auto">{format(new Date(), 'EEEE, MMMM d')}</Text>
      </Box>

      {/* The briefing — the model's voice, in serif */}
      <AIThread
        thinking={loading}
        bg={panelBg}
        border="1px solid"
        borderColor={border}
        borderRadius="lg"
        px={5}
        py={4}
        mb={5}
      >
        {loading ? (
          <Box display="flex" alignItems="center" gap={3}>
            <Spinner size="sm" color={g.base} />
            <Text fontFamily="ai" fontStyle="italic" fontSize="sm" color={textSecondary}>
              Reading your boards and planning the day…
            </Text>
          </Box>
        ) : error ? (
          <Box display="flex" alignItems="center" gap={3}>
            <Text fontSize="sm" color="red.400" flex="1">{error}</Text>
            <Button size="xs" variant="outline" borderColor={border} color={textPrimary} onClick={() => load()}>
              Retry
            </Button>
          </Box>
        ) : (
          <Text fontFamily="ai" fontSize="md" color={textPrimary} lineHeight={1.65}>
            {data?.briefing}
          </Text>
        )}
      </AIThread>

      {!loading && !error && data && (
        <>
          {data.picks.length === 0 ? (
            <Box bg={panelBg} border="1px solid" borderColor={border} borderRadius="xl" p={10} textAlign="center">
              <Text fontSize="3xl" mb={2}>🌤️</Text>
              <Text fontWeight="medium" color={textPrimary} mb={1}>Nothing scheduled</Text>
              <Text fontSize="sm" color={textSecondary}>Open tasks will show up here, ranked and explained.</Text>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2.5}>
              {data.picks.map((p, i) => {
                const due = dueLabel(p.task?.dueDate);
                return (
                  <Box
                    key={p.task?._id || i}
                    display="flex"
                    gap={4}
                    px={4}
                    py={3.5}
                    bg={cardBg}
                    border="1px solid"
                    borderColor={border}
                    borderRadius="lg"
                    cursor="pointer"
                    transition="all 0.15s"
                    _hover={{ borderColor: 'brand.500', transform: 'translateY(-1px)' }}
                    onClick={() => p.task?.project?._id && navigate(`/projects/${p.task.project._id}`)}
                  >
                    {/* Rank roundel */}
                    <Box
                      w="30px"
                      h="30px"
                      borderRadius="full"
                      flexShrink={0}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="white"
                      fontWeight="800"
                      fontSize="sm"
                      style={{ background: 'linear-gradient(135deg, #7a1f3d, #a83a58)' }}
                    >
                      {i + 1}
                    </Box>
                    <Box flex="1" minW={0}>
                      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        <Text fontWeight="600" fontSize="md" color={textPrimary}>
                          {p.task?.title}
                        </Text>
                        <Box w="7px" h="7px" borderRadius="full" style={{ background: PRIORITY_DOT[p.task?.priority] || '#94a3b8' }} title={`${p.task?.priority} priority`} />
                      </Box>
                      <Text fontFamily="ai" fontStyle="italic" fontSize="sm" color={textSecondary} mt={0.5} lineHeight={1.5}>
                        {p.reason}
                      </Text>
                      <Box display="flex" alignItems="center" gap={3} mt={1.5} flexWrap="wrap">
                        {p.task?.project && (
                          <Text fontSize="xs" color={textMuted}>
                            {p.task.project.icon} {p.task.project.name}
                          </Text>
                        )}
                        {due && (
                          <Text fontSize="xs" fontWeight={due.overdue ? '700' : '400'} color={due.overdue ? '#ef4444' : textMuted}>
                            {due.text}
                          </Text>
                        )}
                        {p.task?.status && (
                          <Text fontSize="xs" color={textMuted}>{STATUS_LABEL[p.task.status] || p.task.status}</Text>
                        )}
                        {p.estimateMin && (
                          <Box
                            display="inline-flex"
                            alignItems="center"
                            gap={1}
                            title={
                              p.estimateSource === 'similar'
                                ? 'Estimated from the median of similar completed tasks (embedding k-NN)'
                                : 'Your estimate on the task'
                            }
                          >
                            <LuClock size={11} color={g.text} />
                            <Text fontSize="xs" color={g.text} fontWeight="600">
                              {fmtEffort(p.estimateMin)}
                              {p.estimateSource === 'similar' ? ' · similar tasks' : ''}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Footer: provenance + controls */}
          <Box display="flex" alignItems="center" gap={3} mt={4} flexWrap="wrap">
            <Text fontSize="xs" color={textMuted}>
              {data.picks.length} of {data.candidateCount} open tasks · capacity {data.capacity} from your recent pace
              {data.cached ? ' · planned earlier today' : ''}
            </Text>
            <Button
              size="xs"
              variant="outline"
              ml="auto"
              borderColor={border}
              color={textSecondary}
              onClick={() => load(true)}
              disabled={loading}
              _hover={{ borderColor: g.base, color: textPrimary, bg: g.tint }}
            >
              <LuRefreshCw size={12} style={{ marginRight: 6 }} />
              Replan
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Today;
