/**
 * @archivo: RubricFamilyView.tsx
 * @módulo: Rubrics (Vista Familiar de Evaluaciones por Rúbricas)
 * @función: Componente para que familias vean evaluaciones detalladas de sus hijos
 * @crítico: SÍ - Sistema de comunicación académica familia-escuela
 * @dependencias: RubricGrid, useRubrics hook, Ant Design, dayjs
 * @no_modificar: Cálculo de performance levels sin verificar escalas oficiales
 * @relacionado_con: useRubrics.ts, RubricGrid.tsx, family dashboard pages
 */

/**
 * COMPONENTE: RubricFamilyView
 * UBICACIÓN: /frontend/src/components/rubrics/RubricFamilyView.tsx
 * FUNCIÓN: Vista detallada de evaluaciones por rúbricas para acceso familiar
 * NO USAR PARA: Evaluación por profesores (usar RubricAssessment) o edición de rúbricas
 * PROPS CRÍTICAS:
 *   - assessment: RubricAssessmentType con criterionAssessments completos
 *   - rubric: Rubric con criteria, levels, cells completas
 *   - studentName: Nombre del estudiante evaluado
 *   - activityName: Nombre de la actividad evaluada
 *   - activityDate: Fecha de la evaluación
 * 
 * ESTRUCTURA DE EVALUACIÓN:
 * - Rubric: Define criterios, niveles y celdas de evaluación
 * - RubricAssessment: Contiene criterionAssessments por estudiante
 * - CriterionAssessment: Evaluación específica criterio+nivel+celda
 * - Cálculo automático: totalScore, maxPossibleScore, percentage
 * 
 * VISTA RESUMIDA (Card principal):
 * - Información general: estudiante, fecha, rúbrica utilizada
 * - Progress circle con puntuación visual
 * - Performance level con emoji y color
 * - Fortalezas destacadas (criterios con mejor puntuación)
 * - Áreas de mejora (criterios con menor puntuación)
 * - Botón "Ver Detalle" para modal completo
 * 
 * VISTA DETALLADA (Modal):
 * - Header con estadísticas: puntuación total, porcentaje, nivel
 * - RubricGrid en modo view-only con celdas seleccionadas resaltadas
 * - Timeline detallado por criterios con puntuaciones individuales
 * - Comentarios del profesor por criterio y generales
 * - Análisis automático: fortalezas vs áreas de mejora
 * - Recomendaciones contextuales según nivel de rendimiento
 * 
 * SISTEMA DE PERFORMANCE LEVELS:
 * - Excelente (≥90%): Verde, emoji 🌟
 * - Muy Bueno (≥80%): Verde claro, emoji 🏆
 * - Bueno (≥70%): Verde pálido, emoji 👍
 * - Satisfactorio (≥60%): Amarillo, emoji 👌
 * - Aceptable (≥50%): Amarillo claro, emoji 📚
 * - Necesita Mejorar (<50%): Rojo, emoji 💪
 * 
 * ANÁLISIS AUTOMÁTICO:
 * getStrengthsAndAreas():
 * - Identifica criterios con máxima puntuación (fortalezas)
 * - Identifica criterios con mínima puntuación (áreas mejora)
 * - Ordena criterios por scoreValue para ranking
 * - Filtra para evitar duplicados y casos edge
 * 
 * CARACTERÍSTICAS UX:
 * - Design amigable para familias (iconos, colores, emojis)
 * - Información pedagógica accesible (sin jerga técnica)
 * - Tooltips explicativos para campos técnicos
 * - Progress visual intuitivo
 * - Recomendaciones constructivas y motivadoras
 * 
 * INTEGRACIÓN CON SISTEMA:
 * - Recibe datos desde family dashboard o activities pages
 * - Compatible con múltiples tipos de rúbricas
 * - Soporte para weighted criteria (pesos por criterio)
 * - Display responsivo para móvil y desktop
 * 
 * FUNCIONALIDADES AVANZADAS:
 * - Modal controlado por prop showDetailModal
 * - Callback onCloseDetail para navegación externa
 * - Paginación implícita (solo primeras 2 fortalezas/mejoras en resumen)
 * - Scroll interno en modal para contenido extenso
 * - Timeline visual para progresión por criterios
 * 
 * LIMITACIONES CONOCIDAS:
 * - Performance levels hardcoded (no configurables)
 * - Sin export/print functionality
 * - Sin comparación histórica entre evaluaciones
 * - Sin gráficos de tendencia temporal
 * 
 * ESTADO ACTUAL: ✅ COMPONENTE FUNCIONAL
 * - Vista resumida y detallada implementadas
 * - Cálculos automáticos operativos
 * - UI responsiva y accesible
 * - Integración con RubricGrid funcionando
 * - Análisis pedagógico automático
 */

import React, { useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Tooltip,
  Button,
  Modal,
  Timeline,
  Avatar
} from 'antd';
import {
  TrophyOutlined,
  EyeOutlined,
  CalendarOutlined,
  CommentOutlined,
  StarOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Rubric, RubricAssessment as RubricAssessmentType } from '../../hooks/useRubrics';
import RubricGrid from './RubricGrid';
import dayjs from 'dayjs';
import { formatNumber } from '@utils/numberFormat';

const { Title, Text, Paragraph } = Typography;

interface RubricFamilyViewProps {
  assessment: RubricAssessmentType;
  rubric: Rubric;
  studentName: string;
  activityName: string;
  activityDate: string;
  showDetailModal?: boolean;
  onCloseDetail?: () => void;
}

interface CriterionDetail {
  criterionId: string;
  criterionName: string;
  criterionWeight: number;
  selectedLevel: {
    name: string;
    color: string;
    scoreValue: number;
    description?: string;
  };
  cellContent: string;
  comments?: string;
}

const RubricFamilyView: React.FC<RubricFamilyViewProps> = ({
  assessment,
  rubric,
  studentName,
  activityName,
  activityDate,
  showDetailModal = false,
  onCloseDetail
}) => {
  const [detailModalVisible, setDetailModalVisible] = useState(showDetailModal);

  // Procesar datos de la evaluación
  const criteriaDetails: CriterionDetail[] = assessment.criterionAssessments.map((ca: any) => {
    const criterion = rubric.criteria.find(c => c.id === ca.criterionId);
    const level = rubric.levels.find(l => l.id === ca.levelId);
    const cell = rubric.cells.find(c => c.id === ca.cellId);
    
    return {
      criterionId: ca.criterionId,
      criterionName: criterion?.name || 'Criterio',
      criterionWeight: criterion?.weight || 0,
      selectedLevel: {
        name: level?.name || 'Nivel',
        color: level?.color || '#d9d9d9',
        scoreValue: level?.scoreValue || 0,
        description: level?.description
      },
      cellContent: cell?.content || '',
      comments: ca.comments
    };
  });

  // Calcular estadísticas
  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { level: 'Excelente', color: '#52c41a', icon: '🌟' };
    if (percentage >= 80) return { level: 'Muy Bueno', color: '#73d13d', icon: '🏆' };
    if (percentage >= 70) return { level: 'Bueno', color: '#95de64', icon: '👍' };
    if (percentage >= 60) return { level: 'Satisfactorio', color: '#faad14', icon: '👌' };
    if (percentage >= 50) return { level: 'Aceptable', color: '#ffc53d', icon: '📚' };
    return { level: 'Necesita Mejorar', color: '#ff7875', icon: '💪' };
  };

  const performance = getPerformanceLevel(assessment.percentage);

  // Obtener fortalezas y áreas de mejora
  const getStrengthsAndAreas = () => {
    const sortedCriteria = [...criteriaDetails].sort((a, b) => b.selectedLevel.scoreValue - a.selectedLevel.scoreValue);
    const maxScore = Math.max(...criteriaDetails.map(c => c.selectedLevel.scoreValue));
    const minScore = Math.min(...criteriaDetails.map(c => c.selectedLevel.scoreValue));
    
    const strengths = sortedCriteria.filter(c => c.selectedLevel.scoreValue === maxScore);
    const areasToImprove = sortedCriteria.filter(c => c.selectedLevel.scoreValue === minScore && minScore < maxScore);
    
    return { strengths, areasToImprove };
  };

  const { strengths, areasToImprove } = getStrengthsAndAreas();

  const handleViewDetail = () => {
    setDetailModalVisible(true);
  };

  const handleCloseModal = () => {
    setDetailModalVisible(false);
    if (onCloseDetail) {
      onCloseDetail();
    }
  };

  return (
    <>
      {/* Vista resumida */}
      <Card
        title={
          <Space>
            <TrophyOutlined style={{ color: performance.color }} />
            <span>Evaluación: {activityName}</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<EyeOutlined />} onClick={handleViewDetail}>
            Ver Detalle
          </Button>
        }
      >
        <Row gutter={16}>
          {/* Información general */}
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '16px' }}>{studentName}</Text>
              <Text type="secondary">
                <CalendarOutlined /> {dayjs(activityDate).format('DD/MM/YYYY')}
              </Text>
              <Tag color="blue">{rubric.name}</Tag>
            </Space>
          </Col>
          
          {/* Puntuación */}
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={assessment.percentage}
                strokeColor={performance.color}
                width={80}
                format={() => (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {formatNumber(assessment.totalScore)}
                    </div>
                    <div style={{ fontSize: '10px' }}>
                      /{assessment.maxPossibleScore}
                    </div>
                  </div>
                )}
              />
              <div style={{ marginTop: '8px' }}>
                <Tag color={performance.color} style={{ fontSize: '12px' }}>
                  {performance.icon} {performance.level}
                </Tag>
              </div>
            </div>
          </Col>
          
          {/* Resumen criterios */}
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Statistic
                title="Criterios Evaluados"
                value={criteriaDetails.length}
                suffix={`/ ${rubric.criteria.length}`}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
              
              {assessment.comments && (
                <Tooltip title={assessment.comments}>
                  <Text type="secondary">
                    <CommentOutlined /> Comentarios del profesor
                  </Text>
                </Tooltip>
              )}
            </Space>
          </Col>
        </Row>
        
        {/* Puntos destacados */}
        <Row gutter={16} style={{ marginTop: '16px' }}>
          {strengths.length > 0 && (
            <Col span={12}>
              <Alert
                message="Fortalezas Destacadas"
                description={
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }} className="text-gray-800 dark:text-gray-200">
                    {strengths.slice(0, 2).map(strength => (
                      <li key={strength.criterionId} className="text-gray-800 dark:text-gray-200">
                        <Text strong className="text-gray-800 dark:text-gray-200">{strength.criterionName}</Text>
                        <Tag color={strength.selectedLevel.color} style={{ marginLeft: '4px' }}>
                          {strength.selectedLevel.name}
                        </Tag>
                      </li>
                    ))}
                  </ul>
                }
                type="success"
                showIcon
                icon={<StarOutlined />}
              />
            </Col>
          )}
          
          {areasToImprove.length > 0 && (
            <Col span={12}>
              <Alert
                message="Áreas de Mejora"
                description={
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }} className="text-gray-800 dark:text-gray-200">
                    {areasToImprove.slice(0, 2).map(area => (
                      <li key={area.criterionId} className="text-gray-800 dark:text-gray-200">
                        <Text className="text-gray-800 dark:text-gray-200">{area.criterionName}</Text>
                        <Tag color={area.selectedLevel.color} style={{ marginLeft: '4px' }}>
                          {area.selectedLevel.name}
                        </Tag>
                      </li>
                    ))}
                  </ul>
                }
                type="warning"
                showIcon
                icon={<InfoCircleOutlined />}
              />
            </Col>
          )}
        </Row>
      </Card>

      {/* Modal de detalle */}
      <Modal
        title={
          <Space>
            <TrophyOutlined style={{ color: performance.color }} />
            Evaluación Detallada - {activityName}
          </Space>
        }
        open={detailModalVisible}
        onCancel={handleCloseModal}
        width={1000}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            Cerrar
          </Button>
        ]}
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Header del modal */}
          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Puntuación Total"
                  value={assessment.totalScore}
                  suffix={`/ ${assessment.maxPossibleScore}`}
                  precision={1}
                  valueStyle={{ color: performance.color }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Porcentaje"
                  value={assessment.percentage}
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: performance.color }}
                  prefix={<StarOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: performance.color }}>
                    {performance.level}
                  </div>
                  <div style={{ fontSize: '24px' }}>{performance.icon}</div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Rúbrica con resultados */}
          <Card title="Rúbrica de Evaluación" style={{ marginBottom: '16px' }}>
            <RubricGrid
              rubric={rubric}
              editable={false}
              viewMode="view"
              selectedCells={assessment.criterionAssessments.map((ca: any) => ca.cellId)}
            />
          </Card>

          {/* Detalle por criterios */}
          <Card title="Detalle por Criterios" style={{ marginBottom: '16px' }}>
            <Timeline>
              {criteriaDetails.map((detail, index) => (
                <Timeline.Item
                  key={detail.criterionId}
                  dot={
                    <Avatar
                      size="small"
                      style={{ 
                        backgroundColor: detail.selectedLevel.color,
                        color: '#fff',
                        fontSize: '12px'
                      }}
                    >
                      {detail.selectedLevel.scoreValue}
                    </Avatar>
                  }
                >
                  <Space direction="vertical" size="small">
                    <Space>
                      <Text strong>{detail.criterionName}</Text>
                      <Tag color="blue">Peso: {Math.round(detail.criterionWeight * 100)}%</Tag>
                    </Space>
                    
                    <Space>
                      <Text>Nivel obtenido:</Text>
                      <Tag color={detail.selectedLevel.color}>
                        {detail.selectedLevel.name} ({detail.selectedLevel.scoreValue} pts)
                      </Tag>
                    </Space>
                    
                    {detail.cellContent && (
                      <Text type="secondary" style={{ fontStyle: 'italic' }}>
                        "{detail.cellContent}"
                      </Text>
                    )}
                    
                    {detail.comments && (
                      <Alert
                        message="Comentario del profesor"
                        description={detail.comments}
                        type="info"
                        showIcon
                        icon={<CommentOutlined />}
                      />
                    )}
                  </Space>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>

          {/* Comentarios generales */}
          {assessment.comments && (
            <Card title="Comentarios Generales del Profesor">
              <Paragraph>{assessment.comments}</Paragraph>
            </Card>
          )}

          {/* Recomendaciones */}
          <Card title="Análisis y Recomendaciones">
            <Row gutter={16}>
              <Col span={12}>
                <Text strong style={{ color: '#52c41a' }}>Fortalezas:</Text>
                <ul style={{ marginTop: '8px' }} className="text-gray-800 dark:text-gray-200">
                  {strengths.map(strength => (
                    <li key={strength.criterionId} className="text-gray-800 dark:text-gray-200">
                      <Text className="text-gray-800 dark:text-gray-200">{strength.criterionName}: </Text>
                      <Text type="secondary" className="text-gray-600 dark:text-gray-400">{strength.cellContent}</Text>
                    </li>
                  ))}
                </ul>
              </Col>
              
              <Col span={12}>
                <Text strong style={{ color: '#faad14' }}>Áreas de Mejora:</Text>
                <ul style={{ marginTop: '8px' }} className="text-gray-800 dark:text-gray-200">
                  {areasToImprove.map(area => (
                    <li key={area.criterionId} className="text-gray-800 dark:text-gray-200">
                      <Text className="text-gray-800 dark:text-gray-200">{area.criterionName}: </Text>
                      <Text type="secondary" className="text-gray-600 dark:text-gray-400">{area.cellContent}</Text>
                    </li>
                  ))}
                </ul>
              </Col>
            </Row>
            
            <Alert
              message="Sugerencias para seguir mejorando"
              description={
                assessment.percentage >= 80 
                  ? "¡Excelente trabajo! Continúa practicando para mantener este nivel de rendimiento."
                  : assessment.percentage >= 60
                  ? "Buen trabajo en general. Enfócate en las áreas de mejora identificadas para alcanzar un nivel superior."
                  : "Hay potencial para mejorar. Practica más en las áreas identificadas y no dudes en pedir ayuda al profesor."
              }
              type={assessment.percentage >= 80 ? 'success' : assessment.percentage >= 60 ? 'info' : 'warning'}
              showIcon
              style={{ marginTop: '16px' }}
            />
          </Card>
        </div>
      </Modal>
    </>
  );
};

export default RubricFamilyView;