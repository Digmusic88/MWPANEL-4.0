import React, { useState, useEffect, useCallback } from 'react';
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
  List,
  Progress,
  Badge,
  Tooltip,
  Descriptions,
  Tabs,
  Empty,
} from 'antd';
import {
  UserOutlined,
  ArrowLeftOutlined,
  MailOutlined,
  PhoneOutlined,
  BookOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@services/apiClient';
import { GenerateAutoReportButton } from '@/components/student-reports/auto/GenerateAutoReportButton';
import AcademicYearSelector from '@components/common/AcademicYearSelector';
import ExpedienteViewer from '@/components/academic-records/ExpedienteViewer';
import BetaSectionBanner from '@/components/common/BetaSectionBanner';
import { SyncExpedienteButton } from '@components/academic-records/SyncExpedienteButton';
import LomloeCompetencyRadar from '@components/competencies/LomloeCompetencyRadar';
import { useStudentLomloeCompetencies } from '@hooks/useStudentLomloeCompetencies';
import StudentSubjectCurriculumPanel from '@components/student-curriculum/StudentSubjectCurriculumPanel';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

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
  classGroup?: {
    id: string;
    name: string;
    section: string;
  };
}

interface StudentGrade {
  id: string;
  value: number;
  subject: {
    name: string;
    code: string;
  };
  date: string;
}

interface StudentAttendance {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'justified';
}

const TeacherStudentDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
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
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [activeTab, setActiveTab] = useState('info');
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined);
  const [academicYears, setAcademicYears] = useState<Array<{ id: string; name: string }>>([]);

  const lomloe = useStudentLomloeCompetencies(studentId);
  const selectedYearName = academicYears.find((y) => y.id === selectedYearId)?.name;

  useEffect(() => {
    apiClient
      .get('/academic-years')
      .then((r) => setAcademicYears(r.data || []))
      .catch(() => setAcademicYears([]));
  }, []);

  const loadGradesAndAttendance = useCallback(async () => {
    if (!studentId) return;
    try {
      const yearQuery = selectedYearId ? `?academicYearId=${selectedYearId}` : '';
      const [gradesRes, attendanceRes] = await Promise.all([
        apiClient.get(`/grades/student/${studentId}${yearQuery}`),
        apiClient.get(
          `/attendance/stats/student/${studentId}` +
            (selectedYearId ? `?academicYearId=${selectedYearId}` : `?days=30`),
        ),
      ]);

      // Map subjectGrades → local StudentGrade shape
      const mappedGrades: StudentGrade[] = (gradesRes.data?.subjectGrades || []).map((item: any) => ({
        id: item.subjectId || item.id || item.subjectName,
        value: item.averageGrade || 0,
        subject: {
          name: item.subjectName || '',
          code: item.subjectCode || '',
        },
        date: item.lastUpdated || '',
      }));

      // Map recentRecords → local StudentAttendance shape (normalize uppercase status)
      const statusMap: Record<string, StudentAttendance['status']> = {
        PRESENT: 'present',
        ABSENT: 'absent',
        LATE: 'late',
        JUSTIFIED_ABSENCE: 'justified',
        EARLY_DEPARTURE: 'justified',
        present: 'present',
        absent: 'absent',
        late: 'late',
        justified: 'justified',
      };
      const mappedAttendance: StudentAttendance[] = (attendanceRes.data?.recentRecords || []).map((item: any) => ({
        id: item.id || item.date,
        date: item.date,
        status: statusMap[item.status] || 'absent',
      }));

      setGrades(mappedGrades);
      setAttendance(mappedAttendance);
    } catch {
      setGrades([]);
      setAttendance([]);
    }
  }, [studentId, selectedYearId]);

  useEffect(() => {
    if (studentId) {
      fetchStudentDetails();
    }
  }, [studentId]);

  // Al cambiar de alumno, resetear el año seleccionado (los años disponibles
  // dependen del alumno; el selector volverá a elegir el año actual por defecto).
  useEffect(() => {
    setSelectedYearId(undefined);
  }, [studentId]);

  // Re-fetch grades and attendance when studentId or selectedYearId changes.
  // loadGradesAndAttendance identity tracks both; listing it here is fully honest.
  useEffect(() => {
    loadGradesAndAttendance();
  }, [loadGradesAndAttendance]);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      
      // Get teacher's students to find this student
      const teacherResponse = await apiClient.get('/teachers/me');
      const teacher = teacherResponse.data;
      
      // Get teacher's classes with students
      const classesResponse = await apiClient.get(`/class-groups?tutorId=${teacher.id}`);
      const classes = classesResponse.data;
      
      // Find the student in teacher's classes
      let foundStudent = null;
      for (const classGroup of classes) {
        if (classGroup.students) {
          const studentInClass = classGroup.students.find((s: any) => s.id === studentId);
          if (studentInClass) {
            foundStudent = {
              ...studentInClass,
              classGroup: {
                id: classGroup.id,
                name: classGroup.name,
                section: classGroup.section
              }
            };
            break;
          }
        }
      }
      
      if (!foundStudent) {
        message.error('Estudiante no encontrado en tus clases');
        safeNavigate('/teacher/students');
        return;
      }
      
      setStudent(foundStudent);

    } catch (error: any) {
      console.error('Error fetching student details:', error);
      message.error('Error al cargar los datos del estudiante');
      safeNavigate('/teacher/students');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    // Navigate to messages page with pre-filled recipient
    safeNavigate('/teacher/messages', { 
      state: { 
        recipientId: student?.user.id,
        recipientName: `${student?.user.profile.firstName} ${student?.user.profile.lastName}`,
        recipientType: 'student'
      }
    });
  };

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getAttendanceRate = (): number => {
    if (attendance.length === 0) return 0;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    return Math.round((presentDays / attendance.length) * 100);
  };

  const getAverageGrade = (): number => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, grade) => acc + grade.value, 0);
    return Math.round((sum / grades.length) * 100) / 100;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large">
          <div style={{ marginTop: 20 }}>
            Cargando detalles del estudiante...
          </div>
        </Spin>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text type="secondary">No se encontró el estudiante</Text>
        <br />
        <Button 
          type="primary" 
          icon={<ArrowLeftOutlined />}
          onClick={() => safeNavigate('/teacher/students')}
          style={{ marginTop: 16 }}
        >
          Volver a Estudiantes
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Space align="center" style={{ marginBottom: '16px' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => safeNavigate('/teacher/students')}
          >
            Volver
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            Detalles del Estudiante
          </Title>
        </Space>
        {studentId && (
          <Space align="center" wrap>
            <AcademicYearSelector
              studentId={studentId}
              value={selectedYearId}
              onChange={setSelectedYearId}
            />
            {selectedYearName && (
              <SyncExpedienteButton studentId={studentId} academicYearName={selectedYearName} />
            )}
          </Space>
        )}
      </div>

      {/* Student Overview */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Avatar 
                size={80} 
                icon={<UserOutlined />} 
                style={{ backgroundColor: '#1890ff', marginBottom: '8px' }}
              />
              <Title level={4} style={{ margin: 0 }}>
                {student.user.profile.firstName} {student.user.profile.lastName}
              </Title>
              <Text type="secondary">{student.enrollmentNumber}</Text>
              <br />
              {student.classGroup && (
                <Tag color="blue" style={{ marginTop: '8px' }}>
                  {student.classGroup.name} {student.classGroup.section}
                </Tag>
              )}
            </div>

            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button
                type="primary"
                icon={<MailOutlined />}
                onClick={handleSendMessage}
                style={{ width: '100%' }}
              >
                Enviar Mensaje
              </Button>
              <GenerateAutoReportButton studentId={student.id} basePath="/teacher/auto-report" block />
              <Button
                icon={<FileTextOutlined />}
                onClick={() => safeNavigate('/teacher/tutor-reports')}
                style={{ width: '100%' }}
              >
                Informes de tutor
              </Button>
              <Badge
                status={student.user.isActive ? 'success' : 'error'}
                text={student.user.isActive ? 'Activo' : 'Inactivo'}
              />
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Promedio General"
                  value={getAverageGrade()}
                  suffix="/100"
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: getAverageGrade() >= 70 ? '#52c41a' : getAverageGrade() >= 50 ? '#faad14' : '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Asistencia"
                  value={getAttendanceRate()}
                  suffix="%"
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: getAttendanceRate() >= 90 ? '#52c41a' : getAttendanceRate() >= 75 ? '#faad14' : '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Edad"
                  value={calculateAge(student.birthDate)}
                  suffix="años"
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Detailed Information Tabs */}
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="Información Personal" key="info">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Nombre Completo">
                    {student.user.profile.firstName} {student.user.profile.lastName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Número de Matrícula">
                    {student.enrollmentNumber}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    <Space>
                      <MailOutlined style={{ color: '#1890ff' }} />
                      {student.user.email}
                    </Space>
                  </Descriptions.Item>
                  {student.user.profile.phone && (
                    <Descriptions.Item label="Teléfono">
                      <Space>
                        <PhoneOutlined style={{ color: '#52c41a' }} />
                        {student.user.profile.phone}
                      </Space>
                    </Descriptions.Item>
                  )}
                  {student.user.profile.address && (
                    <Descriptions.Item label="Dirección">
                      {student.user.profile.address}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Fecha de Nacimiento">
                    {new Date(student.birthDate).toLocaleDateString('es-ES')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Estado">
                    <Badge 
                      status={student.user.isActive ? 'success' : 'error'} 
                      text={student.user.isActive ? 'Activo' : 'Inactivo'} 
                    />
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab="Calificaciones" key="grades">
                {grades.length > 0 ? (
                  <List
                    dataSource={grades}
                    renderItem={(grade) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar 
                              style={{ 
                                backgroundColor: grade.value >= 70 ? '#52c41a' : grade.value >= 50 ? '#faad14' : '#f5222d' 
                              }}
                            >
                              {grade.value}
                            </Avatar>
                          }
                          title={grade.subject.name}
                          description={`Código: ${grade.subject.code} • ${new Date(grade.date).toLocaleDateString('es-ES')}`}
                        />
                        <div>
                          <Progress 
                            percent={grade.value} 
                            showInfo={false}
                            strokeColor={grade.value >= 70 ? '#52c41a' : grade.value >= 50 ? '#faad14' : '#f5222d'}
                            style={{ width: '100px' }}
                          />
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <BookOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                    <div style={{ marginTop: '16px' }}>
                      <Text type="secondary">No hay calificaciones registradas</Text>
                    </div>
                  </div>
                )}
              </TabPane>

              <TabPane tab="Asistencia" key="attendance">
                {attendance.length > 0 ? (
                  <div>
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>Resumen de Asistencia</Text>
                      <br />
                      <Progress
                        percent={getAttendanceRate()}
                        status={getAttendanceRate() >= 90 ? 'success' : getAttendanceRate() >= 75 ? 'normal' : 'exception'}
                        format={(percent) => `${percent}% de asistencia`}
                      />
                    </div>
                    <List
                      dataSource={attendance.slice(0, 10)} // Show last 10 records
                      renderItem={(record) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                style={{
                                  backgroundColor:
                                    record.status === 'present' ? '#52c41a' :
                                    record.status === 'justified' ? '#1890ff' :
                                    record.status === 'late' ? '#faad14' : '#f5222d'
                                }}
                              >
                                {record.status === 'present' ? '✓' :
                                 record.status === 'justified' ? 'J' :
                                 record.status === 'late' ? 'T' : '✗'}
                              </Avatar>
                            }
                            title={new Date(record.date).toLocaleDateString('es-ES')}
                            description={
                              record.status === 'present' ? 'Presente' :
                              record.status === 'justified' ? 'Ausencia Justificada' :
                              record.status === 'late' ? 'Tardanza' : 'Ausente'
                            }
                          />
                          <Tag
                            color={
                              record.status === 'present' ? 'green' :
                              record.status === 'justified' ? 'blue' :
                              record.status === 'late' ? 'orange' : 'red'
                            }
                          >
                            {record.status === 'present' ? 'Presente' :
                             record.status === 'justified' ? 'Justificado' :
                             record.status === 'late' ? 'Tardanza' : 'Ausente'}
                          </Tag>
                        </List.Item>
                      )}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <CalendarOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                    <div style={{ marginTop: '16px' }}>
                      <Text type="secondary">No hay registros de asistencia</Text>
                    </div>
                  </div>
                )}
              </TabPane>

              <TabPane tab="Expediente" key="expediente">
                <BetaSectionBanner />
                {studentId && <ExpedienteViewer studentId={studentId} />}
              </TabPane>

              <TabPane tab={<span>Competencias</span>} key="competencias">
                {lomloe.loading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : lomloe.hasData && lomloe.byKey.length > 0 ? (
                  <LomloeCompetencyRadar data={lomloe.byKey} height={420} />
                ) : (
                  <Empty description="Sin datos de competencias LOMLOE todavía" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </TabPane>

              <TabPane tab="Currículo por asignatura" key="curriculo">
                {studentId && selectedYearId
                  ? <StudentSubjectCurriculumPanel studentId={studentId} academicYearId={selectedYearId} />
                  : <Empty description="Selecciona un año académico" />}
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherStudentDetailPage;