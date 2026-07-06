/**
 * @archivo: TutorReportsDashboardPage.tsx
 * @módulo: Teacher - Dashboard del Tutor
 * @función: Vista consolidada para que el tutor vea todos los informes de sus estudiantes tutorados
 * @descripción: Muestra de forma clara y visual todos los informes que otros profesores han escrito
 *               sobre los estudiantes que el profesor tutoriza, para facilitar las reuniones con familias.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Avatar,
  Empty,
  Spin,
  Tag,
  Typography,
  Collapse,
  Badge,
  Tooltip,
  Statistic,
  Alert,
  Input,
  Space,
  Divider,
} from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useCurrentAcademicYear } from '../../hooks/useCurrentAcademicYear';
import qualitativeReportService, {
  TutorDashboardData,
  TutorClassGroup,
  TutorStudent,
  TutorStudentReport,
  downloadStudentReportPdf,
  downloadAllStudentsReportPdf,
} from '../../services/qualitativeReportService';
import { message, Button } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Search } = Input;

// Colores de prioridad
const priorityConfig: Record<number, { color: string; bgColor: string; icon: React.ReactNode }> = {
  1: { color: '#8c8c8c', bgColor: '#f5f5f5', icon: <InfoCircleOutlined /> },
  2: { color: '#1890ff', bgColor: '#e6f7ff', icon: <FileTextOutlined /> },
  3: { color: '#fa8c16', bgColor: '#fff7e6', icon: <WarningOutlined /> },
  4: { color: '#f5222d', bgColor: '#fff2f0', icon: <ExclamationCircleOutlined /> },
};

const TutorReportsDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TutorDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingStudent, setDownloadingStudent] = useState<string | null>(null);

  const { currentYear } = useCurrentAcademicYear();

  // Descargar PDF de todos los estudiantes
  const handleDownloadAllPdf = async () => {
    setDownloadingAll(true);
    try {
      await downloadAllStudentsReportPdf(currentYear?.id);
      message.success('PDF descargado correctamente');
    } catch (err: any) {
      console.error('Error downloading all PDF:', err);
      message.error('Error al descargar el PDF. Inténtalo de nuevo.');
    } finally {
      setDownloadingAll(false);
    }
  };

  // Descargar PDF de un estudiante individual
  const handleDownloadStudentPdf = async (studentId: string, studentName: string) => {
    setDownloadingStudent(studentId);
    try {
      await downloadStudentReportPdf(studentId, studentName, currentYear?.id);
      message.success(`PDF de ${studentName} descargado correctamente`);
    } catch (err: any) {
      console.error('Error downloading student PDF:', err);
      message.error('Error al descargar el PDF. Inténtalo de nuevo.');
    } finally {
      setDownloadingStudent(null);
    }
  };

  // Cargar datos
  useEffect(() => {
    loadData();
  }, [currentYear?.id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await qualitativeReportService.getTutorDashboard(currentYear?.id);
      setData(result);
      // Expandir todos los grupos por defecto
      setExpandedGroups(result.classGroups.map(g => g.id));
    } catch (err: any) {
      console.error('Error loading tutor dashboard:', err);
      if (err.response?.status === 403) {
        setError('No tienes grupos asignados como tutor.');
      } else {
        setError('Error al cargar los datos. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtrar estudiantes por búsqueda
  const filteredData = useMemo(() => {
    if (!data || !searchText.trim()) return data;

    const searchLower = searchText.toLowerCase();
    const filteredGroups = data.classGroups.map(group => ({
      ...group,
      students: group.students.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchLower) ||
        student.enrollmentNumber.toLowerCase().includes(searchLower)
      ),
    })).filter(group => group.students.length > 0);

    return {
      ...data,
      classGroups: filteredGroups,
    };
  }, [data, searchText]);

  // Formatear fecha
  const formatDate = (date: string) => {
    return dayjs(date).format('DD MMM YYYY, HH:mm');
  };

  // Renderizar un informe individual
  const renderReport = (report: TutorStudentReport) => (
    <div
      key={report.id}
      style={{
        padding: '12px 16px',
        marginBottom: 8,
        borderRadius: 8,
        backgroundColor: priorityConfig[report.priority]?.bgColor || '#f5f5f5',
        borderLeft: `4px solid ${priorityConfig[report.priority]?.color || '#8c8c8c'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <Tag color={priorityConfig[report.priority]?.color}>
            {priorityConfig[report.priority]?.icon} {report.priorityLabel}
          </Tag>
          <Tag>{report.contextTag}</Tag>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {formatDate(report.updatedAt)}
        </Text>
      </div>
      <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {report.content}
      </Paragraph>
      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <UserOutlined style={{ marginRight: 4 }} />
          {report.authorName || 'Profesor'} {report.authorEmail && `(${report.authorEmail})`}
        </Text>
      </div>
    </div>
  );

  // Renderizar un estudiante
  const renderStudent = (student: TutorStudent) => (
    <Card
      key={student.id}
      size="small"
      style={{
        marginBottom: 12,
        borderRadius: 12,
        border: student.hasHighPriority ? '2px solid #fa8c16' : '1px solid #f0f0f0',
      }}
      bodyStyle={{ padding: 16 }}
    >
      {/* Cabecera del estudiante */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: student.reports.length > 0 ? 16 : 0 }}>
        <Badge
          count={student.totalReports}
          style={{ backgroundColor: student.hasHighPriority ? '#fa8c16' : '#1890ff' }}
          offset={[-5, 5]}
        >
          <Avatar
            size={48}
            src={student.photoUrl}
            icon={!student.photoUrl && <UserOutlined />}
            style={{ backgroundColor: '#87d068' }}
          />
        </Badge>
        <div style={{ marginLeft: 16, flex: 1 }}>
          <Text strong style={{ fontSize: 16 }}>
            {student.firstName} {student.lastName}
          </Text>
          {student.hasHighPriority && (
            <Tooltip title="Tiene informes de alta prioridad">
              <ExclamationCircleOutlined style={{ color: '#fa8c16', marginLeft: 8 }} />
            </Tooltip>
          )}
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {student.enrollmentNumber}
            </Text>
            {student.lastReportDate && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                Último informe: {formatDate(student.lastReportDate)}
              </Text>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
          {student.totalReports > 0 ? (
            <>
              <Tag color="blue">
                <FileTextOutlined /> {student.totalReports} informe{student.totalReports !== 1 ? 's' : ''}
              </Tag>
              <Tooltip title="Descargar PDF">
                <Button
                  type="text"
                  size="small"
                  icon={downloadingStudent === student.id ? <LoadingOutlined spin /> : <DownloadOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadStudentPdf(student.id, `${student.firstName}_${student.lastName}`);
                  }}
                  disabled={downloadingStudent === student.id}
                  style={{
                    color: '#1890ff',
                    borderRadius: 6,
                  }}
                />
              </Tooltip>
            </>
          ) : (
            <Tag>
              <CheckCircleOutlined /> Sin informes
            </Tag>
          )}
        </div>
      </div>

      {/* Lista de informes */}
      {student.reports.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {student.reports.map(report => renderReport(report))}
        </div>
      )}
    </Card>
  );

  // Renderizar un grupo de clase
  const renderClassGroup = (group: TutorClassGroup) => (
    <Panel
      key={group.id}
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <TeamOutlined style={{ fontSize: 18, color: '#1890ff' }} />
            <Text strong style={{ fontSize: 16 }}>{group.name}</Text>
            <Tag>{group.totalStudents} estudiantes</Tag>
          </Space>
          <Space>
            {group.totalReports > 0 && (
              <Tag color="blue">
                <FileTextOutlined /> {group.totalReports} informes
              </Tag>
            )}
            {group.studentsWithReports > 0 && (
              <Tag color="green">
                {group.studentsWithReports} con informes
              </Tag>
            )}
          </Space>
        </div>
      }
    >
      {group.students.length > 0 ? (
        group.students.map(student => renderStudent(student))
      ) : (
        <Empty description="No hay estudiantes que coincidan con la búsqueda" />
      )}
    </Panel>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Cargando informes de tus tutorados..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="info"
          showIcon
          message="Panel del Tutor"
          description={error}
        />
      </div>
    );
  }

  if (!data || data.classGroups.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="info"
          showIcon
          message="Sin grupos asignados"
          description="No tienes grupos de clase asignados como tutor. Contacta con el administrador si crees que esto es un error."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ marginBottom: 8 }}>
            <TeamOutlined style={{ marginRight: 12 }} />
            Informes de Mis Tutorados
          </Title>
          <Text type="secondary">
            Vista consolidada de todos los informes que otros profesores han escrito sobre tus estudiantes tutorados.
            Ideal para preparar reuniones con las familias.
          </Text>
        </div>
        <Button
          type="primary"
          size="large"
          icon={downloadingAll ? <LoadingOutlined /> : <FilePdfOutlined />}
          onClick={handleDownloadAllPdf}
          loading={downloadingAll}
          disabled={downloadingAll || !data?.summary.totalReports}
          style={{
            borderRadius: 8,
            height: 44,
            paddingLeft: 20,
            paddingRight: 20,
            fontWeight: 500,
          }}
        >
          {downloadingAll ? 'Generando PDF...' : 'Descargar Informe Completo'}
        </Button>
      </div>

      {/* Estadísticas resumen */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <Statistic
              title="Grupos"
              value={data.summary.totalGroups}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <Statistic
              title="Estudiantes"
              value={data.summary.totalStudents}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <Statistic
              title="Informes"
              value={data.summary.totalReports}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <Statistic
              title="Alta Prioridad"
              value={data.summary.highPriorityCount}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: data.summary.highPriorityCount > 0 ? '#fa8c16' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alerta si hay informes de alta prioridad */}
      {data.summary.highPriorityCount > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={`Hay ${data.summary.highPriorityCount} informe${data.summary.highPriorityCount !== 1 ? 's' : ''} de alta prioridad que requieren atención`}
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {/* Buscador */}
      <div style={{ marginBottom: 24 }}>
        <Search
          placeholder="Buscar estudiante por nombre o número de matrícula..."
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 500 }}
        />
      </div>

      {/* Lista de grupos */}
      {filteredData && filteredData.classGroups.length > 0 ? (
        <Collapse
          activeKey={expandedGroups}
          onChange={(keys) => setExpandedGroups(keys as string[])}
          expandIconPosition="start"
          style={{ background: 'transparent', border: 'none' }}
        >
          {filteredData.classGroups.map(group => renderClassGroup(group))}
        </Collapse>
      ) : (
        <Empty description="No hay resultados para la búsqueda" />
      )}
    </div>
  );
};

export default TutorReportsDashboardPage;
