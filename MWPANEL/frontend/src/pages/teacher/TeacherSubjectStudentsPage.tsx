import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
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
  Empty,
  List,
  Breadcrumb,
  Select,
} from 'antd';
import {
  TeamOutlined,
  BookOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  FileTextOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@services/apiClient';
import { useResponsive } from '../../hooks/useResponsive';

const { Title, Text } = Typography;

interface Student {
  id: string;
  enrollmentNumber: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
      address?: string;
    };
  };
  family?: {
    id: string;
    primaryContact: {
      user: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    };
    secondaryContact?: {
      user: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    };
  };
}

interface SubjectAssignment {
  id: string;
  weeklyHours: number;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  classGroup: {
    id: string;
    name: string;
    students: Student[];
  };
  teacher: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  academicYear: {
    id: string;
    name: string;
    isCurrent: boolean;
  };
}

const TeacherSubjectStudentsPage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<SubjectAssignment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [myAssignments, setMyAssignments] = useState<SubjectAssignment[]>([]);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentData();
    } else {
      // Sin asignatura en la URL (p.ej. entrada de menú): cargar las del profesor
      // para ofrecer un selector, en vez de quedar en spinner infinito.
      fetchMyAssignments();
    }
  }, [assignmentId]);

  const fetchMyAssignments = async () => {
    try {
      setLoading(true);
      const userResponse = await apiClient.get('/auth/me');
      const currentUser = userResponse.data;
      const teachersResponse = await apiClient.get('/teachers');
      const teachers = (teachersResponse.data || []).filter((t: any) => t?.user?.id);
      const currentTeacher = teachers.find((t: any) => t.user.id === currentUser?.id);
      if (currentTeacher) {
        const res = await apiClient.get(`/subjects/assignments/teacher/${currentTeacher.id}`);
        setMyAssignments(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching teacher assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);

      // Fetch assignment details
      const assignmentResponse = await apiClient.get(`/subjects/assignments/${assignmentId}`);
      const assignmentData = assignmentResponse.data;
      setAssignment(assignmentData);

      // Get students from the class group
      setStudents(assignmentData.classGroup?.students || []);

    } catch (error: any) {
      console.error('Error fetching assignment data:', error);
      message.error('Error al cargar los datos de la asignatura');
    } finally {
      setLoading(false);
    }
  };

  const handleContactParents = (student: Student) => {
    if (student.family?.id) {
      navigate(`/teacher/communications?familyId=${student.family.id}&studentId=${student.id}&subjectId=${assignment?.subject.id}`);
    } else {
      message.warning('Este estudiante no tiene familia registrada');
    }
  };

  const handleViewGrades = (student: Student) => {
    navigate(`/teacher/grades?studentId=${student.id}&subjectId=${assignment?.subject.id}`);
  };

  const handleViewEvaluations = (student: Student) => {
    navigate(`/teacher/evaluations?studentId=${student.id}&subjectId=${assignment?.subject.id}`);
  };

  const handleViewAttendance = (student: Student) => {
    navigate(`/teacher/attendance?studentId=${student.id}&classGroupId=${assignment?.classGroup.id}`);
  };

  // Table columns for desktop view
  const columns: ColumnsType<Student> = [
    {
      title: 'Estudiante',
      key: 'student',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>
              {record.user.profile.firstName} {record.user.profile.lastName}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.enrollmentNumber}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Contacto',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: '4px' }}>
            <MailOutlined style={{ marginRight: '4px', color: '#1890ff' }} />
            <Text style={{ fontSize: '12px' }}>{record.user.email}</Text>
          </div>
          {record.user.profile.phone && (
            <div>
              <PhoneOutlined style={{ marginRight: '4px', color: '#52c41a' }} />
              <Text style={{ fontSize: '12px' }}>{record.user.profile.phone}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Familia',
      key: 'family',
      render: (_, record) => (
        <div>
          {record.family ? (
            <>
              <Text strong style={{ fontSize: '12px' }}>
                {record.family.primaryContact.user.profile.firstName}{' '}
                {record.family.primaryContact.user.profile.lastName}
              </Text>
              {record.family.secondaryContact && (
                <>
                  <br />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {record.family.secondaryContact.user.profile.firstName}{' '}
                    {record.family.secondaryContact.user.profile.lastName}
                  </Text>
                </>
              )}
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Sin familia registrada
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 280,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space wrap>
            <Button
              size="small"
              icon={<MessageOutlined />}
              onClick={() => handleContactParents(record)}
              disabled={!record.family}
            >
              Contactar Padres
            </Button>
            <Button
              size="small"
              icon={<BookOutlined />}
              onClick={() => handleViewGrades(record)}
            >
              Calificaciones
            </Button>
          </Space>
          <Space wrap>
            <Button
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleViewEvaluations(record)}
            >
              Evaluaciones
            </Button>
            <Button
              size="small"
              icon={<CalendarOutlined />}
              onClick={() => handleViewAttendance(record)}
            >
              Asistencia
            </Button>
          </Space>
        </Space>
      ),
    },
  ];

  // Mobile card render
  const renderMobileCard = (student: Student) => (
    <Card
      key={student.id}
      size="small"
      style={{ marginBottom: '12px' }}
      bodyStyle={{ padding: '12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <Avatar icon={<UserOutlined />} />
        <div>
          <Text strong style={{ fontSize: '14px' }}>
            {student.user.profile.firstName} {student.user.profile.lastName}
          </Text>
          <br />
          <Tag color="blue" size="small">
            {student.enrollmentNumber}
          </Tag>
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '12px' }}>
          <MailOutlined style={{ marginRight: '4px', color: '#1890ff' }} />
          {student.user.email}
        </div>
        {student.user.profile.phone && (
          <div style={{ fontSize: '12px', marginTop: '2px' }}>
            <PhoneOutlined style={{ marginRight: '4px', color: '#52c41a' }} />
            {student.user.profile.phone}
          </div>
        )}
      </div>

      {student.family && (
        <div style={{ marginBottom: '8px' }}>
          <Text strong style={{ fontSize: '12px' }}>
            👨‍👩‍👧‍👦 Familia:
          </Text>
          <br />
          <Text style={{ fontSize: '11px' }}>
            {student.family.primaryContact.user.profile.firstName}{' '}
            {student.family.primaryContact.user.profile.lastName}
          </Text>
          {student.family.secondaryContact && (
            <>
              {', '}
              <Text style={{ fontSize: '11px' }}>
                {student.family.secondaryContact.user.profile.firstName}{' '}
                {student.family.secondaryContact.user.profile.lastName}
              </Text>
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <Space wrap size="small">
          <Button
            type="primary"
            size="small"
            icon={<MessageOutlined />}
            onClick={() => handleContactParents(student)}
            disabled={!student.family}
          >
            Contactar
          </Button>
          <Button
            size="small"
            icon={<BookOutlined />}
            onClick={() => handleViewGrades(student)}
          >
            Notas
          </Button>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewEvaluations(student)}
          >
            Evaluar
          </Button>
          <Button
            size="small"
            icon={<CalendarOutlined />}
            onClick={() => handleViewAttendance(student)}
          >
            Asistencia
          </Button>
        </Space>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large">
          <div className="text-center p-4">Cargando estudiantes...</div>
        </Spin>
      </div>
    );
  }

  // Entrada de menú sin asignatura seleccionada: ofrecer un selector.
  if (!assignmentId) {
    return (
      <div className="space-y-6">
        <Title level={2} className="!mb-2">Alumnos por Asignatura</Title>
        <Card>
          {myAssignments.length === 0 ? (
            <Empty
              description="No tienes asignaturas asignadas"
              extra={
                <Button type="primary" onClick={() => navigate('/teacher/classes')}>
                  Ir a Mis Clases
                </Button>
              }
            />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>Selecciona una asignatura para ver sus alumnos:</Text>
              <Select
                showSearch
                style={{ width: '100%', maxWidth: 480 }}
                placeholder="Elige una asignatura"
                optionFilterProp="label"
                onChange={(id) => navigate(`/teacher/subject-students?assignmentId=${id}`)}
                options={myAssignments.map((a) => ({
                  value: a.id,
                  label: `${a.subject?.name || 'Asignatura'}${a.classGroup?.name ? ` · ${a.classGroup.name}` : ''}`,
                }))}
              />
            </Space>
          )}
        </Card>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex justify-center items-center h-64">
        <Empty
          description="No se pudo cargar la información de la asignatura"
          extra={
            <Button type="primary" onClick={() => navigate('/teacher/classes')}>
              Volver a Mis Clases
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <Breadcrumb.Item>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/teacher/classes')}
            style={{ padding: 0 }}
          >
            Mis Clases
          </Button>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <HomeOutlined />
          {assignment.subject.name}
        </Breadcrumb.Item>
        <Breadcrumb.Item>Estudiantes</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <div>
        <Title level={2} className="!mb-2">
          Estudiantes de {assignment.subject.name}
        </Title>
        <Text type="secondary">
          {assignment.classGroup.name} • {assignment.subject.code} •
          {assignment.weeklyHours}h semanales •
          {students.length} estudiantes
        </Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Estudiantes"
              value={students.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Con Familia Registrada"
              value={students.filter(s => s.family).length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Horas Semanales"
              value={assignment.weeklyHours}
              suffix="h"
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Año Académico"
              value={assignment.academicYear.name}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Students Table/Cards */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamOutlined style={{ color: '#1890ff' }} />
            <span>Estudiantes en {assignment.classGroup.name}</span>
          </div>
        }
        extra={
          <Space>
            <Button
              onClick={() => handleContactParents(students[0])}
              disabled={students.filter(s => s.family).length === 0}
            >
              Contactar Todas las Familias
            </Button>
            <Button
              type="primary"
              onClick={() => navigate(`/teacher/grades?classGroupId=${assignment.classGroup.id}&subjectId=${assignment.subject.id}`)}
            >
              Ver Todas las Calificaciones
            </Button>
          </Space>
        }
      >
        {students.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-center">
                <Text type="secondary">No hay estudiantes en este grupo</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Contacta con el administrador para gestionar los estudiantes
                </Text>
              </div>
            }
          />
        ) : (
          <>
            {isMobile || isTablet ? (
              <div>
                {students.map(renderMobileCard)}
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={students}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} de ${total} estudiantes`,
                }}
              />
            )}
          </>
        )}
      </Card>

      {/* Quick Actions */}
      <Card title="Acciones Rápidas">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <List
              size="small"
              header={<Title level={4}>Gestión Académica</Title>}
              dataSource={[
                {
                  title: 'Ver Calificaciones del Grupo',
                  action: () => navigate(`/teacher/grades?classGroupId=${assignment.classGroup.id}&subjectId=${assignment.subject.id}`)
                },
                {
                  title: 'Crear Evaluación',
                  action: () => navigate(`/teacher/evaluations/new?subjectId=${assignment.subject.id}&classGroupId=${assignment.classGroup.id}`)
                },
                {
                  title: 'Gestionar Asistencia',
                  action: () => navigate(`/teacher/attendance?classGroupId=${assignment.classGroup.id}`)
                },
                {
                  title: 'Crear Tarea',
                  action: () => navigate(`/teacher/tasks/new?subjectId=${assignment.subject.id}&classGroupId=${assignment.classGroup.id}`)
                },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Button type="link" onClick={item.action} className="p-0">
                    {item.title}
                  </Button>
                </List.Item>
              )}
            />
          </Col>
          <Col xs={24} md={12}>
            <List
              size="small"
              header={<Title level={4}>Comunicación</Title>}
              dataSource={[
                {
                  title: 'Mensaje Grupal a Familias',
                  action: () => navigate(`/teacher/communications/group?classGroupId=${assignment.classGroup.id}&subjectId=${assignment.subject.id}`)
                },
                {
                  title: 'Ver Conversaciones',
                  action: () => navigate(`/teacher/communications?subjectId=${assignment.subject.id}`)
                },
                {
                  title: 'Enviar Circular',
                  action: () => navigate(`/teacher/communications/circular?classGroupId=${assignment.classGroup.id}`)
                },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Button type="link" onClick={item.action} className="p-0">
                    {item.title}
                  </Button>
                </List.Item>
              )}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default TeacherSubjectStudentsPage;