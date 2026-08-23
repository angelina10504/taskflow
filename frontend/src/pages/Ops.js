import React, { useState, useEffect, useCallback } from 'react';
import { Box, Heading, Text, Button, Spinner } from '@chakra-ui/react';
import { format } from 'date-fns';
import { LuRefreshCw, LuActivity } from 'react-icons/lu';
import * as aiService from '../services/aiService';
import useColors from '../hooks/useColors';
import { AIHallmark, AIThread, gold } from '../components/ai/primitives';

// AI Ops: production observability for every LLM feature. The backend logs
// each model call content-free (tokens, latency, outcome — never prompt or
// response text), so system-wide metrics are safe to show any signed-in user.

const FEATURE_LABEL = {
  velocity: 'Velocity intel',
  command: 'Command dock',
  quick_add: 'Quick add',
  extract: 'Notes extract',
  decompose: 'Planner',
  ask: 'Ask board',
  today: 'Today plan',
  health: 'Risk radar',
};

const OUTCOME_COLOR = {
  ok: { light: '#16a34a', dark: '#4ade80', label: 'ok' },
  error: { light: '#dc2626', dark: '#f87171', label: 'error' },
  rejected: { light: '#ea580c', dark: '#fb923c', label: 'rejected' },
};

const fmtTokens = (n = 0) =>
  n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtMs = (ms = 0) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);

const OutcomeChip = ({ outcome }) => {
  const { dark } = useColors();
  const g = gold(dark);
  const c = outcome === 'cache' ? g.text : (dark ? OUTCOME_COLOR[outcome]?.dark : OUTCOME_COLOR[outcome]?.light) || g.text;
  const label = outcome === 'cache' ? 'cache hit' : OUTCOME_COLOR[outcome]?.label || outcome;
  return (
    <Box display="inline-flex" alignItems="center" gap={1.5} flexShrink={0}>
      <Box w="6px" h="6px" borderRadius="full" style={{ background: c }} />
      <Text fontSize="11px" fontWeight="600" letterSpacing="0.04em" style={{ color: c }}>
        {label}
      </Text>
    </Box>
  );
};

const StatCard = ({ label, value, sub, valueColor }) => {
  const { cardBg, border, textPrimary, textSecondary, textMuted } = useColors();
  return (
    <Box bg={cardBg} border="1px solid" borderColor={border} borderRadius="xl" p={4}>
      <Text fontSize="xs" color={textSecondary} fontWeight="600" letterSpacing="0.04em" mb={1}>
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="700" color={valueColor || textPrimary} lineHeight={1.1}>
        {value}
      </Text>
      {sub && (
        <Text fontSize="xs" color={textMuted} mt={1}>
          {sub}
        </Text>
      )}
    </Box>
  );
};

