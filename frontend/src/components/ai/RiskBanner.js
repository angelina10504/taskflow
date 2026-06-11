import React, { useState, useEffect } from 'react';
import { Box, Button, Text, Spinner } from '@chakra-ui/react';
import { LuActivity } from 'react-icons/lu';
import useColors from '../../hooks/useColors';
import * as aiService from '../../services/aiService';

const RISK = {
  on_track: { label: 'On Track', color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  at_risk: { label: 'At Risk', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  off_track: { label: 'Off Track', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
};

const RiskBanner = ({ projectId, socket, onOpenDetails }) => {
  const { border, panelBg, textPrimary, textSecondary, textMuted } = useColors();
  const [report, setReport] = useState(null);
  const [dismissedId, setDismissedId] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let active = true;
    aiService
      .getHealthReport(projectId)
      .then((res) => {
        if (active) setReport(res.report || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [projectId]);

  // Live updates: scans (scheduled, boot, or another member's manual scan)
  // arrive through the project's socket room.
  useEffect(() => {
    if (!socket) return;
    const onReport = (r) => setReport(r);
    socket.on('health-report', onReport);
    return () => socket.off('health-report', onReport);
  }, [socket]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await aiService.runHealthScan(projectId);
      if (res.report) setReport(res.report);
    } catch (err) {
      // non-critical UI; fail silently
    } finally {
      setScanning(false);
    }
  };

  if (!report) {
    return (
      <Box
        display="flex"
        alignItems="center"
        gap={3}
        px={4}
        py={2}
        mb={4}
        borderRadius="lg"
        bg={panelBg}
        border="1px solid"
        borderColor={border}
        flexShrink={0}
      >
        <Box display="flex" alignItems="center" gap={2} color={textMuted}>
          <LuActivity size={14} />
          <Text fontSize="sm">Risk Radar — no health scan yet.</Text>
        </Box>
        <Button
          size="xs"
          variant="outline"
          borderColor={border}
          color={textPrimary}
          onClick={runScan}
          disabled={scanning}
        >
          {scanning ? <Spinner size="xs" /> : 'Scan now'}
        </Button>
      </Box>
    );
  }

  if (report._id === dismissedId) return null;

  const risk = RISK[report.riskLevel] || RISK.on_track;

  return (
    <Box
      px={4}
      py={3}
      mb={4}
      borderRadius="lg"
      bg={risk.bg}
      border="1px solid"
      borderColor={risk.color}
      flexShrink={0}
    >
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <Box px={2} py={0.5} borderRadius="md" bg={risk.color} color="white" fontSize="xs" fontWeight="bold">
          {risk.label}
        </Box>
        <Text fontSize="sm" fontWeight="medium" color={textPrimary} flex="1" minW="200px">
          {report.headline}
        </Text>
        <Text fontSize="xs" color={textMuted}>
          {new Date(report.createdAt).toLocaleString()}
        </Text>
        <Button size="xs" variant="outline" borderColor={risk.color} color={textPrimary} onClick={onOpenDetails}>
          Details
        </Button>
        <Button size="xs" variant="ghost" color={textSecondary} onClick={runScan} disabled={scanning}>
          {scanning ? <Spinner size="xs" /> : 'Rescan'}
        </Button>
        <Box
          as="button"
          onClick={() => setDismissedId(report._id)}
          bg="transparent"
          border="none"
          cursor="pointer"
          color={textSecondary}
          fontSize="lg"
          lineHeight={1}
          opacity={0.7}
          _hover={{ opacity: 1 }}
        >
          ×
        </Box>
      </Box>
      {report.issues?.length > 0 && (
        <Box mt={1.5} display="flex" flexDirection="column" gap={0.5}>
          {report.issues.slice(0, 3).map((issue, i) => (
            <Text key={i} fontSize="xs" color={textSecondary}>
              • {issue}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default RiskBanner;
