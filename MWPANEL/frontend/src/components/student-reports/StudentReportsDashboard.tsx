/**
 * @archivo: StudentReportsDashboard.tsx
 * @módulo: Student Reports (Visión 360º)
 * @función: Dashboard principal para visualizar reportes de un estudiante
 * @descripción: Vista para tutores con modos cronológico y por categoría
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  Tabs,
  Timeline,
  Collapse,
  Tag,
  Avatar,
  Typography,
  Empty,
  Spin,
  Space,
  Button,
  Tooltip,
  Badge,
  Select,
  Input,
  Segmented,
  Statistic,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  ClockCircleOutlined,
  FolderOutlined,
  UserOutlined,
  BookOutlined,
  TagOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

// ===== TYPES =====

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Report {
  id: string;
  studentId: string;
  author: Author;
  subject: Subject | null;
  customTag: string | null;
  displayTag: string;
  tagType: 'subject' | 'custom';
  title: string | null;
  content: string;
  priority: number;
  priorityLabel: string;
  visibleToFamily: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  wasEdited: boolean;
}

interface GroupedReports {
  subjectName?: string;
  subjectId?: string;
  subjectCode?: string;
  tag?: string;
  reports: Report[];
  count: number;
}

interface StudentReportsDashboardProps {
  studentId: string;
  studentName: string;
  reports: Report[];
  groupedBySubject: GroupedReports[];
  groupedByTag: GroupedReports[];
  loading?: boolean;
  onViewReport?: (report: Report) => void;
  onEditReport?: (report: Report) => void;
  academicYearId?: string;
  showCreateButton?: boolean;
  onCreateReport?: () => void;
}

// ===== HELPERS =====

const getPriorityColor = (priority: number): string => {
  switch (priority) {
    case 1: return 'default';
    case 2: return 'blue';
    case 3: return 'orange';
    case 4: return 'red';
    default: return 'blue';
  }
};

const getTagColor = (tagType: 'subject' | 'custom', tagName: string): string => {
  if (tagType === 'subject') {
    // Colores para asignaturas
    const subjectColors: Record<string, string> = {
      'matemáticas': 'blue',
      'lengua': 'green',
      'inglés': 'purple',
      'ciencias': 'cyan',
      'historia': 'orange',
      'geografía': 'gold',
      'educación física': 'lime',
      'música': 'magenta',
      'arte': 'volcano',
    };
    const lowerName = tagName.toLowerCase();
    for (const [key, color] of Object.entries(subjectColors)) {
      if (lowerName.includes(key)) return color;
    }
    return 'geekblue';
  }

  // Colores para etiquetas personalizadas
  const customColors: Record<string, string> = {
    'comportamiento': 'volcano',
    'reunión': 'purple',
    'tutoría': 'cyan',
    'general': 'default',
    'convivencia': 'orange',
    'salud': 'red',
    'extraescolar': 'lime',
    'académico': 'blue',
  };
  const lowerTag = tagName.toLowerCase();
  for (const [key, color] of Object.entries(customColors)) {
    if (lowerTag.includes(key)) return color;
  }
  return 'default';
};

// ===== SUBCOMPONENTS =====

const ReportCard: React.FC<{
  report: Report;
  onView?: (report: Report) => void;
  onEdit?: (report: Report) => void;
  showTag?: boolean;
}> = ({ report, onView, onEdit, showTag = true }) => {
  return (
    <Card
      size="small"
      className="mb-3 hover:shadow-md transition-shadow"
      styles={{ body: { padding: '12px 16px' } }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar
            src={report.author.photoUrl}
            icon={<UserOutlined />}
            size="small"
          />
          <div>
            <Text strong className="text-sm">
              {report.author.firstName} {report.author.lastName}
            </Text>
            {showTag && (
              <Tag
                color={getTagColor(report.tagType, report.displayTag)}
                className="ml-2"
                icon={report.tagType === 'subject' ? <BookOutlined /> : <TagOutlined />}
              >
                {report.displayTag}
              </Tag>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tag color={getPriorityColor(report.priority)} className="m-0">
            {report.priorityLabel}
          </Tag>
          {report.visibleToFamily && (
            <Tooltip title="Visible para familias">
              <TeamOutlined className="text-green-500" />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Title */}
      {report.title && (
        <Title level={5} className="mb-2 mt-0">
          {report.title}
        </Title>
      )}

      {/* Content */}
      <div
        className="text-gray-700 mb-3"
        dangerouslySetInnerHTML={{ __html: report.content }}
        style={{
          maxHeight: '100px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <Space>
          <Tooltip title={dayjs(report.createdAt).format('DD/MM/YYYY HH:mm')}>
            <span>
              <CalendarOutlined className="mr-1" />
              {dayjs(report.createdAt).fromNow()}
            </span>
          </Tooltip>
          {report.wasEdited && (
            <Tooltip title={`Editado: ${dayjs(report.updatedAt).format('DD/MM/YYYY HH:mm')}`}>
              <span className="text-orange-500">
                <EditOutlined className="mr-1" />
                Editado
              </span>
            </Tooltip>
          )}
        </Space>
        <Space>
          {onView && (
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onView(report)}
            >
              Ver
            </Button>
          )}
          {onEdit && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(report)}
            >
              Editar
            </Button>
          )}
        </Space>
      </div>
    </Card>
  );
};

