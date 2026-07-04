import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Button, Text, Spinner } from '@chakra-ui/react';
import { LuChevronDown, LuChevronUp, LuRefreshCw } from 'react-icons/lu';
import useColors from '../../hooks/useColors';
import * as aiService from '../../services/aiService';
import { AIHallmark, AIThread, RuleBasedChip, gold } from './primitives';

// Velocity Intelligence, promoted: a persistent panel above the board.
// Collapsed it's a one-line verdict strip fed by the cached health report
// (free — no LLM call); expanding fetches the full /velocity analysis once.

const RISK = {
  on_track: { label: 'On Track', color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  at_risk: { label: 'At Risk', color: '#e07b00', bg: 'rgba(224,123,0,0.10)' },
  off_track: { label: 'Off Track', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';

const RiskPill = ({ level }) => {
  const risk = RISK[level] || RISK.on_track;
  return (
    <Box
      px={2}
      py={0.5}
      borderRadius="md"
      bg={risk.color}
      color="white"
      fontSize="xs"
      fontWeight="bold"
      flexShrink={0}
    >
      {risk.label}
    </Box>
  );
};

const MetricCard = ({ label, value, sub, alert }) => {
  const { inputBg, border, textPrimary, textSecondary, textMuted } = useColors();
  return (
    <Box bg={inputBg} border="1px solid" borderColor={border} borderRadius="lg" px={4} py={3} flex="1" minW="128px">
      <Text fontSize="xs" color={textMuted} mb={1}>{label}</Text>
      <Text fontSize="xl" fontWeight="bold" color={alert ? '#ef4444' : textPrimary} lineHeight={1.1}>
        {value}
      </Text>
      {sub && <Text fontSize="xs" color={textSecondary} mt={1}>{sub}</Text>}
    </Box>
  );
};

// Today → deadline runway with the projected-finish marker: the "will we
// make it" question as one picture.
const DeadlineRunway = ({ projection }) => {
  const { border, textPrimary, textSecondary, textMuted } = useColors();
  const { projectedDate, deadline, willMiss, slackDays } = projection || {};

  if (!projectedDate && !deadline) return null;
  if (!projectedDate) {
    return (
      <Text fontSize="sm" color={textSecondary}>
        Deadline {fmtDate(deadline)} — not enough completed tasks yet to project a finish date.
      </Text>
    );
  }

  const now = Date.now();
  const projMs = new Date(projectedDate).getTime();
  const deadMs = deadline ? new Date(deadline).getTime() : null;
  const span = Math.max(projMs - now, deadMs ? deadMs - now : 0, 1) * 1.15;
  const pos = (ms) => `${Math.min(Math.max(((ms - now) / span) * 100, 0), 97)}%`;
  const good = deadMs ? !willMiss : true;
  const fillColor = good ? '#10b981' : '#ef4444';

  return (
    <Box>
      <Box position="relative" h="44px" mt={1}>
        {/* Track */}
        <Box position="absolute" top="8px" left={0} right={0} h="6px" borderRadius="full" bg={border} />
        {/* Fill: today → projected finish */}
        <Box
          position="absolute"
          top="8px"
          left={0}
          w={pos(projMs)}
          h="6px"
          borderRadius="full"
          bg={fillColor}
          opacity={0.85}
        />
        {/* Projected marker */}
        <Box position="absolute" top="4px" left={pos(projMs)} transform="translateX(-50%)">
          <Box w="14px" h="14px" borderRadius="full" bg={fillColor} border="3px solid" borderColor="white" boxShadow="0 0 0 1px rgba(0,0,0,0.15)" />
          <Text fontSize="10px" color={textPrimary} fontWeight="600" mt={1} whiteSpace="nowrap" transform="translateX(calc(-50% + 7px))" display="inline-block">
            Projected {fmtDate(projectedDate)}
          </Text>
        </Box>
        {/* Deadline tick */}
        {deadMs && (
          <Box position="absolute" top={0} left={pos(deadMs)} transform="translateX(-50%)" textAlign="center">
            <Box w="2px" h="22px" bg={textSecondary} mx="auto" borderRadius="1px" />
            <Text fontSize="10px" color={textSecondary} fontWeight="600" mt={0.5} whiteSpace="nowrap">
              Deadline {fmtDate(deadline)}
            </Text>
          </Box>
        )}
      </Box>
      <Text fontSize="xs" color={textMuted} mt={1}>
        {deadMs
          ? willMiss
            ? `At the current pace this project finishes ~${Math.abs(slackDays ?? 0)} days past the deadline.`
            : `On the current pace there are ~${slackDays ?? 0} days of slack before the deadline.`
          : 'No project deadline set — showing the projected finish at the current pace.'}
      </Text>
    </Box>
  );
};

const SectionTitle = ({ children }) => {
  const { textMuted } = useColors();
  return (
    <Text fontSize="10px" fontWeight="700" letterSpacing="0.12em" textTransform="uppercase" color={textMuted} mb={2}>
      {children}
    </Text>
  );
};

const IntelligencePanel = ({ projectId, socket, expanded, onExpandedChange }) => {
  const { dark, panelBg, inputBg, border, textPrimary, textSecondary, textMuted, hoverBg } = useColors();
  const g = gold(dark);

  const [report, setReport] = useState(null); // cached health scan (cheap)
  const [scanning, setScanning] = useState(false);
  const [data, setData] = useState(null); // full /velocity payload (fetched on expand)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Route can swap projects without remounting — start clean per project.
    fetchedRef.current = false;
    setData(null);
    setError(null);
    setReport(null);
    let active = true;
    aiService
      .getHealthReport(projectId)
      .then((res) => active && setReport(res.report || null))
      .catch(() => {});
    return () => { active = false; };
  }, [projectId]);

  // Live updates: scheduled scans or another member's manual scan arrive
  // through the project's socket room.
  useEffect(() => {
    if (!socket) return;
    const onReport = (r) => setReport(r);
    socket.on('health-report', onReport);
    return () => socket.off('health-report', onReport);
  }, [socket]);

  const loadVelocity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getVelocityInsights(projectId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load the analysis');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch the full analysis the first time the panel opens (once — the
  // narrative costs LLM tokens; Refresh re-runs it on demand).
  useEffect(() => {
    if (expanded && !fetchedRef.current) {
      fetchedRef.current = true;
      loadVelocity();
    }
  }, [expanded, loadVelocity]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await aiService.runHealthScan(projectId);
      if (res.report) setReport(res.report);
    } catch (err) {
      /* non-critical */
    } finally {
      setScanning(false);
    }
  };

  const stats = data?.stats;
  const insights = data?.insights;
  const level = insights?.riskLevel || report?.riskLevel;
  const headline = insights?.headline || report?.headline;

  return (
    <AIThread
      thinking={loading || scanning}
      mb={4}
      flexShrink={0}
      bg={panelBg}
      border="1px solid"
      borderColor={border}
      borderRadius="lg"
      overflow="hidden"
    >
      {/* ── Collapsed strip: always visible, teaches the feature ── */}
      <Box
        as="button"
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        aria-expanded={expanded}
        display="flex"
        alignItems="center"
        gap={3}
        w="100%"
        textAlign="left"
        px={4}
        py={2.5}
        bg="transparent"
        border="none"
        cursor="pointer"
        _hover={{ bg: hoverBg }}
        _focusVisible={{ outline: '2px solid', outlineColor: g.base, outlineOffset: '-2px' }}
      >
        <AIHallmark label="Intelligence" flexShrink={0} />
        {level ? (
          <>
            <RiskPill level={level} />
            <Text
              fontFamily="ai"
              fontSize="sm"
              color={textPrimary}
              flex="1"
              minW="120px"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {headline}
            </Text>
          </>
        ) : (
          <Text fontFamily="ai" fontSize="sm" color={textSecondary} flex="1" minW="120px">
            This board reads itself — velocity, risks and a projected finish. Open the analysis.
          </Text>
        )}
        {report?.createdAt && (
          <Text fontSize="xs" color={textMuted} flexShrink={0} display={{ base: 'none', md: 'block' }}>
            scanned {new Date(report.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
        <Box display="flex" alignItems="center" gap={1} color={g.text} flexShrink={0}>
          <Text fontSize="xs" fontWeight="600">{expanded ? 'Hide' : 'Analysis'}</Text>
          {expanded ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
        </Box>
      </Box>

      {/* ── Expanded: the full read ── */}
      {expanded && (
        <Box px={4} pb={4} pt={1} borderTop="1px solid" borderColor={border} maxH="46vh" overflowY="auto">
          {loading && (
            <Box py={8} display="flex" alignItems="center" justifyContent="center" gap={3}>
              <Spinner size="sm" color={g.base} />
              <Text fontFamily="ai" fontStyle="italic" color={textSecondary} fontSize="sm">
                Reading the board…
              </Text>
            </Box>
          )}

          {!loading && error && (
            <Box py={6} textAlign="center">
              <Text color="red.400" fontSize="sm" mb={3}>{error}</Text>
              <Button size="sm" variant="outline" borderColor={border} color={textPrimary} onClick={loadVelocity}>
                Retry
              </Button>
            </Box>
          )}

          {!loading && !error && stats && stats.totals.total === 0 && (
            <Text py={6} textAlign="center" fontFamily="ai" color={textSecondary} fontSize="sm">
              Nothing to read yet — add a few tasks and the analysis lights up.
            </Text>
          )}

          {!loading && !error && stats && insights && stats.totals.total > 0 && (
            <Box display="flex" flexDirection="column" gap={4} pt={3}>
              {/* The narrative — the AI's voice, in serif, honestly labeled */}
              <Box>
                <Box display="flex" alignItems="center" gap={2} mb={1.5} flexWrap="wrap">
                  <RiskPill level={insights.riskLevel} />
                  <Text fontFamily="ai" fontSize="lg" fontWeight="600" color={textPrimary} lineHeight={1.3}>
                    {insights.headline}
                  </Text>
                  {data.aiAvailable === false && <RuleBasedChip ml="auto" />}
                </Box>
                <Text fontFamily="ai" fontSize="sm" color={textSecondary} lineHeight={1.6}>
                  {insights.summary}
                </Text>
              </Box>

              {/* Hard numbers — computed in code, never by the model */}
              <Box display="flex" gap={2.5} flexWrap="wrap">
                <MetricCard
                  label="Progress"
                  value={`${stats.totals.done}/${stats.totals.total}`}
                  sub={`${stats.totals.open} open`}
                />
                <MetricCard
                  label="Throughput"
                  value={`${stats.throughput.weeklyAvg}/wk`}
                  sub={`${stats.throughput.completedLast7d} done last 7d`}
                />
                <MetricCard
                  label="Cycle time"
                  value={stats.cycleTime.avgDays != null ? `${stats.cycleTime.avgDays}d` : '—'}
                  sub={stats.cycleTime.medianDays != null ? `median ${stats.cycleTime.medianDays}d` : 'no completions yet'}
                />
                <MetricCard
                  label="Overdue"
                  value={stats.overdue.length}
                  sub={stats.overdue.length ? `worst by ${stats.overdue[0].daysOverdue}d` : 'all on time'}
                  alert={stats.overdue.length > 0}
                />
                <MetricCard
                  label="Stale"
                  value={stats.staleInProgress.length}
                  sub="in progress, 5+ days idle"
                  alert={stats.staleInProgress.length > 0}
                />
                <MetricCard
                  label="Estimated"
                  value={`${stats.estimates.coveragePct}%`}
                  sub={stats.estimates.openEstimatedHrs > 0 ? `~${stats.estimates.openEstimatedHrs}h left planned` : 'of tasks have estimates'}
                />
              </Box>

              {/* Runway */}
              <Box bg={inputBg} border="1px solid" borderColor={border} borderRadius="lg" px={4} py={3}>
                <SectionTitle>Projected finish vs. deadline</SectionTitle>
                <DeadlineRunway projection={stats.deadlineProjection} />
              </Box>

              {/* What the model noticed / what to do about it */}
              <Box display="flex" gap={4} flexWrap="wrap">
                {insights.insights?.length > 0 && (
                  <Box flex="1" minW="240px">
                    <SectionTitle>Signals</SectionTitle>
                    <Box display="flex" flexDirection="column" gap={1.5}>
                      {insights.insights.map((it, i) => (
                        <Box key={i} display="flex" gap={2} alignItems="flex-start">
                          <Text color={g.text} fontSize="xs" lineHeight="20px">◆</Text>
                          <Text fontSize="sm" color={textSecondary}>{it}</Text>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
                {insights.recommendations?.length > 0 && (
                  <Box flex="1" minW="240px">
                    <SectionTitle>Recommended moves</SectionTitle>
                    <Box display="flex" flexDirection="column" gap={1.5}>
                      {insights.recommendations.map((rec, i) => (
                        <Box key={i} display="flex" gap={2} alignItems="flex-start">
                          <Text color="#10b981" fontSize="sm" lineHeight="20px">✓</Text>
                          <Text fontSize="sm" color={textSecondary}>{rec}</Text>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Who's carrying what */}
              {stats.workload?.length > 0 && (
                <Box>
                  <SectionTitle>Workload — open tasks</SectionTitle>
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    {stats.workload.map((w, i) => {
                      const max = stats.workload[0].openCount || 1;
                      return (
                        <Box key={i} display="flex" alignItems="center" gap={3} fontSize="sm">
                          <Text color={textSecondary} w="132px" flexShrink={0} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                            {w.user}
                          </Text>
                          <Box flex="1" h="6px" borderRadius="full" bg={border} overflow="hidden">
                            <Box w={`${(w.openCount / max) * 100}%`} h="100%" bg="brand.500" opacity={0.75} borderRadius="full" />
                          </Box>
                          <Text color={textMuted} fontSize="xs" flexShrink={0} w="120px" textAlign="right">
                            {w.openCount} open{w.overdueCount > 0 ? ` · ${w.overdueCount} overdue` : ''}
                          </Text>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Footer: freshness + controls */}
              <Box display="flex" alignItems="center" gap={3} pt={1}>
                <Text fontSize="xs" color={textMuted}>
                  Metrics computed from live board data · narrative {data.aiAvailable === false ? 'rule-based' : 'by the model'} · {new Date(stats.generatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Button
                  size="xs"
                  variant="outline"
                  ml="auto"
                  borderColor={border}
                  color={textSecondary}
                  onClick={loadVelocity}
                  disabled={loading}
                >
                  <LuRefreshCw size={12} style={{ marginRight: 6 }} />
                  Refresh analysis
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  borderColor={border}
                  color={textSecondary}
                  onClick={runScan}
                  disabled={scanning}
                >
                  {scanning ? <Spinner size="xs" /> : 'Rescan health'}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </AIThread>
  );
};

export default IntelligencePanel;
