/**
 * @archivo: ReportAccessManagerPage.tsx
 * @módulo: Admin - Report Access Manager
 * @función: Panel de administración para asignar permisos de informes a profesores
 * @flujo: Admin selecciona profesor → selecciona estudiantes/grupo → asigna permisos
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  message,
  Statistic,
  Typography,
  Avatar,
  Popconfirm,
  Input,
  Divider,
  Transfer,
  Spin,
  Empty,
  Alert,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';
import reportPermissionService, {
  ReportPermission,
  PermissionStats,
} from '@services/reportPermissionService';
import { useCurrentAcademicYear } from '@hooks/useCurrentAcademicYear';

const { Title, Text } = Typography;
const { Option } = Select;

interface Teacher {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  user?: {
    profile?: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };
    email?: string;
  };
}

interface Student {
  id: string;
  enrollmentNumber: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  classGroup?: string;
  user?: {
    profile?: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };
  };
  classGroups?: { id: string; name: string }[];
}

interface ClassGroup {
  id: string;
  name: string;
  students?: Student[];
}

const ReportAccessManagerPage: React.FC = () => {
  // Estado principal
  const [permissions, setPermissions] = useState<ReportPermission[]>([]);
  const [stats, setStats] = useState<PermissionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Datos para selectores
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; isCurrent: boolean }[]>([]);

  // Modal de asignación
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'individual' | 'group'>('individual');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [adminNote, setAdminNote] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Filtros
  const [filterTeacher, setFilterTeacher] = useState<string | null>(null);
  const [filterAcademicYear, setFilterAcademicYear] = useState<string | null>(null);

  const { currentYear } = useCurrentAcademicYear();

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (filterAcademicYear) {
      loadPermissions();
      loadStats();
    }
  }, [filterAcademicYear, filterTeacher]);

  useEffect(() => {
    if (currentYear?.id && !filterAcademicYear) {
      setFilterAcademicYear(currentYear.id);
    }
  }, [currentYear]);

  const loadInitialData = async () => {
    try {
      // Cargar profesores
      const teachersRes = await apiClient.get('/teachers');
      setTeachers(teachersRes.data.data || teachersRes.data || []);

      // Cargar estudiantes
      const studentsRes = await apiClient.get('/students');
      setStudents(studentsRes.data.data || studentsRes.data || []);

      // Cargar grupos de clase
      const groupsRes = await apiClient.get('/class-groups');
      setClassGroups(groupsRes.data.data || groupsRes.data || []);

      // Cargar años académicos
      const yearsRes = await apiClient.get('/academic-years');
      setAcademicYears(yearsRes.data.data || yearsRes.data || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
      message.error('Error al cargar datos iniciales');
    }
  };

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const data = await reportPermissionService.getAll({
        academicYearId: filterAcademicYear || undefined,
        teacherId: filterTeacher || undefined,
        activeOnly: true,
      });
      setPermissions(data);
    } catch (error) {
      console.error('Error loading permissions:', error);
      message.error('Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const data = await reportPermissionService.getStats(filterAcademicYear || undefined);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Asignar permisos
  const handleAssign = async () => {
    if (!selectedTeacher || !filterAcademicYear) {
      message.error('Selecciona un profesor y año académico');
      return;
    }

    if (assignMode === 'individual' && selectedStudents.length === 0) {
      message.error('Selecciona al menos un estudiante');
      return;
    }

    if (assignMode === 'group' && selectedGroups.length === 0) {
      message.error('Selecciona al menos un grupo de clase');
      return;
    }

    setAssigning(true);
    try {
      let result;
      if (assignMode === 'individual') {
        result = await reportPermissionService.bulkAssign({
          teacherId: selectedTeacher,
          studentIds: selectedStudents,
          academicYearId: filterAcademicYear,
          adminNote: adminNote || undefined,
        });
      } else {
        result = await reportPermissionService.assignByMultipleGroups({
          teacherId: selectedTeacher,
          classGroupIds: selectedGroups,
          academicYearId: filterAcademicYear,
          adminNote: adminNote || undefined,
        });
      }

      message.success(`Se crearon ${result.created} permisos (${result.skipped} ya existían)`);
      setAssignModalOpen(false);
      resetAssignForm();
      loadPermissions();
      loadStats();
    } catch (error: any) {
      console.error('Error assigning permissions:', error);
      message.error(error.response?.data?.message || 'Error al asignar permisos');
    } finally {
      setAssigning(false);
    }
  };

  const resetAssignForm = () => {
    setSelectedTeacher(null);
    setSelectedStudents([]);
    setSelectedGroups([]);
    setAdminNote('');
    setAssignMode('individual');
  };

  // Revocar permisos
  const handleRevoke = async (permissionIds: string[]) => {
    try {
      const result = await reportPermissionService.bulkRevoke(permissionIds);
      message.success(`Se revocaron ${result.revoked} permisos`);
      loadPermissions();
      loadStats();
    } catch (error) {
      console.error('Error revoking permissions:', error);
      message.error('Error al revocar permisos');
    }
  };

  // Helper para obtener nombre del profesor
  const getTeacherName = (teacher: Teacher) => {
    const firstName = teacher.user?.profile?.firstName || teacher.firstName || '';
    const lastName = teacher.user?.profile?.lastName || teacher.lastName || '';
    return `${firstName} ${lastName}`.trim() || teacher.email || teacher.user?.email || 'Sin nombre';
  };

  // Helper para obtener nombre del estudiante
  const getStudentName = (student: Student) => {
    const firstName = student.user?.profile?.firstName || student.firstName || '';
    const lastName = student.user?.profile?.lastName || student.lastName || '';
    return `${firstName} ${lastName}`.trim() || student.enrollmentNumber;
  };

  // Preparar datos para Transfer
  const transferDataSource = useMemo(() => {
    return students.map(student => ({
      key: student.id,
      title: getStudentName(student),
      description: student.classGroups?.[0]?.name || 'Sin grupo',
      enrollmentNumber: student.enrollmentNumber,
    }));
  }, [students]);

  // Columnas de la tabla
  const columns = [
    {
      title: 'Profesor',
      dataIndex: 'teacher',
      key: 'teacher',
      render: (teacher: ReportPermission['teacher']) => (
        <Space>
          <Avatar
            size="small"
            src={teacher?.photoUrl}
            icon={<UserOutlined />}
          />
          <Text>
            {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'N/A'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Estudiante',
      dataIndex: 'student',
      key: 'student',
      render: (student: ReportPermission['student']) => (
        <Space>
          <Avatar
            size="small"
            src={student?.photoUrl}
            icon={<UserOutlined />}
          />
          <div>
            <Text>{student ? `${student.firstName} ${student.lastName}` : 'N/A'}</Text>
            {student?.classGroup && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {student.classGroup}
                </Text>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'} icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Nota',
      dataIndex: 'adminNote',
      key: 'adminNote',
      ellipsis: true,
      width: 200,
      render: (note: string) => note || '-',
    },
    {
      title: 'Asignado por',
      dataIndex: 'grantedBy',
      key: 'grantedBy',
      render: (grantedBy: ReportPermission['grantedBy']) =>
        grantedBy ? `${grantedBy.firstName} ${grantedBy.lastName}` : 'Sistema',
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('es-ES'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 100,
      render: (_: any, record: ReportPermission) => (
        <Popconfirm
          title="¿Revocar este permiso?"
          description="El profesor ya no podrá escribir informes sobre este estudiante"
          onConfirm={() => handleRevoke([record.id])}
          okText="Revocar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 12 }} />
            Gestión de Permisos de Informes
          </Title>
          <Text type="secondary">
            Asigna profesores para escribir informes cualitativos sobre estudiantes
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setAssignModalOpen(true)}
          >
            Asignar Permisos
          </Button>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Permisos Activos"
              value={stats?.activePermissions || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Profesores Asignados"
              value={stats?.teachersWithPermissions || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Estudiantes con Evaluadores"
              value={stats?.studentsWithReporters || 0}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Permisos"
              value={stats?.totalPermissions || 0}
              prefix={<FileTextOutlined style={{ color: '#fa8c16' }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8}>
            <Text strong>Año Académico:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Seleccionar año"
              value={filterAcademicYear}
              onChange={setFilterAcademicYear}
              allowClear
            >
              {academicYears.map(year => (
                <Option key={year.id} value={year.id}>
                  {year.name} {year.isCurrent && '(Actual)'}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Text strong>Filtrar por Profesor:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Todos los profesores"
              value={filterTeacher}
              onChange={setFilterTeacher}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {teachers.map(teacher => (
                <Option key={teacher.id} value={teacher.id}>
                  {getTeacherName(teacher)}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} style={{ display: 'flex', alignItems: 'flex-end', paddingTop: 28 }}>
            <Button icon={<ReloadOutlined />} onClick={loadPermissions}>
              Actualizar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Permissions Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={permissions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay permisos asignados"
              />
            ),
          }}
        />
      </Card>

      {/* Assignment Modal */}
      <Modal
        title="Asignar Permisos de Informe"
        open={assignModalOpen}
        onCancel={() => {
          setAssignModalOpen(false);
          resetAssignForm();
        }}
        onOk={handleAssign}
        okText="Asignar"
        cancelText="Cancelar"
        width={800}
        confirmLoading={assigning}
      >
        <Alert
          message="Asignación de Evaluadores"
          description="Selecciona un profesor y los estudiantes sobre los que podrá escribir informes cualitativos."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Row gutter={16}>
          <Col span={24}>
            <Text strong>1. Seleccionar Profesor *</Text>
            <Select
              style={{ width: '100%', marginTop: 8, marginBottom: 16 }}
              placeholder="Buscar profesor..."
              value={selectedTeacher}
              onChange={setSelectedTeacher}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {teachers.map(teacher => (
                <Option key={teacher.id} value={teacher.id}>
                  {getTeacherName(teacher)}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Text strong>2. Modo de Asignación</Text>
            <div style={{ marginTop: 8 }}>
              <Button
                type={assignMode === 'individual' ? 'primary' : 'default'}
                onClick={() => setAssignMode('individual')}
                style={{ marginRight: 8 }}
              >
                Estudiantes Individuales
              </Button>
              <Button
                type={assignMode === 'group' ? 'primary' : 'default'}
                onClick={() => setAssignMode('group')}
              >
                Por Grupo de Clase
              </Button>
            </div>
          </Col>
        </Row>

        {assignMode === 'individual' ? (
          <Row gutter={16}>
            <Col span={24}>
              <Text strong>3. Seleccionar Estudiantes *</Text>
              <Select
                mode="multiple"
                style={{ width: '100%', marginTop: 8, marginBottom: 16 }}
                placeholder="Buscar y seleccionar estudiantes..."
                value={selectedStudents}
                onChange={setSelectedStudents}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
                maxTagCount={5}
              >
                {students.map(student => (
                  <Option key={student.id} value={student.id}>
                    {getStudentName(student)} ({student.classGroups?.[0]?.name || 'Sin grupo'})
                  </Option>
                ))}
              </Select>
              <Text type="secondary">
                {selectedStudents.length} estudiante(s) seleccionado(s)
              </Text>
            </Col>
          </Row>
        ) : (
          <Row gutter={16}>
            <Col span={24}>
              <Text strong>3. Seleccionar Grupos de Clase *</Text>
              <Select
                mode="multiple"
                style={{ width: '100%', marginTop: 8, marginBottom: 16 }}
                placeholder="Seleccionar uno o varios grupos..."
                value={selectedGroups}
                onChange={setSelectedGroups}
                showSearch
                optionFilterProp="children"
                maxTagCount={5}
              >
                {classGroups.map(group => (
                  <Option key={group.id} value={group.id}>
                    {group.name}
                  </Option>
                ))}
              </Select>
              <Text type="secondary">
                {selectedGroups.length} grupo(s) seleccionado(s)
              </Text>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col span={24}>
            <Text strong>4. Nota (opcional)</Text>
            <Input.TextArea
              style={{ marginTop: 8 }}
              placeholder="Ej: Para evaluación trimestral, Informe de comportamiento..."
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              rows={2}
            />
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

export default ReportAccessManagerPage;
