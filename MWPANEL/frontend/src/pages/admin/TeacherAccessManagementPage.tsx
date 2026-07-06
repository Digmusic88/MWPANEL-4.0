/**
 * @archivo: TeacherAccessManagementPage.tsx
 * @módulo: Admin - Gestión de Accesos Profesor-Estudiante
 * @función: Panel administrativo para controlar qué profesores pueden ver reportes de qué alumnos
 * @descripción: Permite asignar acceso manual a profesores que no tienen asignación directa
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Avatar,
  Typography,
  Modal,
  Form,
  Select,
  Input,
  DatePicker,
  Switch,
  message,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Statistic,
  Alert,
  Tabs,
  Empty,
  Spin,
  Divider,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  SearchOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import teacherAccessService, {
  TeacherStudentAccess,
  CreateAccessDto,
  AccessType,
  AccessReason,
  AccessOption,
  BulkAssignDto,
  BulkAssignResult,
} from '../../services/teacherAccessService';
import apiClient from '../../services/apiClient';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

// ===== TYPES =====

interface Teacher {
  id: string;
  user: {
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };
  };
}

interface Student {
  id: string;
  enrollmentNumber: string;
  user: {
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
  classGroups?: Array<{ name: string }>;
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

// ===== COMPONENT =====

const TeacherAccessManagementPage: React.FC = () => {
  // Data state
  const [accesses, setAccesses] = useState<TeacherStudentAccess[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [accessTypes, setAccessTypes] = useState<AccessOption[]>([]);
  const [accessReasons, setAccessReasons] = useState<AccessOption[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccess, setEditingAccess] = useState<TeacherStudentAccess | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>();
  const [showInactive, setShowInactive] = useState(false);

  // Form
  const [form] = Form.useForm();

  // Bulk assign (selection) state
  const [selectBulkModalVisible, setSelectBulkModalVisible] = useState(false);
  const [selectBulkSaving, setSelectBulkSaving] = useState(false);
  const [selectBulkForm] = Form.useForm();
  const [selectedStudentKeys, setSelectedStudentKeys] = useState<string[]>([]);
  const [bulkStudentSearch, setBulkStudentSearch] = useState('');
  const [bulkClassGroupFilter, setBulkClassGroupFilter] = useState<string | undefined>();

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        teachersRes,
        studentsRes,
        yearsRes,
        typesRes,
        reasonsRes,
      ] = await Promise.all([
        apiClient.get('/teachers'),
        apiClient.get('/students'),
        apiClient.get('/academic-years'),
        teacherAccessService.getAccessTypes(),
        teacherAccessService.getAccessReasons(),
      ]);

      setTeachers(teachersRes.data || []);
      setStudents(studentsRes.data?.data || studentsRes.data || []);
      setAcademicYears(yearsRes.data?.data || yearsRes.data || []);
      setAccessTypes(typesRes);
      setAccessReasons(reasonsRes);

      // Set current year as default
      const currentYear = (yearsRes.data?.data || yearsRes.data || []).find(
        (y: AcademicYear) => y.isCurrent
      );
      if (currentYear) {
        setSelectedYearId(currentYear.id);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      message.error('Error al cargar los datos iniciales');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch accesses
  const fetchAccesses = useCallback(async () => {
    if (!selectedYearId) return;

    try {
      const data = await teacherAccessService.getAllAccess({
        academicYearId: selectedYearId,
        isActive: showInactive ? undefined : true,
      });
      setAccesses(data);
    } catch (error) {
      console.error('Error fetching accesses:', error);
      message.error('Error al cargar los accesos');
    }
  }, [selectedYearId, showInactive]);

  // Derived data for bulk selection modal
  const allClassGroupNames = useMemo(() => {
    const names = new Set<string>();
    students.forEach((s) => s.classGroups?.forEach((g) => names.add(g.name)));
    return Array.from(names).sort();
  }, [students]);

  const filteredStudentsForBulk = useMemo(() => {
    return students.filter((s) => {
      const fullName = `${s.user.profile?.firstName || ''} ${s.user.profile?.lastName || ''}`.toLowerCase();
      const matchName =
        !bulkStudentSearch ||
        fullName.includes(bulkStudentSearch.toLowerCase()) ||
        s.enrollmentNumber.includes(bulkStudentSearch);
      const matchGroup =
        !bulkClassGroupFilter ||
        s.classGroups?.some((g) => g.name === bulkClassGroupFilter);
      return matchName && matchGroup;
    });
  }, [students, bulkStudentSearch, bulkClassGroupFilter]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedYearId) {
      fetchAccesses();
    }
  }, [selectedYearId, showInactive, fetchAccesses]);

  // Handlers
  const handleCreate = () => {
    setEditingAccess(null);
    form.resetFields();
    form.setFieldsValue({
      academicYearId: selectedYearId,
      accessType: 'write',
      reason: 'admin_override',
      isActive: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: TeacherStudentAccess) => {
    setEditingAccess(record);
    form.setFieldsValue({
      teacherId: record.teacher?.id,
      studentId: record.student?.id,
      academicYearId: record.academicYear?.id,
      accessType: record.accessType,
      reason: record.reason,
      notes: record.notes,
      expiresAt: record.expiresAt ? dayjs(record.expiresAt) : undefined,
      isActive: record.isActive,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await teacherAccessService.deleteAccess(id);
      message.success('Acceso eliminado correctamente');
      fetchAccesses();
    } catch (error) {
      message.error('Error al eliminar el acceso');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await teacherAccessService.deactivateAccess(id);
      message.success('Acceso desactivado');
      fetchAccesses();
    } catch (error) {
      message.error('Error al desactivar el acceso');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const data: CreateAccessDto = {
        teacherId: values.teacherId,
        studentId: values.studentId,
        academicYearId: values.academicYearId,
        accessType: values.accessType,
        reason: values.reason,
        notes: values.notes,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
      };

      if (editingAccess) {
        await teacherAccessService.updateAccess(editingAccess.id, {
          accessType: data.accessType,
          reason: data.reason,
          notes: data.notes,
          expiresAt: data.expiresAt || null,
          isActive: values.isActive,
        });
        message.success('Acceso actualizado correctamente');
      } else {
        await teacherAccessService.createAccess(data);
        message.success('Acceso creado correctamente');
      }

      setModalVisible(false);
      fetchAccesses();
    } catch (error: any) {
      if (error.errorFields) {
        message.error('Por favor complete los campos requeridos');
      } else {
        message.error(error.response?.data?.message || 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = {
    total: accesses.length,
    active: accesses.filter((a) => a.isValid).length,
    expired: accesses.filter((a) => a.isExpired).length,
    inactive: accesses.filter((a) => !a.isActive).length,
  };

  // Table columns
  const columns = [
    {
      title: 'Profesor',
      key: 'teacher',
      render: (_: any, record: TeacherStudentAccess) => (
        <Space>
          <Avatar
            src={record.teacher?.photoUrl}
            icon={<UserOutlined />}
            size="small"
          />
          <div>
            <Text strong>
              {record.teacher?.firstName} {record.teacher?.lastName}
            </Text>
            <br />
            <Text type="secondary" className="text-xs">
              {record.teacher?.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Estudiante',
      key: 'student',
      render: (_: any, record: TeacherStudentAccess) => (
        <Space>
          <Avatar
            src={record.student?.photoUrl}
            icon={<UserOutlined />}
            size="small"
          />
          <div>
            <Text strong>
              {record.student?.firstName} {record.student?.lastName}
            </Text>
            <br />
            <Text type="secondary" className="text-xs">
              {record.student?.enrollmentNumber}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Tipo de Acceso',
      key: 'accessType',
      render: (_: any, record: TeacherStudentAccess) => {
        const colors: Record<AccessType, string> = {
          read: 'blue',
          write: 'green',
          full: 'purple',
        };
        const icons: Record<AccessType, React.ReactNode> = {
          read: <EyeOutlined />,
          write: <EditOutlined />,
          full: <SafetyOutlined />,
        };
        return (
          <Tag color={colors[record.accessType]} icon={icons[record.accessType]}>
            {record.accessTypeLabel}
          </Tag>
        );
      },
    },
    {
      title: 'Razón',
      key: 'reason',
      render: (_: any, record: TeacherStudentAccess) => (
        <Tooltip title={record.notes || 'Sin notas'}>
          <Tag>{record.reasonLabel}</Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_: any, record: TeacherStudentAccess) => {
        if (!record.isActive) {
          return <Tag icon={<StopOutlined />} color="default">Inactivo</Tag>;
        }
        if (record.isExpired) {
          return <Tag icon={<ClockCircleOutlined />} color="orange">Expirado</Tag>;
        }
        return <Tag icon={<CheckCircleOutlined />} color="success">Activo</Tag>;
      },
    },
    {
      title: 'Expira',
      key: 'expiresAt',
      render: (_: any, record: TeacherStudentAccess) =>
        record.expiresAt ? (
          <Text type={record.isExpired ? 'danger' : 'secondary'}>
            {dayjs(record.expiresAt).format('DD/MM/YYYY')}
          </Text>
        ) : (
          <Text type="secondary">Sin expiración</Text>
        ),
    },
    {
      title: 'Asignado por',
      key: 'grantedBy',
      render: (_: any, record: TeacherStudentAccess) =>
        record.grantedBy ? (
          <Text type="secondary">
            {record.grantedBy.firstName} {record.grantedBy.lastName}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 150,
      render: (_: any, record: TeacherStudentAccess) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {record.isActive && (
            <Tooltip title="Desactivar">
              <Popconfirm
                title="¿Desactivar este acceso?"
                onConfirm={() => handleDeactivate(record.id)}
              >
                <Button type="text" icon={<LockOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Eliminar este acceso permanentemente?"
              onConfirm={() => handleDelete(record.id)}
              okText="Eliminar"
              okType="danger"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleSelectBulkAssign = async () => {
    if (selectedStudentKeys.length === 0) {
      message.warning('Selecciona al menos un alumno antes de asignar');
      return;
    }
    try {
      const values = await selectBulkForm.validateFields();
      setSelectBulkSaving(true);
      const dto: BulkAssignDto = {
        teacherId: values.teacherId,
        academicYearId: values.academicYearId,
        studentIds: selectedStudentKeys,
        accessType: values.accessType ?? 'read',
        reason: values.reason ?? 'admin_override',
        notes: values.notes,
      };
      const result: BulkAssignResult = await teacherAccessService.bulkAssign(dto);
      message.success(
        `✅ ${result.created} accesos creados (${result.skipped} ya existían de ${result.total} seleccionados)`
      );
      setSelectBulkModalVisible(false);
      selectBulkForm.resetFields();
      setSelectedStudentKeys([]);
      setBulkStudentSearch('');
      setBulkClassGroupFilter(undefined);
      fetchAccesses();
    } catch (error: any) {
      if (error?.errorFields) {
        message.error('Por favor complete los campos requeridos');
      } else {
        message.error(error?.response?.data?.message || 'Error al ejecutar la asignación');
      }
    } finally {
      setSelectBulkSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="Cargando..." />
      </div>
    );
  }

  return (
    <div className="teacher-access-management p-4">
      {/* Header */}
      <Card className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Title level={3} className="mb-1">
              <SafetyOutlined className="mr-2" />
              Gestión de Accesos Profesor-Estudiante
            </Title>
            <Text type="secondary">
              Controla qué profesores pueden acceder a los reportes de qué estudiantes
            </Text>
          </div>
          <Space>
            <Select
              value={selectedYearId}
              onChange={setSelectedYearId}
              style={{ width: 180 }}
              placeholder="Año académico"
            >
              {academicYears.map((year) => (
                <Select.Option key={year.id} value={year.id}>
                  {year.name} {year.isCurrent && '(Actual)'}
                </Select.Option>
              ))}
            </Select>
            <Badge count={selectedStudentKeys.length} size="small" offset={[-4, 4]}>
              <Button
                icon={<TeamOutlined />}
                onClick={() => {
                  selectBulkForm.resetFields();
                  selectBulkForm.setFieldsValue({
                    academicYearId: selectedYearId,
                    accessType: 'read',
                    reason: 'admin_override',
                  });
                  setSelectedStudentKeys([]);
                  setBulkStudentSearch('');
                  setBulkClassGroupFilter(undefined);
                  setSelectBulkModalVisible(true);
                }}
              >
                Asignación masiva
              </Button>
            </Badge>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Nuevo Acceso
            </Button>
          </Space>
        </div>
      </Card>

      {/* Info Alert */}
      <Alert
        message="Sistema de Permisos Híbrido"
        description={
          <div>
            <p className="mb-2">
              Los profesores tienen acceso automático a los estudiantes de las clases donde imparten asignaturas.
              Este panel permite otorgar acceso <strong>adicional</strong> a profesores que no tienen asignación directa.
            </p>
            <p className="mb-0">
              <strong>Casos de uso:</strong> Tutores, profesores de apoyo, orientadores, coordinadores, sustitutos.
            </p>
          </div>
        }
        type="info"
        showIcon
        className="mb-4"
      />

      {/* Stats */}
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Accesos"
              value={stats.total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Activos"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Expirados"
              value={stats.expired}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Inactivos"
              value={stats.inactive}
              prefix={<StopOutlined />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <Space>
            <Switch
              checked={showInactive}
              onChange={setShowInactive}
              checkedChildren="Mostrar inactivos"
              unCheckedChildren="Solo activos"
            />
          </Space>
        </div>

        <Table
          dataSource={accesses}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} accesos`,
          }}
          locale={{
            emptyText: (
              <Empty
                description="No hay accesos manuales configurados"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  Crear primer acceso
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Modal */}
      <Modal
        title={
          <Space>
            {editingAccess ? <EditOutlined /> : <PlusOutlined />}
            {editingAccess ? 'Editar Acceso' : 'Nuevo Acceso Manual'}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        width={600}
        okText={editingAccess ? 'Actualizar' : 'Crear'}
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          {!editingAccess && (
            <>
              <Form.Item
                name="teacherId"
                label="Profesor"
                rules={[{ required: true, message: 'Seleccione un profesor' }]}
              >
                <Select
                  showSearch
                  placeholder="Buscar profesor..."
                  optionFilterProp="label"
                  options={teachers.map((t) => ({
                    value: t.id,
                    label: `${t.user.profile?.firstName || ''} ${t.user.profile?.lastName || ''} (${t.user.email})`,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="studentId"
                label="Estudiante"
                rules={[{ required: true, message: 'Seleccione un estudiante' }]}
              >
                <Select
                  showSearch
                  placeholder="Buscar estudiante..."
                  optionFilterProp="label"
                  options={students.map((s) => ({
                    value: s.id,
                    label: `${s.user.profile?.firstName || ''} ${s.user.profile?.lastName || ''} (${s.enrollmentNumber})`,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="academicYearId"
                label="Año Académico"
                rules={[{ required: true, message: 'Seleccione el año académico' }]}
              >
                <Select placeholder="Seleccionar año...">
                  {academicYears.map((year) => (
                    <Select.Option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && '(Actual)'}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="accessType"
                label="Tipo de Acceso"
                rules={[{ required: true, message: 'Seleccione el tipo' }]}
              >
                <Select placeholder="Seleccionar...">
                  {accessTypes.map((type) => (
                    <Select.Option key={type.value} value={type.value}>
                      {type.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="reason"
                label="Razón del Acceso"
                rules={[{ required: true, message: 'Seleccione la razón' }]}
              >
                <Select placeholder="Seleccionar...">
                  {accessReasons.map((reason) => (
                    <Select.Option key={reason.value} value={reason.value}>
                      {reason.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="expiresAt" label="Fecha de Expiración (opcional)">
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Sin expiración"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item name="notes" label="Notas (opcional)">
            <TextArea
              rows={3}
              placeholder="Notas adicionales sobre este acceso..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          {editingAccess && (
            <Form.Item name="isActive" label="Estado" valuePropName="checked">
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal: Asignación masiva con selección de alumnos */}
      <Modal
        title={<Space><TeamOutlined />Asignación Masiva de Acceso</Space>}
        open={selectBulkModalVisible}
        onCancel={() => {
          setSelectBulkModalVisible(false);
          setSelectedStudentKeys([]);
          setBulkStudentSearch('');
          setBulkClassGroupFilter(undefined);
        }}
        onOk={handleSelectBulkAssign}
        confirmLoading={selectBulkSaving}
        width={820}
        okText={
          selectedStudentKeys.length > 0
            ? `Asignar a ${selectedStudentKeys.length} alumno${selectedStudentKeys.length !== 1 ? 's' : ''}`
            : 'Asignar'
        }
        cancelText="Cancelar"
        okButtonProps={{ disabled: selectedStudentKeys.length === 0 }}
      >
        {/* Config section */}
        <Form form={selectBulkForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="teacherId"
                label="Profesor"
                rules={[{ required: true, message: 'Seleccione un profesor' }]}
              >
                <Select
                  showSearch
                  placeholder="Buscar profesor..."
                  optionFilterProp="label"
                  options={teachers.map((t) => ({
                    value: t.id,
                    label: `${t.user.profile?.firstName || ''} ${t.user.profile?.lastName || ''} (${t.user.email})`.trim(),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="academicYearId"
                label="Año Académico"
                rules={[{ required: true, message: 'Seleccione el año académico' }]}
              >
                <Select placeholder="Seleccionar año...">
                  {academicYears.map((year) => (
                    <Select.Option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && '(Actual)'}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="accessType" label="Tipo de Acceso">
                <Select placeholder="Seleccionar...">
                  {accessTypes.map((type) => (
                    <Select.Option key={type.value} value={type.value}>
                      {type.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reason" label="Razón del Acceso">
                <Select placeholder="Seleccionar...">
                  {accessReasons.map((r) => (
                    <Select.Option key={r.value} value={r.value}>
                      {r.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notas (opcional)">
            <TextArea
              rows={2}
              placeholder="Notas adicionales sobre estos accesos..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>

        <Divider className="my-3" />

        {/* Filter + selection bar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Buscar por nombre o matrícula..."
            value={bulkStudentSearch}
            onChange={(e) => setBulkStudentSearch(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="Filtrar por clase..."
            allowClear
            value={bulkClassGroupFilter}
            onChange={setBulkClassGroupFilter}
            style={{ width: 180 }}
          >
            {allClassGroupNames.map((name) => (
              <Select.Option key={name} value={name}>{name}</Select.Option>
            ))}
          </Select>
          <Space className="ml-auto">
            <Button
              size="small"
              onClick={() => setSelectedStudentKeys(filteredStudentsForBulk.map((s) => s.id))}
            >
              Seleccionar todos ({filteredStudentsForBulk.length})
            </Button>
            <Button
              size="small"
              onClick={() => setSelectedStudentKeys([])}
              disabled={selectedStudentKeys.length === 0}
            >
              Limpiar selección
            </Button>
            {selectedStudentKeys.length > 0 && (
              <Tag color="blue">{selectedStudentKeys.length} seleccionado{selectedStudentKeys.length !== 1 ? 's' : ''}</Tag>
            )}
          </Space>
        </div>

        {/* Student selection table */}
        <Table
          dataSource={filteredStudentsForBulk}
          rowKey="id"
          size="small"
          rowSelection={{
            selectedRowKeys: selectedStudentKeys,
            onChange: (keys) => setSelectedStudentKeys(keys as string[]),
            preserveSelectedRowKeys: true,
          }}
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (t) => `${t} alumnos` }}
          columns={[
            {
              title: 'Alumno',
              key: 'name',
              render: (_: any, s: Student) => (
                <Space>
                  <Avatar icon={<UserOutlined />} size="small" />
                  <span>
                    {s.user.profile?.firstName} {s.user.profile?.lastName}
                  </span>
                </Space>
              ),
            },
            {
              title: 'Matrícula',
              dataIndex: 'enrollmentNumber',
              key: 'enrollment',
              width: 110,
            },
            {
              title: 'Clase',
              key: 'classGroup',
              width: 140,
              render: (_: any, s: Student) =>
                s.classGroups?.length ? (
                  <Space size={2} wrap>
                    {s.classGroups.map((g) => (
                      <Tag key={g.name} style={{ fontSize: 11 }}>{g.name}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontSize: 11 }}>Sin clase</Text>
                ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default TeacherAccessManagementPage;
