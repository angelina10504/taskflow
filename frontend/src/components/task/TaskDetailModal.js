import React, { useState, useEffect } from 'react';
import { Box, Button, Text, Heading, Input } from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogCloseTrigger,
} from '../ui/dialog';
import * as taskService from '../../services/taskService';
import { toaster } from '../ui/toaster';
import ConfirmDialog from '../common/ConfirmDialog';
import useColors from '../../hooks/useColors';

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const TaskDetailModal = ({ task, isOpen, onClose, onUpdate, onDelete, workspaceMemberCount }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const { dark, cardBg, inputBg, border, textPrimary, textSecondary, textMuted, hoverBg } = useColors();

  useEffect(() => {
    if (task) {
      setEditData({
        title: task.title,
        description: task.description || '',
        link: task.link || '',
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split('T')[0]
          : '',
      });
    }
    setIsEditing(false);
  }, [task]);

  const selectStyle = {
    border: `1px solid ${dark ? '#2a3244' : '#e2e8f0'}`,
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '14px',
    background: dark ? '#1a2030' : 'white',
    color: dark ? '#f1f5f9' : '#1a202c',
    outline: 'none',
    cursor: 'pointer',
  };

  const textareaStyle = {
    width: '100%',
    border: `1px solid ${dark ? '#2a3244' : '#e2e8f0'}`,
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none',
    background: dark ? '#1a2030' : 'white',
    color: dark ? '#f1f5f9' : '#1a202c',
  };

  // Priority and status badge colors — dark-mode aware
  const PRIORITY_COLORS = {
    low:    { bg: dark ? '#1e2535' : 'gray.100',   color: dark ? 'gray.400'   : 'gray.600'   },
    medium: { bg: dark ? '#0f2040' : 'blue.50',    color: dark ? '#93c5fd'    : 'blue.700'   },
    high:   { bg: dark ? '#2a1500' : 'orange.50',  color: dark ? '#fb923c'    : 'orange.700' },
    urgent: { bg: dark ? '#2a0808' : 'red.50',     color: dark ? '#f87171'    : 'red.700'    },
  };

  const STATUS_COLORS = {
    todo:        { bg: dark ? '#1e2535' : 'gray.100',   color: dark ? 'gray.400'   : 'gray.600'   },
    in_progress: { bg: dark ? '#0f2040' : 'blue.50',    color: dark ? '#93c5fd'    : 'blue.700'   },
    in_review:   { bg: dark ? '#1a0f40' : 'purple.50',  color: dark ? '#c084fc'    : 'purple.700' },
    done:        { bg: dark ? '#0a2010' : 'green.50',   color: dark ? '#4ade80'    : 'green.700'  },
  };

  const handleSave = async () => {
    if (!editData.title?.trim()) {
      toaster.create({ title: 'Title is required', type: 'error', duration: 3000 });
      return;
    }
    setIsSaving(true);
    try {
      const data = await taskService.updateTask(task._id, editData);
      onUpdate(data.task);
      setIsEditing(false);
      toaster.create({ title: 'Task updated', type: 'success', duration: 2000 });
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to update task',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await taskService.deleteTask(task._id);
      onDelete(task._id);
      onClose();
      toaster.create({ title: 'Task deleted', type: 'success', duration: 2000 });
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to delete task',
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  if (!task) return null;

  const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
  const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS.todo;

  return (
    <>
      <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
        <DialogBackdrop />
        <DialogContent maxW="580px" bg={cardBg} color={textPrimary}>
          <DialogHeader borderBottomColor={border}>
            {isEditing ? (
              <Input
                value={editData.title}
                onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
                fontSize="lg"
                fontWeight="bold"
                pr={8}
                bg={inputBg}
                color={textPrimary}
                borderColor={border}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
              />
            ) : (
              <Heading size="md" pr={8} color={textPrimary}>
                {task.title}
              </Heading>
            )}
            <DialogCloseTrigger />
          </DialogHeader>

          <DialogBody>
            {/* Status & Priority */}
            <Box display="flex" gap={3} mb={5} flexWrap="wrap">
              {isEditing ? (
                <>
                  <Box>
                    <Text fontSize="xs" color={textMuted} mb={1} fontWeight="medium">Status</Text>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value }))}
                      style={selectStyle}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={textMuted} mb={1} fontWeight="medium">Priority</Text>
                    <select
                      value={editData.priority}
                      onChange={(e) => setEditData((prev) => ({ ...prev, priority: e.target.value }))}
                      style={selectStyle}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </Box>
                </>
              ) : (
                <>
                  <Box px={3} py={1} borderRadius="full" bg={statusStyle.bg} color={statusStyle.color} fontSize="sm" fontWeight="medium">
                    {STATUS_LABELS[task.status]}
                  </Box>
                  <Box px={3} py={1} borderRadius="full" bg={priorityStyle.bg} color={priorityStyle.color} fontSize="sm" fontWeight="medium" textTransform="capitalize">
                    {task.priority} Priority
                  </Box>
                </>
              )}
            </Box>

            {/* Description */}
            <Box mb={4}>
              <Text fontSize="sm" fontWeight="medium" color={textSecondary} mb={1}>Description</Text>
              {isEditing ? (
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Add a description..."
                  style={textareaStyle}
                />
              ) : (
                <Text fontSize="sm" color={task.description ? textPrimary : textMuted}>
                  {task.description || 'No description'}
                </Text>
              )}
            </Box>

            {/* Link */}
            <Box mb={4}>
              <Text fontSize="sm" fontWeight="medium" color={textSecondary} mb={1}>Link</Text>
              {isEditing ? (
                <Input
                  value={editData.link}
                  onChange={(e) => setEditData((prev) => ({ ...prev, link: e.target.value }))}
                  placeholder="https://..."
                  size="sm"
                  bg={inputBg}
                  color={textPrimary}
                  borderColor={border}
                  _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
                />
              ) : task.link ? (
                <a
                  href={task.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '14px', color: '#a78bfa', wordBreak: 'break-all' }}
                >
                  {task.link}
                </a>
              ) : (
                <Text fontSize="sm" color={textMuted}>No link</Text>
              )}
            </Box>

            {/* Due Date */}
            <Box mb={4}>
              <Text fontSize="sm" fontWeight="medium" color={textSecondary} mb={1}>Due Date</Text>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.dueDate}
                  onChange={(e) => setEditData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  size="sm"
                  maxW="200px"
                  bg={inputBg}
                  color={textPrimary}
                  borderColor={border}
                  _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
                />
              ) : (
                <Text fontSize="sm" color={task.dueDate ? textPrimary : textMuted}>
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                </Text>
              )}
            </Box>

            {/* Estimated Time */}
            {task.estimatedTime && (
              <Box mb={4}>
                <Text fontSize="sm" fontWeight="medium" color={textSecondary} mb={1}>Estimated Time</Text>
                <Text fontSize="sm" color={textPrimary}>{task.estimatedTime} minutes</Text>
              </Box>
            )}

            {/* Assignees */}
            {task.assignedTo && task.assignedTo.length > 0 && (
              <Box mb={4}>
                <Text fontSize="sm" fontWeight="medium" color={textSecondary} mb={2}>Assignees</Text>
                <Box display="flex" gap={2} flexWrap="wrap">
                  {task.assignedTo.map((u) => {
                    const initials = u.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
                    return (
                      <Box
                        key={u._id}
                        display="flex" alignItems="center" gap={2}
                        bg={hoverBg}
                        border="1px solid" borderColor={border}
                        borderRadius="full" pl={1} pr={3} py={1}
                      >
                        <Box
                          w="24px" h="24px" borderRadius="full"
                          display="flex" alignItems="center" justifyContent="center"
                          fontSize="10px" fontWeight="bold" color="white"
                          style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
                        >
                          {initials}
                        </Box>
                        <Text fontSize="sm" color={textPrimary}>{u.name}</Text>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <Box mb={4}>
                <Text fontSize="sm" fontWeight="medium" color={textSecondary} mb={2}>Labels</Text>
                <Box display="flex" gap={2} flexWrap="wrap">
                  {task.labels.map((label, i) => (
                    <Box
                      key={i} px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="medium"
                      bg={dark ? '#0f2040' : 'blue.50'} color={dark ? '#93c5fd' : 'blue.700'}
                    >
                      {label}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Footer metadata */}
            <Box mt={6} pt={4} borderTop="1px solid" borderColor={border}>
              <Text fontSize="xs" color={textMuted}>
                Created {new Date(task.createdAt).toLocaleDateString()}
                {workspaceMemberCount > 1 && task.createdBy?.name ? ` by ${task.createdBy.name}` : ''}
              </Text>
              {task.completedAt && (
                <Text fontSize="xs" color="green.400" mt={1}>
                  Completed {new Date(task.completedAt).toLocaleDateString()}
                </Text>
              )}
            </Box>
          </DialogBody>

          <DialogFooter borderTopColor={border}>
            <Box display="flex" justifyContent="space-between" w="full">
              <Button
                variant="ghost"
                size="sm"
                color="red.400"
                _hover={{ bg: dark ? '#3d1f1f' : 'red.50' }}
                onClick={() => setIsConfirmDeleteOpen(true)}
              >
                Delete Task
              </Button>
              <Box display="flex" gap={3}>
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      borderColor={border}
                      color={textPrimary}
                      _hover={{ bg: hoverBg }}
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
                      color="white"
                      _hover={{ opacity: 0.9 }}
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      borderColor={border}
                      color={textPrimary}
                      _hover={{ bg: hoverBg }}
                      onClick={handleClose}
                    >
                      Close
                    </Button>
                    <Button
                      style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
                      color="white"
                      _hover={{ opacity: 0.9 }}
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task?.title}"? This cannot be undone.`}
        confirmLabel="Delete Task"
      />
    </>
  );
};

export default TaskDetailModal;
