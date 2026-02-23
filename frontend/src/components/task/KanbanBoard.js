import React, { useState, useEffect } from 'react';
import { Box, Button, Text } from '@chakra-ui/react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
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
        w="28px"
        h="28px"
        borderRadius="full"
        border="2px solid white"
        overflow="hidden"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="9px"
        fontWeight="bold"
        color="white"
        flexShrink={0}
        style={avatarSrc ? {} : { background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
      >
        {avatarSrc ? (
          <Box as="img" src={avatarSrc} alt={user.name} w="100%" h="100%" style={{ objectFit: 'cover' }} />
        ) : (
          initials
        )}
      </Box>
      {/* Green online dot */}
      <Box
        position="absolute"
        bottom="0"
        right="0"
        w="8px"
        h="8px"
        bg="#22c55e"
        borderRadius="full"
        border="1.5px solid white"
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Listen for remote task moves
  useEffect(() => {
    if (!socket) return;

    const handleRemoteMove = ({ task, movedBy }) => {
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? task : t))
      );
      toaster.create({
        title: `${movedBy.name} moved a task`,
        description: `"${task.title}" → ${STATUS_LABELS[task.status] || task.status}`,
        type: 'info',
        duration: 3000,
      });
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
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const draggedTask = tasks.find((t) => t._id === active.id);

    // over.id is either a column status (dropped on empty column / droppable area)
    // or a task _id (dropped on top of another card) — resolve to column status either way
    let overStatus;
    if (COLUMNS.includes(over.id)) {
      overStatus = over.id;
    } else {
      const overTask = tasks.find((t) => t._id === over.id);
      overStatus = overTask?.status;
    }

    if (!overStatus || draggedTask.status === overStatus) return;

    try {
      const response = await taskService.updateTaskStatus(draggedTask._id, overStatus, 0);
      const updatedTask = response.task;

      const updatedTasks = tasks.map((t) =>
        t._id === draggedTask._id ? updatedTask : t
      );
      setTasks(updatedTasks);
      onTasksUpdate?.(updatedTasks);

      // Broadcast to teammates
      if (socket && currentUser) {
        socket.emit('task-moved', {
          projectId,
          task: updatedTask,
          movedBy: { id: currentUser.id, name: currentUser.name },
        });
      }

      toaster.create({
        title: 'Task moved',
        description: `Task moved to ${STATUS_LABELS[overStatus]}`,
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
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
    const updatedTasks = tasks.map((t) =>
      t._id === updatedTask._id ? updatedTask : t
    );
    setTasks(updatedTasks);
    setSelectedTask(updatedTask);
    onTasksUpdate?.(updatedTasks);
  };

  const handleTaskDelete = (taskId) => {
    const updatedTasks = tasks.filter((t) => t._id !== taskId);
    setTasks(updatedTasks);
    onTasksUpdate?.(updatedTasks);
  };

  // Deduplicate online users by id
  const uniqueOnlineUsers = onlineUsers.filter(
    (u, i, arr) => arr.findIndex((x) => x.id === u.id) === i
  );
  const visibleUsers = uniqueOnlineUsers.slice(0, 6);
  const overflow = uniqueOnlineUsers.length - visibleUsers.length;

  return (
    <Box>
      {/* Toolbar: online users + new task button */}
      <Box mb={4} display="flex" alignItems="center" justifyContent="space-between">

        {/* Online users */}
        {uniqueOnlineUsers.length > 0 ? (
          <Box display="flex" alignItems="center" gap={2}>
            <Box display="flex" alignItems="center">
              {visibleUsers.map((u, i) => (
                <UserAvatar key={u.id} user={u} index={i} />
              ))}
              {overflow > 0 && (
                <Box
                  ml="-8px"
                  w="28px"
                  h="28px"
                  borderRadius="full"
                  border="2px solid white"
                  bg="gray.200"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="9px"
                  fontWeight="bold"
                  color="gray.600"
                  style={{ zIndex: 0 }}
                >
                  +{overflow}
                </Box>
              )}
            </Box>
            <Text fontSize="xs" color="gray.500">
              {uniqueOnlineUsers.length} online
            </Text>
          </Box>
        ) : (
          <Box />
        )}

        <Button colorScheme="blue" onClick={() => setIsCreateModalOpen(true)}>
          + New Task
        </Button>
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box display="flex" gap={4} overflowX="auto" pb={4}>
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
