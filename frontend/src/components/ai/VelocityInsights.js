import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Heading, Text, Spinner, Center } from '@chakra-ui/react';
import { LuSparkles } from 'react-icons/lu';
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

const RISK = {
  on_track: { label: 'On Track', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  at_risk: { label: 'At Risk', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  off_track: { label: 'Off Track', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const VelocityInsights = ({ isOpen, onClose, projectId }) => {
  const { cardBg, panelBg, inputBg, border, textPrimary, textSecondary, textMuted } = useColors();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getVelocityInsights(projectId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const stats = data?.stats;
  const insights = data?.insights;
  const risk = RISK[insights?.riskLevel] || RISK.on_track;

  const MetricCard = ({ label, value, sub }) => (
    <Box bg={inputBg} border="1px solid" borderColor={border} borderRadius="lg" px={4} py={3} flex="1" minW="130px">
      <Text fontSize="xs" color={textMuted} mb={1}>{label}</Text>
      <Text fontSize="xl" fontWeight="bold" color={textPrimary}>{value}</Text>
      {sub && <Text fontSize="xs" color={textSecondary} mt={0.5}>{sub}</Text>}
    </Box>
  );

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="xl" scrollBehavior="inside">
      <DialogBackdrop />
      <DialogContent bg={cardBg} color={textPrimary} maxW="720px">
        <DialogHeader borderBottomColor={border}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box color="#a855f7" display="flex" alignItems="center">
              <LuSparkles size={20} />
            </Box>
            <Heading size="lg" color={textPrimary}>Velocity Intelligence</Heading>
          </Box>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody pb={6}>
          {loading && (
            <Center py={12} flexDirection="column" gap={3}>
              <Spinner size="lg" color="purple.400" />
              <Text color={textSecondary} fontSize="sm">Analyzing your board…</Text>
            </Center>
          )}

          {!loading && error && (
            <Center py={10} flexDirection="column" gap={3}>
              <Text color="red.400">{error}</Text>
              <Button size="sm" onClick={load} variant="outline" borderColor={border} color={textPrimary}>
                Retry
              </Button>
            </Center>
          )}

          {!loading && !error && stats && insights && (
            <Box display="flex" flexDirection="column" gap={5}>
              {/* Verdict */}
              <Box bg={risk.bg} border="1px solid" borderColor={risk.color} borderRadius="lg" px={4} py={3}>
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <Box px={2} py={0.5} borderRadius="md" bg={risk.color} color="white" fontSize="xs" fontWeight="bold">
                    {risk.label}
                  </Box>
                  <Text fontWeight="semibold" color={textPrimary}>{insights.headline}</Text>
                </Box>
                <Text fontSize="sm" color={textSecondary}>{insights.summary}</Text>
                {data.aiAvailable === false && (
                  <Text fontSize="xs" color={textMuted} mt={2}>
                    Showing computed metrics only — set AI_API_KEY (Gemini) to enable AI narrative.
                  </Text>
                )}
              </Box>

              {/* Key metrics */}
              <Box display="flex" gap={3} flexWrap="wrap">
                <MetricCard
                  label="Progress"
                  value={`${stats.totals.done}/${stats.totals.total}`}
                  sub={`${stats.totals.open} open`}
                />
                <MetricCard
                  label="Weekly throughput"
                  value={stats.throughput.weeklyAvg}
                  sub={`${stats.throughput.completedLast7d} done last 7d`}
                />
                <MetricCard
                  label="Avg cycle time"
                  value={stats.cycleTime.avgDays != null ? `${stats.cycleTime.avgDays}d` : '—'}
                  sub={stats.cycleTime.sampleSize ? `n=${stats.cycleTime.sampleSize}` : 'no data'}
                />
                <MetricCard
                  label="Projected finish"
                  value={stats.deadlineProjection.projectedDate ? fmtDate(stats.deadlineProjection.projectedDate) : '—'}
                  sub={
                    stats.deadlineProjection.deadline
                      ? stats.deadlineProjection.willMiss
                        ? `misses deadline by ${Math.abs(stats.deadlineProjection.slackDays ?? 0)}d`
                        : `${stats.deadlineProjection.slackDays ?? 0}d of slack`
                      : 'no deadline set'
                  }
                />
              </Box>

              {/* Estimate coverage / remaining effort */}
              <Box bg={panelBg} border="1px solid" borderColor={border} borderRadius="lg" px={4} py={3}>
                <Text fontSize="sm" color={textPrimary}>
                  <Text as="span" fontWeight="bold" color={stats.estimates.coveragePct < 50 ? '#f59e0b' : '#10b981'}>
                    {stats.estimates.coveragePct}%
                  </Text>{' '}
                  of tasks have a time estimate
                  {stats.estimates.openEstimatedHrs > 0
                    ? ` · ~${stats.estimates.openEstimatedHrs}h of planned effort remaining in open tasks.`
                    : '.'}
                </Text>
              </Box>

              {/* Insights */}
              {insights.insights?.length > 0 && (
                <Box>
                  <Heading size="sm" color={textPrimary} mb={2}>Insights</Heading>
                  <Box display="flex" flexDirection="column" gap={2}>
                    {insights.insights.map((it, i) => (
                      <Box key={i} display="flex" gap={2} alignItems="flex-start">
                        <Text color="purple.400">•</Text>
                        <Text fontSize="sm" color={textSecondary}>{it}</Text>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Recommendations */}
              {insights.recommendations?.length > 0 && (
                <Box>
                  <Heading size="sm" color={textPrimary} mb={2}>Recommended actions</Heading>
                  <Box display="flex" flexDirection="column" gap={2}>
                    {insights.recommendations.map((rec, i) => (
                      <Box key={i} display="flex" gap={2} alignItems="flex-start">
                        <Text color="#10b981">✓</Text>
                        <Text fontSize="sm" color={textSecondary}>{rec}</Text>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Workload */}
              {stats.workload?.length > 0 && (
                <Box>
                  <Heading size="sm" color={textPrimary} mb={2}>Workload (open tasks)</Heading>
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    {stats.workload.map((w, i) => (
                      <Box key={i} display="flex" justifyContent="space-between" fontSize="sm">
                        <Text color={textSecondary}>{w.user}</Text>
                        <Text color={textMuted}>
                          {w.openCount} open{w.overdueCount > 0 ? ` · ${w.overdueCount} overdue` : ''}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};

export default VelocityInsights;
