import React, { useState } from 'react';
import { Box, Button } from '@chakra-ui/react';
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

const KanbanBoard = ({ projectId, workspaceId, initialTasks, onTasksUpdate, workspaceMemberCount }) => {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [activeTask, setActiveTask] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const groupedTasks = COLUMNS.reduce((acc, status) => {
    acc[status] = tasks.filter((task) => task.status === status);
    return acc;
  }, {});

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    setActiveTask(task);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    setActiveTask(null);

    if (!over) return;

    const draggedTask = tasks.find((t) => t._id === active.id);
    const overStatus = over.id;

    if (COLUMNS.includes(overStatus)) {
      if (draggedTask.status !== overStatus) {
        try {
          await taskService.updateTaskStatus(draggedTask._id, overStatus, 0);

          const updatedTasks = tasks.map((task) =>
            task._id === draggedTask._id ? { ...task, status: overStatus } : task
          );
          setTasks(updatedTasks);
          onTasksUpdate?.(updatedTasks);

          toaster.create({
            title: 'Task moved',
            description: `Task moved to ${overStatus.replace('_', ' ')}`,
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
      }
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

  return (
    <Box>
      <Box mb={4} display="flex" justifyContent="flex-end">
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
