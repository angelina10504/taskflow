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

const PRIORITY_COLORS = {
  low: { bg: 'gray.100', color: 'gray.600' },
  medium: { bg: 'blue.100', color: 'blue.700' },
  high: { bg: 'orange.100', color: 'orange.700' },
  urgent: { bg: 'red.100', color: 'red.700' },
};

const STATUS_COLORS = {
  todo: { bg: 'gray.100', color: 'gray.600' },
  in_progress: { bg: 'blue.100', color: 'blue.700' },
  in_review: { bg: 'purple.100', color: 'purple.700' },
  done: { bg: 'green.100', color: 'green.700' },
};

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
        <DialogContent maxW="580px">
          <DialogHeader>
            {isEditing ? (
              <Input
                value={editData.title}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, title: e.target.value }))
                }
                fontSize="lg"
                fontWeight="bold"
                pr={8}
              />
            ) : (
              <Heading size="md" pr={8}>
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
                    <Text fontSize="xs" color="gray.500" mb={1} fontWeight="medium">
                      Status
                    </Text>
                    <select
                      value={editData.status}
                      onChange={(e) =>
                        setEditData((prev) => ({ ...prev, status: e.target.value }))
                      }
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '14px',
                        background: 'white',
                      }}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1} fontWeight="medium">
                      Priority
                    </Text>
                    <select
                      value={editData.priority}
                      onChange={(e) =>
                        setEditData((prev) => ({ ...prev, priority: e.target.value }))
                      }
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '14px',
                        background: 'white',
                      }}
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
                  <Box
                    px={3}
                    py={1}
                    borderRadius="full"
                    bg={statusStyle.bg}
                    color={statusStyle.color}
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    {STATUS_LABELS[task.status]}
                  </Box>
                  <Box
                    px={3}
                    py={1}
                    borderRadius="full"
                    bg={priorityStyle.bg}
                    color={priorityStyle.color}
                    fontSize="sm"
                    fontWeight="medium"
                    textTransform="capitalize"
                  >
                    {task.priority} Priority
                  </Box>
                </>
              )}
            </Box>

            {/* Description */}
            <Box mb={4}>
              <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                Description
              </Text>
              {isEditing ? (
                <textarea
                  value={editData.description}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={4}
                  placeholder="Add a description..."
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
              ) : (
                <Text fontSize="sm" color={task.description ? 'gray.700' : 'gray.400'}>
                  {task.description || 'No description'}
                </Text>
              )}
            </Box>

            {/* Link */}
            <Box mb={4}>
              <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                Link
              </Text>
              {isEditing ? (
                <Input
                  value={editData.link}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, link: e.target.value }))
                  }
                  placeholder="https://..."
                  size="sm"
                />
              ) : task.link ? (
                <a
                  href={task.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '14px', color: '#3182ce', wordBreak: 'break-all' }}
                >
                  {task.link}
                </a>
              ) : (
                <Text fontSize="sm" color="gray.400">No link</Text>
              )}
            </Box>

            {/* Due Date */}
            <Box mb={4}>
              <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                Due Date
              </Text>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.dueDate}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                  size="sm"
                  maxW="200px"
                />
              ) : (
                <Text fontSize="sm" color={task.dueDate ? 'gray.700' : 'gray.400'}>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : 'No due date'}
                </Text>
              )}
            </Box>

            {/* Estimated Time */}
            {task.estimatedTime && (
              <Box mb={4}>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                  Estimated Time
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {task.estimatedTime} minutes
                </Text>
              </Box>
            )}

            {/* Assignees */}
            {task.assignedTo && task.assignedTo.length > 0 && (
              <Box mb={4}>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                  Assignees
                </Text>
                <Box display="flex" gap={2} flexWrap="wrap">
                  {task.assignedTo.map((u) => {
                    const initials =
                      u.name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || 'U';
                    return (
                      <Box
                        key={u._id}
                        display="flex"
                        alignItems="center"
                        gap={2}
                        bg="gray.50"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="full"
                        pl={1}
                        pr={3}
                        py={1}
                      >
                        <Box
                          w="24px"
                          h="24px"
                          borderRadius="full"
                          bg="purple.500"
                          color="white"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          fontSize="10px"
                          fontWeight="bold"
                        >
                          {initials}
                        </Box>
                        <Text fontSize="sm">{u.name}</Text>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <Box mb={4}>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                  Labels
                </Text>
                <Box display="flex" gap={2} flexWrap="wrap">
                  {task.labels.map((label, i) => (
                    <Box
                      key={i}
                      px={3}
                      py={1}
                      bg="blue.100"
                      color="blue.700"
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="medium"
                    >
                      {label}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Footer metadata */}
            <Box mt={6} pt={4} borderTop="1px solid" borderColor="gray.100">
              <Text fontSize="xs" color="gray.400">
                Created {new Date(task.createdAt).toLocaleDateString()}
                {workspaceMemberCount > 1 && task.createdBy?.name
                  ? ` by ${task.createdBy.name}`
                  : ''}
              </Text>
              {task.completedAt && (
                <Text fontSize="xs" color="green.500" mt={1}>
                  Completed {new Date(task.completedAt).toLocaleDateString()}
                </Text>
              )}
            </Box>
          </DialogBody>

          <DialogFooter>
            <Box display="flex" justifyContent="space-between" w="full">
              <Button
                colorScheme="red"
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(true)}
              >
                Delete Task
              </Button>
              <Box display="flex" gap={3}>
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button
                      colorScheme="blue"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleClose}>
                      Close
                    </Button>
                    <Button colorScheme="blue" onClick={() => setIsEditing(true)}>
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