const Ops = () => {
  const { dark, cardBg, border, textPrimary, textSecondary, textMuted } = useColors();
  const g = gold(dark);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await aiService.getAiOps();
      setData(res);
      setError(null);
    } catch (e) {
      if (!silent) setError(e.message || 'Could not load AI operations');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Ops pages should feel live — refresh quietly in the background.
  useEffect(() => {
    const id = setInterval(() => load(true), 60000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="60vh">
        <Spinner size="lg" color="brand.500" />
      </Box>
    );
  }

  const pct = data?.today?.pctBudget ?? 0;
  const barColor = pct >= 85 ? '#dc2626' : pct >= 60 ? '#ea580c' : g.base;
  const maxDay = Math.max(1, ...(data?.tokensByDay || []).map((d) => d.tokens));
  const quiet = data && data.week.calls === 0 && data.recent.length === 0;
  const degradedColor =
    data?.week?.degradedRate > 10 ? (dark ? '#f87171' : '#dc2626') : data?.week?.degradedRate > 0 ? (dark ? '#fb923c' : '#ea580c') : undefined;

  return (
    <Box p={{ base: 4, md: 8 }} maxW="960px" mx="auto">
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={1}>
        <Box display="flex" alignItems="baseline" gap={3}>
          <Heading size="2xl" color={textPrimary} letterSpacing="-0.02em">
            AI Ops
          </Heading>
          <AIHallmark label="observability" />
        </Box>
        <Box display="flex" alignItems="center" gap={3}>
          {data && (
            <Text fontSize="xs" color={textMuted}>
              as of {format(new Date(data.generatedAt), 'h:mm a')}
            </Text>
          )}
          <Button size="xs" variant="outline" onClick={() => load()}>
            <LuRefreshCw size={12} /> Refresh
          </Button>
        </Box>
      </Box>
      <Text fontSize="sm" color={textSecondary} mb={5}>
        Every model call, logged content-free — tokens, latency, and what the code did with the output.
      </Text>

      {error && (
        <Box bg={cardBg} border="1px solid" borderColor={border} borderRadius="xl" p={4} display="flex" alignItems="center" justifyContent="space-between">
          <Text fontSize="sm" color={dark ? '#f87171' : '#dc2626'}>{error}</Text>
          <Button size="xs" variant="outline" onClick={() => load()}>
            Retry
          </Button>
        </Box>
      )}

      {quiet && (
        <AIThread bg={cardBg} border="1px solid" borderColor={border} borderRadius="xl" p={6} textAlign="center">
          <Box display="inline-flex" color={g.text} mb={2}>
            <LuActivity size={20} />
          </Box>
          <Text fontSize="sm" color={textPrimary} fontWeight="600" mb={1}>
            Nothing logged yet
          </Text>
          <Text fontSize="sm" color={textSecondary} maxW="440px" mx="auto">
            Every model call lands here the moment one happens — refresh your Today plan, run a ⌘K command, or ask a
            board a question, then come back.
          </Text>
        </AIThread>
      )}

      {data && !quiet && (
        <>
          {/* Daily budget — the number that prevents production 429s. */}
          <AIThread bg={cardBg} border="1px solid" borderColor={border} borderRadius="xl" p={4} mb={3}>
            <Box display="flex" alignItems="baseline" justifyContent="space-between" mb={2}>
              <Text fontSize="xs" color={textSecondary} fontWeight="600" letterSpacing="0.04em">
                TODAY&apos;S TOKEN BUDGET
              </Text>
              <Text fontSize="sm" color={textPrimary}>
                <Text as="span" fontWeight="700">
                  {fmtTokens(data.today.tokens)}
                </Text>{' '}
                <Text as="span" color={textMuted}>
                  of {fmtTokens(data.budget)} · {pct}%
                </Text>
              </Text>
            </Box>
            <Box h="8px" borderRadius="full" overflow="hidden" bg={dark ? '#2a3244' : 'gray.100'}>
              <Box h="100%" borderRadius="full" style={{ width: `${Math.max(pct, data.today.tokens > 0 ? 2 : 0)}%`, background: barColor, transition: 'width 0.4s' }} />
            </Box>
            <Box display="flex" gap={4} mt={2} flexWrap="wrap">
              <Text fontSize="xs" color={textMuted}>
                est. ${data.today.cost.toFixed(4)} today
              </Text>
              {data.today.cacheHits > 0 && (
                <Text fontSize="xs" style={{ color: g.text }}>
                  {data.today.cacheHits} call{data.today.cacheHits === 1 ? '' : 's'} saved by cache
                </Text>
              )}
              {data.today.rejected > 0 && (
                <Text fontSize="xs" color={dark ? '#fb923c' : '#ea580c'}>
                  {data.today.rejected} output{data.today.rejected === 1 ? '' : 's'} rejected by validation
                </Text>
              )}
              {data.today.errors > 0 && (
                <Text fontSize="xs" color={dark ? '#f87171' : '#dc2626'}>
                  {data.today.errors} provider error{data.today.errors === 1 ? '' : 's'}
                </Text>
              )}
            </Box>
          </AIThread>

          <Box display="grid" gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={3}>
            <StatCard label="Calls today" value={data.today.calls} sub={`${data.week.calls} in the last 7 days`} />
            <StatCard label="Avg latency" value={fmtMs(data.week.avgMs)} sub="per call · 7 days" />
            <StatCard label="Est. cost" value={`$${data.week.cost.toFixed(3)}`} sub="last 7 days" />
            <StatCard
              label="Degraded"
              value={`${data.week.degradedRate}%`}
              sub="errors + rejected outputs"
              valueColor={degradedColor}
            />
          </Box>

          <Box display="grid" gridTemplateColumns={{ base: '1fr', lg: '2fr 3fr' }} gap={3} mb={3}>
            {/* 7-day token spend */}
            <Box bg={cardBg} border="1px solid" borderColor={border} borderRadius="xl" p={4}>
              <Text fontSize="xs" color={textSecondary} fontWeight="600" letterSpacing="0.04em" mb={3}>
                TOKENS · LAST 7 DAYS
              </Text>
              <svg viewBox="0 0 280 110" width="100%" role="img" aria-label="Token spend per day">
                {data.tokensByDay.map((d, i) => {
                  const h = Math.round((d.tokens / maxDay) * 62);
                  const x = 10 + i * 38;
                  return (
                    <g key={d.date}>
                      <rect x={x} y={88 - h} width="26" height={Math.max(h, d.tokens > 0 ? 3 : 1)} rx="3" fill={d.tokens > 0 ? g.base : dark ? '#2a3244' : '#e2e8f0'} opacity={d.tokens > 0 ? 0.9 : 0.6} />
                      {d.tokens > 0 && (
                        <text x={x + 13} y={80 - h} textAnchor="middle" fontSize="9" fill={g.text} fontWeight="600">
                          {fmtTokens(d.tokens)}
                        </text>
                      )}
                      <text x={x + 13} y={102} textAnchor="middle" fontSize="9" fill={dark ? '#64748b' : '#94a3b8'}>
                        {String(Number(d.date.slice(8)))}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </Box>

            {/* Per-feature rollup */}
            <Box bg={cardBg} border="1px solid" borderColor={border} borderRadius="xl" p={4}>
              <Text fontSize="xs" color={textSecondary} fontWeight="600" letterSpacing="0.04em" mb={2}>
                BY FEATURE · 7 DAYS
              </Text>
              {data.features.length === 0 && (
                <Text fontSize="sm" color={textMuted} py={4}>
                  No calls in the last 7 days.
                </Text>
              )}
              {data.features.map((f) => {
                const maxTokens = Math.max(1, ...data.features.map((x) => x.tokens));
                return (
                  <Box key={f.feature} py={2} borderBottom="1px solid" borderColor={dark ? '#232b3d' : 'gray.100'} _last={{ borderBottom: 'none' }}>
                    <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={2}>
                      <Text fontSize="sm" fontWeight="600" color={textPrimary}>
                        {FEATURE_LABEL[f.feature] || f.feature}
                      </Text>
                      <Text fontSize="xs" color={textSecondary} whiteSpace="nowrap">
                        {f.calls} call{f.calls === 1 ? '' : 's'} · {fmtTokens(f.tokens)} tok · {fmtMs(f.avgMs)} avg · {fmtMs(f.p95Ms)} p95
                      </Text>
                    </Box>
                    <Box h="2px" borderRadius="full" mt={1.5} bg={dark ? '#232b3d' : 'gray.100'}>
                      <Box h="100%" borderRadius="full" style={{ width: `${Math.max((f.tokens / maxTokens) * 100, 2)}%`, background: g.base, opacity: 0.7 }} />
                    </Box>
                    {(f.errors > 0 || f.rejected > 0 || f.cacheHits > 0) && (
                      <Box display="flex" gap={3} mt={1}>
                        {f.errors > 0 && (
                          <Text fontSize="11px" color={dark ? '#f87171' : '#dc2626'}>
                            {f.errors} error{f.errors === 1 ? '' : 's'}
                          </Text>
                        )}
                        {f.rejected > 0 && (
                          <Text fontSize="11px" color={dark ? '#fb923c' : '#ea580c'}>
                            {f.rejected} rejected
                          </Text>
                        )}
                        {f.cacheHits > 0 && (
                          <Text fontSize="11px" style={{ color: g.text }}>
                            {f.cacheHits} cache hit{f.cacheHits === 1 ? '' : 's'}
                          </Text>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Recent calls */}
          <Box bg={cardBg} border="1px solid" borderColor={border} borderRadius="xl" p={4} mb={3}>
            <Text fontSize="xs" color={textSecondary} fontWeight="600" letterSpacing="0.04em" mb={2}>
              RECENT
            </Text>
            {data.recent.slice(0, 12).map((r, i) => (
              <Box
                key={`${r.at}-${i}`}
                display="flex"
                alignItems="center"
                gap={3}
                py={1.5}
                borderBottom="1px solid"
                borderColor={dark ? '#232b3d' : 'gray.100'}
                _last={{ borderBottom: 'none' }}
              >
                <Text fontSize="xs" color={textMuted} w="64px" flexShrink={0}>
                  {format(new Date(r.at), 'h:mm a')}
                </Text>
                <Text fontSize="sm" color={textPrimary} fontWeight="500" w="120px" flexShrink={0}>
                  {FEATURE_LABEL[r.feature] || r.feature}
                </Text>
                <OutcomeChip outcome={r.outcome} />
                <Text fontSize="xs" color={textMuted} flex="1" truncate>
                  {r.detail || ''}
                </Text>
                {(r.outcome === 'ok' || r.outcome === 'error') && (
                  <Text fontSize="xs" color={textSecondary} whiteSpace="nowrap">
                    {fmtTokens(r.tokens)} tok · {fmtMs(r.latencyMs)}
                  </Text>
                )}
              </Box>
            ))}
            {data.recent.length > 12 && (
              <Text fontSize="xs" color={textMuted} mt={2}>
                …and more in the last 7 days.
              </Text>
            )}
          </Box>

          <Text fontSize="xs" color={textMuted}>
            Rows store zero prompt or response content and expire after 30 days. Cost is an estimate from published
            per-token rates.
          </Text>
        </>
      )}
    </Box>
  );
};

export default Ops;
