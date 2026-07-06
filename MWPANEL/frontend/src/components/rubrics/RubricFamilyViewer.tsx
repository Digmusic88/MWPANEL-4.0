import React from 'react'
import {
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Progress,
  Statistic,
  Row,
  Col,
  Divider,
  Alert,
  Tooltip,
  Badge,
} from 'antd'
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  BookOutlined,
  TrophyOutlined,
  PercentageOutlined,
  CommentOutlined,
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

interface RubricLevel {
  id: string
  name: string
  description: string
  score: number
  color: string
}

interface RubricCriterion {
  id: string
  name: string
  description?: string
  weight: number
  levels: RubricLevel[]
}

interface Rubric {
  id: string
  title: string
  description?: string
  criteria: RubricCriterion[]
  cells?: RubricCell[]
}

interface RubricCell {
  id: string
  content: string
  criterionId: string
  levelId: string
}

interface CriterionAssessment {
  id: string
  comments?: string
  criterion: RubricCriterion
  level: RubricLevel
  selectedCell?: RubricCell
  cellId?: string
}

interface RubricAssessment {
  id: string
  totalScore: number
  maxPossibleScore: number
  percentage: number
  comments?: string
  criterionAssessments: CriterionAssessment[]
}

interface Activity {
  id: string
  name: string
  description?: string
  assignedDate: string
  rubric?: Rubric
  teacher: {
    user: {
      profile: {
        firstName: string
        lastName: string
      }
    }
  }
  subjectAssignment?: {
    subject: {
      name: string
      code: string
    }
    classGroup: {
      name: string
    }
  }
}

interface AssessmentWithRubric {
  id: string
  value?: string
  comment?: string
  assessedAt?: string
  activity: Activity
  student: {
    user: {
      profile: {
        firstName: string
        lastName: string
      }
    }
  }
  rubricAssessments?: RubricAssessment[]
}

interface RubricFamilyViewerProps {
  assessment: AssessmentWithRubric
  showHeader?: boolean
  showStudentInfo?: boolean
}

const RubricFamilyViewer: React.FC<RubricFamilyViewerProps> = ({
  assessment,
  showHeader = true,
  showStudentInfo = true,
}) => {
  const { activity, rubricAssessments } = assessment
  const rubric = activity.rubric
  const rubricAssessment = rubricAssessments?.[0] // Tomamos la primera valoración de rúbrica

  if (!rubric || !rubricAssessment) {
    return (
      <Alert
        message="Sin rúbrica"
        description="Esta actividad no tiene una rúbrica de evaluación asociada."
        type="info"
        icon={<InfoCircleOutlined />}
        className="mb-4"
      />
    )
  }

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 85) return '#52c41a' // Verde excelente
    if (percentage >= 70) return '#722ed1' // Morado bueno
    if (percentage >= 60) return '#faad14' // Amarillo satisfactorio
    return '#ff4d4f' // Rojo necesita mejorar
  }

  const getScoreText = (percentage: number): string => {
    if (percentage >= 85) return 'Excelente'
    if (percentage >= 70) return 'Bueno'
    if (percentage >= 60) return 'Satisfactorio'
    return 'Necesita mejorar'
  }

  // Helper para obtener el contenido de la celda seleccionada
  const getCellContent = (record: CriterionAssessment): string => {
    // Primero intentar obtener de selectedCell directamente
    if (record.selectedCell?.content) {
      return record.selectedCell.content
    }
    // Si no viene en selectedCell, buscar en rubric.cells por cellId
    if (record.cellId && rubric?.cells) {
      const cell = rubric.cells.find(c => c.id === record.cellId)
      if (cell?.content) {
        return cell.content
      }
    }
    // Fallback: buscar por criterionId y levelId
    if (rubric?.cells && record.criterion?.id && record.level?.id) {
      const cell = rubric.cells.find(c =>
        c.criterionId === record.criterion.id &&
        c.levelId === record.level.id
      )
      if (cell?.content) {
        return cell.content
      }
    }
    return ''
  }

  const columns = [
    {
      title: 'Criterio',
      dataIndex: 'criterion',
      key: 'criterion',
      width: '30%',
      render: (criterion: RubricCriterion, record: CriterionAssessment) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text strong>{criterion.name}</Text>
          {criterion.description && (
            <Text type="secondary" className="text-sm">
              {criterion.description}
            </Text>
          )}
          <Badge count={`${criterion.weight}%`} color="blue" />
        </Space>
      ),
    },
    {
      title: 'Nivel Alcanzado',
      dataIndex: 'level',
      key: 'level',
      width: '35%',
      render: (level: RubricLevel, record: CriterionAssessment) => {
        const cellContent = getCellContent(record)
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Tag color={level.color} className="text-center w-full">
              <Space>
                <CheckCircleOutlined />
                {level.name}
              </Space>
            </Tag>
            {/* Mostrar el contenido de la celda de la rúbrica */}
            {cellContent && (
              <div className="bg-gray-50 p-2 rounded border-l-4" style={{ borderColor: level.color || '#d9d9d9' }}>
                <Text className="text-sm" style={{ fontStyle: 'italic' }}>
                  "{cellContent}"
                </Text>
              </div>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Puntuación',
      dataIndex: 'level',
      key: 'score',
      width: '15%',
      align: 'center' as const,
      render: (level: RubricLevel) => (
        <Statistic
          value={level.score}
          precision={1}
          valueStyle={{ 
            fontSize: '16px', 
            color: getScoreColor((level.score / 4) * 100) 
          }}
          suffix="/4"
        />
      ),
    },
    {
      title: 'Comentarios',
      dataIndex: 'comments',
      key: 'comments',
      width: '20%',
      render: (comments: string) => (
        comments ? (
          <div className="bg-blue-50 p-2 rounded">
            <Text className="text-sm italic">
              <CommentOutlined className="mr-2" />
              "{comments}"
            </Text>
          </div>
        ) : (
          <Text type="secondary" className="text-sm">Sin comentarios</Text>
        )
      ),
    },
  ]

  return (
    <div className="rubric-family-viewer">
      {showHeader && (
        <Card className="mb-4">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className="flex justify-between items-start">
              <Space>
                <BookOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {activity.name}
                  </Title>
                  <Text type="secondary">
                    Evaluación con Rúbrica • Prof. {activity.teacher.user.profile.firstName} {activity.teacher.user.profile.lastName}
                  </Text>
                </div>
              </Space>
              {activity.subjectAssignment && (
                <Tag color="blue">
                  {activity.subjectAssignment.subject.code}
                </Tag>
              )}
            </div>
            
            {activity.description && (
              <Paragraph className="mt-2 mb-0">
                {activity.description}
              </Paragraph>
            )}
            
            {showStudentInfo && (
              <div className="bg-gray-50 p-3 rounded">
                <Text strong>Estudiante: </Text>
                <Text>
                  {assessment.student.user.profile.firstName} {assessment.student.user.profile.lastName}
                </Text>
              </div>
            )}
          </Space>
        </Card>
      )}

      {/* Resumen de la Rúbrica */}
      <Card title={
        <Space>
          <TrophyOutlined />
          {rubric.title}
        </Space>
      } className="mb-4">
        {rubric.description && (
          <Paragraph className="mb-4 text-gray-600">
            {rubric.description}
          </Paragraph>
        )}
        
        {/* Estadísticas Generales */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Puntuación Total"
                value={rubricAssessment.totalScore}
                precision={1}
                suffix={`/ ${rubricAssessment.maxPossibleScore}`}
                valueStyle={{ color: getScoreColor(rubricAssessment.percentage) }}
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Criterios Evaluados"
                value={rubricAssessment.criterionAssessments.length}
                suffix={`/ ${rubric.criteria.length}`}
                valueStyle={{ color: getScoreColor(rubricAssessment.percentage) }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <div className="text-center">
                <Text type="secondary" className="block mb-2">Nivel General</Text>
                <Tag 
                  color={getScoreColor(rubricAssessment.percentage)} 
                  className="text-lg px-3 py-1"
                >
                  {getScoreText(rubricAssessment.percentage)}
                </Tag>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <div className="text-center">
                <Text type="secondary" className="block mb-2">Progreso</Text>
                <Progress
                  type="circle"
                  size={60}
                  percent={Math.round(rubricAssessment.percentage)}
                  strokeColor={getScoreColor(rubricAssessment.percentage)}
                  format={() => '✓'}
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Comentarios Generales del Profesor */}
        {rubricAssessment.comments && (
          <Alert
            message="Comentarios del Profesor"
            description={rubricAssessment.comments}
            type="info"
            icon={<CommentOutlined />}
            className="mb-4"
          />
        )}
      </Card>

      {/* Tabla Detallada de Criterios */}
      <Card title="Evaluación Detallada por Criterios" className="mb-4">
        <Table
          dataSource={rubricAssessment.criterionAssessments}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
          className="rubric-assessment-table"
        />
      </Card>

      {/* Información Adicional */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card title="Información de la Evaluación" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Fecha de evaluación:</Text>
                <br />
                <Text>{new Date(assessment.assessedAt || '').toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</Text>
              </div>
              <div>
                <Text type="secondary">Criterios evaluados:</Text>
                <br />
                <Text>{rubricAssessment.criterionAssessments.length} de {rubric.criteria.length}</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Sobre esta Rúbrica" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Total de criterios:</Text>
                <br />
                <Text>{rubric.criteria.length}</Text>
              </div>
              <div>
                <Text type="secondary">Puntuación máxima:</Text>
                <br />
                <Text>{rubricAssessment.maxPossibleScore} puntos</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Comentario General de la Actividad */}
      {assessment.comment && (
        <Card title="Comentario General" className="mt-4">
          <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
            <Text>
              <CommentOutlined className="mr-2" />
              {assessment.comment}
            </Text>
          </div>
        </Card>
      )}
    </div>
  )
}

export default RubricFamilyViewer