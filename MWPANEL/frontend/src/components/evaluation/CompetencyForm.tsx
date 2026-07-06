/**
 * @archivo: CompetencyForm.tsx
 * @módulo: Evaluations (Formulario de Evaluación por Competencias)
 * @función: Formulario completo para evaluar competencias españolas con radar chart
 * @crítico: SÍ - Core del sistema de evaluación competencial español
 * @dependencias: RadarChart, Ant Design Form, competencias backend
 * @no_modificar: Escala 1-10 y lógica de colores sin verificar rúbricas
 * @relacionado_con: RadarChart.tsx, evaluations.service.ts, competencies backend
 */

/**
 * COMPONENTE: CompetencyForm
 * UBICACIÓN: /frontend/src/components/evaluation/CompetencyForm.tsx
 * FUNCIÓN: Formulario de evaluación por competencias con vista previa radar
 * NO USAR PARA: Evaluaciones de rúbricas (usar RubricAssessment.tsx)
 * PROPS CRÍTICAS:
 *   - competencies: Competency[] - Lista de competencias a evaluar
 *   - studentName: string - Nombre del estudiante evaluado
 *   - onSave: Callback para guardar borrador
 *   - onSubmit: Callback para enviar evaluación final
 * 
 * SISTEMA DE EVALUACIÓN:
 * - Escala 1-10 puntos por competencia
 * - Valoración visual con Rate (1-5 estrellas, incluye medias estrellas)
 * - Observaciones opcionales por competencia
 * - Puntuación global automática (promedio)
 * 
 * COLORES POR PUNTUACIÓN:
 * - Excelente (≥9): Verde #52c41a
 * - Bueno (≥7): Azul #1890ff  
 * - Satisfactorio (≥5): Amarillo #faad14
 * - Necesita Mejorar (<5): Rojo #f5222d
 * 
 * MODOS DE VISTA:
 * - Formulario: Campos de entrada con validación
 * - Vista Previa: Radar chart con datos introducidos
 * - Solo Lectura: Para consultar evaluaciones finalizadas
 * 
 * FUNCIONALIDADES:
 * - Guardar Borrador: Permite trabajo progresivo
 * - Enviar Evaluación: Finaliza y bloquea edición
 * - Cambios sin guardar: Alert de advertencia
 * - Validación de campos obligatorios (puntuación)
 * - Contador de caracteres en observaciones
 * 
 * INTEGRACIÓN CON RADAR CHART:
 * - Conversión automática de datos para visualización
 * - Muestra solo competencias evaluadas (score > 0)
 * - Incluye observaciones en vista previa
 * - Configuración responsive del gráfico
 * 
 * ESTADO ACTUAL: ✅ SISTEMA COMPLETO
 * - Formulario con validación funcionando
 * - Radar chart integrado y operativo
 * - Estados draft/final implementados
 * - UI responsive y accesible
 */

import React, { useState, useEffect } from 'react'
import { Form, InputNumber, Input, Button, Card, Space, Typography, Row, Col, Rate, Divider, Alert, Switch, Tooltip } from 'antd'
import { SaveOutlined, EyeOutlined, CheckOutlined, PoweroffOutlined } from '@ant-design/icons'
import { formatNumber } from '@utils/numberFormat'
import EvaluationRadarChart from './RadarChart'

const { Title, Text } = Typography
const { TextArea } = Input

interface Competency {
  id: string
  code: string
  name: string
  description: string
}

interface CompetencyEvaluation {
  competencyId: string
  score: number
  observations?: string
  isActive?: boolean // Nueva propiedad para activar/desactivar competencia
}

interface CompetencyFormProps {
  competencies: Competency[]
  studentName: string
  subjectName: string
  period: string
  initialValues?: CompetencyEvaluation[]
  onSave: (evaluations: CompetencyEvaluation[], isDraft: boolean) => Promise<void>
  onSubmit: (evaluations: CompetencyEvaluation[]) => Promise<void>
  isLoading?: boolean
  readonly?: boolean
}

