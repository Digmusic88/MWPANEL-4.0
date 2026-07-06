import React, { useState, useEffect, useCallback } from 'react';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Avatar,
  Spin,
  message,
  Row,
  Col,
  Statistic,
  Divider,
  List,
  Empty,
  Badge,
  Descriptions,
  Table,
} from 'antd';
import {
  TeamOutlined,
  BookOutlined,
  EyeOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

// Componente para Avatar de estudiante con foto real
const StudentAvatar: React.FC<{ 
  avatarUrl?: string | null, 
  size?: 'small' | 'default' | number 
}> = ({ avatarUrl, size = 'small' }) => {
  const { photoUrl, hasPhoto } = useProfilePhoto(avatarUrl)
  
  return (
    <Avatar 
      size={size} 
      src={photoUrl}
      icon={!hasPhoto ? <UserOutlined /> : undefined}
      style={{ 
        backgroundColor: hasPhoto ? undefined : '#1890ff', 
      }} 
    />
  )
}
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '@services/apiClient';
import { useResponsive } from '../../hooks/useResponsive';

const { Title, Text } = Typography;

interface Teacher {
  id: string;
  employeeNumber: string;
  specialties: string[];
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      department: string;
      position: string;
    };
  };
}

interface Student {
  id: string;
  enrollmentNumber: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface ClassGroup {
  id: string;
  name: string;
  section: string;
  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  };
  courses: Array<{
    id: string;
    name: string;
    order: number;
    cycle: {
      id: string;
      name: string;
      educationalLevel: {
        id: string;
        name: string;
        code: string;
      };
    };
  }>;
  tutor: Teacher;
  students: Student[];
  createdAt: string;
  updatedAt: string;
}

const TeacherClassDetailPage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === "function") {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn("Navigation error:", error, "Path:", path);
      }
    } else {
      console.warn("Navigate function not available:", path);
    }
  }, [navigate]);
  const { classId } = useParams<{ classId: string }>();
  const [loading, setLoading] = useState(true);
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);

  useEffect(() => {
    if (classId) {
      fetchClassDetails(classId);
    }
  }, [classId]);

  const fetchClassDetails = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/class-groups/${id}`);
      setClassGroup(response.data);
    } catch (error: any) {
      console.error('Error fetching class details:', error);
      message.error('Error al cargar los detalles de la clase');
      safeNavigate('/teacher/classes');
    } finally {
      setLoading(false);
    }
  };

  const handleManageAttendance = () => {
    safeNavigate(`/teacher/attendance?classId=${classId}`);
  };

  const handleManageGrades = () => {
    safeNavigate(`/teacher/grades?classId=${classId}`);
  };

  const handleManageEvaluations = () => {
    safeNavigate(`/teacher/evaluations?classId=${classId}`);
  };

  const handleManageTasks = () => {
    safeNavigate(`/teacher/tasks?classId=${classId}`);
  };

  // Student table columns
  const studentColumns: ColumnsType<Student> = [
    {
      title: 'Estudiante',
      key: 'student',
      render: (_, record) => (
        <Space>
          <StudentAvatar 
            avatarUrl={record.user?.profile?.avatar} 
            size="small"
          />
          <div>
            <div className="font-medium">
              {record.user?.profile?.firstName && record.user?.profile?.lastName
                ? `${record.user.profile.firstName} ${record.user.profile.lastName}`
                : record.user?.profile?.fullName || record.user?.email || 'Estudiante'}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.enrollmentNumber}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: ['user', 'email'],
      key: 'email',
      responsive: ['md'],
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large">
          <div className="text-center p-4">Cargando detalles de la clase...</div>
        </Spin>
      </div>
    );
  }

  if (!classGroup) {
    return (
      <Card>
        <Empty
          description="No se encontraron los detalles de la clase"
          extra={
            <Button type="primary" onClick={() => safeNavigate('/teacher/classes')}>
              Volver a Mis Clases
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => safeNavigate('/teacher/classes')}
          >
            Volver
          </Button>
          <div>
            <Title level={2} className="!mb-1">
              {classGroup.name}
            </Title>
            <Space>
              <Tag color="blue">Sección {classGroup.section}</Tag>
              <Tag color={classGroup.academicYear.isCurrent ? 'green' : 'default'}>
                {classGroup.academicYear.name}
              </Tag>
            </Space>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Estudiantes"
              value={classGroup.students.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Cursos"
              value={classGroup.courses?.length || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Nivel Educativo"
              value={classGroup.courses?.[0]?.cycle?.educationalLevel?.name || 'N/A'}
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Estado"
              value={classGroup.academicYear.isCurrent ? 'Activo' : 'Inactivo'}
              valueStyle={{ 
                color: classGroup.academicYear.isCurrent ? '#52c41a' : '#8c8c8c',
                fontSize: '16px'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card title="Acciones Rápidas">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              block
              onClick={handleManageAttendance}
            >
              Gestionar Asistencia
            </Button>
          </Col>
          <Col xs={24} sm={6}>
            <Button
              icon={<BookOutlined />}
              block
              onClick={handleManageGrades}
            >
              Ver Calificaciones
            </Button>
          </Col>
          <Col xs={24} sm={6}>
            <Button
              icon={<FileTextOutlined />}
              block
              onClick={handleManageEvaluations}
            >
              Evaluaciones
            </Button>
          </Col>
          <Col xs={24} sm={6}>
            <Button
              icon={<EditOutlined />}
              block
              onClick={handleManageTasks}
            >
              Gestionar Tareas
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Class Information */}
        <Col xs={24} lg={12}>
          <Card title="Información de la Clase">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Nombre de la Clase">
                {classGroup.name}
              </Descriptions.Item>
              <Descriptions.Item label="Sección">
                {classGroup.section}
              </Descriptions.Item>
              <Descriptions.Item label="Año Académico">
                {classGroup.academicYear.name}
              </Descriptions.Item>
              <Descriptions.Item label="Tutor">
                {classGroup.tutor.user.profile.firstName} {classGroup.tutor.user.profile.lastName}
              </Descriptions.Item>
              <Descriptions.Item label="Departamento">
                {classGroup.tutor.user.profile.department}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Title level={4}>Cursos</Title>
            {classGroup.courses && classGroup.courses.length > 0 ? (
              <List
                size="small"
                dataSource={classGroup.courses}
                renderItem={(course) => (
                  <List.Item>
                    <div>
                      <Text strong>{course.name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {course.cycle.educationalLevel.name} - Orden: {course.order}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">No hay cursos asignados</Text>
            )}
          </Card>
        </Col>

        {/* Students List */}
        <Col xs={24} lg={12}>
          <Card title={`Estudiantes (${classGroup.students.length})`}>
            {classGroup.students.length > 0 ? (
              isMobile || isTablet ? (
                <List
                  size="small"
                  dataSource={classGroup.students}
                  renderItem={(student) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<StudentAvatar 
                          avatarUrl={student.user?.profile?.avatar} 
                          size="small"
                        />}
                        title={`${student.user.profile.firstName} ${student.user.profile.lastName}`}
                        description={
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {student.enrollmentNumber}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {student.user.email}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Table
                  columns={studentColumns}
                  dataSource={classGroup.students}
                  rowKey="id"
                  size="small"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} de ${total} estudiantes`,
                  }}
                />
              )
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay estudiantes matriculados en esta clase"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherClassDetailPage;