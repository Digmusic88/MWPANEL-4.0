/**
 * Tarjeta para mostrar una entrada de bitácora
 * Con vista previa, edición inline y acciones rápidas
 */

import React, { useState } from 'react';
import {
  Card,
  Tag,
  Button,
  Space,
  Dropdown,
  Typography,
  Badge,
  Tooltip,
  Modal,
  message,
  Popconfirm,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PushpinOutlined,
  PushpinFilled,
  EyeOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  ShareAltOutlined,
  FileOutlined,
  EditFilled,
} from '@ant-design/icons';
import { LogbookEntry, LogbookVisibility } from '../../types/logbook.types';
import useLogbook from '../../hooks/useLogbook';
import TipTapEditor from './TipTapEditor';

const { Text, Title } = Typography;

interface LogbookEntryCardProps {
  entry: LogbookEntry;
  compact?: boolean;
  showActions?: boolean;
  onEdit?: (entry: LogbookEntry) => void;
  onView?: (entry: LogbookEntry) => void;
}

const VisibilityBadge: React.FC<{ visibility: LogbookVisibility }> = ({ visibility }) => {
  const configs = {
    private: { color: 'red', text: 'Privado' },
    staff: { color: 'orange', text: 'Profesorado' },
    admin: { color: 'blue', text: 'Administración' },
  };

  const config = configs[visibility] || configs.private;

  return (
    <Badge
      status={config.color as any}
      text={<Text type="secondary" className="text-xs">{config.text}</Text>}
    />
  );
};

