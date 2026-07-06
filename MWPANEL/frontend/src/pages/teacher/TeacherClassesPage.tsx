import React, { useState, useEffect, useCallback } from 'react';
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
  List,
  Empty,
} from 'antd';
import {
  TeamOutlined,
  BookOutlined,
  EyeOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
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
  students: Array<{
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
  }>;
  createdAt: string;
  updatedAt: string;
}

const TeacherClassesPage: React.FC = () => {
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
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);
  const [myClasses, setMyClasses] = useState<ClassGroup[]>([]);
  const [mySubjectAssignments, setMySubjectAssignments] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<ClassGroup[]>([]);

  // Fetch teacher profile and classes
  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      
      // Get current user info first
      const userResponse = await apiClient.get('/auth/me');
      const currentUser = userResponse.data;
      
      if (currentUser.role !== 'teacher') {
        message.error('Acceso denegado: Solo profesores pueden acceder a esta página');
        return;
      }

      // Find teacher by user ID
      const teachersResponse = await apiClient.get('/teachers');
      const teachers = (teachersResponse.data || []).filter((teacher: any) => teacher?.user?.id); // Filter invalid teachers
      const currentTeacher = teachers.find((teacher: any) => teacher.user.id === currentUser?.id);
      
      if (currentTeacher) {
        setTeacherProfile(currentTeacher);
        
        // Fetch teacher's classes (where they are tutor)
        const myClassesResponse = await apiClient.get(`/class-groups?tutorId=${currentTeacher.id}`);
        setMyClasses(myClassesResponse.data);

        // Fetch teacher's subject assignments (all subjects they teach)
        const subjectAssignmentsResponse = await apiClient.get(`/subjects/assignments/teacher/${currentTeacher.id}`);
        setMySubjectAssignments(subjectAssignmentsResponse.data || []);

        // Fetch all classes for overview (optional)
        const allClassesResponse = await apiClient.get('/class-groups');
        setAllClasses(allClassesResponse.data);
      } else {
        message.error('No se encontró el perfil de profesor para este usuario');
      }
    } catch (error: any) {
      console.error('Error fetching teacher data:', error);
      message.error('Error al cargar los datos del profesor');
    } finally {
      setLoading(false);
    }
  };

  const handleViewClass = (classGroup: ClassGroup) => {
    safeNavigate(`/teacher/class/${classGroup.id}`);
  };

  const handleManageAttendance = (classGroup: ClassGroup) => {
    safeNavigate(`/teacher/attendance?classId=${classGroup.id}`);
  };

  const handleManageGrades = (classGroup: ClassGroup) => {
    safeNavigate(`/teacher/grades?classId=${classGroup.id}`);
  };

  const handleManageEvaluations = (classGroup: ClassGroup) => {
    safeNavigate(`/teacher/evaluations?classId=${classGroup.id}`);
  };

  const handleViewSubjectAssignment = (assignment: any) => {
    safeNavigate(`/teacher/subject-assignment/${assignment.id}`);
  };

  const handleManageSubjectStudents = (assignment: any) => {
    safeNavigate(`/teacher/subject-students?assignmentId=${assignment.id}`);
  };

  const handleContactParents = (assignment: any) => {
    safeNavigate(`/teacher/communications?subjectAssignmentId=${assignment.id}`);
  };

  // Table columns for desktop view
  const columns: ColumnsType<ClassGroup> = [
    {
      title: 'Clase',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Tag color="blue">Sección {record.section}</Tag>
        </div>
      ),
    },
    {
      title: 'Cursos',
      key: 'courses',
      render: (_, record) => (
        <div>
          {record.courses?.map((course, index) => (
            <div key={course.id}>
              <Text>{course.name}</Text>
              {index === 0 && course.cycle?.educationalLevel?.name && (
                <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                  ({course.cycle.educationalLevel.name})
                </Text>
              )}
            </div>
          )) || <Text type="secondary">Sin cursos</Text>}
        </div>
      ),
    },
    {
      title: 'Estudiantes',
      key: 'students',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tag color="cyan" icon={<TeamOutlined />}>
            {record.students.length} estudiantes
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Año Académico',
      key: 'academicYear',
      render: (_, record) => (
        <Tag color={record.academicYear.isCurrent ? 'green' : 'default'}>
          {record.academicYear.name}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space wrap>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewClass(record)}
            >
              Ver Detalles
            </Button>
            <Button
              size="small"
              icon={<CalendarOutlined />}
              onClick={() => handleManageAttendance(record)}
            >
              Asistencia
            </Button>
          </Space>
          <Space wrap>
            <Button
              size="small"
              icon={<BookOutlined />}
              onClick={() => handleManageGrades(record)}
            >
              Calificaciones
            </Button>
            <Button
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleManageEvaluations(record)}
            >
              Evaluaciones
            </Button>
          </Space>
        </Space>
      ),
    },
  ];

  // Mobile card render
  const renderMobileCard = (classGroup: ClassGroup) => (
    <Card
      key={classGroup.id}
      size="small"
      style={{ marginBottom: '12px' }}
      bodyStyle={{ padding: '12px' }}
      extra={
        <Tag color={classGroup.academicYear.isCurrent ? 'green' : 'default'} size="small">
          {classGroup.academicYear.name}
        </Tag>
      }
    >
      <div style={{ marginBottom: '8px' }}>
        <Text strong style={{ fontSize: '14px', display: 'block' }}>
          {classGroup.name}
        </Text>
        <Tag color="blue" size="small" style={{ marginTop: '4px' }}>
          Sección {classGroup.section}
        </Tag>
      </div>

      {/* Courses */}
      {classGroup.courses && classGroup.courses.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <Text style={{ fontSize: '12px', fontWeight: '500', display: 'block' }}>
            📚 Cursos:
          </Text>
          {classGroup.courses.map((course, idx) => (
            <div key={course.id} style={{ marginLeft: '16px' }}>
              <Text style={{ fontSize: '11px' }}>{course.name}</Text>
              {idx === 0 && course.cycle?.educationalLevel?.name && (
                <Text type="secondary" style={{ fontSize: '10px', marginLeft: '8px' }}>
                  ({course.cycle.educationalLevel.name})
                </Text>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Students count */}
      <div style={{ marginBottom: '8px' }}>
        <Tag color="cyan" size="small" icon={<TeamOutlined />}>
          {classGroup.students.length} estudiantes
        </Tag>
      </div>

      {/* Action buttons */}
      <div style={{ marginTop: '12px' }}>
        <Space wrap size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewClass(classGroup)}
          >
            Ver
          </Button>
          <Button
            size="small"
            icon={<CalendarOutlined />}
            onClick={() => handleManageAttendance(classGroup)}
          >
            Asistencia
          </Button>
          <Button
            size="small"
            icon={<BookOutlined />}
            onClick={() => handleManageGrades(classGroup)}
          >
            Notas
          </Button>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleManageEvaluations(classGroup)}
          >
            Evaluaciones
          </Button>
        </Space>
      </div>
    </Card>
  );

  // Table columns for subject assignments
  const subjectAssignmentColumns: ColumnsType<any> = [
    {
      title: 'Asignatura',
      key: 'subject',
      render: (_, record) => (
        <div>
          <Text strong>{record.subject?.name || 'Sin nombre'}</Text>
          <br />
          <Tag color="blue">{record.subject?.code || 'N/A'}</Tag>
        </div>
      ),
    },
    {
      title: 'Grupo de Clase',
      key: 'classGroup',
      render: (_, record) => (
        <div>
          <Text>{record.classGroup?.name || 'Sin grupo'}</Text>
          <br />
          <Tag color="green" size="small">
            {record.classGroup?.students?.length || 0} estudiantes
          </Tag>
        </div>
      ),
    },
    {
      title: 'Horas Semanales',
      dataIndex: 'weeklyHours',
      key: 'weeklyHours',
      render: (hours) => (
        <Tag color="orange">{hours || 0}h</Tag>
      ),
    },
    {
      title: 'Año Académico',
      key: 'academicYear',
      render: (_, record) => (
        <Tag color={record.academicYear?.isCurrent ? 'green' : 'default'}>
          {record.academicYear?.name || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 250,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space wrap>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewSubjectAssignment(record)}
            >
              Ver Detalles
            </Button>
            <Button
              size="small"
              icon={<TeamOutlined />}
              onClick={() => handleManageSubjectStudents(record)}
            >
              Ver Estudiantes
            </Button>
          </Space>
          <Space wrap>
            <Button
              size="small"
              icon={<BookOutlined />}
              onClick={() => handleManageGrades(record.classGroup)}
            >
              Calificaciones
            </Button>
            <Button
              size="small"
              icon={<UserOutlined />}
              onClick={() => handleContactParents(record)}
            >
              Contactar Padres
            </Button>
          </Space>
        </Space>
      ),
    },
  ];

  // Mobile card render for subject assignments
  const renderSubjectAssignmentMobileCard = (assignment: any) => (
    <Card
      key={assignment.id}
      size="small"
      style={{ marginBottom: '12px' }}
      bodyStyle={{ padding: '12px' }}
      extra={
        <Tag color={assignment.academicYear?.isCurrent ? 'green' : 'default'} size="small">
          {assignment.academicYear?.name || 'N/A'}
        </Tag>
      }
    >
      <div style={{ marginBottom: '8px' }}>
        <Text strong style={{ fontSize: '14px', display: 'block' }}>
          {assignment.subject?.name || 'Sin nombre'}
        </Text>
        <Space size="small" style={{ marginTop: '4px' }}>
          <Tag color="blue" size="small">{assignment.subject?.code || 'N/A'}</Tag>
          <Tag color="orange" size="small">{assignment.weeklyHours || 0}h/semana</Tag>
        </Space>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <Text style={{ fontSize: '12px', fontWeight: '500', display: 'block' }}>
          📚 Grupo: {assignment.classGroup?.name || 'Sin grupo'}
        </Text>
        <Tag color="green" size="small" style={{ marginTop: '4px' }}>
          <TeamOutlined /> {assignment.classGroup?.students?.length || 0} estudiantes
        </Tag>
      </div>

      <div style={{ marginTop: '12px' }}>
        <Space wrap size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewSubjectAssignment(assignment)}
          >
            Ver
          </Button>
          <Button
            size="small"
            icon={<TeamOutlined />}
            onClick={() => handleManageSubjectStudents(assignment)}
          >
            Estudiantes
          </Button>
          <Button
            size="small"
            icon={<BookOutlined />}
            onClick={() => handleManageGrades(assignment.classGroup)}
          >
            Notas
          </Button>
          <Button
            size="small"
            icon={<UserOutlined />}
            onClick={() => handleContactParents(assignment)}
          >
            Padres
          </Button>
        </Space>
      </div>
    </Card>
  );

  // Calculate statistics
  const totalStudents = myClasses.reduce((total, classGroup) => total + classGroup.students.length, 0);
  const totalCourses = myClasses.reduce((total, classGroup) => total + (classGroup.courses?.length || 0), 0);
  const totalSubjectAssignments = mySubjectAssignments.length;
  const totalSubjectStudents = mySubjectAssignments.reduce((total, assignment) =>
    total + (assignment.classGroup?.students?.length || 0), 0
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large">
          <div className="text-center p-4">Cargando mis clases...</div>
        </Spin>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Title level={2} className="!mb-2">
          Mis Clases
        </Title>
        {teacherProfile && (
          <Text type="secondary">
            {teacherProfile.user.profile.firstName} {teacherProfile.user.profile.lastName} • 
            {teacherProfile.user.profile.department} • 
            {myClasses.length} {myClasses.length === 1 ? 'clase' : 'clases'} como tutor
          </Text>
        )}
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Clases como Tutor"
              value={myClasses.length}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Asignaturas que Enseño"
              value={totalSubjectAssignments}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Estudiantes en Asignaturas"
              value={totalSubjectStudents}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Estudiantes (Tutor)"
              value={totalStudents}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Classes Table/Cards */}
      <Card 
        title="Mis Clases como Tutor"
        extra={
          <Button 
            type="primary" 
            onClick={() => safeNavigate('/teacher/schedule')}
          >
            Ver Horario
          </Button>
        }
      >
        {myClasses.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-center">
                <Text type="secondary">No tienes clases asignadas como tutor</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Contacta con el administrador para que te asigne clases
                </Text>
              </div>
            }
          />
        ) : (
          <>
            {isMobile || isTablet ? (
              <div>
                {myClasses.map(renderMobileCard)}
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={myClasses}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} de ${total} clases`,
                }}
              />
            )}
          </>
        )}
      </Card>

      {/* Subject Assignments Table/Cards */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined style={{ color: '#52c41a' }} />
            <span>Mis Asignaturas</span>
            <Tag color="green">{totalSubjectAssignments}</Tag>
          </div>
        }
        extra={
          <Button
            type="primary"
            onClick={() => safeNavigate('/teacher/assignments')}
          >
            Gestionar Asignaturas
          </Button>
        }
      >
        {mySubjectAssignments.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-center">
                <Text type="secondary">No tienes asignaturas asignadas</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Contacta con el administrador para que te asigne asignaturas
                </Text>
              </div>
            }
          />
        ) : (
          <>
            {isMobile || isTablet ? (
              <div>
                {mySubjectAssignments.map(renderSubjectAssignmentMobileCard)}
              </div>
            ) : (
              <Table
                columns={subjectAssignmentColumns}
                dataSource={mySubjectAssignments}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} de ${total} asignaturas`,
                }}
              />
            )}
          </>
        )}
      </Card>

      {/* Additional Info */}
      {myClasses.length > 0 && (
        <Card title="Información Adicional">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Title level={4}>Acciones Rápidas</Title>
              <List
                size="small"
                dataSource={[
                  { title: 'Gestionar Asistencia', action: () => safeNavigate('/teacher/attendance') },
                  { title: 'Ver Calificaciones', action: () => safeNavigate('/teacher/grades') },
                  { title: 'Crear Evaluación', action: () => safeNavigate('/teacher/evaluations') },
                  { title: 'Gestionar Tareas', action: () => safeNavigate('/teacher/tasks') },
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
              <Title level={4}>Niveles Educativos</Title>
              <div>
                {Array.from(new Set(
                  myClasses.flatMap(cls => 
                    cls.courses?.map(course => course.cycle?.educationalLevel?.name) || []
                  ).filter(Boolean)
                )).map(level => (
                  <Tag key={level} color="purple" style={{ marginBottom: '4px' }}>
                    {level}
                  </Tag>
                ))}
              </div>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default TeacherClassesPage;