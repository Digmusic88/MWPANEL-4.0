import React, { useState, useEffect } from 'react';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
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
  Select,
  Statistic,
  Button,
  Space,
  Tabs,
  Timeline,
  Badge,
  Descriptions,
  Avatar,
  Tooltip,
  List,
} from 'antd';
import {
  TrophyOutlined,
  BookOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  UserOutlined,
  BarChartOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import useGrades, { StudentGrades, SubjectGrade, GradeDetail } from '../../hooks/useGrades';
import { useResponsive } from '../../hooks/useResponsive';
import AcademicYearSelector from '@components/common/AcademicYearSelector';
import BetaSectionBanner from '@/components/common/BetaSectionBanner';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { Line, Radar } from '@ant-design/plots';
import { formatNumber } from '@utils/numberFormat';
import { lomloeConversion } from '@/utils/lomloe';

dayjs.locale('es');

const { Title, Text } = Typography;
const { Option } = Select;

// Componente para Avatar de estudiante con foto real
const StudentAvatar: React.FC<{ 
  avatarUrl?: string | null, 
  size?: number 
}> = ({ avatarUrl, size = 64 }) => {
  const { photoUrl, hasPhoto } = useProfilePhoto(avatarUrl)
  
  return (
    <Avatar 
      size={size} 
      src={photoUrl}
      icon={!hasPhoto ? <UserOutlined /> : undefined}
      style={{ 
        backgroundColor: hasPhoto ? undefined : '#f0f0f0', 
        color: hasPhoto ? undefined : '#1890ff',
      }} 
    />
  )
}

const FamilyGradesPage: React.FC = () => {
  const [childrenGrades, setChildrenGrades] = useState<StudentGrades[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('overview');
  const { getFamilyChildrenGrades, getFamilyChildGrades, exportStudentGrades, loading } = useGrades();
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    fetchChildrenGrades();
  }, []);

  // Refetch del hijo seleccionado al cambiar de año
  useEffect(() => {
    const refetchChildForYear = async () => {
      if (!selectedChildId || !selectedYearId) return;
      const updated = await getFamilyChildGrades(selectedChildId, selectedYearId);
      if (updated) {
        setChildrenGrades((prev) =>
          prev.map((g) => (g.student.id === selectedChildId ? updated : g)),
        );
      }
    };
    refetchChildForYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId, selectedYearId]);

  const fetchChildrenGrades = async () => {
    const grades = await getFamilyChildrenGrades();
    if (grades && grades.length > 0) {
      setChildrenGrades(grades);
      setSelectedChildId(grades[0].student.id);
    }
  };

  const getGradeColor = (grade: number): string => {
    if (grade >= 90) return '#52c41a';
    if (grade >= 70) return '#1890ff';
    if (grade >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const getGradeLabel = (grade: number, etapa?: string): string =>
    lomloeConversion(grade, etapa);

  const getProgressStatus = (grade: number): 'success' | 'normal' | 'exception' | 'active' => {
    if (grade >= 90) return 'success';
    if (grade >= 50) return 'normal';
    return 'exception';
  };

  const getGradeTrend = (grades: GradeDetail[]): 'up' | 'down' | 'stable' => {
    if (grades.length < 2) return 'stable';
    
    const recentGrades = grades.slice(0, 5);
    const avgRecent = recentGrades.reduce((sum, g) => sum + Math.round(((g.grade / g.maxGrade) * 100) * 10) / 10, 0) / recentGrades.length;
    const avgOlder = grades.slice(5, 10).reduce((sum, g) => sum + Math.round(((g.grade / g.maxGrade) * 100) * 10) / 10, 0) / Math.min(grades.length - 5, 5);
    
    if (avgRecent > avgOlder + 0.5) return 'up';
    if (avgRecent < avgOlder - 0.5) return 'down';
    return 'stable';
  };

  const selectedChild = childrenGrades.find(c => c.student.id === selectedChildId);
  const selectedSubject = selectedChild?.subjectGrades.find(s => s.subjectId === selectedSubjectId);

  // Prepare data for performance bar chart - Clean and safe
  const prepareBarData = (grades: SubjectGrade[]) => {
    if (!grades || grades.length === 0) return [];

    return grades
      .filter(subject => {
        if (!subject || !subject.subjectName) return false;
        const avg = subject.averageGrade;
        return avg !== null && avg !== undefined && typeof avg === 'number' && !isNaN(avg);
      })
      .map(subject => {
        const grade = Math.round((subject.averageGrade as number) * 10) / 10;
        return {
          asignatura: subject.subjectName,
          nota: grade,
        };
      })
      .sort((a, b) => b.nota - a.nota);
  };

  // Prepare data for line chart - Clean and safe
  const prepareLineData = (grades: GradeDetail[]) => {
    if (!grades || grades.length === 0) return [];

    return grades
      .filter(grade => {
        if (!grade || !grade.gradedAt) return false;
        if (!grade.subject || !grade.subject.name) return false;
        const gradeVal = grade.grade;
        const maxVal = grade.maxGrade;
        return gradeVal !== null && gradeVal !== undefined &&
               typeof gradeVal === 'number' && !isNaN(gradeVal) &&
               maxVal !== null && maxVal !== undefined &&
               typeof maxVal === 'number' && !isNaN(maxVal) && maxVal > 0;
      })
      .slice(0, 10)
      .reverse()
      .map(grade => {
        const percentage = Math.round(((grade.grade as number) / (grade.maxGrade as number)) * 1000) / 10;
        const tipoEval = grade.type === 'exam' ? 'Test Yourself' :
                         grade.type === 'task' ? 'Tarea' :
                         grade.type === 'activity' ? 'Actividad' : 'Evaluación';
        return {
          fecha: dayjs(grade.gradedAt).format('DD/MM'),
          fechaCompleta: dayjs(grade.gradedAt).format('DD/MM/YYYY'),
          porcentaje: percentage,
          asignatura: grade.subject.name,
          titulo: grade.title || tipoEval,
          notaOriginal: grade.grade as number,
          notaMaxima: grade.maxGrade as number,
          tipo: tipoEval,
        };
      });
  };

  const renderChildCard = (child: StudentGrades) => {
    const isSelected = child.student.id === selectedChildId;
    const trend = getGradeTrend(child.recentGrades);

    return (
      <Card
        key={child.student.id}
        hoverable
        onClick={() => {
          setSelectedChildId(child.student.id);
          setSelectedSubjectId(null);
          setSelectedYearId(undefined);
          setActiveTab('overview');
        }}
        style={{
          borderColor: isSelected ? '#1890ff' : undefined,
          borderWidth: isSelected ? 2 : 1,
        }}
        bodyStyle={{ padding: isMobile ? '12px' : '24px' }}
      >
        <Row gutter={isMobile ? 8 : 16} align="middle">
          <Col span={isMobile ? 5 : 6}>
            <StudentAvatar
              avatarUrl={child.student.user?.profile?.avatar}
              size={isMobile ? 48 : 64}
            />
          </Col>
          <Col span={isMobile ? 19 : 18}>
            <Space direction="vertical" style={{ width: '100%' }} size={isMobile ? 'small' : 'middle'}>
              <div>
                <Text strong style={{ fontSize: isMobile ? '14px' : '16px' }}>
                  {child.student.firstName} {child.student.lastName}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                  {child.student.classGroup?.name}
                </Text>
              </div>
              <Row gutter={8}>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Promedio</span>}
                    value={typeof child.summary.overallAverage === 'number'
                      ? Math.round(child.summary.overallAverage * 10) / 10
                      : 'Sin datos'}
                    suffix={
                      <>
                        {typeof child.summary.overallAverage === 'number' ? '%' : null}
                        {trend === 'up' ? <RiseOutlined style={{ color: '#52c41a', marginLeft: 4 }} /> :
                         trend === 'down' ? <FallOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} /> :
                         null}
                      </>
                    }
                    valueStyle={{
                      fontSize: isMobile ? '14px' : '20px',
                      color: typeof child.summary.overallAverage === 'number'
                        ? getGradeColor(child.summary.overallAverage)
                        : '#8c8c8c',
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Pendientes</span>}
                    value={child.summary.totalPendingTasks}
                    valueStyle={{ fontSize: isMobile ? '14px' : '20px', color: '#faad14' }}
                  />
                </Col>
              </Row>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderSubjectCard = (subject: SubjectGrade) => {
    const isSelected = subject.subjectId === selectedSubjectId;

    return (
      <Card
        key={subject.subjectId}
        hoverable
        onClick={() => setSelectedSubjectId(subject.subjectId)}
        style={{
          borderColor: isSelected ? '#1890ff' : undefined,
          marginBottom: isMobile ? 6 : 8,
        }}
        bodyStyle={{ padding: isMobile ? '10px' : '16px' }}
      >
        <Row gutter={isMobile ? 8 : 16} align="middle">
          <Col span={isMobile ? 14 : 16}>
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: isMobile ? '13px' : '14px' }}>{subject.subjectName}</Text>
              <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '12px' }}>{subject.subjectCode}</Text>
            </Space>
          </Col>
          <Col span={isMobile ? 10 : 8} style={{ textAlign: 'right' }}>
            <div>
              {subject.averageGrade !== null ? (
                <>
                  <Text style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 'bold', color: getGradeColor(subject.averageGrade) }}>
                    {subject.averageGrade.toFixed(1)}
                  </Text>
                  <br />
                  <Tag color={getGradeColor(subject.averageGrade)} style={{ marginTop: 2, fontSize: isMobile ? '10px' : '12px' }}>
                    {getGradeLabel(subject.averageGrade, selectedChild?.student?.educationalLevel?.name)}
                  </Tag>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 'bold', color: '#d9d9d9' }}>
                    --
                  </Text>
                  <br />
                  <Tag color="default" style={{ marginTop: 2, fontSize: isMobile ? '10px' : '12px' }}>
                    {isMobile ? 'S/N' : 'Sin calificar'}
                  </Tag>
                </>
              )}
            </div>
          </Col>
        </Row>
        <Progress
          percent={subject.averageGrade !== null ? Math.round(subject.averageGrade) : 0}
          status={subject.averageGrade !== null ? "active" : "exception"}
          showInfo={false}
          size={isMobile ? 'small' : 'default'}
          style={{ marginTop: isMobile ? 8 : 12 }}
        />
      </Card>
    );
  };

  const renderGradeTimeline = (grades: GradeDetail[]) => {
    return (
      <Timeline mode={isMobile ? 'left' : 'alternate'}>
        {grades.map(grade => {
          const percentage = Math.round(((grade.grade / grade.maxGrade) * 100) * 10) / 10;
          return (
            <Timeline.Item
              key={grade.id}
              color={getGradeColor(percentage)}
              dot={
                grade.type === 'task' ? <FileTextOutlined /> :
                grade.type === 'activity' ? <BookOutlined /> :
                <TrophyOutlined />
              }
            >
              <Card size="small" bodyStyle={{ padding: isMobile ? '10px' : '16px' }}>
                <Row gutter={[isMobile ? 8 : 16, isMobile ? 6 : 8]}>
                  <Col xs={16} sm={16}>
                    <Space direction="vertical" size={isMobile ? 2 : 4}>
                      <Text strong style={{ fontSize: isMobile ? '13px' : '14px' }}>{grade.title}</Text>
                      <Space size={4} wrap>
                        <Tag color="blue" style={{ fontSize: isMobile ? '10px' : '12px', margin: 0 }}>{grade.subject.code}</Tag>
                        <Tag style={{ fontSize: isMobile ? '10px' : '12px', margin: 0 }}>
                          {grade.type === 'task' ? (isMobile ? 'Tarea' : 'Tarea') :
                           grade.type === 'activity' ? (isMobile ? 'Act.' : 'Actividad') :
                           grade.type === 'evaluation' ? (isMobile ? 'Eval.' : 'Evaluación') : 'Test'}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '12px' }}>
                        <CalendarOutlined /> {dayjs(grade.gradedAt).format(isMobile ? 'DD/MM' : 'DD MMM YYYY')}
                      </Text>
                      {grade.feedback && !isMobile && (
                        <Alert
                          message={grade.feedback}
                          type="info"
                          showIcon={false}
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        />
                      )}
                    </Space>
                  </Col>
                  <Col xs={8} sm={8} style={{ textAlign: 'center' }}>
                    <div>
                      <Text style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold', color: getGradeColor(percentage) }}>
                        {Math.round(percentage)}%
                      </Text>
                      {!isMobile && <Text type="secondary" style={{ display: 'block', fontSize: '11px' }}>Nota</Text>}
                    </div>
                    <Progress
                      percent={percentage}
                      status={percentage >= 50 ? 'success' : 'exception'}
                      size="small"
                      showInfo={false}
                    />
                  </Col>
                </Row>
                {grade.feedback && isMobile && (
                  <Alert
                    message={grade.feedback}
                    type="info"
                    showIcon={false}
                    style={{ fontSize: '11px', padding: '4px 8px', marginTop: 8 }}
                  />
                )}
              </Card>
            </Timeline.Item>
          );
        })}
      </Timeline>
    );
  };

  if (loading && childrenGrades.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large">
          <div className="text-center p-4">Cargando calificaciones...</div>
        </Spin>
      </div>
    );
  }

  if (childrenGrades.length === 0) {
    return (
      <Empty
        description="No hay calificaciones disponibles"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <BetaSectionBanner />
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <Title level={isMobile ? 3 : 2} style={{ marginBottom: 4 }}>
          <TrophyOutlined style={{ marginRight: 8 }} />
          Calificaciones
        </Title>
        <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
          Seguimiento académico de tus hijos
        </Text>
      </div>

      {/* Academic Year Selector */}
      {selectedChildId && (
        <div style={{ marginBottom: 16 }}>
          <AcademicYearSelector
            key={selectedChildId}
            studentId={selectedChildId}
            value={selectedYearId}
            onChange={setSelectedYearId}
          />
        </div>
      )}

      {/* Children Selector */}
      {childrenGrades.length > 1 && (
        <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginBottom: isMobile ? 16 : 24 }}>
          {childrenGrades.map(child => (
            <Col xs={24} sm={12} md={8} key={child.student.id}>
              {renderChildCard(child)}
            </Col>
          ))}
        </Row>
      )}

      {/* Selected Child Content */}
      {selectedChild && (
        <>
          {/* Child Header */}
          <Card style={{ marginBottom: isMobile ? 16 : 24 }} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
            <Row gutter={[isMobile ? 8 : 16, isMobile ? 12 : 16]} align="middle">
              <Col xs={24} sm={16}>
                <Space size={isMobile ? 'middle' : 'large'} align="center">
                  <StudentAvatar
                    avatarUrl={selectedChild.student.user?.profile?.avatar}
                    size={isMobile ? 48 : 64}
                  />
                  <div>
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                      {selectedChild.student.firstName} {selectedChild.student.lastName}
                    </Title>
                    {isMobile ? (
                      <div style={{ fontSize: '12px' }}>
                        <Text>{selectedChild.student.classGroup?.name}</Text>
                        <br />
                        <Text type="secondary">{selectedChild.student.enrollmentNumber}</Text>
                      </div>
                    ) : (
                      <Space wrap size="small">
                        <Text>{selectedChild.student.classGroup?.name}</Text>
                        <Text type="secondary">•</Text>
                        <Text>{selectedChild.student.educationalLevel?.name}</Text>
                        <Text type="secondary">•</Text>
                        <Text>{selectedChild.student.enrollmentNumber}</Text>
                      </Space>
                    )}
                  </div>
                </Space>
              </Col>
              <Col xs={24} sm={8} style={{ textAlign: isMobile ? 'center' : 'right' }}>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => exportStudentGrades(selectedChild.student.id)}
                  size={isMobile ? 'middle' : 'large'}
                  block={isMobile}
                >
                  {isMobile ? 'Exportar' : 'Exportar Boletín'}
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Summary Statistics */}
          <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginBottom: isMobile ? 16 : 24 }}>
            <Col xs={12} sm={6}>
              <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Promedio General</span>}
                  value={typeof selectedChild.summary.overallAverage === 'number'
                    ? Math.round(selectedChild.summary.overallAverage * 10) / 10
                    : 'Sin datos'}
                  suffix={typeof selectedChild.summary.overallAverage === 'number' ? '%' : ''}
                  valueStyle={{
                    color: typeof selectedChild.summary.overallAverage === 'number'
                      ? getGradeColor(selectedChild.summary.overallAverage)
                      : '#8c8c8c',
                    fontSize: isMobile ? '16px' : '24px',
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Asignaturas</span>}
                  value={selectedChild.summary.totalSubjects}
                  prefix={<BookOutlined />}
                  valueStyle={{ fontSize: isMobile ? '16px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Evaluaciones</span>}
                  value={selectedChild.summary.totalGradedItems}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a', fontSize: isMobile ? '16px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Pendientes</span>}
                  value={selectedChild.summary.totalPendingTasks}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: '#faad14', fontSize: isMobile ? '16px' : '24px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Content Tabs */}
          <Card bodyStyle={{ padding: isMobile ? '8px' : '24px' }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size={isMobile ? 'small' : 'middle'}
              tabBarStyle={{ marginBottom: isMobile ? 12 : 24 }}
              items={[
                {
                  key: 'overview',
                  label: isMobile ? 'General' : 'Vista General',
                  children: (
                <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
                  <Col xs={24} lg={12}>
                    <Card
                      title={<span style={{ fontSize: isMobile ? '14px' : '16px' }}>Calificaciones por Asignatura</span>}
                      size="small"
                      bodyStyle={{ padding: isMobile ? '8px' : '16px' }}
                    >
                      <List
                        dataSource={selectedChild.subjectGrades}
                        renderItem={subject => renderSubjectCard(subject)}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card
                      title={<span style={{ fontSize: isMobile ? '14px' : '16px' }}>Rendimiento por Asignatura</span>}
                      size="small"
                      bodyStyle={{ padding: isMobile ? '8px' : '16px' }}
                    >
                      {(() => {
                        const barData = prepareBarData(selectedChild.subjectGrades || []);

                        if (barData.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                              <Empty
                                description="No hay calificaciones disponibles"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                              />
                            </div>
                          );
                        }

                        return (
                          <Radar
                            data={barData}
                            xField="asignatura"
                            yField="nota"
                            meta={{
                              nota: {
                                min: 0,
                                max: 100,
                                nice: true,
                              },
                            }}
                            xAxis={{
                              line: null,
                              tickLine: null,
                              label: {
                                formatter: (text: string) => {
                                  if (!text) return '';
                                  const maxLen = isMobile ? 8 : 15;
                                  return text.length > maxLen ? text.substring(0, maxLen - 2) + '...' : text;
                                },
                                style: {
                                  fill: '#333',
                                  fontSize: isMobile ? 9 : 11,
                                  fontWeight: 500,
                                },
                              },
                              grid: {
                                line: {
                                  style: {
                                    stroke: '#e8e8e8',
                                    lineDash: [3, 3],
                                  },
                                },
                              },
                            }}
                            yAxis={{
                              min: 0,
                              max: 100,
                              tickCount: 5,
                              label: {
                                formatter: (v: string) => `${v}%`,
                                style: { fill: '#999', fontSize: 9 },
                              },
                              grid: {
                                line: {
                                  style: {
                                    stroke: '#e8e8e8',
                                    lineDash: [3, 3],
                                  },
                                },
                              },
                            }}
                            area={{
                              style: {
                                fill: 'l(270) 0:#1890ff33 1:#1890ff99',
                              },
                            }}
                            point={{
                              size: 4,
                              style: {
                                fill: '#1890ff',
                                stroke: '#fff',
                                lineWidth: 2,
                              },
                            }}
                            lineStyle={{
                              stroke: '#1890ff',
                              lineWidth: 2,
                            }}
                            tooltip={{
                              title: 'asignatura',
                              items: [
                                (d: any) => ({
                                  name: 'Promedio',
                                  value: `${d.nota}%`,
                                  color: d.nota >= 70 ? '#52c41a' : d.nota >= 50 ? '#faad14' : '#ff4d4f',
                                }),
                              ],
                            }}
                            interaction={{
                              tooltip: {
                                render: (event: any, { title, items }: any) => {
                                  const nota = parseFloat(items?.[0]?.value) || 0;
                                  const gradeColor = nota >= 70 ? '#52c41a' : nota >= 50 ? '#faad14' : '#ff4d4f';
                                  const status = lomloeConversion(nota, selectedChild?.student?.educationalLevel?.name);
                                  return `
                                    <div style="padding: 12px; min-width: 180px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                                      <div style="font-weight: 600; margin-bottom: 8px; color: #1890ff; font-size: 13px; border-bottom: 1px solid #f0f0f0; padding-bottom: 6px;">
                                        ${title || 'Asignatura'}
                                      </div>
                                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                        <span style="color: #666; font-size: 12px;">Promedio:</span>
                                        <span style="font-size: 16px; font-weight: 700; color: ${gradeColor};">
                                          ${items?.[0]?.value || '0%'}
                                        </span>
                                      </div>
                                      <div style="background: ${gradeColor}20; padding: 4px 8px; border-radius: 4px; text-align: center;">
                                        <span style="font-size: 11px; color: ${gradeColor}; font-weight: 600;">
                                          ${status}
                                        </span>
                                      </div>
                                    </div>
                                  `;
                                },
                              },
                            }}
                            animation={{
                              appear: {
                                animation: 'fade-in',
                                duration: 600,
                              },
                            }}
                            height={isMobile ? 220 : isTablet ? 280 : 320}
                          />
                        );
                      })()}
                    </Card>
                  </Col>
                </Row>
                  )
                },
                {
                  key: 'timeline',
                  label: 'Historial',
                  children: (
                <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
                  <Col xs={24} lg={8}>
                    <Card
                      title={<span style={{ fontSize: isMobile ? '14px' : '16px' }}>Filtrar por Asignatura</span>}
                      size="small"
                      bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
                    >
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Todas las asignaturas"
                        value={selectedSubjectId}
                        onChange={setSelectedSubjectId}
                        allowClear
                      >
                        {selectedChild.subjectGrades.map(subject => (
                          <Option key={subject.subjectId} value={subject.subjectId}>
                            {subject.subjectName}
                          </Option>
                        ))}
                      </Select>
                      
                      {selectedSubject && (
                        <div style={{ marginTop: 24 }}>
                          <Descriptions column={1} size="small">
                            <Descriptions.Item label="Promedio">
                              <Text strong style={{ color: selectedSubject.averageGrade ? '#52c41a' : '#999' }}>
                                {selectedSubject.averageGrade !== null && selectedSubject.averageGrade !== undefined ?
                                  `${selectedSubject.averageGrade.toFixed(1)}%` :
                                  'Sin evaluar'
                                }
                              </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Evaluaciones">
                              {/* Use totalEvaluations which includes exams + tasks + activities */}
                              {(selectedSubject as any).totalEvaluations ||
                               ((selectedSubject as any).examGradedCount || 0) + (selectedSubject.gradedTasks || 0) + (selectedSubject.activityAssessments || 0)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Pendientes">
                              {selectedSubject.pendingTasks || 0}
                            </Descriptions.Item>
                            <Descriptions.Item label="Última actualización">
                              {selectedSubject.lastUpdated ?
                                dayjs(selectedSubject.lastUpdated).format('DD/MM/YYYY') :
                                'Sin datos'
                              }
                            </Descriptions.Item>
                          </Descriptions>
                        </div>
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} lg={16}>
                    <Card
                      title={<span style={{ fontSize: isMobile ? '14px' : '16px' }}>Calificaciones Recientes</span>}
                      size="small"
                      bodyStyle={{ padding: isMobile ? '8px' : '16px' }}
                    >
                      {(() => {
                        const filteredGrades = selectedSubjectId
                          ? selectedChild.recentGrades.filter(g => g.subject.id === selectedSubjectId)
                          : selectedChild.recentGrades;
                        
                        return filteredGrades.length > 0 ? (
                          renderGradeTimeline(filteredGrades)
                        ) : (
                          <Empty description="No hay calificaciones para mostrar" />
                        );
                      })()}
                    </Card>
                  </Col>
                </Row>
                  )
                },
                {
                  key: 'progress',
                  label: 'Progreso',
                  children: (
                <Card
                  title={<span style={{ fontSize: isMobile ? '14px' : '16px' }}>Evolución de Calificaciones</span>}
                  size="small"
                  bodyStyle={{ padding: isMobile ? '8px' : '16px' }}
                >
                  {(() => {
                    const lineData = prepareLineData(selectedChild.recentGrades || []);
                    
                    if (lineData.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                          <Empty 
                            description="No hay datos de calificaciones para mostrar la evolución" 
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        </div>
                      );
                    }
                    
                    return (
                      <Line
                        data={lineData}
                        xField="fecha"
                        yField="porcentaje"
                        seriesField="asignatura"
                        yAxis={{
                          min: 0,
                          max: 100,
                          tickCount: 6,
                          title: {
                            text: 'Calificación (%)',
                            style: { fill: '#666', fontSize: 12 },
                          },
                          grid: {
                            line: {
                              style: {
                                stroke: '#f0f0f0',
                                lineDash: [4, 4],
                              },
                            },
                          },
                          label: {
                            formatter: (v: string) => `${v}%`,
                            style: { fill: '#999', fontSize: 11 },
                          },
                        }}
                        xAxis={{
                          title: {
                            text: 'Fecha',
                            style: { fill: '#666', fontSize: 12 },
                          },
                          label: {
                            style: { fill: '#666', fontSize: 11 },
                          },
                          grid: null,
                        }}
                        smooth
                        point={{
                          size: 6,
                          shape: 'circle',
                          style: {
                            stroke: '#fff',
                            lineWidth: 2,
                          },
                        }}
                        legend={{
                          position: 'top',
                          itemName: {
                            style: { fill: '#333', fontSize: 12 },
                          },
                        }}
                        tooltip={{
                          title: 'fechaCompleta',
                          items: [
                            (d: any) => ({
                              name: d.asignatura,
                              value: `${d.porcentaje}%`,
                              color: d.porcentaje >= 70 ? '#52c41a' : d.porcentaje >= 50 ? '#faad14' : '#ff4d4f',
                              titulo: d.titulo,
                              tipo: d.tipo,
                              notaOriginal: d.notaOriginal,
                              notaMaxima: d.notaMaxima,
                            }),
                          ],
                        }}
                        interaction={{
                          tooltip: {
                            render: (event: any, { title, items }: any) => {
                              const item = items?.[0] || {};
                              const porcentaje = parseFloat(item.value) || 0;
                              const gradeColor = porcentaje >= 70 ? '#52c41a' : porcentaje >= 50 ? '#faad14' : '#ff4d4f';
                              return `
                                <div style="padding: 14px; min-width: 220px; background: #fff; border-radius: 8px; box-shadow: 0 3px 12px rgba(0,0,0,0.12);">
                                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
                                    <span style="color: #1890ff; font-weight: 600; font-size: 13px;">
                                      ${title || 'Fecha'}
                                    </span>
                                    <span style="background: #e6f7ff; color: #1890ff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">
                                      ${item.tipo || 'Evaluación'}
                                    </span>
                                  </div>
                                  <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #333;">
                                    ${item.titulo || 'Sin título'}
                                  </div>
                                  <div style="color: #666; font-size: 12px; margin-bottom: 12px;">
                                    ${item.name || 'Asignatura'}
                                  </div>
                                  <div style="background: #fafafa; padding: 10px; border-radius: 6px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                      <span style="font-size: 12px; color: #666;">Porcentaje:</span>
                                      <span style="font-size: 18px; font-weight: 700; color: ${gradeColor};">
                                        ${item.value || '0%'}
                                      </span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                      <span style="font-size: 11px; color: #999;">Nota obtenida:</span>
                                      <span style="font-size: 13px; color: #333; font-weight: 500;">
                                        ${item.notaOriginal != null ? Number(item.notaOriginal).toFixed(1) : '-'} / ${item.notaMaxima || 100}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              `;
                            },
                          },
                        }}
                        color={['#1890ff', '#52c41a', '#722ed1', '#faad14', '#eb2f96', '#13c2c2']}
                        lineStyle={{
                          lineWidth: 3,
                        }}
                        animation={{
                          appear: {
                            animation: 'wave-in',
                            duration: 800,
                          },
                        }}
                      />
                    );
                  })()}
                </Card>
                  )
                }
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default FamilyGradesPage;