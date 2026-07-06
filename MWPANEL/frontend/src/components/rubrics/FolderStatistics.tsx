/**
 * Componente de estadísticas de carpetas de rúbricas
 * Muestra métricas detalladas y análisis de uso
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Spin,
  Alert,
  Space,
  Tooltip,
  Badge,
  Divider,
  Table,
  Tag
} from 'antd';
import {
  FolderOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  TrophyOutlined,
  TeamOutlined,
  StarOutlined
} from '@ant-design/icons';
import {
  RubricFolder,
  FolderStatsDto,
  RubricFoldersApiService
} from '../../services/rubricFoldersApi';

const { Title, Text } = Typography;

interface FolderStatisticsProps {
  folders: RubricFolder[];
  selectedFolder?: RubricFolder | null;
  loading?: boolean;
}

interface FolderStatsDisplay extends FolderStatsDto {
  percentage: number;
  level: 'empty' | 'low' | 'medium' | 'high';
}

export const FolderStatistics: React.FC<FolderStatisticsProps> = ({
  folders,
  selectedFolder,
  loading = false
}) => {
  const [statsData, setStatsData] = useState<FolderStatsDisplay[]>([]);
  const [selectedStats, setSelectedStats] = useState<FolderStatsDto | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar estadísticas generales
  useEffect(() => {
    // CRITICAL: Add loading protection and data validation
    if (!loading && folders.length > 0) {
      console.log('🔍 FOLDER STATS: Loading general stats for', folders.length, 'folders');
      // Validate folders have required properties
      const validFolders = folders.filter(folder => folder && folder.id);
      if (validFolders.length > 0) {
        loadGeneralStats();
      } else {
        console.warn('⚠️ FOLDER STATS: No valid folders found');
      }
    } else if (loading) {
      console.log('🔍 FOLDER STATS: Skipping stats load during loading state');
    }
  }, [folders, loading]);

  // Cargar estadísticas de carpeta específica
  useEffect(() => {
    // CRITICAL: Add safety checks to prevent race condition errors
    if (selectedFolder && selectedFolder.id) {
      console.log('🔍 FOLDER STATS: Loading stats for folder', selectedFolder.id);
      loadFolderStats(selectedFolder.id);
    } else {
      console.log('🔍 FOLDER STATS: No valid selectedFolder, clearing stats');
      setSelectedStats(null);
    }
  }, [selectedFolder]);

  const loadGeneralStats = async () => {
    try {
      setLoadingStats(true);
      setError(null);

      // CRITICAL: Validate folders before mapping to prevent undefined errors
      const validFolders = folders.filter(folder => 
        folder && 
        folder.id && 
        typeof folder.id === 'string'
      );
      
      if (validFolders.length === 0) {
        console.warn('⚠️ FOLDER STATS: No valid folders for stats calculation');
        setStatsData([]);
        return;
      }

      console.log('🔍 FOLDER STATS: Processing', validFolders.length, 'valid folders');
      
      const statsPromises = validFolders.map(folder =>
        RubricFoldersApiService.getFolderStats(folder.id)
      );

      const results = await Promise.all(statsPromises);
      const totalRubrics = results.reduce((sum, stats) => sum + stats.totalRubrics, 0);

      const enhancedStats: FolderStatsDisplay[] = results.map(stats => {
        const percentage = totalRubrics > 0 ? (stats.totalRubrics / totalRubrics) * 100 : 0;
        let level: 'empty' | 'low' | 'medium' | 'high' = 'empty';
        
        if (stats.totalRubrics === 0) level = 'empty';
        else if (stats.totalRubrics < 5) level = 'low';
        else if (stats.totalRubrics < 15) level = 'medium';
        else level = 'high';

        return {
          ...stats,
          percentage,
          level
        };
      });

      setStatsData(enhancedStats.sort((a, b) => b.totalRubrics - a.totalRubrics));
    } catch (err: any) {
      setError(err.message || 'Error cargando estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadFolderStats = async (folderId: string) => {
    try {
      const stats = await RubricFoldersApiService.getFolderStats(folderId);
      setSelectedStats(stats);
    } catch (err: any) {
      console.error('Error loading folder stats:', err);
    }
  };

  const getLevelColor = (level: 'empty' | 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'empty': return '#d9d9d9';
      case 'low': return '#faad14';
      case 'medium': return '#52c41a';
      case 'high': return '#1890ff';
    }
  };

  const getLevelText = (level: 'empty' | 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'empty': return 'Vacía';
      case 'low': return 'Bajo uso';
      case 'medium': return 'Uso medio';
      case 'high': return 'Alto uso';
    }
  };

  const totalRubrics = statsData.filter(stats => stats).reduce((sum, stats) => sum + (stats.totalRubrics || 0), 0);
  const totalSubfolders = statsData.filter(stats => stats).reduce((sum, stats) => sum + (stats.subfolders || 0), 0);
  const averageRubricsPerFolder = folders.length > 0 ? totalRubrics / folders.length : 0;

  const tableColumns = [
    {
      title: 'Carpeta',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: FolderStatsDisplay) => (
        <Space>
          <FolderOutlined style={{ color: getLevelColor(record.level) }} />
          <Text strong>{text}</Text>
          <Badge 
            color={getLevelColor(record.level)} 
            text={getLevelText(record.level)}
            size="small"
          />
        </Space>
      ),
    },
    {
      title: 'Rúbricas',
      children: [
        {
          title: 'Directas',
          dataIndex: 'directRubrics',
          key: 'directRubrics',
          width: 80,
          render: (value: number) => (
            <Statistic value={value} valueStyle={{ fontSize: 14 }} />
          ),
        },
        {
          title: 'Total',
          dataIndex: 'totalRubrics',
          key: 'totalRubrics',
          width: 80,
          render: (value: number) => (
            <Statistic value={value} valueStyle={{ fontSize: 14, color: '#1890ff' }} />
          ),
        },
      ],
    },
    {
      title: 'Subcarpetas',
      dataIndex: 'subfolders',
      key: 'subfolders',
      width: 100,
      render: (value: number) => (
        <Statistic value={value} valueStyle={{ fontSize: 14 }} />
      ),
    },
    {
      title: 'Distribución',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 150,
      render: (value: number, record: FolderStatsDisplay) => (
        <Progress 
          percent={Math.round(value)} 
          size="small" 
          strokeColor={getLevelColor(record.level)}
          showInfo={true}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Cargando estadísticas...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Error al cargar estadísticas"
        description={error}
        showIcon
      />
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Estadísticas generales */}
      <Card 
        title={
          <Space>
            <BarChartOutlined />
            <Text>Estadísticas Generales</Text>
          </Space>
        }
        size="small"
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total Carpetas"
              value={folders.length}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Rúbricas"
              value={totalRubrics}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Subcarpetas"
              value={totalSubfolders}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Promedio por Carpeta"
              value={averageRubricsPerFolder}
              precision={1}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Estadísticas de carpeta específica */}
      {selectedFolder && selectedStats && (
        <Card 
          title={
            <Space>
              <FolderOutlined style={{ color: selectedFolder.color || '#1890ff' }} />
              <Text>Estadísticas de "{selectedFolder.name}"</Text>
            </Space>
          }
          size="small"
        >
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Rúbricas Directas"
                value={selectedStats.directRubrics}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Rúbricas Totales"
                value={selectedStats.totalRubrics}
                prefix={<StarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Subcarpetas"
                value={selectedStats.subfolders}
                prefix={<FolderOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
          <Divider />
          <Text type="secondary">
            <ClockCircleOutlined /> Última modificación: {' '}
            {new Date(selectedStats.lastModified).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </Card>
      )}

      {/* Tabla detallada de estadísticas */}
      <Card 
        title={
          <Space>
            <TeamOutlined />
            <Text>Análisis Detallado por Carpeta</Text>
          </Space>
        }
        size="small"
      >
        <Table
          columns={tableColumns}
          dataSource={statsData}
          rowKey="id"
          loading={loadingStats}
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} carpetas`
          }}
          scroll={{ x: 600 }}
        />
      </Card>
    </Space>
  );
};

export default FolderStatistics;