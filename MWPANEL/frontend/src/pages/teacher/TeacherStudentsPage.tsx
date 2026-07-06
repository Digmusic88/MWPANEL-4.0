import React, { useState, useEffect, useCallback } from 'react';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { useResponsive } from '../../hooks/useResponsive';
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
  Input,
  Select,
  Badge,
  Tooltip,
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  SearchOutlined,
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
  BookOutlined,
  FilterOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

// Componente para Avatar de estudiante con foto real
const StudentAvatar: React.FC<{ 
  avatarUrl?: string | null, 
  size?: number 
}> = ({ avatarUrl, size = 32 }) => {
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
import { useNavigate } from 'react-router-dom';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface Student {
  id: string;
  enrollmentNumber: string;
  birthDate: string;
  user: {
    id: string;
    email: string;
    isActive: boolean;
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
      address?: string;
    };
  };
}

interface ClassGroup {
  id: string;
  name: string;
  section: string;
  students: Student[];
}

interface TeacherProfile {
  id: string;
  employeeNumber: string;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

const TeacherStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

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
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  useEffect(() => {
    fetchTeacherData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchText, selectedClass, allStudents]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      
      // Get teacher profile
      const teacherResponse = await apiClient.get('/teachers/me');
      const teacher = teacherResponse.data;
      setTeacherProfile(teacher);
      
      // Get teacher's classes with students
      const classesResponse = await apiClient.get(`/class-groups?tutorId=${teacher.id}`);
      const classes = classesResponse.data;
      setClassGroups(classes);
      
      // Extract all students from all classes
      const students: Student[] = [];
      classes.forEach((classGroup: ClassGroup) => {
        if (classGroup.students) {
          classGroup.students.forEach((student) => {
            students.push({
              ...student,
              classGroup: classGroup
            } as Student & { classGroup: ClassGroup });
          });
        }
      });
      
      setAllStudents(students);
      setFilteredStudents(students);
      
    } catch (error: any) {
      console.error('Error fetching teacher data:', error);
      message.error('Error al cargar los datos del profesor');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = allStudents;

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(student => {
        const firstName = student.user?.profile?.firstName || '';
        const lastName = student.user?.profile?.lastName || '';
        const enrollmentNumber = student.enrollmentNumber || '';
        const email = student.user?.email || '';
        
        const searchLower = searchText.toLowerCase();
        return firstName.toLowerCase().includes(searchLower) ||
               lastName.toLowerCase().includes(searchLower) ||
               enrollmentNumber.toLowerCase().includes(searchLower) ||
               email.toLowerCase().includes(searchLower);
      });
    }

    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter(student => {
        const studentWithClass = student as Student & { classGroup: ClassGroup };
        return studentWithClass.classGroup?.id === selectedClass;
      });
    }

    setFilteredStudents(filtered);
  };

  const handleSendMessage = (student: Student) => {
    // Navigate to messages page with pre-filled recipient
    safeNavigate('/teacher/messages', { 
      state: { 
        recipientId: student.user.id,
        recipientName: `${student.user.profile.firstName} ${student.user.profile.lastName}`,
        recipientType: 'student'
      }
    });
  };

  // Columnas móviles - vista de tarjeta compacta
  const mobileColumns: ColumnsType<Student & { classGroup: ClassGroup }> = [
    {
      title: 'Estudiante',
      key: 'mobile',
      render: (_, record) => {
        const studentWithClass = record as Student & { classGroup: ClassGroup };
        return (
          <div className="py-2">
            {/* Header: Avatar, nombre y estado */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <StudentAvatar
                  avatarUrl={record.user?.profile?.avatar}
                  size={40}
                />
                <div>
                  <Text strong className="text-sm">
                    {record.user.profile.firstName} {record.user.profile.lastName}
                  </Text>
                  <div className="text-xs text-gray-500">{record.enrollmentNumber}</div>
                </div>
              </div>
              <Badge
                status={record.user.isActive ? 'success' : 'error'}
                text={record.user.isActive ? 'Activo' : 'Inactivo'}
              />
            </div>

            {/* Clase */}
            <div className="mb-2">
              <Tag color="blue" className="text-xs">
                {studentWithClass.classGroup?.name} {studentWithClass.classGroup?.section}
              </Tag>
            </div>

            {/* Contacto */}
            <div className="text-xs text-gray-600 mb-2">
              <div className="flex items-center gap-1 mb-1">
                <MailOutlined style={{ color: '#1890ff', fontSize: '11px' }} />
                <span className="truncate" style={{ maxWidth: '180px' }}>{record.user.email}</span>
              </div>
              {record.user.profile.phone && (
                <div className="flex items-center gap-1">
                  <PhoneOutlined style={{ color: '#52c41a', fontSize: '11px' }} />
                  <span>{record.user.profile.phone}</span>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button
                size="small"
                type="primary"
                ghost
                icon={<EyeOutlined />}
                onClick={() => safeNavigate(`/teacher/student/${record.id}`)}
              >
                Ver
              </Button>
              <Button
                size="small"
                icon={<MessageOutlined />}
                onClick={() => handleSendMessage(record)}
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
              >
                Mensaje
              </Button>
            </div>
          </div>
        );
      },
    },
  ];

  // Columnas desktop - tabla completa
  const desktopColumns: ColumnsType<Student & { classGroup: ClassGroup }> = [
    {
      title: 'Estudiante',
      key: 'student',
      render: (_, record) => (
        <Space>
          <StudentAvatar
            avatarUrl={record.user?.profile?.avatar}
            size={32}
          />
          <div>
            <Text strong>
              {record.user.profile.firstName} {record.user.profile.lastName}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.enrollmentNumber}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Clase',
      key: 'class',
      render: (_, record) => {
        const studentWithClass = record as Student & { classGroup: ClassGroup };
        return (
          <Tag color="blue">
            {studentWithClass.classGroup?.name} {studentWithClass.classGroup?.section}
          </Tag>
        );
      },
    },
    {
      title: 'Contacto',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space size="small">
            <MailOutlined style={{ color: '#1890ff' }} />
            <Text style={{ fontSize: '12px' }}>{record.user.email}</Text>
          </Space>
          {record.user.profile.phone && (
            <Space size="small">
              <PhoneOutlined style={{ color: '#52c41a' }} />
              <Text style={{ fontSize: '12px' }}>{record.user.profile.phone}</Text>
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_, record) => (
        <Badge
          status={record.user.isActive ? 'success' : 'error'}
          text={record.user.isActive ? 'Activo' : 'Inactivo'}
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver detalles">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => safeNavigate(`/teacher/student/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Enviar mensaje">
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={() => handleSendMessage(record)}
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Seleccionar columnas según dispositivo
  const columns = isMobile ? mobileColumns : desktopColumns;

  const totalStudents = allStudents.length;
  const activeStudents = allStudents.filter(s => s.user.isActive).length;
  const totalClasses = classGroups.length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large">
          <div style={{ marginTop: 20 }}>
            Cargando estudiantes...
          </div>
        </Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <Title level={isMobile ? 4 : 2}>
          <TeamOutlined /> Mis Estudiantes
        </Title>
        <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
          Gestión de estudiantes en las clases donde eres tutor
        </Text>
      </div>

      {/* Statistics Cards - 2x2 en móvil, 3 cols en desktop */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <Col xs={12} sm={8}>
          <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Total Estudiantes</span>}
              value={totalStudents}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: isMobile ? '20px' : '24px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Estudiantes Activos</span>}
              value={activeStudents}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: isMobile ? '20px' : '24px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Clases Tutorizadas</span>}
              value={totalClasses}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#722ed1', fontSize: isMobile ? '20px' : '24px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters - Stack en móvil */}
      <Card style={{ marginBottom: isMobile ? '16px' : '24px' }} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
        <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} align="middle">
          <Col xs={24} sm={12}>
            <Search
              placeholder={isMobile ? "Buscar estudiante..." : "Buscar por nombre, número de matrícula o email"}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              prefix={<SearchOutlined />}
              size={isMobile ? 'middle' : 'large'}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              placeholder="Filtrar por clase"
              value={selectedClass}
              onChange={(value) => setSelectedClass(value)}
              style={{ width: '100%' }}
              suffixIcon={<FilterOutlined />}
              size={isMobile ? 'middle' : 'large'}
            >
              <Option value="all">Todas las clases</Option>
              {classGroups.map((classGroup) => (
                <Option key={classGroup.id} value={classGroup.id}>
                  {classGroup.name} {classGroup.section}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Button
              type="primary"
              onClick={() => safeNavigate('/teacher/classes')}
              style={{ width: '100%' }}
              size={isMobile ? 'middle' : 'large'}
            >
              {isMobile ? 'Clases' : 'Gestionar Clases'}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Students Table */}
      <Card
        title={
          <Space size={isMobile ? 'small' : 'middle'}>
            <TeamOutlined />
            <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
              {isMobile ? 'Estudiantes' : 'Lista de Estudiantes'}
            </span>
            <Badge count={filteredStudents.length} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
        bodyStyle={{ padding: isMobile ? '8px' : '24px' }}
      >
        <Table
          columns={columns}
          dataSource={filteredStudents}
          rowKey="id"
          size={isMobile ? 'small' : 'middle'}
          scroll={isMobile ? undefined : { x: 800 }}
          pagination={{
            total: filteredStudents.length,
            pageSize: isMobile ? 5 : 10,
            showSizeChanger: !isMobile,
            showQuickJumper: !isMobile,
            showTotal: isMobile
              ? undefined
              : (total, range) => `${range[0]}-${range[1]} de ${total} estudiantes`,
            simple: isMobile,
          }}
          locale={{
            emptyText: (
              <div style={{ padding: isMobile ? '24px' : '40px', textAlign: 'center' }}>
                <TeamOutlined style={{ fontSize: isMobile ? '36px' : '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">No se encontraron estudiantes</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {totalStudents === 0
                      ? 'No tienes estudiantes asignados a tus clases'
                      : 'Intenta ajustar los filtros de búsqueda'
                    }
                  </Text>
                </div>
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
};

export default TeacherStudentsPage;