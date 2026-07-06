/**
 * @archivo: TeacherReportRequestsPage.tsx
 * @módulo: Teacher - Solicitudes de Informe
 * @función: Vista del profesor para ver estudiantes asignados y escribir/editar informes
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Tag,
  Avatar,
  Empty,
  Spin,
  Modal,
  Form,
  message,
  Badge,
  Tooltip,
  Typography,
  Tabs,
  List,
  Divider,
  Space,
  Collapse,
  Progress,
  Drawer,
} from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  EditOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  TagOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useResponsive } from '../../hooks/useResponsive';
import { useCurrentAcademicYear } from '../../hooks/useCurrentAcademicYear';
import qualitativeReportService, {
  AssignedStudent,
  QualitativeReport,
  CreateReportDto,
  UpdateReportDto,
  ContextTags,
} from '../../services/qualitativeReportService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// Mapeo de prioridades
const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Baja', color: 'default' },
  2: { label: 'Normal', color: 'blue' },
  3: { label: 'Alta', color: 'orange' },
  4: { label: 'Urgente', color: 'red' },
};

const TeacherReportRequestsPage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignedStudent[]>([]);
  const [myReports, setMyReports] = useState<QualitativeReport[]>([]);
  const [contextTags, setContextTags] = useState<ContextTags>({ predefined: [], used: [], all: [] });
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [activeTab, setActiveTab] = useState('assignments');
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  // Estados del modal de informe
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AssignedStudent | null>(null);
  const [editingReport, setEditingReport] = useState<QualitativeReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Año académico
  const { currentYear } = useCurrentAcademicYear();

  // Cargar datos
  useEffect(() => {
    loadData();
  }, [currentYear?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, reportsRes, tagsRes] = await Promise.all([
        qualitativeReportService.getMyAssignments(currentYear?.id),
        qualitativeReportService.getMyReports(currentYear?.id),
        qualitativeReportService.getContextTags(currentYear?.id),
      ]);

      setAssignments(assignmentsRes.data || []);
      setMyReports(reportsRes || []);
      setContextTags(tagsRes || { predefined: [], used: [], all: [] });
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Obtener lista de grupos únicos
  const uniqueGroups = React.useMemo(() => {
    const groups = new Set<string>();
    assignments.forEach((a) => {
      if (a.student?.classGroup) {
        groups.add(a.student.classGroup);
      }
    });
    return Array.from(groups).sort((a, b) => {
      // Ordenar numéricamente si contienen números
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  }, [assignments]);

  // Filtrar asignaciones
  const filteredAssignments = assignments.filter((a) => {
    const student = a.student;
    if (!student) return false;

    // Filtro de texto
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch =
      !searchText ||
      fullName.includes(searchText.toLowerCase()) ||
      student.enrollmentNumber?.toLowerCase().includes(searchText.toLowerCase());

    // Filtro de estado
    let matchesStatus = true;
    if (filterStatus === 'pending') {
      matchesStatus = !a.hasReport;
    } else if (filterStatus === 'completed') {
      matchesStatus = a.hasReport;
    }

    // Filtro de grupo
    let matchesGroup = true;
    if (filterGroup !== 'all') {
      matchesGroup = student.classGroup === filterGroup;
    }

    return matchesSearch && matchesStatus && matchesGroup;
  });

  // Agrupar asignaciones por grupo de clase
  const groupedAssignments = React.useMemo(() => {
    const groups: Record<string, AssignedStudent[]> = {};

    filteredAssignments.forEach((a) => {
      const groupName = a.student?.classGroup || 'Sin grupo';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(a);
    });

    // Ordenar los grupos
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      if (a === 'Sin grupo') return 1;
      if (b === 'Sin grupo') return -1;
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

    return sortedGroups.map((groupName) => ({
      groupName,
      students: groups[groupName],
      total: groups[groupName].length,
      completed: groups[groupName].filter((a) => a.hasReport).length,
      pending: groups[groupName].filter((a) => !a.hasReport).length,
    }));
  }, [filteredAssignments]);

  // Abrir modal para nuevo informe
  const openNewReport = (assignment: AssignedStudent) => {
    setSelectedStudent(assignment);
    setEditingReport(null);
    form.resetFields();
    form.setFieldsValue({
      priority: 2,
      visibleToFamily: false,
    });
    setReportModalVisible(true);
  };

  // Abrir modal para editar informe
  const openEditReport = async (report: QualitativeReport) => {
    // Buscar el assignment correspondiente
    const assignment = assignments.find((a) => a.student?.id === report.studentId);
    setSelectedStudent(assignment || null);
    setEditingReport(report);
    form.setFieldsValue({
      // El Select mode="tags" espera un array
      contextTag: report.contextTag ? [report.contextTag] : [],
      content: report.content,
      priority: report.priority,
      visibleToFamily: report.visibleToFamily,
    });
    setReportModalVisible(true);
  };

  // Guardar informe
  const handleSaveReport = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // El Select mode="tags" devuelve un array, necesitamos convertirlo a string
      const contextTag = Array.isArray(values.contextTag)
        ? values.contextTag[0] || ''
        : values.contextTag;

      if (!contextTag || contextTag.length < 2) {
        message.error('Por favor, indica el contexto del informe');
        setSubmitting(false);
        return;
      }

      if (editingReport) {
        // Actualizar informe existente
        const updateData: UpdateReportDto = {
          contextTag: contextTag,
          content: values.content,
          priority: values.priority,
          visibleToFamily: values.visibleToFamily,
        };
        await qualitativeReportService.updateReport(editingReport.id, updateData);
        message.success('Informe actualizado correctamente');
      } else if (selectedStudent?.student) {
        // Crear nuevo informe
        const createData: CreateReportDto = {
          studentId: selectedStudent.student.id,
          contextTag: contextTag,
          content: values.content,
          priority: values.priority,
          visibleToFamily: values.visibleToFamily,
          academicYearId: currentYear?.id,
        };
        await qualitativeReportService.createReport(createData);
        message.success('Informe creado correctamente');
      }

      setReportModalVisible(false);
      loadData();
    } catch (error: unknown) {
      console.error('Error saving report:', error);
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Error al guardar el informe');
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar informe
  const handleDeleteReport = (report: QualitativeReport) => {
    Modal.confirm({
      title: '¿Eliminar este informe?',
      icon: <ExclamationCircleOutlined />,
      content: 'Esta acción no se puede deshacer.',
      okText: 'Eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await qualitativeReportService.deleteReport(report.id);
          message.success('Informe eliminado');
          loadData();
        } catch (error) {
          console.error('Error deleting report:', error);
          message.error('Error al eliminar el informe');
        }
      },
    });
  };

  // Renderizar tarjeta de estudiante
  const renderStudentCard = (assignment: AssignedStudent) => {
    const student = assignment.student;
    if (!student) return null;

    return (
      <Card
        key={assignment.permissionId}
        hoverable
        className={isMobile ? 'mb-2' : 'mb-4'}
        size={isMobile ? 'small' : 'default'}
        bodyStyle={{ padding: isMobile ? '12px' : '24px' }}
        actions={[
          assignment.hasReport ? (
            <Tooltip title={isMobile ? undefined : 'Ver/Editar informes'} key="edit">
              <Button
                type="link"
                size={isMobile ? 'small' : 'middle'}
                icon={<EditOutlined />}
                onClick={() => {
                  const reports = assignment.reports || [];
                  if (reports.length === 1) {
                    const fullReport = myReports.find((r) => r.id === reports[0].id);
                    if (fullReport) openEditReport(fullReport);
                  } else {
                    openNewReport(assignment);
                  }
                }}
                style={{ fontSize: isMobile ? '12px' : '14px' }}
              >
                {isMobile ? `Ver (${assignment.reportsCount})` : `Ver Informes (${assignment.reportsCount})`}
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title={isMobile ? undefined : 'Escribir nuevo informe'} key="new">
              <Button
                type="link"
                size={isMobile ? 'small' : 'middle'}
                icon={<PlusOutlined />}
                onClick={() => openNewReport(assignment)}
                style={{ fontSize: isMobile ? '12px' : '14px' }}
              >
                {isMobile ? 'Escribir' : 'Escribir Informe'}
              </Button>
            </Tooltip>
          ),
        ]}
      >
        <Card.Meta
          avatar={
            <Badge
              dot
              color={assignment.hasReport ? 'green' : 'orange'}
              offset={isMobile ? [-3, 28] : [-5, 35]}
            >
              <Avatar
                size={isMobile ? 40 : 64}
                src={student.photoUrl}
                icon={!student.photoUrl && <UserOutlined />}
              />
            </Badge>
          }
          title={
            isMobile ? (
              <div>
                <div className="font-medium text-sm truncate" style={{ maxWidth: '160px' }}>
                  {student.firstName} {student.lastName}
                </div>
                {assignment.hasReport && (
                  <Tag color="green" className="text-xs mt-1" style={{ fontSize: '10px' }}>
                    <CheckCircleOutlined /> Info
                  </Tag>
                )}
              </div>
            ) : (
              <Space>
                <span>
                  {student.firstName} {student.lastName}
                </span>
                {assignment.hasReport && (
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    Informado
                  </Tag>
                )}
              </Space>
            )
          }
          description={
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>
                {isMobile ? student.enrollmentNumber : `Nº: ${student.enrollmentNumber}`}
              </Text>
              {student.classGroup && (
                <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>
                  {isMobile ? student.classGroup : `Grupo: ${student.classGroup}`}
                </Text>
              )}
              {assignment.hasReport && assignment.reports && assignment.reports.length > 0 && (
                <div className={isMobile ? 'mt-1 flex flex-wrap gap-1' : 'mt-2'}>
                  {assignment.reports.slice(0, isMobile ? 2 : 3).map((r) => (
                    <Tag key={r.id} color="blue" className={isMobile ? 'text-xs m-0' : 'mb-1'} style={isMobile ? { fontSize: '10px' } : undefined}>
                      {isMobile ? r.contextTag : <><TagOutlined /> {r.contextTag}</>}
                    </Tag>
                  ))}
                  {assignment.reports.length > (isMobile ? 2 : 3) && (
                    <Tag className={isMobile ? 'text-xs m-0' : ''} style={isMobile ? { fontSize: '10px' } : undefined}>
                      +{assignment.reports.length - (isMobile ? 2 : 3)}
                    </Tag>
                  )}
                </div>
              )}
            </Space>
          }
        />
      </Card>
    );
  };

  // Renderizar lista de mis informes
  const renderMyReports = () => {
    if (myReports.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={isMobile ? 'Sin informes' : 'Aún no has escrito ningún informe'}
        />
      );
    }

    return (
      <List
        dataSource={myReports}
        size={isMobile ? 'small' : 'default'}
        renderItem={(report) => (
          <List.Item
            key={report.id}
            actions={isMobile ? [
              <Button
                key="edit"
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditReport(report)}
                style={{ padding: '0 4px' }}
              />,
              <Button
                key="delete"
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteReport(report)}
                style={{ padding: '0 4px' }}
              />,
            ] : [
              <Button
                key="edit"
                type="link"
                icon={<EditOutlined />}
                onClick={() => openEditReport(report)}
              >
                Editar
              </Button>,
              <Button
                key="delete"
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteReport(report)}
              >
                Eliminar
              </Button>,
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  size={isMobile ? 36 : 48}
                  src={report.student?.photoUrl}
                  icon={!report.student?.photoUrl && <UserOutlined />}
                />
              }
              title={
                isMobile ? (
                  <div>
                    <div className="font-medium text-sm">
                      {report.student?.firstName} {report.student?.lastName}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Tag color="blue" className="text-xs m-0">
                        {report.contextTag}
                      </Tag>
                      <Tag color={priorityLabels[report.priority]?.color || 'default'} className="text-xs m-0">
                        {priorityLabels[report.priority]?.label || 'Normal'}
                      </Tag>
                      {report.visibleToFamily && (
                        <Tag color="green" className="text-xs m-0">
                          <EyeOutlined />
                        </Tag>
                      )}
                    </div>
                  </div>
                ) : (
                  <Space wrap>
                    <span>
                      {report.student?.firstName} {report.student?.lastName}
                    </span>
                    <Tag color="blue">
                      <TagOutlined /> {report.contextTag}
                    </Tag>
                    <Tag color={priorityLabels[report.priority]?.color || 'default'}>
                      {priorityLabels[report.priority]?.label || 'Normal'}
                    </Tag>
                    {report.visibleToFamily && (
                      <Tag color="green">
                        <EyeOutlined /> Visible para familia
                      </Tag>
                    )}
                  </Space>
                )
              }
              description={
                <div>
                  <Paragraph
                    ellipsis={{ rows: isMobile ? 1 : 2 }}
                    className="mb-0"
                    style={{ fontSize: isMobile ? '12px' : '14px' }}
                  >
                    {report.content}
                  </Paragraph>
                  {isMobile && (
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {report.wasEdited ? 'Editado' : 'Creado'}{' '}
                      {new Date(report.updatedAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Text>
                  )}
                </div>
              }
            />
            {!isMobile && (
              <div className="text-right">
                <Text type="secondary" className="text-xs">
                  {report.wasEdited ? 'Editado' : 'Creado'}{' '}
                  {new Date(report.updatedAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </div>
            )}
          </List.Item>
        )}
      />
    );
  };

  // Estadísticas
  const stats = {
    total: assignments.length,
    completed: assignments.filter((a) => a.hasReport).length,
    pending: assignments.filter((a) => !a.hasReport).length,
    totalReports: myReports.length,
    totalGroups: uniqueGroups.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={isMobile ? 'px-2 py-3' : 'p-6'}>
      <Title level={isMobile ? 4 : 2} className={isMobile ? 'mb-3' : 'mb-6'}>
        <FileTextOutlined className="mr-2" />
        {isMobile ? 'Informes' : 'Solicitudes de Informe'}
      </Title>

      {/* Estadísticas */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} className={isMobile ? 'mb-3' : 'mb-6'}>
        <Col xs={8} sm={12} md={4}>
          <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '12px' }}>
            <div className="text-center">
              <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>{isMobile ? 'Total' : 'Total Asignados'}</Text>
              <Title level={isMobile ? 4 : 3} className="mb-0" style={{ marginTop: isMobile ? '4px' : '8px' }}>
                {stats.total}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={8} sm={12} md={4}>
          <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '12px' }}>
            <div className="text-center">
              <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>Grupos</Text>
              <Title level={isMobile ? 4 : 3} className="mb-0" style={{ color: '#722ed1', marginTop: isMobile ? '4px' : '8px' }}>
                {stats.totalGroups}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={8} sm={12} md={4}>
          <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '12px' }}>
            <div className="text-center">
              <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>{isMobile ? 'Pend.' : 'Pendientes'}</Text>
              <Title level={isMobile ? 4 : 3} className="mb-0" style={{ color: '#faad14', marginTop: isMobile ? '4px' : '8px' }}>
                {stats.pending}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={8} sm={12} md={4}>
          <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '12px' }}>
            <div className="text-center">
              <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>{isMobile ? 'Compl.' : 'Completados'}</Text>
              <Title level={isMobile ? 4 : 3} className="mb-0" style={{ color: '#52c41a', marginTop: isMobile ? '4px' : '8px' }}>
                {stats.completed}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={8} sm={12} md={4}>
          <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '12px' }}>
            <div className="text-center">
              <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>{isMobile ? 'Inform.' : 'Mis Informes'}</Text>
              <Title level={isMobile ? 4 : 3} className="mb-0" style={{ color: '#1890ff', marginTop: isMobile ? '4px' : '8px' }}>
                {stats.totalReports}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={8} sm={12} md={4}>
          <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '12px' }}>
            <div className="text-center">
              <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>Progreso</Text>
              <Progress
                type="circle"
                percent={stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}
                size={isMobile ? 36 : 50}
                strokeColor={stats.completed === stats.total ? '#52c41a' : '#1890ff'}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '8px' : '24px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size={isMobile ? 'small' : 'middle'}
          items={[
            {
              key: 'assignments',
              label: (
                <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                  <UserOutlined />
                  <span className={isMobile ? 'ml-1' : 'ml-2'}>
                    {isMobile ? 'Asignados' : 'Estudiantes Asignados'}
                  </span>
                  <Badge count={stats.pending} className="ml-1" size={isMobile ? 'small' : 'default'} />
                </span>
              ),
              children: (
                <>
                  {/* Filtros */}
                  <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 12]} className={isMobile ? 'mb-3' : 'mb-4'}>
                    <Col xs={24} sm={12} md={6}>
                      <Input
                        placeholder={isMobile ? 'Buscar...' : 'Buscar estudiante...'}
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                        size={isMobile ? 'middle' : 'large'}
                      />
                    </Col>
                    <Col xs={12} sm={6} md={5}>
                      <Select
                        value={filterGroup}
                        onChange={setFilterGroup}
                        style={{ width: '100%' }}
                        placeholder={isMobile ? 'Grupo' : 'Filtrar por grupo'}
                        size={isMobile ? 'middle' : 'large'}
                      >
                        <Select.Option value="all">
                          <TeamOutlined className="mr-1" />
                          {isMobile ? 'Todos' : 'Todos los grupos'}
                        </Select.Option>
                        {uniqueGroups.map((group) => (
                          <Select.Option key={group} value={group}>
                            {isMobile ? group : <><TeamOutlined className="mr-1" />{group}</>}
                          </Select.Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={12} sm={6} md={5}>
                      <Select
                        value={filterStatus}
                        onChange={setFilterStatus}
                        style={{ width: '100%' }}
                        size={isMobile ? 'middle' : 'large'}
                      >
                        <Select.Option value="all">Todos</Select.Option>
                        <Select.Option value="pending">
                          <ClockCircleOutlined className="mr-1" style={{ color: '#faad14' }} />
                          {isMobile ? 'Pend.' : 'Pendientes'}
                        </Select.Option>
                        <Select.Option value="completed">
                          <CheckCircleOutlined className="mr-1" style={{ color: '#52c41a' }} />
                          {isMobile ? 'Compl.' : 'Con informe'}
                        </Select.Option>
                      </Select>
                    </Col>
                    {!isMobile && (
                      <Col xs={24} sm={6} md={8} className="flex justify-end">
                        <Button.Group>
                          <Tooltip title="Vista agrupada por clase">
                            <Button
                              type={viewMode === 'grouped' ? 'primary' : 'default'}
                              icon={<AppstoreOutlined />}
                              onClick={() => setViewMode('grouped')}
                            >
                              Por Grupo
                            </Button>
                          </Tooltip>
                          <Tooltip title="Vista de lista">
                            <Button
                              type={viewMode === 'list' ? 'primary' : 'default'}
                              icon={<UnorderedListOutlined />}
                              onClick={() => setViewMode('list')}
                            >
                              Lista
                            </Button>
                          </Tooltip>
                        </Button.Group>
                      </Col>
                    )}
                  </Row>

                  {/* Lista de estudiantes */}
                  {filteredAssignments.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        assignments.length === 0
                          ? (isMobile ? 'Sin estudiantes asignados' : 'No tienes estudiantes asignados. Contacta al administrador.')
                          : (isMobile ? 'Sin resultados' : 'No se encontraron estudiantes con los filtros aplicados')
                      }
                    />
                  ) : (isMobile || viewMode === 'list') ? (
                    /* Vista de lista - siempre en móvil */
                    <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
                      {filteredAssignments.map((assignment) => (
                        <Col xs={24} sm={12} lg={8} xl={6} key={assignment.permissionId}>
                          {renderStudentCard(assignment)}
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    /* Vista agrupada por grupos de clase - solo desktop */
                    <Collapse
                      defaultActiveKey={groupedAssignments.length <= 3 ? groupedAssignments.map((g) => g.groupName) : []}
                      accordion={false}
                      className="bg-white"
                    >
                      {groupedAssignments.map((group) => (
                        <Panel
                          key={group.groupName}
                          header={
                            <div className="flex items-center justify-between w-full pr-4">
                              <Space size="middle">
                                <TeamOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
                                <span className="font-medium text-base">{group.groupName}</span>
                                <Tag color="blue">{group.total} estudiantes</Tag>
                              </Space>
                              <Space size="small">
                                {group.pending > 0 && (
                                  <Tag color="orange" icon={<ClockCircleOutlined />}>
                                    {group.pending} pendientes
                                  </Tag>
                                )}
                                {group.completed > 0 && (
                                  <Tag color="green" icon={<CheckCircleOutlined />}>
                                    {group.completed} completados
                                  </Tag>
                                )}
                                <Progress
                                  percent={Math.round((group.completed / group.total) * 100)}
                                  size="small"
                                  style={{ width: 80 }}
                                  strokeColor={group.completed === group.total ? '#52c41a' : '#1890ff'}
                                />
                              </Space>
                            </div>
                          }
                        >
                          <Row gutter={[16, 16]}>
                            {group.students.map((assignment) => (
                              <Col xs={24} sm={12} lg={8} xl={6} key={assignment.permissionId}>
                                {renderStudentCard(assignment)}
                              </Col>
                            ))}
                          </Row>
                        </Panel>
                      ))}
                    </Collapse>
                  )}
                </>
              ),
            },
            {
              key: 'myReports',
              label: (
                <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                  <FileTextOutlined />
                  <span className={isMobile ? 'ml-1' : 'ml-2'}>
                    {isMobile ? 'Informes' : 'Mis Informes'} ({stats.totalReports})
                  </span>
                </span>
              ),
              children: renderMyReports(),
            },
          ]}
        />
      </Card>

      {/* Modal/Drawer de creación/edición de informe */}
      {isMobile ? (
        <Drawer
          title={
            <Space size="small">
              {editingReport ? <EditOutlined /> : <PlusOutlined />}
              <span style={{ fontSize: '14px' }}>
                {editingReport ? 'Editar' : 'Nuevo'} Informe
              </span>
            </Space>
          }
          placement="bottom"
          height="90vh"
          open={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          styles={{ body: { padding: '12px', paddingBottom: '80px' } }}
          footer={
            <div className="flex gap-2 p-3 border-t bg-white">
              <Button block onClick={() => setReportModalVisible(false)}>
                Cancelar
              </Button>
              <Button block type="primary" onClick={handleSaveReport} loading={submitting}>
                {editingReport ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          }
        >
          {/* Informes existentes del estudiante - Móvil */}
          {selectedStudent?.reports && selectedStudent.reports.length > 0 && !editingReport && (
            <>
              <div className="mb-3">
                <Text strong style={{ fontSize: '12px' }}>Informes existentes:</Text>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedStudent.reports.map((r) => {
                    const fullReport = myReports.find((mr) => mr.id === r.id);
                    return (
                      <Tag
                        key={r.id}
                        color="blue"
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          if (fullReport) openEditReport(fullReport);
                        }}
                      >
                        <EditOutlined /> {r.contextTag}
                      </Tag>
                    );
                  })}
                </div>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <Text type="secondary" style={{ fontSize: '11px' }} className="block mb-3">
                Edita un informe existente o crea uno nuevo:
              </Text>
            </>
          )}

          <Form form={form} layout="vertical" size="middle">
            <Form.Item
              name="contextTag"
              label={<span style={{ fontSize: '12px' }}>Contexto / Asignatura</span>}
              rules={[{ required: true, message: 'Indica el contexto' }]}
            >
              <Select
                mode="tags"
                maxTagCount={1}
                placeholder="Contexto..."
                style={{ width: '100%' }}
              >
                {contextTags.all.map((tag) => (
                  <Select.Option key={tag} value={tag}>
                    {tag}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="content"
              label={<span style={{ fontSize: '12px' }}>Contenido del Informe</span>}
              rules={[
                { required: true, message: 'Escribe el contenido' },
                { min: 10, message: 'Mínimo 10 caracteres' },
              ]}
            >
              <TextArea
                rows={5}
                placeholder="Observaciones sobre el estudiante..."
                showCount
                maxLength={5000}
              />
            </Form.Item>

            <Row gutter={8}>
              <Col span={12}>
                <Form.Item
                  name="priority"
                  label={<span style={{ fontSize: '12px' }}>Prioridad</span>}
                >
                  <Select>
                    <Select.Option value={1}><Tag color="default">Baja</Tag></Select.Option>
                    <Select.Option value={2}><Tag color="blue">Normal</Tag></Select.Option>
                    <Select.Option value={3}><Tag color="orange">Alta</Tag></Select.Option>
                    <Select.Option value={4}><Tag color="red">Urgente</Tag></Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="visibleToFamily"
                  label={<span style={{ fontSize: '12px' }}>Visibilidad</span>}
                  valuePropName="checked"
                >
                  <Select>
                    <Select.Option value={false}><Tag>Solo prof.</Tag></Select.Option>
                    <Select.Option value={true}><Tag color="green"><EyeOutlined /> Familia</Tag></Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Drawer>
      ) : (
        <Modal
          title={
            <Space>
              {editingReport ? <EditOutlined /> : <PlusOutlined />}
              {editingReport ? 'Editar Informe' : 'Nuevo Informe'}
              {selectedStudent?.student && (
                <Text type="secondary">
                  - {selectedStudent.student.firstName} {selectedStudent.student.lastName}
                </Text>
              )}
            </Space>
          }
          open={reportModalVisible}
          onCancel={() => setReportModalVisible(false)}
          onOk={handleSaveReport}
          confirmLoading={submitting}
          okText={editingReport ? 'Guardar Cambios' : 'Crear Informe'}
          cancelText="Cancelar"
          width={700}
        >
          {/* Informes existentes del estudiante - Desktop */}
          {selectedStudent?.reports && selectedStudent.reports.length > 0 && !editingReport && (
            <>
              <div className="mb-4">
                <Text strong>Informes existentes para este estudiante:</Text>
                <div className="mt-2">
                  {selectedStudent.reports.map((r) => {
                    const fullReport = myReports.find((mr) => mr.id === r.id);
                    return (
                      <Tag
                        key={r.id}
                        color="blue"
                        className="cursor-pointer mb-1"
                        onClick={() => {
                          if (fullReport) openEditReport(fullReport);
                        }}
                      >
                        <EditOutlined /> {r.contextTag}
                      </Tag>
                    );
                  })}
                </div>
              </div>
              <Divider />
              <Text type="secondary" className="block mb-4">
                Puedes editar un informe existente o crear uno nuevo con un contexto diferente:
              </Text>
            </>
          )}

          <Form form={form} layout="vertical">
            <Form.Item
              name="contextTag"
              label="Contexto / Asignatura"
              rules={[{ required: true, message: 'Por favor, indica el contexto del informe' }]}
              tooltip="Escribe el nombre de la asignatura o el contexto de este informe (ej: Matemáticas, Tutoría, Comportamiento)"
            >
              <Select
                mode="tags"
                maxTagCount={1}
                placeholder="Escribe o selecciona el contexto..."
                style={{ width: '100%' }}
              >
                {contextTags.all.map((tag) => (
                  <Select.Option key={tag} value={tag}>
                    {tag}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="content"
              label="Contenido del Informe"
              rules={[
                { required: true, message: 'Por favor, escribe el contenido del informe' },
                { min: 10, message: 'El informe debe tener al menos 10 caracteres' },
              ]}
            >
              <TextArea
                rows={6}
                placeholder="Escribe aquí las observaciones, evaluación o comentarios sobre el estudiante..."
                showCount
                maxLength={5000}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="priority"
                  label="Prioridad"
                  tooltip="Indica la importancia de este informe"
                >
                  <Select>
                    <Select.Option value={1}>
                      <Tag color="default">Baja</Tag>
                    </Select.Option>
                    <Select.Option value={2}>
                      <Tag color="blue">Normal</Tag>
                    </Select.Option>
                    <Select.Option value={3}>
                      <Tag color="orange">Alta</Tag>
                    </Select.Option>
                    <Select.Option value={4}>
                      <Tag color="red">Urgente</Tag>
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="visibleToFamily"
                  label="Visibilidad"
                  valuePropName="checked"
                  tooltip="Si está activado, la familia podrá ver este informe"
                >
                  <Select>
                    <Select.Option value={false}>
                      <Tag>Solo profesores</Tag>
                    </Select.Option>
                    <Select.Option value={true}>
                      <Tag color="green">
                        <EyeOutlined /> Visible para familia
                      </Tag>
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default TeacherReportRequestsPage;
