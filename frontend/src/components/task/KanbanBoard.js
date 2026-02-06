import React, { useState } from 'react';
import { Box, Button, Spinner, Center } from '@chakra-ui/react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import * as taskService from '../../services/taskService';
import { toaster } from '../ui/toaster';

const COLUMNS = ['todo', 'in_progress', 'in_review', 'done'];

const KanbanBoard = ({ projectId, workspaceId, initialTasks, onTasksUpdate }) => {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [activeTask, setActiveTask] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
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

    const activeTask = tasks.find((t) => t._id === active.id);
    const overStatus = over.id;

    // If dropped on a column (status)
    if (COLUMNS.includes(overStatus)) {
      if (activeTask.status !== overStatus) {
        // Update task status
        try {
          await taskService.updateTaskStatus(activeTask._id, overStatus, 0);
          
          const updatedTasks = tasks.map((task) =>
            task._id === activeTask._id ? { ...task, status: overStatus } : task
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
    // TODO: Open task detail modal
    console.log('Task clicked:', task);
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
    </Box>
  );
};

export default KanbanBoard;