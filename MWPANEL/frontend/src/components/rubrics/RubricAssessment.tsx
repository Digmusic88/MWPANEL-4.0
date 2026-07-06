import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Tag,
  Modal,
  Input,
  message,
  Divider,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Tooltip
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  CommentOutlined
} from '@ant-design/icons';
import { Rubric, RubricAssessment as RubricAssessmentType, useRubrics } from '../../hooks/useRubrics';
import RubricGrid from './RubricGrid';
import { formatNumber, formatPercentage } from '@utils/numberFormat';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface RubricAssessmentProps {
  rubric: Rubric;
  studentId: string;
  studentName: string;
  activityAssessmentId: string;
  existingAssessment?: RubricAssessmentType | null;
  onAssessmentComplete: (assessment: RubricAssessmentType) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

interface SelectedCriterion {
  criterionId: string;
  levelId: string;
  cellId: string;
  comments?: string;
}

const RubricAssessment: React.FC<RubricAssessmentProps> = ({
  rubric,
  studentId,
  studentName,
  activityAssessmentId,
  existingAssessment,
  onAssessmentComplete,
  onCancel,
  readOnly = false
}) => {
  const { createAssessment, calculateScore } = useRubrics();
  
  const [selectedCriteria, setSelectedCriteria] = useState<SelectedCriterion[]>([]);
  const [globalComments, setGlobalComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [currentCriterion, setCurrentCriterion] = useState<{ criterionId: string; levelId: string } | null>(null);
  const [criterionComment, setCriterionComment] = useState('');

  // Inicializar con evaluación existente
  useEffect(() => {
    if (existingAssessment) {
      const criteria = existingAssessment.criterionAssessments.map((ca: any) => ({
        criterionId: ca.criterionId,
        levelId: ca.levelId,
        cellId: ca.cellId,
        comments: ca.comments
      }));
      setSelectedCriteria(criteria);
      setGlobalComments(existingAssessment.comments || '');
    }
  }, [existingAssessment]);

  // Calcular puntuación actual
  const calculateCurrentScore = () => {
    if (selectedCriteria.length === 0) {
      return { totalScore: 0, maxPossibleScore: rubric.maxScore, percentage: 0 };
    }

    const assessments = selectedCriteria.map(sc => {
      const criterion = rubric.criteria.find(c => c.id === sc.criterionId);
      const level = rubric.levels.find(l => l.id === sc.levelId);
      
      return {
        criterion: { weight: criterion?.weight || 0 },
        selectedLevel: { scoreValue: level?.scoreValue || 0 }
      };
    });

    return calculateScore(assessments, rubric.maxScore, rubric.levels);
  };

  // Manejar clic en celda
  const handleCellClick = (criterionId: string, levelId: string, cellId: string) => {
    if (readOnly) return;

    // Verificar si ya hay una selección para este criterio
    const existingIndex = selectedCriteria.findIndex(sc => sc.criterionId === criterionId);
    
    if (existingIndex >= 0) {
      // Actualizar selección existente
      const updated = [...selectedCriteria];
      updated[existingIndex] = {
        ...updated[existingIndex],
        levelId,
        cellId
      };
      setSelectedCriteria(updated);
    } else {
      // Añadir nueva selección
      setSelectedCriteria(prev => [...prev, {
        criterionId,
        levelId,
        cellId
      }]);
    }
  };

  // Añadir comentario a criterio
  const handleAddCriterionComment = (criterionId: string, levelId: string) => {
    const existing = selectedCriteria.find(sc => sc.criterionId === criterionId);
    setCurrentCriterion({ criterionId, levelId });
    setCriterionComment(existing?.comments || '');
    setShowCommentsModal(true);
  };

  // Guardar comentario de criterio
  const handleSaveCriterionComment = () => {
    if (!currentCriterion) return;

    const updated = selectedCriteria.map(sc => 
      sc.criterionId === currentCriterion.criterionId 
        ? { ...sc, comments: criterionComment.trim() || undefined }
        : sc
    );
    
    setSelectedCriteria(updated);
    setShowCommentsModal(false);
    setCurrentCriterion(null);
    setCriterionComment('');
  };

  // Guardar evaluación
  const handleSaveAssessment = async () => {
    if (selectedCriteria.length !== rubric.criteria.length) {
      message.warning('Debes evaluar todos los criterios antes de guardar');
      return;
    }

    try {
      setLoading(true);
      
      const assessmentData = {
        activityAssessmentId,
        rubricId: rubric.id,
        studentId,
        comments: globalComments.trim() || undefined,
        criterionAssessments: selectedCriteria
      };

      const result = await createAssessment(assessmentData);
      
      if (result) {
        onAssessmentComplete(result);
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Obtener celdas seleccionadas para resaltar
  const getSelectedCells = () => {
    return selectedCriteria.map(sc => sc.cellId);
  };

  // Verificar si la evaluación está completa
  const isComplete = selectedCriteria.length === rubric.criteria.length;
  const currentScore = calculateCurrentScore();

  // Obtener nivel seleccionado para un criterio
  const getSelectedLevel = (criterionId: string) => {
    const selected = selectedCriteria.find(sc => sc.criterionId === criterionId);
    if (!selected) return null;
    
    return rubric.levels.find(l => l.id === selected.levelId);
  };

  return (
    <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
      {/* Header con información del estudiante */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space direction="vertical" size="small">
              <Text strong style={{ fontSize: '16px' }}>{studentName}</Text>
              <Text type="secondary">Evaluación con Rúbrica</Text>
            </Space>
          </Col>
          
          <Col span={8}>
            <Statistic
              title="Progreso"
              value={selectedCriteria.length}
              suffix={`/ ${rubric.criteria.length}`}
              prefix={isComplete ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Col>
          
          <Col span={8}>
            <Statistic
              title="Puntuación Actual"
              value={currentScore.totalScore}
              suffix={`/ ${currentScore.maxPossibleScore}`}
              precision={1}
              valueStyle={{ color: isComplete ? '#52c41a' : '#faad14' }}
              prefix={<TrophyOutlined />}
            />
          </Col>
        </Row>
        
        {isComplete && (
          <div style={{ marginTop: '8px' }}>
            <Progress
              percent={currentScore.percentage}
              strokeColor="#52c41a"
              showInfo={false}
              size="small"
            />
            <Text style={{ fontSize: '12px', color: '#52c41a' }}>
              {formatPercentage(currentScore.percentage)} de rendimiento
            </Text>
          </div>
        )}
      </Card>

      {/* Instrucciones */}
      {!readOnly && selectedCriteria.length === 0 && (
        <Alert
          message="Instrucciones de Evaluación"
          description="Haz clic en las celdas de la rúbrica para seleccionar el nivel de cada criterio. Puedes añadir comentarios específicos a cada criterio."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Rúbrica interactiva */}
      <Card title={rubric.name} style={{ marginBottom: '16px' }}>
        <RubricGrid
          rubric={rubric}
          editable={false}
          viewMode="assessment"
          onCellClick={handleCellClick}
          selectedCells={getSelectedCells()}
        />
      </Card>

      {/* Resumen de selecciones */}
      {selectedCriteria.length > 0 && (
        <Card title="Resumen de Evaluación" style={{ marginBottom: '16px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {rubric.criteria.map(criterion => {
              const selectedLevel = getSelectedLevel(criterion.id);
              const selected = selectedCriteria.find(sc => sc.criterionId === criterion.id);
              
              return (
                <Row key={criterion.id} gutter={16} align="middle">
                  <Col span={8}>
                    <Text strong>{criterion.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Peso: {Math.round(criterion.weight * 100)}%
                    </Text>
                  </Col>
                  
                  <Col span={8}>
                    {selectedLevel ? (
                      <Space>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: selectedLevel.color,
                            borderRadius: '2px'
                          }}
                        />
                        <Text strong>{selectedLevel.name}</Text>
                        <Tag color="green">{selectedLevel.scoreValue} pts</Tag>
                      </Space>
                    ) : (
                      <Text type="secondary">Sin evaluar</Text>
                    )}
                  </Col>
                  
                  <Col span={8}>
                    <Space>
                      {selected?.comments && (
                        <Tooltip title={selected.comments}>
                          <CommentOutlined style={{ color: '#1890ff' }} />
                        </Tooltip>
                      )}
                      
                      {!readOnly && selectedLevel && (
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleAddCriterionComment(criterion.id, selectedLevel.id)}
                        >
                          {selected?.comments ? 'Editar' : 'Comentar'}
                        </Button>
                      )}
                    </Space>
                  </Col>
                </Row>
              );
            })}
          </Space>
        </Card>
      )}

      {/* Comentarios globales */}
      {(selectedCriteria.length > 0 || readOnly) && (
        <Card title="Comentarios Generales">
          <TextArea
            rows={3}
            value={globalComments}
            onChange={(e) => setGlobalComments(e.target.value)}
            placeholder="Comentarios adicionales sobre la evaluación (opcional)..."
            maxLength={500}
            showCount
            disabled={readOnly}
          />
        </Card>
      )}

      {/* Botones de acción */}
      {!readOnly && (
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <Space>
            {onCancel && (
              <Button onClick={onCancel}>
                Cancelar
              </Button>
            )}
            
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              disabled={!isComplete}
              onClick={handleSaveAssessment}
            >
              Guardar Evaluación
            </Button>
          </Space>
        </div>
      )}

      {/* Modal para comentarios de criterio */}
      <Modal
        title="Comentario del Criterio"
        open={showCommentsModal}
        onCancel={() => {
          setShowCommentsModal(false);
          setCurrentCriterion(null);
          setCriterionComment('');
        }}
        onOk={handleSaveCriterionComment}
        okText="Guardar"
        cancelText="Cancelar"
      >
        {currentCriterion && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>
              <strong>
                {rubric.criteria.find(c => c.id === currentCriterion.criterionId)?.name}
              </strong>
            </Text>
            <TextArea
              rows={3}
              value={criterionComment}
              onChange={(e) => setCriterionComment(e.target.value)}
              placeholder="Comentario específico para este criterio..."
              maxLength={200}
              showCount
            />
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default RubricAssessment;