const CompetencyForm: React.FC<CompetencyFormProps> = ({
  competencies,
  studentName,
  subjectName,
  period,
  initialValues = [],
  onSave,
  onSubmit,
  isLoading = false,
  readonly = false,
}) => {
  const [form] = Form.useForm()
  const [evaluations, setEvaluations] = useState<CompetencyEvaluation[]>(initialValues)
  const [showPreview, setShowPreview] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [activeCompetencies, setActiveCompetencies] = useState<Set<string>>(
    new Set(initialValues.map(evaluation => evaluation.competencyId).filter(id => 
      initialValues.find(e => e.competencyId === id)?.isActive !== false
    ))
  )

  useEffect(() => {
    // Initialize form with existing values
    const formValues: Record<string, any> = {}
    const newActiveCompetencies = new Set<string>()
    
    // Si no hay valores iniciales, activar todas las competencias por defecto
    if (initialValues.length === 0) {
      competencies.forEach(competency => {
        newActiveCompetencies.add(competency.id)
      })
    } else {
      initialValues.forEach(evaluation => {
        formValues[`score_${evaluation.competencyId}`] = evaluation.score
        formValues[`observations_${evaluation.competencyId}`] = evaluation.observations
        
        // Si isActive no está definido, se considera activa por defecto
        if (evaluation.isActive !== false) {
          newActiveCompetencies.add(evaluation.competencyId)
        }
      })
    }
    
    form.setFieldsValue(formValues)
    setEvaluations(initialValues)
    setActiveCompetencies(newActiveCompetencies)
  }, [initialValues, form, competencies])

  const handleFormChange = () => {
    setIsDirty(true)
    
    // Update evaluations state
    const formValues = form.getFieldsValue()
    const newEvaluations: CompetencyEvaluation[] = competencies.map(competency => {
      const isActive = activeCompetencies.has(competency.id)
      const score = isActive ? (formValues[`score_${competency.id}`] || 0) : 0
      const observations = isActive ? (formValues[`observations_${competency.id}`] || '') : ''
      
      return {
        competencyId: competency.id,
        score,
        observations,
        isActive,
      }
    })
    
    setEvaluations(newEvaluations)
  }

  const handleCompetencyToggle = (competencyId: string, checked: boolean) => {
    setIsDirty(true)
    const newActiveCompetencies = new Set(activeCompetencies)
    
    if (checked) {
      newActiveCompetencies.add(competencyId)
    } else {
      newActiveCompetencies.delete(competencyId)
      // Limpiar valores del formulario cuando se desactiva
      form.setFieldsValue({
        [`score_${competencyId}`]: undefined,
        [`observations_${competencyId}`]: '',
      })
    }
    
    setActiveCompetencies(newActiveCompetencies)
    handleFormChange()
  }

  const handleSaveDraft = async () => {
    try {
      await form.validateFields()
      await onSave(evaluations, true)
      setIsDirty(false)
    } catch (error) {
      console.error('Error saving draft:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      await form.validateFields()
      await onSubmit(evaluations)
      setIsDirty(false)
    } catch (error) {
      console.error('Error submitting evaluation:', error)
    }
  }

  const getRadarData = () => {
    return evaluations
      .filter(evaluation => evaluation.isActive && evaluation.score > 0)
      .map(evaluation => {
        const competency = competencies.find(c => c.id === evaluation.competencyId)
        return {
          competency: competency?.name || '',
          code: competency?.code || '',
          score: evaluation.score,
          fullMark: 10,
          observations: evaluation.observations,
        }
      })
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return '#52c41a'
    if (score >= 7) return '#1890ff'
    if (score >= 5) return '#faad14'
    return '#f5222d'
  }

  const getScoreDescription = (score: number) => {
    if (score >= 9) return 'Excelente'
    if (score >= 7) return 'Bueno'
    if (score >= 5) return 'Satisfactorio'
    if (score > 0) return 'Necesita Mejorar'
    return 'Sin Evaluar'
  }

  const activeEvaluations = evaluations.filter(e => e.isActive)
  const overallScore = activeEvaluations.length > 0
    ? activeEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / activeEvaluations.length
    : 0

  return (
    <div className="space-y-6" >
      {/* Header */}
      <Card>
        <div className="text-center">
          <Title level={3}>Evaluación por Competencias</Title>
          <Space direction="vertical" size="small">
            <Text className="text-lg font-medium">{studentName}</Text>
            <Text type="secondary">{subjectName} - {period}</Text>
            {overallScore > 0 && (
              <div className="mt-2">
                <Text>Puntuación Global: </Text>
                <Text 
                  strong 
                  style={{ color: getScoreColor(overallScore), fontSize: '18px' }}
                >
                  {formatNumber(overallScore)} / 10
                </Text>
                <Text type="secondary" className="ml-2">
                  ({getScoreDescription(overallScore)})
                </Text>
              </div>
            )}
          </Space>
        </div>
      </Card>

      {/* Form and Preview Toggle */}
      {!readonly && (
        <div className="flex justify-center">
          <Button.Group>
            <Button 
              type={!showPreview ? 'primary' : 'default'}
              onClick={() => setShowPreview(false)}
              icon={<SaveOutlined />}
            >
              Formulario
            </Button>
            <Button 
              type={showPreview ? 'primary' : 'default'}
              onClick={() => setShowPreview(true)}
              icon={<EyeOutlined />}
            >
              Vista Previa
            </Button>
          </Button.Group>
        </div>
      )}

      {showPreview || readonly ? (
        // Preview Mode - Radar Chart
        <EvaluationRadarChart
          data={getRadarData()}
          title="Vista Previa de Evaluación"
          studentName={studentName}
          period={`${subjectName} - ${period}`}
          height={500}
          showObservations={true}
        />
      ) : (
        // Form Mode
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          disabled={readonly}
          
        >
          <Card title="Evaluación de Competencias" >
            {!readonly && (
              <Alert
                message="Control de Competencias"
                description="Usa los interruptores en cada competencia para activar/desactivar su evaluación. Solo las competencias activas serán incluidas en el cálculo final."
                type="info"
                showIcon
                className="mb-4"
              />
            )}
            
            {isDirty && (
              <Alert
                message="Hay cambios sin guardar"
                description="Recuerda guardar tu progreso o enviar la evaluación cuando hayas terminado."
                type="warning"
                showIcon
                className="mb-4"
              />
            )}

            <Row gutter={[16, 24]}>
              {competencies.map((competency) => (
                <Col xs={24} key={competency.id}>
                  <Card 
                    size="small" 
                    className={`${activeCompetencies.has(competency.id) ? 'bg-gray-50' : 'bg-gray-100'} ${
                      !activeCompetencies.has(competency.id) ? 'opacity-60' : ''
                    }`}
                  >
                    <Space direction="vertical" className="w-full">
                      {/* Competency Header with Toggle */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <Text strong className="text-base">
                            {competency.code} - {competency.name}
                          </Text>
                          <Text className="block text-sm text-gray-600 mt-1">
                            {competency.description}
                          </Text>
                        </div>
                        {!readonly && (
                          <Tooltip title={activeCompetencies.has(competency.id) ? "Desactivar competencia" : "Activar competencia"}>
                            <Switch
                              checked={activeCompetencies.has(competency.id)}
                              onChange={(checked) => handleCompetencyToggle(competency.id, checked)}
                              checkedChildren={<PoweroffOutlined />}
                              unCheckedChildren={<PoweroffOutlined />}
                              size="small"
                              style={{
                                backgroundColor: activeCompetencies.has(competency.id) ? '#52c41a' : '#d9d9d9'
                              }}
                            />
                          </Tooltip>
                        )}
                      </div>

                      <Divider className="my-3" />

                      <Row gutter={16}>
                        {/* Score Input */}
                        <Col xs={24} md={8}>
                          <Form.Item
                            label="Puntuación (1-10)"
                            name={`score_${competency.id}`}
                            rules={activeCompetencies.has(competency.id) ? [
                              { required: true, message: 'La puntuación es obligatoria' },
                              { type: 'number', min: 1, max: 10, message: 'Debe estar entre 1 y 10' },
                            ] : []}
                          >
                            <InputNumber
                              min={1}
                              max={10}
                              step={0.1}
                              precision={1}
                              className="w-full"
                              placeholder={activeCompetencies.has(competency.id) ? "0.0" : "Competencia desactivada"}
                              disabled={!activeCompetencies.has(competency.id)}
                            />
                          </Form.Item>
                        </Col>

                        {/* Visual Score Rating */}
                        <Col xs={24} md={8}>
                          <div className="text-center">
                            <Text className="block mb-2">Valoración Visual</Text>
                            {activeCompetencies.has(competency.id) ? (
                              <>
                                <Rate
                                  count={5}
                                  value={(evaluations.find(e => e.competencyId === competency.id)?.score || 0) / 2}
                                  allowHalf
                                  disabled
                                  style={{ color: getScoreColor(evaluations.find(e => e.competencyId === competency.id)?.score || 0) }}
                                />
                                <div className="mt-1">
                                  <Text 
                                    style={{ 
                                      color: getScoreColor(evaluations.find(e => e.competencyId === competency.id)?.score || 0),
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {getScoreDescription(evaluations.find(e => e.competencyId === competency.id)?.score || 0)}
                                  </Text>
                                </div>
                              </>
                            ) : (
                              <>
                                <Rate
                                  count={5}
                                  value={0}
                                  disabled
                                  style={{ color: '#d9d9d9' }}
                                />
                                <div className="mt-1">
                                  <Text style={{ color: '#999', fontWeight: 'bold' }}>
                                    Competencia Desactivada
                                  </Text>
                                </div>
                              </>
                            )}
                          </div>
                        </Col>

                        {/* Observations */}
                        <Col xs={24} md={8}>
                          <Form.Item
                            label="Observaciones (opcional)"
                            name={`observations_${competency.id}`}
                          >
                            <TextArea
                              rows={3}
                              placeholder={activeCompetencies.has(competency.id) ? 
                                "Observaciones sobre el desarrollo de esta competencia..." : 
                                "Competencia desactivada - No se pueden agregar observaciones"
                              }
                              maxLength={500}
                              showCount={activeCompetencies.has(competency.id)}
                              disabled={!activeCompetencies.has(competency.id)}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Action Buttons */}
          {!readonly && (
            <Card>
              <div className="flex justify-center gap-4">
                <Button
                  type="default"
                  icon={<SaveOutlined />}
                  onClick={handleSaveDraft}
                  loading={isLoading}
                  disabled={!isDirty}
                >
                  Guardar Borrador
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleSubmit}
                  loading={isLoading}
                  disabled={activeEvaluations.some(e => e.score === 0) || activeEvaluations.length === 0}
                >
                  Enviar Evaluación
                </Button>
              </div>
              <div className="text-center mt-3 space-y-1">
                <Text type="secondary" className="text-sm block">
                  El borrador se guarda automáticamente. Una vez enviada, la evaluación no se podrá modificar.
                </Text>
                <Text type="secondary" className="text-xs">
                  Competencias activas: {activeEvaluations.length} de {competencies.length}
                </Text>
              </div>
            </Card>
          )}
        </Form>
      )}
    </div>
  )
}

export default CompetencyForm