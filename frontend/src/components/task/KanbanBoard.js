import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Button, Text } from '@chakra-ui/react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';
import * as taskService from '../../services/taskService';
import { toaster } from '../ui/toaster';
import useColors from '../../hooks/useColors';

const COLUMNS = ['todo', 'in_progress', 'in_review', 'done'];

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const API_URL = process.env.REACT_APP_API_URL || '';

const UserAvatar = ({ user, index }) => {
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const avatarSrc =
    user.avatar && !user.avatar.includes('ui-avatars.com')
      ? user.avatar.startsWith('/uploads/')
        ? `${API_URL}${user.avatar}`
        : user.avatar
      : null;

  return (
    <Box
      position="relative"
      ml={index > 0 ? '-8px' : 0}
      style={{ zIndex: 10 - index }}
      title={user.name}
    >
      <Box
        w="28px" h="28px"
        borderRadius="full"
        border="2px solid white"
        overflow="hidden"
        display="flex" alignItems="center" justifyContent="center"
        fontSize="9px" fontWeight="bold" color="white" flexShrink={0}
        style={avatarSrc ? {} : { background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
      >
        {avatarSrc ? (
          <Box as="img" src={avatarSrc} alt={user.name} w="100%" h="100%" style={{ objectFit: 'cover' }} />
        ) : (
          initials
        )}
      </Box>
      <Box
        position="absolute" bottom="0" right="0"
        w="8px" h="8px" bg="#22c55e" borderRadius="full" border="1.5px solid white"
      />
    </Box>
  );
};

const KanbanBoard = ({
  projectId,
  workspaceId,
  initialTasks,
  onTasksUpdate,
  workspaceMemberCount,
  socket,
  onlineUsers = [],
  currentUser,
}) => {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [activeTask, setActiveTask] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [moveNotifs, setMoveNotifs] = useState([]);
  const { dark, textMuted } = useColors();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Track the status the task had before this drag started
  const activeTaskOriginalStatus = useRef(null);

  // pointerWithin correctly handles empty columns; fall back to rectIntersection
  const collisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  }, []);

  const addNotif = (name, title, status) => {
    setMoveNotifs((prev) => [
      { id: Date.now() + Math.random(), name, title, status },
      ...prev,
    ]);
  };

  const dismissNotif = (id) => {
    setMoveNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  // Listen for remote task moves
  useEffect(() => {
    if (!socket) return;

    const handleRemoteMove = ({ task, movedBy }) => {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
      addNotif(movedBy.name, task.title, STATUS_LABELS[task.status] || task.status);
    };

    socket.on('task-moved', handleRemoteMove);
    return () => socket.off('task-moved', handleRemoteMove);
  }, [socket]);

  const groupedTasks = COLUMNS.reduce((acc, status) => {
    acc[status] = tasks.filter((task) => task.status === status);
    return acc;
  }, {});

  const handleDragStart = (event) => {
    const task = tasks.find((t) => t._id === event.active.id);
    setActiveTask(task);
    activeTaskOriginalStatus.current = task?.status ?? null;
  };

  // Optimistically move the card into the destination column while dragging
  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    let overStatus;
    if (COLUMNS.includes(over.id)) {
      overStatus = over.id;
    } else {
      const overTask = tasks.find((t) => t._id === over.id);
      overStatus = overTask?.status;
    }

    if (!overStatus) return;

    setTasks((prev) => {
      const current = prev.find((t) => t._id === active.id);
      if (!current || current.status === overStatus) return prev;
      return prev.map((t) => (t._id === active.id ? { ...t, status: overStatus } : t));
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);

    const originalStatus = activeTaskOriginalStatus.current;
    activeTaskOriginalStatus.current = null;

    const draggedTask = tasks.find((t) => t._id === active.id);
    if (!draggedTask) return;

    // Dropped outside any valid target — revert the optimistic update
    if (!over) {
      setTasks((prev) =>
        prev.map((t) => (t._id === active.id ? { ...t, status: originalStatus } : t))
      );
      return;
    }

    const newStatus = draggedTask.status; // already updated by handleDragOver

    // No column change — nothing to persist
    if (newStatus === originalStatus) return;

    try {
      const response = await taskService.updateTaskStatus(draggedTask._id, newStatus, 0);
      const updatedTask = response.task;

      const updatedTasks = tasks.map((t) => (t._id === draggedTask._id ? updatedTask : t));
      setTasks(updatedTasks);
      onTasksUpdate?.(updatedTasks);

      addNotif('You', updatedTask.title, STATUS_LABELS[newStatus]);

      if (socket && currentUser) {
        socket.emit('task-moved', {
          projectId,
          task: updatedTask,
          movedBy: { id: currentUser.id, name: currentUser.name },
        });
      }
    } catch (error) {
      // Revert optimistic update on API failure
      setTasks((prev) =>
        prev.map((t) => (t._id === active.id ? { ...t, status: originalStatus } : t))
      );
      toaster.create({
        title: 'Error',
        description: 'Failed to move task',
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const data = await taskService.createTask(taskData);
      const newTasks = [data.task, ...tasks];
      setTasks(newTasks);
      onTasksUpdate?.(newTasks);
      toaster.create({
        title: 'Success',
        description: 'Task created successfully',
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to create task',
        type: 'error',
        duration: 5000,
      });
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleTaskUpdate = (updatedTask) => {
    const updatedTasks = tasks.map((t) => (t._id === updatedTask._id ? updatedTask : t));
    setTasks(updatedTasks);
    setSelectedTask(updatedTask);
    onTasksUpdate?.(updatedTasks);
  };

  const handleTaskDelete = (taskId) => {
    const updatedTasks = tasks.filter((t) => t._id !== taskId);
    setTasks(updatedTasks);
    onTasksUpdate?.(updatedTasks);
  };

  const uniqueOnlineUsers = onlineUsers.filter(
    (u, i, arr) => arr.findIndex((x) => x.id === u.id) === i
  );
  const visibleUsers = uniqueOnlineUsers.slice(0, 6);
  const overflow = uniqueOnlineUsers.length - visibleUsers.length;

  const notifBg       = dark ? '#0f1e30' : '#eff6ff';
  const notifBorder   = dark ? '#1e4070' : '#bfdbfe';
  const notifColor    = dark ? '#93c5fd' : '#1d4ed8';
  const notifSelfBg   = dark ? '#0f2a1a' : '#f0fdf4';
  const notifSelfBorder = dark ? '#1a4a28' : '#bbf7d0';
  const notifSelfColor  = dark ? '#4ade80' : '#15803d';

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Toolbar */}
      <Box mb={3} flexShrink={0} display="flex" alignItems="center" justifyContent="space-between" gap={3}>

        {/* Online users */}
        {uniqueOnlineUsers.length > 0 ? (
          <Box display="flex" alignItems="center" gap={2} flexShrink={0}>
            <Box display="flex" alignItems="center">
              {visibleUsers.map((u, i) => (
                <UserAvatar key={u.id} user={u} index={i} />
              ))}
              {overflow > 0 && (
                <Box
                  ml="-8px" w="28px" h="28px"
                  borderRadius="full"
                  border="2px solid white"
                  bg={dark ? '#2a3244' : 'gray.200'}
                  display="flex" alignItems="center" justifyContent="center"
                  fontSize="9px" fontWeight="bold"
                  color={dark ? 'gray.300' : 'gray.600'}
                  style={{ zIndex: 0 }}
                >
                  +{overflow}
                </Box>
              )}
            </Box>
            <Text fontSize="xs" color={textMuted}>
              {uniqueOnlineUsers.length} online
            </Text>
          </Box>
        ) : (
          <Box flexShrink={0} />
        )}

        <Button
          flexShrink={0}
          style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)', color: 'white' }}
          _hover={{ opacity: 0.9 }}
          onClick={() => setIsCreateModalOpen(true)}
        >
          + New Task
        </Button>
      </Box>

      {/* Move notifications — above kanban columns, dismiss with × */}
      {moveNotifs.length > 0 && (
        <Box flexShrink={0} mb={3} display="flex" flexDirection="column" gap={2}>
          {moveNotifs.map((notif) => {
            const isSelf = notif.name === 'You';
            return (
              <Box
                key={notif.id}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                px={4} py={2}
                borderRadius="md"
                bg={isSelf ? notifSelfBg : notifBg}
                border="1px solid"
                borderColor={isSelf ? notifSelfBorder : notifBorder}
                color={isSelf ? notifSelfColor : notifColor}
                fontSize="sm"
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Text flexShrink={0}>🔄</Text>
                  <Text>
                    <Box as="span" fontWeight="semibold">{notif.name}</Box>
                    {' moved '}
                    <Box as="span" fontWeight="semibold">"{notif.title}"</Box>
                    {' → '}
                    <Box as="span" fontWeight="semibold">{notif.status}</Box>
                  </Text>
                </Box>
                <Box
                  as="button"
                  onClick={() => dismissNotif(notif.id)}
                  bg="transparent"
                  border="none"
                  cursor="pointer"
                  color={isSelf ? notifSelfColor : notifColor}
                  fontSize="xl"
                  lineHeight={1}
                  opacity={0.6}
                  flexShrink={0}
                  ml={3}
                  _hover={{ opacity: 1 }}
                >
                  ×
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Box flex={1} display="flex" gap={4} overflow="hidden">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={groupedTasks[status]}
              onTaskClick={handleTaskClick}
              workspaceMemberCount={workspaceMemberCount}
            />
          ))}
        </Box>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTask}
        projectId={projectId}
        workspaceId={workspaceId}
      />

      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        workspaceMemberCount={workspaceMemberCount}
      />
    </Box>
  );
};

export default KanbanBoard;
