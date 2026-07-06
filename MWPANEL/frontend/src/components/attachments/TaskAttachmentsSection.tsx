import React, { useState } from 'react';
import { Card, Tabs, Badge, Button, Space, Typography } from 'antd';
import {
  FileOutlined,
  UploadOutlined,
  CommentOutlined,
  HistoryOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import TaskFileExplorer from './TaskFileExplorer';
import FileUploadZone from './FileUploadZone';
import CommentsPanel from './CommentsPanel';
import { taskAttachmentsApiService } from '../../services/taskAttachmentsApiService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface TaskAttachmentsSectionProps {
  taskId: string;
  taskTitle: string;
  isTeacher?: boolean;
  readOnly?: boolean;
  showTabs?: boolean;
  defaultTab?: 'explorer' | 'upload' | 'stats';
  className?: string;
    onUploadComplete?: (uploadedFiles: any[]) => void;
}

export const TaskAttachmentsSection: React.FC<TaskAttachmentsSectionProps> = ({
  taskId,
  taskTitle,
  isTeacher = false,
  readOnly = false,
  showTabs = true,
  defaultTab = 'explorer',
  className,
    onUploadComplete,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);

  // Get task statistics
  const { data: taskStats } = useQuery({
    queryKey: ['taskStats', taskId],
    queryFn: () => Promise.resolve({ totalFiles: 0, totalSize: 0, filesByType: {}, recentActivity: [] }),
    enabled: !!taskId,
  });

  // Get attachments count for badges
  const { data: attachmentsData } = useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => taskAttachmentsApiService.getTaskAttachments(taskId).then(attachments => ({ attachments, total: attachments.length })),
    enabled: !!taskId,
  });

  const totalFiles = attachmentsData?.total || 0;
  const totalSize = taskStats?.totalSize || 0;

  // Handle upload completion
  const handleUploadComplete = (uploadedFiles: any[]) => {
    // Optionally switch to explorer tab after upload
    setActiveTab('explorer');
    // Call parent callback if provided
    onUploadComplete?.(uploadedFiles);
  };

  // Render content based on tabs or single view
  const renderContent = () => {
    if (!showTabs) {
      return (
        <TaskFileExplorer
          taskId={taskId}
          taskTitle={taskTitle}
          isTeacher={isTeacher}
          readOnly={readOnly}
        />
      );
    }

    return (
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
        size="small"
      >
        <TabPane
          tab={
            <Space>
              <FileOutlined />
              <span>Explorador</span>
              {totalFiles > 0 && <Badge count={totalFiles} size="small" />}
            </Space>
          }
          key="explorer"
        >
          <TaskFileExplorer
            taskId={taskId}
            taskTitle={taskTitle}
            isTeacher={isTeacher}
            readOnly={readOnly}
          />
        </TabPane>

        {!readOnly && (
          <TabPane
            tab={
              <Space>
                <UploadOutlined />
                <span>Subir Archivos</span>
              </Space>
            }
            key="upload"
          >
            <FileUploadZone
              taskId={taskId}
              isTeacher={isTeacher}
              onUploadComplete={handleUploadComplete}
            />
          </TabPane>
        )}

        <TabPane
          tab={
            <Space>
              <BarChartOutlined />
              <span>Estadísticas</span>
            </Space>
          }
          key="stats"
        >
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalFiles}</div>
                <Text type="secondary">Archivos totales</Text>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {taskAttachmentsApiService.formatFileSize(totalSize)}
                </div>
                <Text type="secondary">Espacio usado</Text>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(taskStats?.filesByType || {}).length}
                </div>
                <Text type="secondary">Tipos de archivo</Text>
              </div>
            </div>

            {taskStats?.filesByType && Object.keys(taskStats.filesByType).length > 0 && (
              <div className="mt-6">
                <Title level={5}>Archivos por tipo</Title>
                <div className="space-y-2">
                  {Object.entries(taskStats.filesByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <Text>{taskAttachmentsApiService.getFileType(type)}</Text>
                      <Badge count={count} showZero color="blue" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {taskStats?.recentActivity && taskStats.recentActivity.length > 0 && (
              <div className="mt-6">
                <Title level={5}>Actividad reciente</Title>
                <div className="space-y-2">
                  {taskStats.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <Text type="secondary">
                        {new Date(activity.createdAt).toLocaleDateString('es-ES')}
                      </Text>
                      <Text>{activity.action}</Text>
                      <Text>{activity.fileName}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabPane>
      </Tabs>
    );
  };

  return (
    <div className={className}>
      {renderContent()}

      {/* Comments Modal */}
      {selectedFileId && (
        <CommentsPanel
          attachmentId={selectedFileId}
          attachmentName="Archivo seleccionado"
          visible={showComments}
          onClose={() => {
            setShowComments(false);
            setSelectedFileId(null);
          }}
          readOnly={readOnly}
        />
      )}
    </div>
  );
};

export default TaskAttachmentsSection;