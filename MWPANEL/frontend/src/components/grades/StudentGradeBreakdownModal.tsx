/**
 * @archivo: StudentGradeBreakdownModal.tsx
 * @módulo: Frontend Components - Grades
 * @función: Modal detallado de breakdown de calificaciones por estudiante
 * @crítico: SÍ - Funcionalidad drill-down para calificaciones centralizadas
 * @actualizado: Julio 2025 - Implementación completa
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Descriptions,
  Card,
  Row,
  Col,
  Progress,
  Tag,
  Table,
  Typography,
  Spin,
  Alert,
  Tabs,
  Statistic,
  Space,
  Tooltip,
} from 'antd';
import {
  BookOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { centralizedGradesService } from '../../services/centralizedGradesService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface StudentGradeBreakdownModalProps {
  visible: boolean;
  onCancel: () => void;
  studentId: string | null;
  subjectAssignmentId: string | null;
  studentName?: string;
  subjectName?: string;
}

const StudentGradeBreakdownModal: React.FC<StudentGradeBreakdownModalProps> = ({
  visible,
  onCancel,
  studentId,
  subjectAssignmentId,
  studentName,
  subjectName,
}) => {
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && studentId && subjectAssignmentId) {
      loadBreakdown();
    }
  }, [visible, studentId, subjectAssignmentId]);

  const loadBreakdown = async () => {
    if (!studentId || !subjectAssignmentId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await centralizedGradesService.getStudentGradeBreakdown(
        studentId,
        subjectAssignmentId
      );
      
      // Validar y normalizar los datos para evitar errores de .map()
      const normalizedData = {
        ...data,
        sourceDetails: {
          tasks: Array.isArray(data.sourceDetails?.tasks) ? data.sourceDetails.tasks : [],
          activities: Array.isArray(data.sourceDetails?.activities) ? data.sourceDetails.activities : [],
          competencies: Array.isArray(data.sourceDetails?.competencies) ? data.sourceDetails.competencies : [],
          rubrics: Array.isArray(data.sourceDetails?.rubrics) ? data.sourceDetails.rubrics : []
        }
      };
      
      setBreakdown(normalizedData);
    } catch (err: any) {
      setError(`Error al cargar el breakdown: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return '#52c41a'; // Verde
    if (grade >= 70) return '#1890ff'; // Azul
    if (grade >= 50) return '#faad14'; // Amarillo
    return '#ff4d4f'; // Rojo
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'GRADED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'NOT_SUBMITTED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'GRADED':
        return <CheckCircleOutlined />;
      case 'PENDING':
        return <ClockCircleOutlined />;
      case 'NOT_SUBMITTED':
        return <ExclamationCircleOutlined />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  // Columnas para la tabla de tareas
  const taskColumns = [
    {
      title: 'Tarea',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <Space>
          <BookOutlined style={{ color: '#1890ff' }} />
          <div>
            <Text strong>{title}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.type} • Vence: {new Date(record.dueDate).toLocaleDateString()}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Calificación',
      dataIndex: 'score',
      key: 'score',
      align: 'center' as const,
      render: (score: number | null, record: any) => (
        score === null || score === undefined || isNaN(Number(score)) ? (
          <Text type="secondary">Sin calificar</Text>
        ) : (
        <div>
          <Text style={{ color: getGradeColor(record.percentage), fontSize: '16px', fontWeight: 'bold' }}>
            {Number(score).toFixed(1)}/{record.maxScore}
          </Text>
          <br />
          <Progress
            percent={record.percentage}
            size="small"
            strokeColor={getGradeColor(record.percentage)}
            format={(percent) => `${Math.round(percent || 0)}%`}
          />
        </div>
        )
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string, record: any) => (
        <div>
          <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
            {status === 'SUBMITTED' ? 'Entregada' :
             status === 'GRADED' ? 'Calificada' :
             status === 'PENDING' ? 'Pendiente' :
             status === 'NOT_SUBMITTED' ? 'No entregada' : status}
          </Tag>
          {record.submittedAt && (
            <div style={{ marginTop: '4px' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Entregada: {new Date(record.submittedAt).toLocaleDateString()}
              </Text>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Columnas para actividades
  const activityColumns = [
    {
      title: 'Actividad',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <Space>
          <TrophyOutlined style={{ color: '#52c41a' }} />
          <div>
            <Text strong>{title}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.type}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Puntuación',
      dataIndex: 'score',
      key: 'score',
      align: 'center' as const,
      render: (score: number | string | null, record: any) => (
        score === null || score === undefined || isNaN(Number(score)) ? (
          <Text strong>{score ?? 'Sin evaluar'}</Text>
        ) : (
        <div>
          <Text style={{ color: getGradeColor(record.percentage), fontSize: '16px', fontWeight: 'bold' }}>
            {Number(score).toFixed(1)}/{record.maxScore}
          </Text>
          <br />
          <Progress
            percent={record.percentage}
            size="small"
            strokeColor={getGradeColor(record.percentage)}
            format={(percent) => `${Math.round(percent || 0)}%`}
          />
        </div>
        )
      ),
    },
    {
      title: 'Fecha Evaluación',
      dataIndex: 'assessedAt',
      key: 'assessedAt',
      align: 'center' as const,
      render: (date: string) => (
        <Text type="secondary">
          {date ? new Date(date).toLocaleDateString() : 'Sin evaluar'}
        </Text>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <BookOutlined style={{ color: '#1890ff' }} />
          <span>Breakdown Detallado de Calificaciones</span>
        </Space>
      }
      visible={visible}
      onCancel={onCancel}
      width={1200}
      footer={null}
      bodyStyle={{ padding: '24px' }}
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="Cargando breakdown detallado..." />
        </div>
      )}

      {error && (
        <Alert
          message="Error al cargar datos"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {!loading && !error && breakdown && (
        <>
          {/* Header con información del estudiante */}
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={24}>
              <Col span={12}>
                <Descriptions title="Información del Estudiante" column={1} size="small">
                  <Descriptions.Item label="Nombre">
                    <Text strong>{breakdown.student.fullName}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Número de Matrícula">
                    {breakdown.student.enrollmentNumber}
                  </Descriptions.Item>
                  <Descriptions.Item label="Asignatura">
                    <Text strong>{breakdown.subject.name} ({breakdown.subject.code})</Text>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={12}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Calificación Final"
                      value={breakdown.finalGrade}
                      precision={1}
                      suffix="%"
                      valueStyle={{ color: getGradeColor(breakdown.finalGrade), fontSize: '32px' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Estado"
                      value={breakdown.status === 'FINAL' ? 'Finalizada' : 
                             breakdown.status === 'PROVISIONAL' ? 'Provisional' : 'Borrador'}
                      valueStyle={{ 
                        color: breakdown.status === 'FINAL' ? '#52c41a' : '#faad14',
                        fontSize: '16px'
                      }}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>

          {/* Breakdown por componentes */}
          <Card title="Breakdown por Componentes" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              {breakdown.breakdown && typeof breakdown.breakdown === 'object' && 
                Object.entries(breakdown.breakdown).map(([componentType, data]: [string, any]) => (
                <Col span={6} key={componentType}>
                  <Card size="small">
                    <Statistic
                      title={componentType.charAt(0).toUpperCase() + componentType.slice(1)}
                      value={data.grade}
                      precision={1}
                      suffix={`% (${data.weight}%)`}
                      valueStyle={{ color: getGradeColor(data.grade) }}
                    />
                    <Progress
                      percent={data.grade}
                      size="small"
                      strokeColor={getGradeColor(data.grade)}
                      format={() => `${data.count} items`}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Detalles por fuente de datos */}
          <Card title="Fuentes de Datos Detalladas">
            <Tabs defaultActiveKey="tasks">
              <TabPane 
                tab={
                  <span>
                    <BookOutlined />
                    Tareas ({breakdown.sourceDetails?.tasks?.length || 0})
                  </span>
                } 
                key="tasks"
              >
                <Table
                  columns={taskColumns}
                  dataSource={Array.isArray(breakdown.sourceDetails?.tasks) ? breakdown.sourceDetails.tasks : []}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              </TabPane>

              <TabPane 
                tab={
                  <span>
                    <TrophyOutlined />
                    Actividades ({breakdown.sourceDetails?.activities?.length || 0})
                  </span>
                } 
                key="activities"
              >
                <Table
                  columns={activityColumns}
                  dataSource={Array.isArray(breakdown.sourceDetails?.activities) ? breakdown.sourceDetails.activities : []}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              </TabPane>

              <TabPane 
                tab={
                  <span>
                    <CheckCircleOutlined />
                    Competencias ({breakdown.sourceDetails?.competencies?.length || 0})
                  </span>
                } 
                key="competencies"
              >
                {Array.isArray(breakdown.sourceDetails?.competencies) ? breakdown.sourceDetails.competencies.map((comp: any) => (
                  <Card key={comp.id} size="small" style={{ marginBottom: 8 }}>
                    <Row>
                      <Col span={16}>
                        <Text strong>{comp.competencyName}</Text>
                        <br />
                        <Text type="secondary">Nivel: {comp.level}</Text>
                      </Col>
                      <Col span={8} style={{ textAlign: 'right' }}>
                        <Text style={{ color: getGradeColor(comp.score), fontSize: '16px', fontWeight: 'bold' }}>
                          {comp.score}%
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {comp.evaluatedAt ? new Date(comp.evaluatedAt).toLocaleDateString() : 'Sin fecha'}
                        </Text>
                      </Col>
                    </Row>
                  </Card>
                )) : (
                  <Text type="secondary">No hay competencias disponibles</Text>
                )}
              </TabPane>

              <TabPane 
                tab={
                  <span>
                    <InfoCircleOutlined />
                    Rúbricas ({breakdown.sourceDetails?.rubrics?.length || 0})
                  </span>
                } 
                key="rubrics"
              >
                {Array.isArray(breakdown.sourceDetails?.rubrics) ? breakdown.sourceDetails.rubrics.map((rubric: any) => (
                  <Card key={rubric.id} size="small" style={{ marginBottom: 8 }}>
                    <Row>
                      <Col span={16}>
                        <Text strong>{rubric.title}</Text>
                        <br />
                        <Progress
                          percent={(rubric.totalScore / rubric.maxScore) * 100}
                          size="small"
                          strokeColor={getGradeColor(rubric.percentage)}
                        />
                      </Col>
                      <Col span={8} style={{ textAlign: 'right' }}>
                        <Text style={{ color: getGradeColor(rubric.percentage), fontSize: '16px', fontWeight: 'bold' }}>
                          {rubric.totalScore.toFixed(1)}/{rubric.maxScore}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {rubric.assessedAt ? new Date(rubric.assessedAt).toLocaleDateString() : 'Sin fecha'}
                        </Text>
                      </Col>
                    </Row>
                  </Card>
                )) : (
                  <Text type="secondary">No hay rúbricas disponibles</Text>
                )}
              </TabPane>
            </Tabs>
          </Card>

          {/* Información adicional */}
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Items Completados"
                  value={breakdown.metrics?.completedItems || 0}
                  suffix={`/ ${breakdown.metrics?.totalItems || 0}`}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Calidad de Datos"
                  value={(breakdown.metrics?.dataQuality || 0) * 100}
                  precision={0}
                  suffix="%"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Última Actualización"
                  value={breakdown.lastCalculated ? new Date(breakdown.lastCalculated).toLocaleDateString() : 'N/A'}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Modal>
  );
};

export default StudentGradeBreakdownModal;