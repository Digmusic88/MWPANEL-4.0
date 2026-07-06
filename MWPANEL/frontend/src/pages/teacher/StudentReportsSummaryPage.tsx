/**
 * @archivo: StudentReportsSummaryPage.tsx
 * @módulo: Teacher/Tutor - Resumen de Informes del Estudiante
 * @función: Vista del tutor para ver todos los informes de un estudiante
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Avatar,
  Tag,
  Empty,
  Spin,
  Button,
  Timeline,
  Collapse,
  Statistic,
  Tooltip,
  Divider,
  Space,
  message,
} from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  TagOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  TeamOutlined,
  CalendarOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { useCurrentAcademicYear } from '../../hooks/useCurrentAcademicYear';
import qualitativeReportService, {
  QualitativeReport,
  StudentReportStats,
} from '../../services/qualitativeReportService';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// Mapeo de prioridades
const priorityConfig: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  1: { label: 'Baja', color: 'default', icon: <FlagOutlined style={{ color: '#8c8c8c' }} /> },
  2: { label: 'Normal', color: 'blue', icon: <FlagOutlined style={{ color: '#1890ff' }} /> },
  3: { label: 'Alta', color: 'orange', icon: <FlagOutlined style={{ color: '#fa8c16' }} /> },
  4: { label: 'Urgente', color: 'red', icon: <FlagOutlined style={{ color: '#ff4d4f' }} /> },
};

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNumber: string;
  photoUrl?: string;
  classGroup?: string;
}

const StudentReportsSummaryPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { currentYear } = useCurrentAcademicYear();

  // Estados
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [timeline, setTimeline] = useState<QualitativeReport[]>([]);
  const [byContext, setByContext] = useState<
    { context: string; reports: QualitativeReport[]; count: number }[]
  >([]);
  const [stats, setStats] = useState<StudentReportStats | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'byContext'>('timeline');

  // Cargar datos
  useEffect(() => {
    if (studentId) {
      loadReports();
    }
  }, [studentId, currentYear?.id]);

  const loadReports = async () => {
    if (!studentId) return;

    setLoading(true);
    try {
      const data = await qualitativeReportService.getStudentReports(studentId, currentYear?.id);

      setTimeline(data.timeline || []);
      setByContext(data.byContext || []);
      setStats(data.stats || null);

      // Extraer info del estudiante del primer informe
      if (data.timeline && data.timeline.length > 0) {
        const firstReport = data.timeline[0];
        if (firstReport.student) {
          setStudent(firstReport.student);
        }
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      message.error('Error al cargar los informes');
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Renderizar timeline de informes
  const renderTimeline = () => {
    if (timeline.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Este estudiante no tiene informes registrados"
        />
      );
    }

    return (
      <Timeline mode="left">
        {timeline.map((report) => (
          <Timeline.Item
            key={report.id}
            color={priorityConfig[report.priority]?.color || 'blue'}
            dot={priorityConfig[report.priority]?.icon}
          >
            <Card size="small" className="mb-2">
              <div className="flex justify-between items-start mb-2">
                <Space>
                  <Tag color="blue" icon={<TagOutlined />}>
                    {report.contextTag}
                  </Tag>
                  <Tag color={priorityConfig[report.priority]?.color}>
                    {priorityConfig[report.priority]?.label}
                  </Tag>
                  {report.visibleToFamily ? (
                    <Tooltip title="Visible para la familia">
                      <Tag color="green" icon={<EyeOutlined />}>
                        Visible
                      </Tag>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Solo visible para profesores">
                      <Tag icon={<EyeInvisibleOutlined />}>Interno</Tag>
                    </Tooltip>
                  )}
                </Space>
                <Text type="secondary" className="text-xs">
                  <CalendarOutlined className="mr-1" />
                  {formatDate(report.updatedAt)}
                  {report.wasEdited && ' (editado)'}
                </Text>
              </div>

              <Paragraph className="mb-2">{report.content}</Paragraph>

              {report.author && (
                <div className="flex items-center mt-2 pt-2 border-t border-gray-100">
                  <Avatar
                    size="small"
                    src={report.author.photoUrl}
                    icon={!report.author.photoUrl && <UserOutlined />}
                    className="mr-2"
                  />
                  <Text type="secondary" className="text-sm">
                    {report.author.firstName} {report.author.lastName}
                  </Text>
                </div>
              )}
            </Card>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  // Renderizar informes agrupados por contexto
  const renderByContext = () => {
    if (byContext.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Este estudiante no tiene informes registrados"
        />
      );
    }

    return (
      <Collapse accordion>
        {byContext.map((group) => (
          <Panel
            key={group.context}
            header={
              <Space>
                <TagOutlined />
                <span>{group.context}</span>
                <Tag color="blue">{group.count} informe(s)</Tag>
              </Space>
            }
          >
            {group.reports.map((report) => (
              <Card key={report.id} size="small" className="mb-3">
                <div className="flex justify-between items-start mb-2">
                  <Space>
                    <Tag color={priorityConfig[report.priority]?.color}>
                      {priorityConfig[report.priority]?.label}
                    </Tag>
                    {report.visibleToFamily ? (
                      <Tag color="green" icon={<EyeOutlined />}>
                        Visible para familia
                      </Tag>
                    ) : (
                      <Tag icon={<EyeInvisibleOutlined />}>Solo profesores</Tag>
                    )}
                  </Space>
                  <Text type="secondary" className="text-xs">
                    {formatDate(report.updatedAt)}
                  </Text>
                </div>

                <Paragraph className="mb-2">{report.content}</Paragraph>

                {report.author && (
                  <div className="flex items-center mt-2 pt-2 border-t border-gray-100">
                    <Avatar
                      size="small"
                      src={report.author.photoUrl}
                      icon={!report.author.photoUrl && <UserOutlined />}
                      className="mr-2"
                    />
                    <Text type="secondary" className="text-sm">
                      Por: {report.author.firstName} {report.author.lastName}
                    </Text>
                  </div>
                )}
              </Card>
            ))}
          </Panel>
        ))}
      </Collapse>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header con navegación */}
      <div className="flex items-center mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          Volver
        </Button>
        <Title level={2} className="mb-0">
          <FileTextOutlined className="mr-2" />
          Informes del Estudiante
        </Title>
      </div>

      {/* Información del estudiante */}
      {student && (
        <Card className="mb-6">
          <Row gutter={24} align="middle">
            <Col>
              <Avatar
                size={80}
                src={student.photoUrl}
                icon={!student.photoUrl && <UserOutlined />}
              />
            </Col>
            <Col flex="1">
              <Title level={3} className="mb-0">
                {student.firstName} {student.lastName}
              </Title>
              <Space className="mt-2">
                <Tag>Nº {student.enrollmentNumber}</Tag>
                {student.classGroup && (
                  <Tag icon={<TeamOutlined />}>{student.classGroup}</Tag>
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Estadísticas */}
      {stats && (
        <Row gutter={16} className="mb-6">
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Informes"
                value={stats.totalReports}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Contextos"
                value={stats.byContext?.length || 0}
                prefix={<TagOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Alta Prioridad"
                value={
                  stats.byPriority?.find((p) => p.priority >= 3)?.count || 0
                }
                valueStyle={{ color: '#fa8c16' }}
                prefix={<FlagOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Último Informe"
                value={
                  stats.lastReportDate
                    ? new Date(stats.lastReportDate).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                      })
                    : '-'
                }
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Selector de vista */}
      <Card
        title="Informes"
        extra={
          <Space>
            <Button
              type={viewMode === 'timeline' ? 'primary' : 'default'}
              onClick={() => setViewMode('timeline')}
              icon={<ClockCircleOutlined />}
            >
              Cronológico
            </Button>
            <Button
              type={viewMode === 'byContext' ? 'primary' : 'default'}
              onClick={() => setViewMode('byContext')}
              icon={<TagOutlined />}
            >
              Por Contexto
            </Button>
          </Space>
        }
      >
        {viewMode === 'timeline' ? renderTimeline() : renderByContext()}
      </Card>
    </div>
  );
};

export default StudentReportsSummaryPage;
