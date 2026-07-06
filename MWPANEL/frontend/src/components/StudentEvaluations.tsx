import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Table,
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Statistic,
  Descriptions,
  Empty,
  Spin,
  message,
  Button,
  Rate,
  Progress
} from 'antd';
import {
  FileTextOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  TrophyOutlined
} from '@ant-design/icons';
// import { Radar } from '@ant-design/plots'; // TODO: Install @ant-design/plots for radar chart
import apiClient from '../services/apiClient';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface Student {
  id: string;
  enrollmentNumber: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface Evaluation {
  id: string;
  student: Student;
  teacher: {
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  subject: {
    name: string;
    code: string;
  };
  period: {
    name: string;
    type: string;
  };
  status: string;
  overallScore: number;
  generalObservations: string;
  competencyEvaluations: Array<{
    competency: {
      code: string;
      name: string;
    };
    score: number;
    observations: string;
  }>;
  createdAt: string;
}

interface RadarData {
  competencies: Array<{
    code: string;
    name: string;
    score: number;
    maxScore: number;
  }>;
  overallScore: number;
  date: string;
}

interface StudentEvaluationsProps {
  visible: boolean;
  onClose: () => void;
  student: Student | null;
}

const getStatusColor = (status: string) => {
  const colors = {
    draft: 'orange',
    submitted: 'blue',
    reviewed: 'purple',
    finalized: 'green'
  };
  return colors[status as keyof typeof colors] || 'default';
};

const getStatusText = (status: string) => {
  const texts = {
    draft: 'Borrador',
    submitted: 'Enviada',
    reviewed: 'Revisada', 
    finalized: 'Finalizada'
  };
  return texts[status as keyof typeof texts] || status;
};

const getScoreColor = (score: number) => {
  if (score >= 4.5) return '#52c41a'; // Verde
  if (score >= 3.5) return '#faad14'; // Amarillo
  if (score >= 2.5) return '#fa8c16'; // Naranja
  return '#f5222d'; // Rojo
};

const StudentEvaluations: React.FC<StudentEvaluationsProps> = ({
  visible,
  onClose,
  student
}) => {
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [activePeriod, setActivePeriod] = useState<any>(null);

  useEffect(() => {
    if (visible && student) {
      fetchEvaluations();
      fetchPeriods();
    }
  }, [visible, student]);

  const fetchEvaluations = async () => {
    if (!student) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/evaluations/student/${student.id}`);
      setEvaluations(response.data);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      message.error('Error al cargar las evaluaciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const activePeriodResponse = await apiClient.get('/evaluations/periods/active');
      setActivePeriod(activePeriodResponse.data);
      
      // Fetch radar chart for active period
      if (student && activePeriodResponse.data) {
        fetchRadarChart(activePeriodResponse.data.id);
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  };

  const fetchRadarChart = async (periodId: string) => {
    if (!student) return;
    
    try {
      const response = await apiClient.get(`/evaluations/radar/${student.id}/${periodId}`);
      setRadarData(response.data.data);
    } catch (error) {
      console.error('Error fetching radar chart:', error);
    }
  };

  const evaluationColumns = [
    {
      title: 'Asignatura',
      dataIndex: ['subject', 'name'],
      key: 'subject',
      render: (text: string, record: Evaluation) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.subject.code}
          </Text>
        </div>
      )
    },
    {
      title: 'Profesor',
      dataIndex: ['teacher', 'user', 'profile'],
      key: 'teacher',
      render: (profile: any) => `${profile.firstName} ${profile.lastName}`
    },
    {
      title: 'Período',
      dataIndex: ['period', 'name'],
      key: 'period'
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Nota General',
      dataIndex: 'overallScore',
      key: 'overallScore',
      render: (score: number) => (
        <div style={{ textAlign: 'center' }}>
          <Text 
            strong 
            style={{ 
              color: getScoreColor(score),
              fontSize: '16px'
            }}
          >
            {score?.toFixed(1) || 'N/A'}
          </Text>
          <br />
          <Rate 
            disabled 
            value={score} 
            count={5} 
            allowHalf 
            style={{ fontSize: '12px' }}
          />
        </div>
      )
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('es-ES')
    }
  ];

  const competencyColumns = [
    {
      title: 'Competencia',
      dataIndex: ['competency', 'code'],
      key: 'competency',
      render: (code: string, record: any) => (
        <div>
          <Tag color="blue">{code}</Tag>
          <br />
          <Text style={{ fontSize: '12px' }}>
            {record.competency.name}
          </Text>
        </div>
      )
    },
    {
      title: 'Puntuación',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <div style={{ textAlign: 'center' }}>
          <Progress 
            type="circle" 
            percent={score * 20} 
            format={() => score.toFixed(1)}
            width={50}
            strokeColor={getScoreColor(score)}
          />
        </div>
      )
    },
    {
      title: 'Observaciones',
      dataIndex: 'observations',
      key: 'observations',
      render: (text: string) => text || <Text type="secondary">Sin observaciones</Text>
    }
  ];

  const renderStatistics = () => {
    if (evaluations.length === 0) return null;

    const avgScore = evaluations.reduce((sum, evaluation) => sum + (evaluation.overallScore || 0), 0) / evaluations.length;
    const completedEvaluations = evaluations.filter(evaluation => evaluation.status === 'finalized').length;
    const totalCompetencies = evaluations.reduce((sum, evaluation) => sum + evaluation.competencyEvaluations.length, 0);

    return (
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Nota Media"
              value={avgScore}
              precision={1}
              valueStyle={{ color: getScoreColor(avgScore) }}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Evaluaciones"
              value={evaluations.length}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completadas"
              value={completedEvaluations}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Competencias"
              value={totalCompetencies}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  const renderRadarChart = () => {
    if (!radarData || !radarData.competencies.length) {
      return (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No hay datos de competencias para mostrar"
        />
      );
    }


    return (
      <div>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card>
              <Statistic
                title="Puntuación General"
                value={radarData.overallScore}
                precision={1}
                valueStyle={{ color: getScoreColor(radarData.overallScore) }}
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Statistic
                title="Período"
                value={activePeriod?.name || 'N/A'}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
        
        <Card title="Diana Competencial">
          <Title level={5}>Competencias Evaluadas</Title>
          <Row gutter={[16, 16]}>
            {radarData.competencies.map(comp => (
              <Col span={12} key={comp.code}>
                <Card size="small">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Competencia">
                      <Tag color="blue">{comp.code}</Tag> {comp.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Puntuación">
                      <Progress 
                        percent={comp.score * 20} 
                        format={() => `${comp.score.toFixed(1)}/5`}
                        strokeColor={getScoreColor(comp.score)}
                      />
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      </div>
    );
  };

  const expandedRowRender = (record: Evaluation) => {
    if (!record.competencyEvaluations.length) {
      return <Empty description="Sin evaluaciones por competencia" />;
    }

    return (
      <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
        <Title level={5}>Evaluaciones por Competencia</Title>
        <Table
          columns={competencyColumns}
          dataSource={record.competencyEvaluations}
          pagination={false}
          size="small"
          rowKey={(record, index) => `${record.competency.code}-${index}`}
        />
        {record.generalObservations && (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>Observaciones Generales</Title>
            <Text>{record.generalObservations}</Text>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      title={
        <div>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Evaluaciones de {student?.user?.profile?.firstName} {student?.user?.profile?.lastName}
          <Text type="secondary" style={{ fontSize: '14px', marginLeft: 8 }}>
            ({student?.enrollmentNumber})
          </Text>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>
      ]}
      style={{ top: 20 }}
    >
      <Spin spinning={loading}>
        {renderStatistics()}
        
        <Tabs defaultActiveKey="evaluations">
          <TabPane 
            tab={
              <span>
                <FileTextOutlined />
                Evaluaciones ({evaluations.length})
              </span>
            } 
            key="evaluations"
          >
            {evaluations.length > 0 ? (
              <Table
                columns={evaluationColumns}
                dataSource={evaluations}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total: ${total} evaluaciones`
                }}
                expandable={{
                  expandedRowRender,
                  expandRowByClick: true
                }}
              />
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay evaluaciones registradas para este estudiante"
              />
            )}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                Diana Competencial
              </span>
            } 
            key="radar"
          >
            {renderRadarChart()}
          </TabPane>
        </Tabs>
      </Spin>
    </Modal>
  );
};

export default StudentEvaluations;