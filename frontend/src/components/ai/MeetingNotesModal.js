import React, { useState, useEffect } from 'react';
import { Box, Button, Heading, Text, Textarea } from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogCloseTrigger,
} from '../ui/dialog';
import { LuClipboardList, LuDiamond, LuCheck, LuArrowLeft } from 'react-icons/lu';
import { toaster } from '../ui/toaster';
import * as aiService from '../../services/aiService';
import useColors from '../../hooks/useColors';

const PRIORITY_DOT = {
  low: '#d1d5db',
  medium: '#9ca3af',
  high: '#f59e0b',
  urgent: '#ef4444',
};

// Paste meeting notes → AI extracts action items → review checklist → bulk-create.
const MeetingNotesModal = ({ isOpen, onClose, projectId, onTasksCreated }) => {
  const [step, setStep] = useState('input'); // 'input' | 'review'
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]); // extracted items, each with `selected`
  const [extracting, setExtracting] = useState(false);
  const [creating, setCreating] = useState(false);
  const { cardBg, inputBg, border, hoverBg, textPrimary, textSecondary, textMuted } = useColors();

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setNotes('');
      setItems([]);
      setExtracting(false);
      setCreating(false);
    }
  }, [isOpen]);

  const handleExtract = async () => {
    if (!notes.trim() || extracting) return;
    setExtracting(true);
    try {
      const res = await aiService.extractTasksFromNotes(projectId, notes.trim());
      if (res.aiAvailable === false) {
        toaster.create({ title: 'AI unavailable', description: res.message, type: 'error', duration: 5000 });
        return;
      }
      if (!res.items?.length) {
        toaster.create({
          title: 'No action items found',
          description: 'These notes don’t seem to contain concrete to-dos.',
          type: 'info',
          duration: 4000,
        });
        return;
      }
      setItems(res.items.map((it) => ({ ...it, selected: true })));
      setStep('review');
    } catch (error) {
      toaster.create({
        title: 'Extraction failed',
        description: error.message || 'Something went wrong',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleCreate = async () => {
    const selected = items.filter((it) => it.selected);
    if (!selected.length || creating) return;
    setCreating(true);
    try {
      const res = await aiService.bulkCreateTasks(
        projectId,
        selected.map((it) => ({
          title: it.title,
          description: it.description,
          priority: it.priority,
          dueDate: it.dueDate,
          assigneeIds: (it.assignees || []).map((a) => a.id),
        }))
      );
      toaster.create({
        title: `Added ${res.tasks.length} task${res.tasks.length === 1 ? '' : 's'}`,
        type: 'success',
        duration: 4000,
      });
      onTasksCreated?.(res.tasks);
      onClose();
    } catch (error) {
      toaster.create({
        title: 'Could not create tasks',
        description: error.message || 'Something went wrong',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleItem = (idx) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it)));
  };

  const selectedCount = items.filter((it) => it.selected).length;

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <DialogBackdrop />
      <DialogContent bg={cardBg} color={textPrimary} maxW="640px">
        <DialogHeader borderBottomColor={border}>
          <Box display="flex" alignItems="center" gap={2.5}>
            <Box color="#cda440" display="flex">
              <LuClipboardList size={18} />
            </Box>
            <Heading size="lg" color={textPrimary}>
              Meeting Notes → Tasks
            </Heading>
          </Box>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          {step === 'input' ? (
            <>
              <Text fontSize="sm" color={textSecondary} mb={3}>
                Paste raw meeting notes, a Slack thread, or a transcript. The AI pulls out the
                action items — you review them before anything is created.
              </Text>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  'e.g.\nStandup 12 Jun —\nLogin redirect still broken, Sam to fix asap.\nAngelina will draft release notes by Monday.\nDecided to keep the pricing page as is.'
                }
                rows={10}
                bg={inputBg}
                color={textPrimary}
                borderColor={border}
                fontSize="sm"
                disabled={extracting}
                _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px #a83a58' }}
                _placeholder={{ color: textMuted }}
              />
            </>
          ) : (
            <>
              <Text fontSize="sm" color={textSecondary} mb={3}>
                {items.length} action item{items.length === 1 ? '' : 's'} found — untick anything
                you don’t want on the board.
              </Text>
              <Box display="flex" flexDirection="column" gap={2} maxH="380px" overflowY="auto">
                {items.map((it, idx) => (
                  <Box
                    key={idx}
                    display="flex"
                    gap={3}
                    px={3}
                    py={2.5}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={it.selected ? '#7a1f3d' : border}
                    bg={it.selected ? 'transparent' : hoverBg}
                    opacity={it.selected ? 1 : 0.55}
                    cursor="pointer"
                    transition="all 0.15s"
                    onClick={() => toggleItem(idx)}
                  >
                    <Box
                      mt="2px"
                      w="18px"
                      h="18px"
                      flexShrink={0}
                      borderRadius="sm"
                      border="2px solid"
                      borderColor={it.selected ? '#7a1f3d' : textMuted}
                      bg={it.selected ? '#7a1f3d' : 'transparent'}
                      color="white"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {it.selected && <LuCheck size={12} />}
                    </Box>
                    <Box flex={1} minW={0}>
                      <Text fontSize="sm" fontWeight="500" color={textPrimary}>
                        {it.title}
                      </Text>
                      {(it.priority || it.dueDate || it.assignees?.length > 0) && (
                        <Box display="flex" gap={3} mt={1} fontSize="xs" color={textMuted} flexWrap="wrap" alignItems="center">
                          {it.priority && (
                            <Box display="flex" alignItems="center" gap={1.5}>
                              <Box w="7px" h="7px" borderRadius="full" bg={PRIORITY_DOT[it.priority]} />
                              <Text>{it.priority}</Text>
                            </Box>
                          )}
                          {it.dueDate && <Text>due {new Date(it.dueDate).toLocaleDateString()}</Text>}
                          {it.assignees?.length > 0 && (
                            <Text>→ {it.assignees.map((a) => a.name).join(', ')}</Text>
                          )}
                        </Box>
                      )}
                      {it.description && (
                        <Text fontSize="xs" color={textMuted} mt={1} lineClamp={2}>
                          {it.description}
                        </Text>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </DialogBody>

        <DialogFooter borderTopColor={border}>
          {step === 'input' ? (
            <>
              <Button variant="outline" borderColor={border} color={textPrimary} _hover={{ bg: hoverBg }} onClick={onClose} mr={3}>
                Cancel
              </Button>
              <Button
                onClick={handleExtract}
                style={{ background: 'linear-gradient(to right, #7a1f3d, #a83a58)' }}
                color="white"
                _hover={{ opacity: 0.9 }}
                disabled={!notes.trim() || extracting}
              >
                <LuDiamond size={14} strokeWidth={2.5} />
                {extracting ? 'Extracting…' : 'Extract Tasks'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                color={textSecondary}
                _hover={{ bg: hoverBg, color: textPrimary }}
                onClick={() => setStep('input')}
                disabled={creating}
                mr="auto"
              >
                <LuArrowLeft size={15} />
                Back
              </Button>
              <Button
                onClick={handleCreate}
                style={{ background: 'linear-gradient(to right, #7a1f3d, #a83a58)' }}
                color="white"
                _hover={{ opacity: 0.9 }}
                disabled={selectedCount === 0 || creating}
              >
                {creating
                  ? 'Adding…'
                  : `Add ${selectedCount} Task${selectedCount === 1 ? '' : 's'}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default MeetingNotesModal;
