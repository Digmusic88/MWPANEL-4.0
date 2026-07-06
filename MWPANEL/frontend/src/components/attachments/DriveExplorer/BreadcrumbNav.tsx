import React from 'react';
import { Breadcrumb, Button } from 'antd';
import { HomeOutlined, FolderOutlined } from '@ant-design/icons';

interface BreadcrumbNavProps {
  path: string[];
  onNavigate: (folderIndex: number | null) => void;
  className?: string;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  path,
  onNavigate,
  className,
}) => {
  // Build breadcrumb items
  const breadcrumbItems = [
    {
      key: 'root',
      title: (
        <Button
          type="link"
          icon={<HomeOutlined />}
          onClick={() => onNavigate(null)}
          className="p-0 h-auto"
        >
          Archivos de la tarea
        </Button>
      ),
    },
    ...path.map((folderName, index) => ({
      key: `folder-${index}`,
      title: index === path.length - 1 ? (
        // Current folder (not clickable)
        <span className="text-gray-600 flex items-center">
          <FolderOutlined className="mr-1" />
          {folderName}
        </span>
      ) : (
        // Parent folders (clickable)
        <Button
          type="link"
          onClick={() => onNavigate(index)}
          className="p-0 h-auto flex items-center"
        >
          <FolderOutlined className="mr-1" />
          {folderName}
        </Button>
      ),
    })),
  ];

  return (
    <div className={className}>
      <Breadcrumb
        items={breadcrumbItems}
        separator="/"
        className="text-sm"
      />
    </div>
  );
};

export default BreadcrumbNav;