const TimelineView: React.FC<{
  reports: Report[];
  onView?: (report: Report) => void;
  onEdit?: (report: Report) => void;
}> = ({ reports, onView, onEdit }) => {
  if (reports.length === 0) {
    return (
      <Empty
        description="No hay reportes para mostrar"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Timeline mode="left">
      {reports.map((report) => (
        <Timeline.Item
          key={report.id}
          color={getPriorityColor(report.priority)}
          label={
            <Text type="secondary" className="text-xs">
              {dayjs(report.createdAt).format('DD MMM YYYY')}
            </Text>
          }
        >
          <ReportCard report={report} onView={onView} onEdit={onEdit} />
        </Timeline.Item>
      ))}
    </Timeline>
  );
};

const CategoryView: React.FC<{
  groupedBySubject: GroupedReports[];
  groupedByTag: GroupedReports[];
  onView?: (report: Report) => void;
  onEdit?: (report: Report) => void;
}> = ({ groupedBySubject, groupedByTag, onView, onEdit }) => {
  const allGroups = [
    ...groupedBySubject.map(g => ({
      ...g,
      key: `subject-${g.subjectId}`,
      title: g.subjectName || 'Sin asignatura',
      icon: <BookOutlined />,
      type: 'subject' as const,
    })),
    ...groupedByTag.map(g => ({
      ...g,
      key: `tag-${g.tag}`,
      title: g.tag || 'Sin categoría',
      icon: <TagOutlined />,
      type: 'custom' as const,
    })),
  ];

  if (allGroups.length === 0) {
    return (
      <Empty
        description="No hay reportes para mostrar"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Collapse
      accordion
      defaultActiveKey={allGroups[0]?.key}
      className="bg-white"
    >
      {allGroups.map((group) => (
        <Panel
          key={group.key}
          header={
            <div className="flex items-center justify-between w-full pr-4">
              <Space>
                {group.icon}
                <Text strong>{group.title}</Text>
                <Tag
                  color={getTagColor(group.type, group.title)}
                >
                  {group.count} {group.count === 1 ? 'reporte' : 'reportes'}
                </Tag>
              </Space>
            </div>
          }
        >
          {group.reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onView={onView}
              onEdit={onEdit}
              showTag={false}
            />
          ))}
        </Panel>
      ))}
    </Collapse>
  );
};

// ===== MAIN COMPONENT =====

const StudentReportsDashboard: React.FC<StudentReportsDashboardProps> = ({
  studentId,
  studentName,
  reports,
  groupedBySubject,
  groupedByTag,
  loading = false,
  onViewReport,
  onEditReport,
  showCreateButton = false,
  onCreateReport,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'category'>('timeline');
  const [searchText, setSearchText] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null);

  // Filtrar reportes
  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (r) =>
          r.content.toLowerCase().includes(search) ||
          r.title?.toLowerCase().includes(search) ||
          r.displayTag.toLowerCase().includes(search) ||
          `${r.author.firstName} ${r.author.lastName}`.toLowerCase().includes(search)
      );
    }

    if (priorityFilter !== null) {
      result = result.filter((r) => r.priority === priorityFilter);
    }

    return result;
  }, [reports, searchText, priorityFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    const byPriority = reports.reduce((acc, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      total: reports.length,
      highPriority: (byPriority[3] || 0) + (byPriority[4] || 0),
      subjects: groupedBySubject.length,
      categories: groupedByTag.length,
    };
  }, [reports, groupedBySubject, groupedByTag]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="Cargando reportes..." />
      </div>
    );
  }

  return (
    <div className="student-reports-dashboard">
      {/* Header */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title level={4} className="mb-0">
              Visión 360º - {studentName}
            </Title>
            <Text type="secondary">
              Reportes cualitativos de todos los profesores
            </Text>
          </div>
          {showCreateButton && onCreateReport && (
            <Button type="primary" icon={<EditOutlined />} onClick={onCreateReport}>
              Nuevo Reporte
            </Button>
          )}
        </div>

        {/* Stats */}
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total Reportes"
              value={stats.total}
              prefix={<BookOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Prioridad Alta"
              value={stats.highPriority}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: stats.highPriority > 0 ? '#cf1322' : undefined }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Asignaturas"
              value={stats.subjects}
              prefix={<BookOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Categorías"
              value={stats.categories}
              prefix={<TagOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Filters & View Mode */}
      <Card className="mb-4" styles={{ body: { padding: '12px 16px' } }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Space>
            <Input
              placeholder="Buscar en reportes..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Prioridad"
              value={priorityFilter}
              onChange={setPriorityFilter}
              style={{ width: 140 }}
              allowClear
              options={[
                { value: 1, label: 'Bajo' },
                { value: 2, label: 'Normal' },
                { value: 3, label: 'Alto' },
                { value: 4, label: 'Urgente' },
              ]}
            />
          </Space>

          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as 'timeline' | 'category')}
            options={[
              {
                value: 'timeline',
                label: (
                  <Space>
                    <ClockCircleOutlined />
                    Cronológico
                  </Space>
                ),
              },
              {
                value: 'category',
                label: (
                  <Space>
                    <FolderOutlined />
                    Por Categoría
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </Card>

      {/* Content */}
      <Card>
        {viewMode === 'timeline' ? (
          <TimelineView
            reports={filteredReports}
            onView={onViewReport}
            onEdit={onEditReport}
          />
        ) : (
          <CategoryView
            groupedBySubject={groupedBySubject}
            groupedByTag={groupedByTag}
            onView={onViewReport}
            onEdit={onEditReport}
          />
        )}
      </Card>
    </div>
  );
};

export default StudentReportsDashboard;
