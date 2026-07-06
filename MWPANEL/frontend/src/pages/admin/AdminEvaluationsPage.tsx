import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  Table,
  Tag,
  Progress,
  Statistic,
  Button,
  Space,
  Empty,
  Spin,
  Alert,
  Input,
  DatePicker,
  Badge,
  Avatar,
  List,
  Descriptions,
  Modal,
  message,
} from 'antd';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import InteractiveButton from '@components/animations/InteractiveButton';
import ScrollReveal from '@components/animations/ScrollReveal';
import FadeInUp from '@components/animations/FadeInUp';
import StaggerContainer, { StaggerItem } from '@components/animations/StaggerContainer';
import {
  FileTextOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  CalendarOutlined,
  UserOutlined,
  BookOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useResponsive } from '../../hooks/useResponsive';
import apiClient from '../../services/apiClient';
import dayjs from 'dayjs';
import Loading from '../../components/common/Loading';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface Evaluation {
  id: string;
  title: string;
  description: string;
  type: 'competency' | 'test' | 'assignment' | 'oral';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  classGroupId: string;
  classGroupName: string;
  dueDate: string;
  completedAt?: string;
  score?: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
}

interface EvaluationStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  averageScore: number;
  completionRate: number;
}

const AdminEvaluationsPage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    teacherId: '',
    subjectId: '',
    classGroupId: '',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
    search: '',
  });
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classGroups, setClassGroups] = useState<any[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const { isMobile, isTablet } = useResponsive();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evaluationsRes, statsRes, teachersRes, subjectsRes, classGroupsRes] = await Promise.all([
        apiClient.get('/evaluations', { params: filters }),
        apiClient.get('/evaluations/stats'),
        apiClient.get('/teachers'),
        apiClient.get('/subjects'),
        apiClient.get('/class-groups'),
      ]);

      setEvaluations(evaluationsRes.data);
      setStats(statsRes.data);
      setTeachers(teachersRes.data);
      setSubjects(subjectsRes.data);
      setClassGroups(classGroupsRes.data);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Solo cargar datos al montar el componente

  // Manejadores de eventos para los botones de acción
  const handleView = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setIsViewModalVisible(true);
  };

  const handleEdit = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setIsEditModalVisible(true);
  };

  const handleDelete = async (evaluation: Evaluation) => {
    Modal.confirm({
      title: '¿Estás seguro de eliminar esta evaluación?',
      content: `Se eliminará la evaluación "${evaluation.title}" permanentemente.`,
      okText: 'Eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await apiClient.delete(`/evaluations/${evaluation.id}`);
          message.success('Evaluación eliminada exitosamente');
          fetchData(); // Recargar datos
        } catch (error) {
          console.error('Error al eliminar evaluación:', error);
          message.error('Error al eliminar la evaluación');
        }
      },
    });
  };

  const handleCreateNew = () => {
    setSelectedEvaluation(null);
    setIsCreateModalVisible(true);
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/evaluations/export', {
        params: filters,
        responseType: 'blob',
      });
      
      // Crear blob y descargar archivo
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evaluaciones_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Evaluaciones exportadas exitosamente');
    } catch (error) {
      console.error('Error al exportar evaluaciones:', error);
      message.error('Error al exportar las evaluaciones');
    }
  };

  const applyFilters = () => {
    fetchData();
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      type: '',
      teacherId: '',
      subjectId: '',
      classGroupId: '',
      dateRange: null,
      search: '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'active': return 'processing';
      case 'draft': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'active': return 'Activa';
      case 'draft': return 'Borrador';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'competency': return 'Competencias';
      case 'test': return 'Test Yourself';
      case 'assignment': return 'Tarea';
      case 'oral': return 'Oral';
      default: return type;
    }
  };

  // Columnas responsive para desktop y tablet
  const columns: ColumnsType<Evaluation> = [
    {
      title: 'Evaluación',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      render: (title: string, record: Evaluation) => (
        <div>
          <Text strong>{title}</Text>
          <div className="text-sm text-gray-500">
            {record.description && record.description.length > 50 
              ? `${record.description.substring(0, 50)}...` 
              : record.description}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Tag color={getStatusColor(record.status)}>
              {getStatusText(record.status)}
            </Tag>
            <Tag>{getTypeText(record.type)}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Estudiante',
      key: 'student',
      width: 200,
      render: (record: Evaluation) => (
        <div className="flex items-center gap-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <Text>{record.studentName}</Text>
            <div className="text-sm text-gray-500">{record.classGroupName}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Profesor/Asignatura',
      key: 'teacher',
      width: 200,
      render: (record: Evaluation) => (
        <div>
          <Text>{record.teacherName}</Text>
          <div className="text-sm text-gray-500">{record.subjectName}</div>
        </div>
      ),
    },
    {
      title: 'Fechas',
      key: 'dates',
      width: 150,
      render: (record: Evaluation) => (
        <div>
          <div className="text-sm">
            <CalendarOutlined /> Vence: {dayjs(record.dueDate).format('DD/MM/YYYY')}
          </div>
          {record.completedAt && (
            <div className="text-sm text-green-600">
              <CheckCircleOutlined /> Completada: {dayjs(record.completedAt).format('DD/MM/YYYY')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Puntuación',
      key: 'score',
      width: 120,
      render: (record: Evaluation) => (
        <div>
          {record.score !== undefined ? (
            <div>
              <Text strong>{record.score} / {record.maxScore}</Text>
              <Progress 
                percent={Math.round((record.score / record.maxScore) * 100)} 
                size="small"
                status={record.score >= record.maxScore * 0.6 ? 'success' : 'exception'}
              />
            </div>
          ) : (
            <Text type="secondary">Pendiente</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (record: Evaluation) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<EyeOutlined />} 
            onClick={() => handleView(record)}
            title="Ver evaluación"
          />
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
            title="Editar evaluación"
          />
          <Button 
            size="small" 
            icon={<DeleteOutlined />} 
            danger 
            onClick={() => handleDelete(record)}
            title="Eliminar evaluación"
          />
        </Space>
      ),
    },
  ];

  // Renderizado personalizado para móvil
  const renderMobileCard = (record: Evaluation, index: number) => (
    <Card
      size="small"
      style={{ marginBottom: '12px' }}
      bodyStyle={{ padding: '12px' }}
      extra={
        <Space size="small">
          <Button 
            size="small" 
            icon={<EyeOutlined />} 
            onClick={() => handleView(record)}
            title="Ver"
          />
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
            title="Editar"
          />
          <Button 
            size="small" 
            icon={<DeleteOutlined />} 
            danger 
            onClick={() => handleDelete(record)}
            title="Eliminar"
          />
        </Space>
      }
    >
      {/* Título y estado */}
      <div style={{ marginBottom: '8px' }}>
        <Text strong style={{ fontSize: '14px', display: 'block' }}>
          {record.title}
        </Text>
        <div style={{ marginTop: '4px' }}>
          <Tag color={getStatusColor(record.status)} size="small">
            {getStatusText(record.status)}
          </Tag>
          <Tag size="small">{getTypeText(record.type)}</Tag>
        </div>
      </div>

      {/* Descripción */}
      {record.description && (
        <Text 
          type="secondary" 
          style={{ 
            fontSize: '12px', 
            display: 'block', 
            marginBottom: '8px',
            lineHeight: '1.4'
          }}
        >
          {record.description.length > 80 
            ? `${record.description.substring(0, 80)}...` 
            : record.description}
        </Text>
      )}

      {/* Información del estudiante */}
      <Row gutter={[8, 4]} style={{ marginBottom: '8px' }}>
        <Col span={12}>
          <Space size="small" align="start">
            <Avatar size="small" icon={<UserOutlined />} />
            <div>
              <Text style={{ fontSize: '12px', fontWeight: '500', display: 'block' }}>
                {record.studentName}
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {record.classGroupName}
              </Text>
            </div>
          </Space>
        </Col>
        <Col span={12}>
          <div>
            <Text style={{ fontSize: '12px', fontWeight: '500', display: 'block' }}>
              {record.teacherName}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.subjectName}
            </Text>
          </div>
        </Col>
      </Row>

      {/* Fechas */}
      <Row gutter={[8, 4]} style={{ marginBottom: '8px' }}>
        <Col span={12}>
          <Space size="small">
            <CalendarOutlined style={{ fontSize: '12px', color: '#faad14' }} />
            <Text style={{ fontSize: '11px' }}>
              Vence: {dayjs(record.dueDate).format('DD/MM/YY')}
            </Text>
          </Space>
        </Col>
        <Col span={12}>
          {record.completedAt && (
            <Space size="small">
              <CheckCircleOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
              <Text style={{ fontSize: '11px', color: '#52c41a' }}>
                {dayjs(record.completedAt).format('DD/MM/YY')}
              </Text>
            </Space>
          )}
        </Col>
      </Row>

      {/* Puntuación */}
      <div>
        {record.score !== undefined ? (
          <div>
            <Space style={{ marginBottom: '4px' }}>
              <Text strong style={{ fontSize: '12px' }}>
                {record.score} / {record.maxScore}
              </Text>
              <Text 
                style={{ 
                  fontSize: '11px',
                  color: record.score >= record.maxScore * 0.6 ? '#52c41a' : '#ff4d4f'
                }}
              >
                ({Math.round((record.score / record.maxScore) * 100)}%)
              </Text>
            </Space>
            <Progress 
              percent={Math.round((record.score / record.maxScore) * 100)} 
              size="small"
              strokeWidth={6}
              status={record.score >= record.maxScore * 0.6 ? 'success' : 'exception'}
              showInfo={false}
            />
          </div>
        ) : (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            📝 Pendiente de calificación
          </Text>
        )}
      </div>
    </Card>
  );

  if (loading) {
    return <Loading size="large" text="Cargando evaluaciones..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeInUp>
        <div className="flex justify-between items-center">
          <div>
            <Title level={2} className="!mb-2">
              Gestión de Evaluaciones
            </Title>
            <Text type="secondary">
              Administra y supervisa todas las evaluaciones del centro
            </Text>
          </div>
          <InteractiveButton 
            variant="primary" 
            icon={<PlusOutlined />} 
            size="large"
            onClick={handleCreateNew}
          >
            Nueva Evaluación
          </InteractiveButton>
        </div>
      </FadeInUp>

      {/* Stats Cards */}
      {stats && (
        <StaggerContainer staggerDelay={0.15} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StaggerItem>
            <Card>
              <Statistic
                title="Total Evaluaciones"
                value={stats.total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card>
              <Statistic
                title="Completadas"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card>
              <Statistic
                title="Pendientes"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card>
              <Statistic
                title="Puntuación Media"
                value={stats.averageScore}
                precision={1}
                suffix="/ 10"
                prefix={<BookOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Filters */}
      <ScrollReveal direction="right" delay={0.3}>
        <Card title="Filtros" size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="Buscar evaluación..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Estado"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              allowClear
            >
              <Option value="draft">Borrador</Option>
              <Option value="active">Activa</Option>
              <Option value="completed">Completada</Option>
              <Option value="cancelled">Cancelada</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Tipo"
              style={{ width: '100%' }}
              value={filters.type}
              onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              allowClear
            >
              <Option value="competency">Competencias</Option>
              <Option value="test">Test Yourself</Option>
              <Option value="assignment">Tarea</Option>
              <Option value="oral">Oral</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Profesor"
              style={{ width: '100%' }}
              value={filters.teacherId}
              onChange={(value) => setFilters(prev => ({ ...prev, teacherId: value }))}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {teachers.map(teacher => (
                <Option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Asignatura"
              style={{ width: '100%' }}
              value={filters.subjectId}
              onChange={(value) => setFilters(prev => ({ ...prev, subjectId: value }))}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {subjects.map(subject => (
                <Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={filters.dateRange}
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
              placeholder={['Fecha inicio', 'Fecha fin']}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
              <InteractiveButton 
                variant="primary" 
                icon={<SearchOutlined />}
                onClick={applyFilters}
                block={isMobile}
                size={isMobile ? 'middle' : 'default'}
              >
                Aplicar Filtros
              </InteractiveButton>
              <InteractiveButton 
                variant="secondary"
                onClick={clearFilters}
                block={isMobile}
                size={isMobile ? 'middle' : 'default'}
              >
                Limpiar
              </InteractiveButton>
            </Space>
          </Col>
        </Row>
        </Card>
      </ScrollReveal>

      {/* Evaluations Table */}
      <ScrollReveal direction="up" delay={0.5}>
        <Card 
          title={`Evaluaciones (${evaluations.length})`}
        extra={
          <Space>
            <InteractiveButton 
              variant="ghost"
              icon={<FilterOutlined />}
              onClick={handleExport}
              loading={loading}
            >
              Exportar
            </InteractiveButton>
          </Space>
        }
      >
        {evaluations.length === 0 ? (
          <Empty
            description="No se encontraron evaluaciones"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <ResponsiveTable
            dataSource={evaluations}
            columns={columns}
            rowKey="id"
            mobileCardRender={renderMobileCard}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} de ${total} evaluaciones`,
            }}
          />
        )}
        </Card>
      </ScrollReveal>

      {/* Modal para Ver Evaluación */}
      <Modal
        title="Detalles de Evaluación"
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            Cerrar
          </Button>
        ]}
        width={isMobile ? '95%' : isTablet ? 600 : 800}
        style={isMobile ? { top: 20 } : {}}
      >
        {selectedEvaluation && (
          <Descriptions 
            bordered={!isMobile} 
            column={1}
            size={isMobile ? 'small' : 'default'}
            labelStyle={isMobile ? { width: '100px' } : {}}
          >
            <Descriptions.Item label="Título">{selectedEvaluation.title}</Descriptions.Item>
            <Descriptions.Item label="Descripción">{selectedEvaluation.description}</Descriptions.Item>
            <Descriptions.Item label="Tipo">
              <Tag>{getTypeText(selectedEvaluation.type)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={getStatusColor(selectedEvaluation.status)}>
                {getStatusText(selectedEvaluation.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Estudiante">{selectedEvaluation.studentName}</Descriptions.Item>
            <Descriptions.Item label="Profesor">{selectedEvaluation.teacherName}</Descriptions.Item>
            <Descriptions.Item label="Asignatura">{selectedEvaluation.subjectName}</Descriptions.Item>
            <Descriptions.Item label="Clase">{selectedEvaluation.classGroupName}</Descriptions.Item>
            <Descriptions.Item label="Fecha de Vencimiento">
              {dayjs(selectedEvaluation.dueDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            {selectedEvaluation.completedAt && (
              <Descriptions.Item label="Fecha de Finalización">
                {dayjs(selectedEvaluation.completedAt).format('DD/MM/YYYY')}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Puntuación">
              {selectedEvaluation.score !== undefined 
                ? `${selectedEvaluation.score} / ${selectedEvaluation.maxScore}` 
                : 'Pendiente'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Modal para Editar Evaluación */}
      <Modal
        title="Editar Evaluación"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        width={isMobile ? '95%' : isTablet ? 600 : 800}
        style={isMobile ? { top: 20 } : {}}
      >
        <Alert
          message="Edición de evaluaciones"
          description="Utilice esta interfaz para modificar evaluaciones existentes. Para gestionar períodos de evaluación, visite la sección correspondiente en el menú."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div className="flex justify-end">
          <Button onClick={() => setIsEditModalVisible(false)}>
            Cerrar
          </Button>
        </div>
      </Modal>

      {/* Modal para Crear Nueva Evaluación */}
      <Modal
        title="Nueva Evaluación"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
        width={isMobile ? '95%' : isTablet ? 600 : 800}
        style={isMobile ? { top: 20 } : {}}
      >
        <Alert
          message="Creación de evaluaciones"
          description="Utilice esta interfaz para crear nuevas evaluaciones. Asegúrese de que existan períodos de evaluación activos antes de proceder."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div className="flex justify-end">
          <Button onClick={() => setIsCreateModalVisible(false)}>
            Cerrar
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminEvaluationsPage;