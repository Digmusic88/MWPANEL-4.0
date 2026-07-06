/**
 * @archivo: StudentCompetenciesPage.tsx
 * @módulo: Student Pages (Vista de Competencias del Estudiante)
 * @función: Dashboard de progreso competencial para estudiantes
 * @crítico: SÍ - Vista de progreso personal del sistema competencial
 * @dependencias: useCompetencies, CompetencyForm, RadarChart
 * @relacionado_con: Sistema competencial, evaluaciones formativas
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Progress,
  Tag,
  Tabs,
  Empty,
  Timeline,
  Badge,
  Statistic,
  Spin,
  Alert,
  Button,
} from 'antd';
import {
  TrophyOutlined,
  BookOutlined,
  BarChartOutlined,
  CalendarOutlined,
  StarOutlined,
  RiseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import EvaluationRadarChart from '@components/evaluation/RadarChart';
import LomloeCompetencyRadar from '@components/competencies/LomloeCompetencyRadar';
import StaggerContainer, { StaggerItem } from '@components/animations/StaggerContainer';
import HoverCard, { StatCard } from '@components/animations/HoverCard';
import FadeInUp from '@components/animations/FadeInUp';
import { useStudentCompetencies } from '@hooks/useStudentCompetencies';
import { useStudentLomloeCompetencies } from '@hooks/useStudentLomloeCompetencies';
import { formatNumber, formatTaskGrade } from '@utils/numberFormat';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const StudentCompetenciesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('progress');
  
  // Use the custom hook to fetch real competency data
  const {
    competencyData,
    evaluationHistory,
    stats,
    loading,
    error,
    refetch,
  } = useStudentCompetencies();

  const [selfStudentId, setSelfStudentId] = useState<string | undefined>(undefined);
  useEffect(() => {
    apiClient.get('/students/me')
      .then((r) => setSelfStudentId(r.data?.id))
      .catch(() => setSelfStudentId(undefined));
  }, []);
  const lomloe = useStudentLomloeCompetencies(selfStudentId);

  const getScoreColor = (score: number) => {
    if (score >= 9) return '#52c41a';
    if (score >= 7) return '#1890ff';
    if (score >= 5) return '#faad14';
    return '#f5222d';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 9) return 'Excelente';
    if (score >= 7) return 'Bueno';
    if (score >= 5) return 'Satisfactorio';
    return 'Necesita Mejorar';
  };

  // Helper function to determine if a score is rubric-based
  // Rubric scores are typically > 10 (scaled to 100), traditional scores are ≤ 10
  const isRubricBasedScore = (score: number) => {
    return score > 10;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large">
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            Cargando competencias del estudiante...
          </div>
        </Spin>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <Alert
          message="Error al cargar competencias"
          description={error}
          type="error"
          showIcon
          action={
            <Button 
              icon={<ReloadOutlined />} 
              onClick={refetch}
            >
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-sm">
          <Row align="middle" justify="space-between">
            <Col>
              <Space size="large">
                <div>
                  <Title level={2} className="mb-1">
                    <TrophyOutlined className="mr-2 text-blue-600" />
                    Mi Progreso en Competencias
                  </Title>
                  <Text type="secondary" className="text-base">
                    Seguimiento de tu desarrollo competencial
                  </Text>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <StaggerContainer staggerDelay={0.15} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <StatCard
            title="Promedio General"
            value={formatTaskGrade(stats.averageScore, isRubricBasedScore(stats.averageScore), 10)}
            suffix=""
            icon={<TrophyOutlined />}
            trend="up"
            trendValue={stats.averageScore >= 7 ? "Buen rendimiento" : "En desarrollo"}
            className="h-full"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Competencias Evaluadas"
            value={stats.evaluatedCompetencies}
            icon={<BookOutlined />}
            trend="up"
            trendValue={`${stats.evaluatedCompetencies} de ${stats.totalCompetencies} competencias`}
            className="h-full"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Evaluaciones Completadas"
            value={stats.completedEvaluations}
            icon={<BarChartOutlined />}
            trend="up"
            trendValue={`${stats.completedEvaluations} este trimestre`}
            className="h-full"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Mejor Competencia"
            value={stats.bestCompetency.code}
            icon={<StarOutlined />}
            trend="up"
            trendValue={stats.bestCompetency.name}
            className="h-full"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Main Content */}
      <FadeInUp delay={0.3}>
        <Card className="shadow-sm">
          <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
            <TabPane 
              tab={
                <span>
                  <BarChartOutlined />
                  Progreso Actual
                </span>
              } 
              key="progress"
            >
              <Row gutter={[24, 24]}>
                {/* Radar Chart */}
                <Col xs={24} lg={14}>
                  {lomloe.hasData && lomloe.byKey.length > 0 ? (
                    <LomloeCompetencyRadar data={lomloe.byKey} height={400} />
                  ) : competencyData.length > 0 ? (
                    <EvaluationRadarChart
                      data={competencyData}
                      title="Mi Perfil Competencial"
                      studentName="Tu Progreso"
                      period="1º Trimestre 2024-25"
                      height={400}
                      showObservations={false}
                    />
                  ) : (
                    <Card className="h-96 flex items-center justify-center">
                      <Empty
                        description="No hay datos de competencias disponibles"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </Card>
                  )}
                </Col>

                {/* Competencies List */}
                <Col xs={24} lg={10}>
                  <Card title="Detalle por Competencia" size="small">
                    <Space direction="vertical" className="w-full" size="middle">
                      {competencyData.length > 0 ? (
                        competencyData.map((comp, index) => (
                          <motion.div
                            key={comp.code}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          >
                            <Card size="small" className="bg-gray-50">
                              <Space direction="vertical" className="w-full" size="small">
                                <div className="flex justify-between items-center">
                                  <Tag color={getScoreColor(comp.score)}>
                                    {comp.code}
                                  </Tag>
                                  <Text strong style={{ color: getScoreColor(comp.score) }}>
                                    {comp.score > 0 
                                      ? formatTaskGrade(comp.score, isRubricBasedScore(comp.score), 10)
                                      : 'Sin evaluar'
                                    }
                                  </Text>
                                </div>
                                <Text className="text-sm">{comp.competency}</Text>
                                {comp.score > 0 ? (
                                  <Progress
                                    percent={(comp.score / (isRubricBasedScore(comp.score) ? 100 : 10)) * 100}
                                    strokeColor={getScoreColor(comp.score)}
                                    size="small"
                                    format={() => getScoreDescription(comp.score)}
                                  />
                                ) : (
                                  <Progress
                                    percent={0}
                                    strokeColor="#d9d9d9"
                                    size="small"
                                    format={() => 'Pendiente'}
                                  />
                                )}
                                {comp.observations && (
                                  <Text type="secondary" className="text-xs">
                                    {comp.observations}
                                  </Text>
                                )}
                              </Space>
                            </Card>
                          </motion.div>
                        ))
                      ) : (
                        <Empty
                          description="No hay competencias evaluadas"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      )}
                    </Space>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane 
              tab={
                <span>
                  <CalendarOutlined />
                  Historial de Evaluaciones
                </span>
              } 
              key="history"
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                  <Card title="Cronología de Evaluaciones">
                    {evaluationHistory.length > 0 ? (
                      <Timeline mode="left">
                        {evaluationHistory.map((evaluation) => (
                          <Timeline.Item
                            key={evaluation.id}
                            color={getScoreColor(evaluation.averageScore)}
                            label={new Date(evaluation.date).toLocaleDateString('es-ES')}
                          >
                            <Space direction="vertical" size="small">
                              <div className="flex items-center gap-2">
                                <Text strong>{evaluation.subject}</Text>
                                <Tag color="blue">{evaluation.period}</Tag>
                              </div>
                              <div className="flex items-center gap-2">
                                <Text>Puntuación: </Text>
                                <Text strong style={{ color: getScoreColor(evaluation.averageScore) }}>
                                  {evaluation.averageScore > 0 
                                    ? formatTaskGrade(evaluation.averageScore, isRubricBasedScore(evaluation.averageScore), 10)
                                    : 'Sin calificar'
                                  }
                                </Text>
                                {evaluation.averageScore > 0 && (
                                  <Text type="secondary">
                                    ({getScoreDescription(evaluation.averageScore)})
                                  </Text>
                                )}
                              </div>
                            </Space>
                          </Timeline.Item>
                        ))}
                      </Timeline>
                    ) : (
                      <Empty
                        description="No hay evaluaciones disponibles"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </Card>
                </Col>

                <Col xs={24} lg={8}>
                  <Space direction="vertical" className="w-full" size="large">
                    {/* Summary Stats */}
                    <Card title="Resumen del Trimestre" size="small">
                      <Space direction="vertical" className="w-full">
                        <Statistic
                          title="Promedio General"
                          value={formatTaskGrade(stats.averageScore, isRubricBasedScore(stats.averageScore), 10)}
                          valueStyle={{ color: getScoreColor(stats.averageScore) }}
                          prefix={<TrophyOutlined />}
                        />
                        <Statistic
                          title="Evaluaciones Completadas"
                          value={stats.completedEvaluations}
                          prefix={<BookOutlined />}
                        />
                        <Statistic
                          title="Progreso"
                          value={stats.totalCompetencies > 0 ? Math.round((stats.evaluatedCompetencies / stats.totalCompetencies) * 100) : 0}
                          suffix="%"
                          prefix={<RiseOutlined />}
                          valueStyle={{ color: '#3f8600' }}
                        />
                      </Space>
                    </Card>

                    {/* Achievements */}
                    <Card title="Logros" size="small">
                      <Space direction="vertical" className="w-full" size="small">
                        {stats.bestCompetency.score >= 9 && (
                          <div className="flex items-center gap-2">
                            <Badge color="gold" />
                            <Text className="text-sm">Excelencia en {stats.bestCompetency.code}</Text>
                          </div>
                        )}
                        {stats.averageScore >= 7 && (
                          <div className="flex items-center gap-2">
                            <Badge color="blue" />
                            <Text className="text-sm">Rendimiento Notable</Text>
                          </div>
                        )}
                        {stats.evaluatedCompetencies >= 4 && (
                          <div className="flex items-center gap-2">
                            <Badge color="green" />
                            <Text className="text-sm">Evaluaciones Activas</Text>
                          </div>
                        )}
                        {stats.completedEvaluations === 0 && (
                          <div className="flex items-center gap-2">
                            <Badge color="orange" />
                            <Text className="text-sm">Comenzando Evaluaciones</Text>
                          </div>
                        )}
                      </Space>
                    </Card>
                  </Space>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Card>
      </FadeInUp>
    </div>
  );
};

export default StudentCompetenciesPage;