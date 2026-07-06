import React from 'react';
import { Button, Space, Tooltip, Dropdown, MenuProps } from 'antd';
import {
  AppstoreOutlined,
  BarsOutlined,
  DeleteOutlined,
  ReloadOutlined,
  MoreOutlined,
  DownloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';

import { ViewMode } from '../common/types';

interface DriveToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedFiles: string[];
  onDelete?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onRefresh: () => void;
  compact?: boolean;
}

export const DriveToolbar: React.FC<DriveToolbarProps> = ({
  viewMode,
  onViewModeChange,
  selectedFiles,
  onDelete,
  onDownload,
  onShare,
  onRefresh,
  compact = false,
}) => {
  const hasSelectedFiles = selectedFiles.length > 0;

  // Actions menu for selected files
  const actionsMenu: MenuProps = {
    items: [
      {
        key: 'download',
        label: 'Descargar',
        icon: <DownloadOutlined />,
        onClick: onDownload,
        disabled: !hasSelectedFiles,
      },
      {
        key: 'share',
        label: 'Compartir',
        icon: <ShareAltOutlined />,
        onClick: onShare,
        disabled: !hasSelectedFiles,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        label: 'Eliminar',
        icon: <DeleteOutlined />,
        onClick: onDelete,
        disabled: !hasSelectedFiles || !onDelete,
        danger: true,
      },
    ],
  };

  if (compact) {
    return (
      <Space size="small">
        {/* View mode toggle */}
        <Button.Group size="small">
          <Button
            icon={<AppstoreOutlined />}
            type={viewMode === 'grid' ? 'primary' : 'default'}
            onClick={() => onViewModeChange('grid')}
          />
          <Button
            icon={<BarsOutlined />}
            type={viewMode === 'list' ? 'primary' : 'default'}
            onClick={() => onViewModeChange('list')}
          />
        </Button.Group>

        {/* Refresh */}
        <Tooltip title="Actualizar">
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            size="small"
          />
        </Tooltip>

        {/* Actions for selected files */}
        {hasSelectedFiles && (
          <Dropdown menu={actionsMenu} trigger={['click']}>
            <Button
              icon={<MoreOutlined />}
              size="small"
            >
              {selectedFiles.length} seleccionado{selectedFiles.length > 1 ? 's' : ''}
            </Button>
          </Dropdown>
        )}
      </Space>
    );
  }

  return (
    <Space size="middle">
      {/* File selection info */}
      {hasSelectedFiles && (
        <span className="text-gray-600">
          {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''} seleccionado{selectedFiles.length > 1 ? 's' : ''}
        </span>
      )}

      {/* View mode toggle */}
      <Button.Group>
        <Tooltip title="Vista de cuadrícula">
          <Button
            icon={<AppstoreOutlined />}
            type={viewMode === 'grid' ? 'primary' : 'default'}
            onClick={() => onViewModeChange('grid')}
          />
        </Tooltip>
        <Tooltip title="Vista de lista">
          <Button
            icon={<BarsOutlined />}
            type={viewMode === 'list' ? 'primary' : 'default'}
            onClick={() => onViewModeChange('list')}
          />
        </Tooltip>
      </Button.Group>

      {/* Individual action buttons for better UX */}
      {hasSelectedFiles && onDownload && (
        <Tooltip title="Descargar seleccionados">
          <Button
            icon={<DownloadOutlined />}
            onClick={onDownload}
          >
            Descargar
          </Button>
        </Tooltip>
      )}

      {hasSelectedFiles && onShare && (
        <Tooltip title="Compartir seleccionados">
          <Button
            icon={<ShareAltOutlined />}
            onClick={onShare}
          >
            Compartir
          </Button>
        </Tooltip>
      )}

      {hasSelectedFiles && onDelete && (
        <Tooltip title="Eliminar seleccionados">
          <Button
            icon={<DeleteOutlined />}
            onClick={onDelete}
            danger
          >
            Eliminar
          </Button>
        </Tooltip>
      )}

      {/* Refresh button */}
      <Tooltip title="Actualizar">
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
        />
      </Tooltip>

      {/* More actions menu */}
      <Dropdown menu={actionsMenu} trigger={['click']}>
        <Button icon={<MoreOutlined />}>
          Más acciones
        </Button>
      </Dropdown>
    </Space>
  );
};

export default DriveToolbar;