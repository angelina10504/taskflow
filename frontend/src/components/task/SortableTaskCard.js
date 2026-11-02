import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';

const SortableTaskCard = ({ task, onClick, workspaceMemberCount }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    // Required for touch dragging. Without it the browser treats the gesture as
    // a scroll and claims it before dnd-kit sees the move, so a card cannot be
    // dragged on a phone at all. dnd-kit's own guidance is to set this on any
    // element carrying drag listeners.
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} workspaceMemberCount={workspaceMemberCount} />
    </div>
  );
};

export default SortableTaskCard;