import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LessonsResourceCard from './LessonsResourceCard';
import type { LessonResource, LessonsResourceCardProps } from '../../types/lessons';

interface SortableResourceCardProps extends Omit<LessonsResourceCardProps, 'resource'> {
  resource: LessonResource;
  id: string;
}

const SortableResourceCard: React.FC<SortableResourceCardProps> = ({
  resource,
  id,
  ...props
}) => {
  console.log('🔄 SortableResourceCard rendering with resource:', resource?.name || 'undefined', 'onEdit:', typeof props.onEdit);
  
  // Defensive programming - return null if resource is undefined
  if (!resource) {
    console.error('🚨 SortableResourceCard received undefined resource with id:', id);
    return null;
  }
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'z-50' : ''} relative`}
    >
      {/* Drag handle - solo esta pequeña área es para arrastrar */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 w-6 h-6 cursor-grab active:cursor-grabbing bg-black bg-opacity-20 rounded flex items-center justify-center z-10 hover:bg-opacity-40"
        style={{ fontSize: '12px' }}
      >
        ⋮⋮
      </div>
      
      {/* La card normal - mantiene toda su funcionalidad */}
      <LessonsResourceCard
        resource={resource}
        {...props}
      />
    </div>
  );
};

export default SortableResourceCard;