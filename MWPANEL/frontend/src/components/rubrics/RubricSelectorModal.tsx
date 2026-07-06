import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Input,
  Select,
  Table,
  Card,
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  InputNumber,
  DatePicker,
  Empty,
  Tooltip,
  Avatar,
  Statistic,
} from 'antd';
import {
  SearchOutlined,
  CalendarOutlined,
  BookOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableProps } from 'antd/es/table';
import dayjs from 'dayjs';
import { Rubric } from '../../hooks/useRubrics';

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface RubricSelectorModalProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (rubric: Rubric) => void;
  rubrics: Rubric[];
  currentTeacherId: string | null;
  loading?: boolean;
  selectedRubricId?: string;
}

interface RubricFilters {
  search: string;
  subject: string;
  criteriaCount: number | null;
  levelsCount: number | null;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  status: string;
  isShared: string;
}

const RubricSelectorModal: React.FC<RubricSelectorModalProps> = ({
  visible,
  onCancel,
  onSelect,
  rubrics,
  currentTeacherId,
  loading = false,
  selectedRubricId,
}) => {
  const [filters, setFilters] = useState<RubricFilters>({
    search: '',
    subject: '',
    criteriaCount: null,
    levelsCount: null,
    dateRange: null,
    status: '',
    isShared: '',
  });

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [previewRubric, setPreviewRubric] = useState<Rubric | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Filtrar rúbricas activas disponibles para el profesor
  const availableRubrics = useMemo(() => {
    return rubrics.filter(r => 
      r.status === 'active' && 
      !r.isTemplate &&
      currentTeacherId && 
      (r.teacherId === currentTeacherId || r.sharedWith?.includes(currentTeacherId))
    );
  }, [rubrics, currentTeacherId]);

  // Aplicar filtros
  const filteredRubrics = useMemo(() => {
    let filtered = [...availableRubrics];

    // Filtro de búsqueda por nombre o descripción
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por número de criterios
    if (filters.criteriaCount) {
      filtered = filtered.filter(r => r.criteriaCount === filters.criteriaCount);
    }

    // Filtro por número de niveles
    if (filters.levelsCount) {
      filtered = filtered.filter(r => r.levelsCount === filters.levelsCount);
    }

    // Filtro por rango de fechas
    if (filters.dateRange) {
      const [startDate, endDate] = filters.dateRange;
      filtered = filtered.filter(r => {
        const rubricDate = dayjs(r.createdAt);
        return rubricDate.isAfter(startDate) && rubricDate.isBefore(endDate.add(1, 'day'));
      });
    }

    // Filtro por estado de compartición
    if (filters.isShared) {
      if (filters.isShared === 'shared') {
        filtered = filtered.filter(r => r.teacherId !== currentTeacherId);
      } else if (filters.isShared === 'owned') {
        filtered = filtered.filter(r => r.teacherId === currentTeacherId);
      }
    }

    return filtered;
  }, [availableRubrics, filters, currentTeacherId]);

  // Obtener opciones únicas para filtros
  const uniqueCriteriaCounts = useMemo(() => {
    const counts = [...new Set(availableRubrics.map(r => r.criteriaCount))].sort((a, b) => a - b);
    return counts;
  }, [availableRubrics]);

  const uniqueLevelsCounts = useMemo(() => {
    const counts = [...new Set(availableRubrics.map(r => r.levelsCount))].sort((a, b) => a - b);
    return counts;
  }, [availableRubrics]);

  const clearFilters = () => {
    setFilters({
      search: '',
      subject: '',
      criteriaCount: null,
      levelsCount: null,
      dateRange: null,
      status: '',
      isShared: '',
    });
  };

  const handleSelect = (rubric: Rubric) => {
    onSelect(rubric);
  };

  const handlePreview = (rubric: Rubric) => {
    setPreviewRubric(rubric);
    setPreviewVisible(true);
  };

  // Columnas para la tabla
  const columns: ColumnsType<Rubric> = [
    {
      title: 'Rúbrica',
      key: 'rubric',
      width: 300,
      render: (_, record) => (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Text strong className="text-base">{record.name}</Text>
            {record.teacherId !== currentTeacherId && (
              <Tag color="cyan" size="small">Compartida</Tag>
            )}
            {selectedRubricId === record.id && (
              <Tag color="blue" size="small">Seleccionada</Tag>
            )}
          </div>
          {record.description && (
            <div className="text-sm text-gray-600 max-w-sm">
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Criterios',
      dataIndex: 'criteriaCount',
      key: 'criteriaCount',
      width: 100,
      align: 'center',
      render: (count) => (
        <Tag color="blue">{count}</Tag>
      ),
    },
    {
      title: 'Niveles',
      dataIndex: 'levelsCount',
      key: 'levelsCount',
      width: 100,
      align: 'center',
      render: (count) => (
        <Tag color="purple">{count}</Tag>
      ),
    },
    {
      title: 'Puntuación',
      dataIndex: 'maxScore',
      key: 'maxScore',
      width: 120,
      align: 'center',
      render: (score) => (
        <Tag color="orange">{score} pts</Tag>
      ),
    },
    {
      title: 'Creada',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => (
        <div className="text-sm">
          {dayjs(date).format('DD/MM/YYYY')}
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Vista previa">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="Seleccionar">
            <Button 
              type={selectedRubricId === record.id ? "primary" : "default"}
              icon={<CheckCircleOutlined />} 
              size="small"
              onClick={() => handleSelect(record)}
            >
              {selectedRubricId === record.id ? 'Seleccionada' : 'Seleccionar'}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tableProps: TableProps<Rubric> = {
    dataSource: filteredRubrics,
    columns,
    loading,
    pagination: {
      pageSize: 10,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} rúbricas`,
    },
    rowKey: "id",
    scroll: { x: 800 },
    rowSelection: {
      type: 'radio',
      selectedRowKeys: selectedRubricId ? [selectedRubricId] : [],
      onSelect: (record) => handleSelect(record),
    }
  };

  // Renderizado en modo cards
  const renderCards = () => (
    <Row gutter={[16, 16]}>
      {filteredRubrics.map(rubric => (
        <Col xs={24} sm={12} lg={8} xl={6} key={rubric.id}>
          <Card
            size="small"
            hoverable
            className={`cursor-pointer transition-all ${
              selectedRubricId === rubric.id 
                ? 'border-blue-500 shadow-md bg-blue-50' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleSelect(rubric)}
            actions={[
              <Tooltip title="Vista previa" key="preview">
                <EyeOutlined onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(rubric);
                }} />
              </Tooltip>,
              <Tooltip title="Seleccionar rúbrica" key="select">
                <CheckCircleOutlined 
                  className={selectedRubricId === rubric.id ? 'text-blue-500' : ''} 
                />
              </Tooltip>,
            ]}
          >
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <Text strong className="text-sm">{rubric.name}</Text>
                {rubric.teacherId !== currentTeacherId && (
                  <Tag color="cyan" size="small">
                    <ShareAltOutlined className="mr-1" />
                  </Tag>
                )}
              </div>
              {rubric.description && (
                <Text type="secondary" className="text-xs line-clamp-2">
                  {rubric.description}
                </Text>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Space>
                  <Tag color="blue" size="small">{rubric.criteriaCount} criterios</Tag>
                  <Tag color="purple" size="small">{rubric.levelsCount} niveles</Tag>
                </Space>
              </div>
              <div className="flex justify-between items-center">
                <Tag color="orange" size="small">{rubric.maxScore} pts</Tag>
                <Text type="secondary" className="text-xs">
                  {dayjs(rubric.createdAt).format('DD/MM/YY')}
                </Text>
              </div>
            </div>

            {selectedRubricId === rubric.id && (
              <div className="absolute top-2 right-2">
                <Avatar size="small" icon={<CheckCircleOutlined />} className="bg-blue-500" />
              </div>
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <BookOutlined />
            <span>Seleccionar Rúbrica de Evaluación</span>
          </div>
        }
        open={visible}
        onCancel={onCancel}
        width={1200}
        style={{ top: 20 }}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancelar
          </Button>,
          <Button 
            key="clear" 
            onClick={clearFilters}
            disabled={Object.values(filters).every(v => !v || (Array.isArray(v) && v.length === 0))}
          >
            Limpiar Filtros
          </Button>,
          <Button 
            key="create" 
            type="dashed"
            onClick={() => window.open('/teacher/rubrics', '_blank')}
          >
            + Crear Nueva Rúbrica
          </Button>,
        ]}
        destroyOnClose
      >
        <div className="space-y-4">
          {/* Filtros */}
          <Card size="small" title="Filtros de Búsqueda">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  prefix={<SearchOutlined />}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  allowClear
                />
              </Col>
              
              <Col xs={12} sm={6} md={4}>
                <Select
                  placeholder="Nº Criterios"
                  value={filters.criteriaCount}
                  onChange={(value) => setFilters({ ...filters, criteriaCount: value })}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {uniqueCriteriaCounts.map(count => (
                    <Option key={count} value={count}>{count} criterios</Option>
                  ))}
                </Select>
              </Col>

              <Col xs={12} sm={6} md={4}>
                <Select
                  placeholder="Nº Niveles"
                  value={filters.levelsCount}
                  onChange={(value) => setFilters({ ...filters, levelsCount: value })}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {uniqueLevelsCounts.map(count => (
                    <Option key={count} value={count}>{count} niveles</Option>
                  ))}
                </Select>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <RangePicker
                  placeholder={['Fecha inicio', 'Fecha fin']}
                  value={filters.dateRange}
                  onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                />
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="Propiedad"
                  value={filters.isShared}
                  onChange={(value) => setFilters({ ...filters, isShared: value })}
                  allowClear
                  style={{ width: '100%' }}
                >
                  <Option value="owned">Mis rúbricas</Option>
                  <Option value="shared">Compartidas conmigo</Option>
                </Select>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="Vista"
                  value={viewMode}
                  onChange={setViewMode}
                  style={{ width: '100%' }}
                >
                  <Option value="cards">Tarjetas</Option>
                  <Option value="table">Tabla</Option>
                </Select>
              </Col>
            </Row>
          </Card>

          {/* Resultados */}
          <Card 
            size="small" 
            title={`Rúbricas Disponibles (${filteredRubrics.length})`}
            extra={
              selectedRubricId && (
                <Tag color="blue">
                  Rúbrica seleccionada
                </Tag>
              )
            }
          >
            {filteredRubrics.length === 0 ? (
              <Empty
                description="No se encontraron rúbricas que coincidan con los filtros"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={() => window.open('/teacher/rubrics', '_blank')}>
                  Crear Nueva Rúbrica
                </Button>
              </Empty>
            ) : (
              viewMode === 'cards' ? renderCards() : <Table {...tableProps} />
            )}
          </Card>
        </div>
      </Modal>

      {/* Modal de vista previa (básico) */}
      <Modal
        title={`Vista Previa: ${previewRubric?.name}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Cerrar
          </Button>,
          <Button 
            key="select" 
            type="primary" 
            onClick={() => {
              if (previewRubric) {
                handleSelect(previewRubric);
                setPreviewVisible(false);
              }
            }}
          >
            Seleccionar Esta Rúbrica
          </Button>,
        ]}
      >
        {previewRubric && (
          <div className="space-y-4">
            <div>
              <Text strong>Descripción:</Text>
              <div>{previewRubric.description || 'Sin descripción'}</div>
            </div>
            
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small" className="text-center">
                  <Statistic 
                    title="Criterios" 
                    value={previewRubric.criteriaCount} 
                    prefix={<BookOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" className="text-center">
                  <Statistic 
                    title="Niveles" 
                    value={previewRubric.levelsCount}
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" className="text-center">
                  <Statistic 
                    title="Puntuación Máxima" 
                    value={previewRubric.maxScore}
                    suffix="pts"
                  />
                </Card>
              </Col>
            </Row>

            <div>
              <Text strong>Información:</Text>
              <div className="mt-2 space-y-1">
                <div>Creada: {dayjs(previewRubric.createdAt).format('DD/MM/YYYY HH:mm')}</div>
                <div>
                  Propiedad: {previewRubric.teacherId === currentTeacherId ? 'Tuya' : 'Compartida contigo'}
                </div>
                <div>Estado: <Tag color="green">Activa</Tag></div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default RubricSelectorModal;