const LogbookEntryCard: React.FC<LogbookEntryCardProps> = ({
  entry,
  compact = false,
  showActions = true,
  onEdit,
  onView,
}) => {
  const { togglePin, deleteEntry } = useLogbook();
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  const handleTogglePin = async () => {
    setIsPinning(true);
    try {
      await togglePin(entry.id);
    } catch (error) {
      console.error('Error toggling pin:', error);
    } finally {
      setIsPinning(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEntry(entry.id);
    } catch (error) {
      console.error('Error deleting entry:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = () => {
    if (onView) {
      onView(entry);
    } else {
      setIsViewModalVisible(true);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(entry);
    }
  };

  const formatTime = (time: string) => {
    return time?.slice(0, 5) || '';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Obtener texto plano del contenido para preview
  const getPlainTextPreview = (content: any, maxLength = 120) => {
    if (!content) return '';

    // Si ya tenemos el texto plano
    if (typeof content === 'string') {
      return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    // Extraer texto del JSON de TipTap
    const extractText = (node: any): string => {
      if (!node) return '';

      if (node.type === 'text') {
        return node.text || '';
      }

      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join(' ');
      }

      return '';
    };

    const plainText = extractText(content);
    return plainText.slice(0, maxLength) + (plainText.length > maxLength ? '...' : '');
  };

  const menuItems = [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'Ver detalles',
      onClick: handleView,
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Editar',
      onClick: handleEdit,
    },
    {
      key: 'pin',
      icon: entry.pinned ? <PushpinFilled /> : <PushpinOutlined />,
      label: entry.pinned ? 'Desfijar' : 'Fijar',
      onClick: handleTogglePin,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Eliminar',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '¿Eliminar entrada?',
          content: `¿Estás seguro de que quieres eliminar "${entry.title}"?`,
          okText: 'Eliminar',
          cancelText: 'Cancelar',
          okButtonProps: { danger: true },
          onOk: handleDelete,
        });
      },
    },
  ];

  return (
    <>
      <Card
        size={compact ? 'small' : 'default'}
        className={`hover:shadow-lg transition-all duration-200 ${
          entry.pinned ? 'ring-2 ring-blue-200 bg-blue-50' : ''
        } ${
          entry.isPlaceholder ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50' : ''
        }`}
        bodyStyle={{
          padding: compact ? '12px' : '16px',
          position: 'relative'
        }}
        actions={
          showActions && !compact
            ? [
                <Tooltip title="Ver detalles" key="view">
                  <Button type="text" icon={<EyeOutlined />} onClick={handleView} />
                </Tooltip>,
                <Tooltip title="Editar" key="edit">
                  <Button type="text" icon={<EditOutlined />} onClick={handleEdit} />
                </Tooltip>,
                <Tooltip title={entry.pinned ? 'Desfijar' : 'Fijar'} key="pin">
                  <Button
                    type="text"
                    icon={entry.pinned ? <PushpinFilled /> : <PushpinOutlined />}
                    onClick={handleTogglePin}
                    loading={isPinning}
                    className={entry.pinned ? 'text-blue-500' : ''}
                  />
                </Tooltip>,
                <Popconfirm
                  title="¿Eliminar entrada?"
                  description={`¿Estás seguro de que quieres eliminar "${entry.title}"?`}
                  onConfirm={handleDelete}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  key="delete"
                >
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    danger
                    loading={isDeleting}
                  />
                </Popconfirm>,
              ]
            : undefined
        }
        extra={
          showActions && (
            <div className="flex items-center space-x-2">
              {entry.pinned && (
                <PushpinFilled className="text-blue-500" />
              )}
              <Dropdown
                menu={{ items: menuItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button type="text" icon={<MoreOutlined />} size="small" />
              </Dropdown>
            </div>
          )
        }
      >
        <div className="space-y-3">
          {/* Encabezado con título y etiqueta */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-start space-x-2 mb-1">
                <Title
                  level={compact ? 5 : 4}
                  className="mb-0 truncate cursor-pointer hover:text-blue-600 flex-1"
                  onClick={handleView}
                >
                  {entry.title}
                </Title>

                {entry.isPlaceholder && (
                  <Tooltip title="Entrada plantilla - Haz clic para rellenar">
                    <Tag
                      color="orange"
                      icon={<FileOutlined />}
                      className="text-xs flex items-center"
                    >
                      Plantilla
                    </Tag>
                  </Tooltip>
                )}
              </div>

              {entry.tag && (
                <Tag
                  color={entry.tag.colorHex}
                  className="mb-2 text-white border-0 font-medium"
                  style={{
                    backgroundColor: entry.tag.colorHex,
                    color: '#ffffff'
                  }}
                >
                  {entry.tag.name}
                </Tag>
              )}
            </div>
          </div>

          {/* Contenido preview */}
          {!compact && (
            <div className="text-gray-600 text-sm leading-relaxed">
              {getPlainTextPreview(entry.contentRich)}
            </div>
          )}

          {/* Metadatos */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <CalendarOutlined />
                <span>{formatDate(entry.dateLocal)}</span>
              </div>

              {(entry.startedAtLocal || entry.endedAtLocal) && (
                <div className="flex items-center space-x-1">
                  <ClockCircleOutlined />
                  <span>
                    {entry.startedAtLocal && formatTime(entry.startedAtLocal)}
                    {entry.startedAtLocal && entry.endedAtLocal && ' - '}
                    {entry.endedAtLocal && formatTime(entry.endedAtLocal)}
                    {entry.durationMin && ` (${entry.durationMin} min)`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <VisibilityBadge visibility={entry.visibility} />
              {entry.attachmentsCnt > 0 && (
                <Badge count={entry.attachmentsCnt} size="small" color="blue" />
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Modal de vista detallada */}
      <Modal
        title={
          <div className="flex items-center justify-between">
            <div>
              <Title level={4} className="mb-0">
                {entry.title}
              </Title>
              {entry.tag && (
                <Tag
                  color={entry.tag.colorHex}
                  className="mt-2 text-white border-0"
                  style={{
                    backgroundColor: entry.tag.colorHex,
                    color: '#ffffff'
                  }}
                >
                  {entry.tag.name}
                </Tag>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                {formatDate(entry.dateLocal)}
              </div>
              {(entry.startedAtLocal || entry.endedAtLocal) && (
                <div className="text-xs text-gray-500">
                  {entry.startedAtLocal && formatTime(entry.startedAtLocal)}
                  {entry.startedAtLocal && entry.endedAtLocal && ' - '}
                  {entry.endedAtLocal && formatTime(entry.endedAtLocal)}
                  {entry.durationMin && ` (${entry.durationMin} min)`}
                </div>
              )}
            </div>
          </div>
        }
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="edit" icon={<EditOutlined />} onClick={handleEdit}>
            Editar
          </Button>,
          <Button
            key="pin"
            icon={entry.pinned ? <PushpinFilled /> : <PushpinOutlined />}
            onClick={handleTogglePin}
            loading={isPinning}
            type={entry.pinned ? 'primary' : 'default'}
          >
            {entry.pinned ? 'Desfijar' : 'Fijar'}
          </Button>,
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            Cerrar
          </Button>,
        ]}
        width={800}
        destroyOnClose
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <VisibilityBadge visibility={entry.visibility} />
            <div className="flex items-center space-x-4">
              <span>Creado: {new Date(entry.createdAt).toLocaleString('es-ES')}</span>
              {entry.updatedAt !== entry.createdAt && (
                <span>Editado: {new Date(entry.updatedAt).toLocaleString('es-ES')}</span>
              )}
            </div>
          </div>

          <div className="border rounded-md">
            <TipTapEditor
              content={entry.contentRich}
              editable={false}
              toolbar={false}
              statusBar={false}
              minHeight={300}
            />
          </div>

          {entry.attachmentsCnt > 0 && (
            <div className="border-t pt-4">
              <Text strong>Archivos adjuntos ({entry.attachmentsCnt})</Text>
              {/* Aquí se mostrarían los archivos adjuntos cuando se implementen */}
              <div className="text-gray-500 text-sm mt-1">
                Funcionalidad de archivos adjuntos próximamente
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default LogbookEntryCard;