import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Empty,
  Alert,
  Progress,
  Tag,
  Timeline,
  Statistic,
  Button,
  Space,
  Tooltip,
  Descriptions,
  Badge,
  List,
} from 'antd';
import {
  TrophyOutlined,
  BookOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  CalendarOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import useGrades, { StudentGrades, SubjectGrade, GradeDetail } from '../../hooks/useGrades';
import { useResponsive } from '../../hooks/useResponsive';
import { formatNumber, formatPercentage } from '@utils/numberFormat';
import AcademicYearSelector from '@components/common/AcademicYearSelector';
import BetaSectionBanner from '@/components/common/BetaSectionBanner';
import { lomloeConversion } from '@/utils/lomloe';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const { Title, Text } = Typography;

const StudentGradesPage: React.FC = () => {
  const [studentGrades, setStudentGrades] = useState<StudentGrades | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined);
  const { getMyGrades, exportStudentGrades, loading } = useGrades();
  const { isMobile } = useResponsive();

  const fetchGrades = useCallback(async () => {
    try {
      const grades = await getMyGrades(selectedYearId);

      if (grades) {
        setStudentGrades(grades);

        // Select first subject with grades by default
        const subjectGrades = Array.isArray(grades.subjectGrades) ? grades.subjectGrades : [];

        const firstSubjectWithGrades = subjectGrades.find(sg => {
          return typeof sg.averageGrade === 'number' && sg.averageGrade !== null && sg.averageGrade >= 0;
        });

        if (firstSubjectWithGrades) {
          setSelectedSubject(firstSubjectWithGrades.subjectId);
        }
      }
    } catch (error) {
      // getMyGrades already handles error display via message.error
    }
    // getMyGrades is a stable hook function (re-created each render but referentially
    // safe to omit here — including it would not cause loops but adds noise).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId]);

  // Fase 1: primer fetch sin año (resuelve año actual en backend)
  useEffect(() => {
    fetchGrades();
    // Run once on mount; fetchGrades is stable on first render (selectedYearId=undefined).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fase 2: refetch cuando el usuario cambia de año en el selector
  useEffect(() => {
    if (selectedYearId) {
      fetchGrades();
    }
  }, [fetchGrades, selectedYearId]);

  const getGradeColor = (grade: number): string => {
    if (grade >= 90) return '#52c41a';
    if (grade >= 70) return '#1890ff';
    if (grade >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const getGradeLabel = (grade: number): string =>
    lomloeConversion(grade, studentGrades?.student?.educationalLevel?.name);

  const getProgressStatus = (grade: number): 'success' | 'normal' | 'exception' | 'active' => {
    if (grade >= 90) return 'success';
    if (grade >= 50) return 'normal';
    return 'exception';
  };

  const renderSubjectCard = (subject: SubjectGrade) => {
    const isSelected = selectedSubject === subject.subjectId;
    const hasGrades = typeof subject.averageGrade === 'number' && subject.averageGrade !== null && subject.averageGrade >= 0;

    return (
      <Card
        key={subject.subjectId}
        hoverable={hasGrades}
        className={`subject-card ${isSelected ? 'selected' : ''} ${!hasGrades ? 'no-grades' : ''}`}
        onClick={() => hasGrades && setSelectedSubject(subject.subjectId)}
        style={{
          borderColor: isSelected ? '#1890ff' : undefined,
          opacity: hasGrades ? 1 : 0.6,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {hasGrades ? (
            <Progress
              type="circle"
              percent={Math.round(subject.averageGrade)}
              size={80}
              strokeColor={getGradeColor(subject.averageGrade)}
              format={(p) => `${p}%`}
            />
          ) : (
            <Progress
              type="circle"
              percent={0}
              size={80}
              strokeColor="#d9d9d9"
              format={() => '-'}
            />
          )}
          <Title level={5} style={{ marginTop: 12, marginBottom: 4 }}>
            {subject.subjectName}
          </Title>
          <Text type="secondary">{subject.subjectCode}</Text>

          {hasGrades && (
            <>
              <div style={{ marginTop: 12 }}>
                <Tag color={getGradeColor(subject.averageGrade)} style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {getGradeLabel(subject.averageGrade)}
                </Tag>
              </div>
              <Row gutter={8} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <Statistic
                    title="Completadas"
                    value={(subject.gradedTasks || 0) + (subject.examGradedCount || 0)}
                    valueStyle={{ fontSize: '16px', color: '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Pendientes"
                    value={(subject.pendingTasks || 0) + (subject.examPendingCount || 0)}
                    valueStyle={{ fontSize: '16px', color: '#faad14' }}
                  />
                </Col>
              </Row>
            </>
          )}
          
          {!hasGrades && (
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Sin calificaciones</Text>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderGradeDetail = (grade: GradeDetail) => {
    const isGraded = grade.grade !== null && grade.grade !== undefined;
    const percentage = isGraded ? Math.round((grade.grade / grade.maxGrade) * 100 * 10) / 10 : 0;

    return (
      <Timeline.Item
        key={grade.id}
        color={isGraded ? getGradeColor((grade.grade / grade.maxGrade) * 100) : '#faad14'}
        dot={
          grade.type === 'task' ? <FileTextOutlined /> :
          grade.type === 'activity' ? <BookOutlined /> :
          <TrophyOutlined />
        }
      >
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={16}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>{grade.title}</Text>
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {grade.type === 'task' ? 'Tarea' :
                     grade.type === 'activity' ? 'Actividad' :
                     grade.type === 'evaluation' ? 'Evaluación' : 'Test Yourself'}
                  </Tag>
                  {!isGraded && (
                    <Tag color="warning" style={{ marginLeft: 4 }}>
                      Pendiente
                    </Tag>
                  )}
                </div>
                <Text type="secondary">
                  <CalendarOutlined /> {dayjs(grade.gradedAt).format('DD MMM YYYY')}
                </Text>
                {grade.feedback && (
                  <Alert
                    message="Comentario del profesor"
                    description={grade.feedback}
                    type="info"
                    showIcon
                    icon={<FileTextOutlined />}
                  />
                )}
              </Space>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Puntuación a la izquierda */}
                <div style={{ textAlign: 'center', minWidth: '60px' }}>
                  {isGraded ? (
                    <>
                      <Text style={{ fontSize: '18px', fontWeight: 'bold', color: getGradeColor((grade.grade / grade.maxGrade) * 100), display: 'block' }}>
                        {Math.round((grade.grade / grade.maxGrade) * 100)}%
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                        Nota
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#faad14', display: 'block' }}>
                        --
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                        Sin calificar
                      </Text>
                    </>
                  )}
                </div>

                {/* Barra de progreso a la derecha */}
                <div style={{ flex: 1 }}>
                  {isGraded ? (
                    <Progress
                      percent={Math.round((grade.grade / grade.maxGrade) * 100)}
                      status={getProgressStatus((grade.grade / grade.maxGrade) * 100)}
                      strokeColor={getGradeColor((grade.grade / grade.maxGrade) * 100)}
                      size="small"
                      format={() => `${Math.round((grade.grade / grade.maxGrade) * 100)}%`}
                    />
                  ) : (
                    <Progress
                      percent={0}
                      status="active"
                      strokeColor="#faad14"
                      size="small"
                      format={() => 'Pendiente'}
                    />
                  )}
                  {grade.weight && isGraded && (
                    <Text type="secondary" style={{ fontSize: '11px', display: 'block', textAlign: 'center', marginTop: '4px' }}>
                      Peso: {grade.weight}%
                    </Text>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </Timeline.Item>
    );
  };

  if (loading && !studentGrades) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Cargando calificaciones..." />
      </div>
    );
  }

  if (!studentGrades) {
    return (
      <Alert
        message="Error al cargar calificaciones"
        description="No se pudieron cargar las calificaciones. Por favor, intenta nuevamente."
        type="error"
        showIcon
      />
    );
  }

  const subjectGrades = Array.isArray(studentGrades.subjectGrades) ? studentGrades.subjectGrades : []
  const recentGrades = Array.isArray(studentGrades.recentGrades) ? studentGrades.recentGrades : []
  const selectedSubjectData = subjectGrades.find(s => s.subjectId === selectedSubject);
  const subjectRecentGrades = selectedSubject
    ? recentGrades.filter(g => g.subject.id === selectedSubject)
    : recentGrades;

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <BetaSectionBanner />
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <TrophyOutlined style={{ marginRight: 8 }} />
            Mis Calificaciones
          </Title>
          <Text type="secondary">
            {studentGrades.academicPeriod.current} - {studentGrades.academicPeriod.year}
          </Text>
        </Col>
        {studentGrades && (
          <Col>
            <AcademicYearSelector
              studentId={studentGrades.student.id}
              value={selectedYearId}
              onChange={setSelectedYearId}
            />
          </Col>
        )}
        <Col>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => exportStudentGrades(studentGrades.student.id)}
          >
            Exportar PDF
          </Button>
        </Col>
      </Row>

      {/* Student Info */}
      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={isMobile ? 1 : 3}>
          <Descriptions.Item label="Estudiante">
            {studentGrades.student.firstName} {studentGrades.student.lastName}
          </Descriptions.Item>
          <Descriptions.Item label="Matrícula">
            {studentGrades.student.enrollmentNumber}
          </Descriptions.Item>
          <Descriptions.Item label="Clase">
            {studentGrades.student.classGroup?.name || 'Sin asignar'}
          </Descriptions.Item>
          <Descriptions.Item label="Nivel">
            {studentGrades.student.educationalLevel?.name || 'Sin asignar'}
          </Descriptions.Item>
          <Descriptions.Item label="Última actividad">
            {studentGrades.summary.lastActivityDate
              ? dayjs(studentGrades.summary.lastActivityDate).format('DD/MM/YYYY')
              : 'Sin actividad'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: `4px solid ${typeof studentGrades.summary.overallAverage === 'number' ? getGradeColor(studentGrades.summary.overallAverage) : '#1890ff'}` }}>
            <Statistic
              title="Promedio General"
              value={typeof studentGrades.summary.overallAverage === 'number' ? studentGrades.summary.overallAverage.toFixed(2) : 'N/A'}
              prefix={<TrophyOutlined />}
              valueStyle={{
                color: typeof studentGrades.summary.overallAverage === 'number'
                  ? getGradeColor(studentGrades.summary.overallAverage)
                  : '#1890ff'
              }}
              suffix={typeof studentGrades.summary.overallAverage === 'number' ? '%' : ''}
            />
            {typeof studentGrades.summary.overallAverage === 'number' && (
              <Progress
                percent={studentGrades.summary.overallAverage}
                status={getProgressStatus(studentGrades.summary.overallAverage)}
                showInfo={false}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: '4px solid #1890ff' }}>
            <Statistic
              title="Asignaturas"
              value={studentGrades.summary.totalSubjects}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: '4px solid #52c41a' }}>
            <Statistic
              title="Evaluaciones Completadas"
              value={studentGrades.summary.totalGradedItems}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: '4px solid #faad14' }}>
            <Statistic
              title="Tareas Pendientes"
              value={studentGrades.summary.totalPendingTasks}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Subjects Grid */}
      <Card
        title="Calificaciones por Asignatura"
        style={{ marginBottom: 24 }}
        extra={
          <Text type="secondary">
            Haz clic en una asignatura para ver el detalle
          </Text>
        }
      >
        <Row gutter={[16, 16]}>
          {subjectGrades.map(subject => (
            <Col xs={24} sm={12} md={8} lg={6} key={subject.subjectId}>
              {renderSubjectCard(subject)}
            </Col>
          ))}
        </Row>
      </Card>

      {/* Selected Subject Details */}
      {selectedSubjectData && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card
              title="Datos Globales de Asignatura"
              style={{
                background: '#fafafa',
                border: '1px solid #e8e8e8',
                borderRadius: '8px'
              }}
              headStyle={{
                background: '#f5f5f5',
                borderBottom: '1px solid #e8e8e8'
              }}
            >
              <Title level={4} style={{ color: '#262626', marginTop: 0 }}>{selectedSubjectData.subjectName}</Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>{selectedSubjectData.subjectCode}</Text>

              <div style={{ marginTop: 24 }}>
                {/* Promedio General - MÁS PROMINENTE */}
                <Card
                  size="small"
                  style={{
                    marginBottom: 20,
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #e8e8e8'
                  }}
                >
                  <Row align="middle">
                    <Col span={12}>
                      <Text strong style={{ fontSize: '14px', color: '#595959' }}>Promedio General</Text>
                    </Col>
                    <Col span={12} style={{ textAlign: 'right' }}>
                      {typeof selectedSubjectData.averageGrade === 'number' ? (
                        <Text strong style={{ fontSize: '28px', color: getGradeColor(selectedSubjectData.averageGrade) }}>
                          {selectedSubjectData.averageGrade.toFixed(1)}%
                        </Text>
                      ) : (
                        <Text type="secondary">Sin calificar</Text>
                      )}
                    </Col>
                  </Row>
                  {typeof selectedSubjectData.averageGrade === 'number' && (
                    <Progress
                      percent={selectedSubjectData.averageGrade}
                      status={getProgressStatus(selectedSubjectData.averageGrade)}
                      strokeColor={getGradeColor(selectedSubjectData.averageGrade)}
                      showInfo={false}
                      strokeWidth={8}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Card>

                {/* Promedios Detallados */}
                {typeof selectedSubjectData.taskAverage === 'number' && (
                  <div style={{ marginBottom: 12, background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                    <Row align="middle">
                      <Col span={16}>
                        <Text style={{ color: '#595959', fontSize: '13px' }}>
                          <FileTextOutlined style={{ marginRight: 8 }} /> Promedio de Tareas
                        </Text>
                      </Col>
                      <Col span={8} style={{ textAlign: 'right' }}>
                        <Text strong style={{ color: '#262626', fontSize: '18px' }}>
                          {selectedSubjectData.taskAverage.toFixed(1)}%
                        </Text>
                      </Col>
                    </Row>
                  </div>
                )}

                {typeof selectedSubjectData.activityAverage === 'number' && (
                  <div style={{ marginBottom: 12, background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                    <Row align="middle">
                      <Col span={16}>
                        <Text style={{ color: '#595959', fontSize: '13px' }}>
                          <BookOutlined style={{ marginRight: 8 }} /> Promedio de Actividades
                        </Text>
                      </Col>
                      <Col span={8} style={{ textAlign: 'right' }}>
                        <Text strong style={{ color: '#262626', fontSize: '18px' }}>
                          {selectedSubjectData.activityAverage.toFixed(1)}%
                        </Text>
                      </Col>
                    </Row>
                  </div>
                )}

                {typeof selectedSubjectData.examAverage === 'number' && (
                  <div style={{ marginBottom: 12, background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                    <Row align="middle">
                      <Col span={16}>
                        <Text style={{ color: '#595959', fontSize: '13px' }}>
                          <TrophyOutlined style={{ marginRight: 8 }} /> Promedio Test Yourself
                        </Text>
                      </Col>
                      <Col span={8} style={{ textAlign: 'right' }}>
                        <Text strong style={{ color: '#262626', fontSize: '18px' }}>
                          {selectedSubjectData.examAverage.toFixed(1)}%
                        </Text>
                      </Col>
                    </Row>
                  </div>
                )}

                {typeof selectedSubjectData.competencyAverage === 'number' && (
                  <div style={{ marginBottom: 12, background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                    <Row align="middle">
                      <Col span={16}>
                        <Text style={{ color: '#595959', fontSize: '13px' }}>
                          <BarChartOutlined style={{ marginRight: 8 }} /> Promedio de Competencias
                        </Text>
                      </Col>
                      <Col span={8} style={{ textAlign: 'right' }}>
                        <Text strong style={{ color: '#262626', fontSize: '18px' }}>
                          {selectedSubjectData.competencyAverage.toFixed(1)}%
                        </Text>
                      </Col>
                    </Row>
                  </div>
                )}

                {/* Estadísticas adicionales */}
                <Row gutter={12} style={{ marginTop: 20 }}>
                  <Col span={12}>
                    <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f', textAlign: 'center' }}>
                      <Statistic
                        title={<Text style={{ color: '#52c41a', fontSize: '12px' }}>Completadas</Text>}
                        value={(selectedSubjectData.gradedTasks || 0) + (selectedSubjectData.examGradedCount || 0)}
                        valueStyle={{ fontSize: '24px', color: '#52c41a' }}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ background: '#fffbe6', border: '1px solid #ffe58f', textAlign: 'center' }}>
                      <Statistic
                        title={<Text style={{ color: '#faad14', fontSize: '12px' }}>Pendientes</Text>}
                        value={(selectedSubjectData.pendingTasks || 0) + (selectedSubjectData.examPendingCount || 0)}
                        valueStyle={{ fontSize: '24px', color: '#faad14' }}
                        prefix={<ClockCircleOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card
              title="Historial de Calificaciones"
              extra={
                <Badge
                  count={subjectRecentGrades.length}
                  style={{ backgroundColor: '#1890ff' }}
                />
              }
            >
              {subjectRecentGrades.length > 0 ? (
                <Timeline mode={isMobile ? 'left' : 'alternate'}>
                  {subjectRecentGrades.map(grade => renderGradeDetail(grade))}
                </Timeline>
              ) : (
                <Empty
                  description="No hay calificaciones registradas para esta asignatura"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Recent Grades (when no subject selected) */}
      {!selectedSubject && recentGrades.length > 0 && (
        <Card title="Calificaciones Recientes">
          <Timeline mode={isMobile ? 'left' : 'alternate'}>
            {recentGrades.slice(0, 5).map(grade => renderGradeDetail(grade))}
          </Timeline>
        </Card>
      )}

      <style jsx>{`
        .subject-card {
          transition: all 0.3s;
          cursor: pointer;
        }
        .subject-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .subject-card.selected {
          border-width: 2px;
          background-color: #f0f5ff;
        }
        .subject-card.no-grades {
          cursor: not-allowed;
        }
        .subject-card.no-grades:hover {
          transform: none;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
};

export default StudentGradesPage;