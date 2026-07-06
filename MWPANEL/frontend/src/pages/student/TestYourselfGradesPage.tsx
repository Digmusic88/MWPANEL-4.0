import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Empty,
  Alert,
  Progress,
  Tag,
  Timeline,
  Statistic,
  Button,
  Space,
  Tooltip,
  Descriptions,
  Badge,
  List,
  Avatar,
  Table,
  Modal,
  Space,
  Divider,
  message,
} from 'antd';
import {
  TrophyOutlined,
  BookOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  DownloadOutlined,
  StarOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  TableOutlined,
  EditOutlined,
  StarFilled,
  LikeOutlined,
  CheckOutlined,
  BookFilled,
  WarningFilled,
} from '@ant-design/icons';
import useGrades, { StudentGrades, GradeDetail } from '../../hooks/useGrades';
import { useResponsive } from '../../hooks/useResponsive';
import { formatNumber, formatPercentage } from '@utils/numberFormat';
import { useAuthStore } from '@store/authStore';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import apiClient from '@services/apiClient';

dayjs.locale('es');

const { Title, Text } = Typography;

interface ExamGrade {
  id: string;
  task: {
    id: string;
    title: string;
    description?: string;
    valuationType?: string; // Added this field
    subject?: {
      name: string;
      code: string;
    };
    subjectAssignment?: {
      subject: {
        id: string;
        name: string;
        code: string;
      };
    };
    classGroup?: {
      name: string;
    };
    teacher?: {
      firstName: string;
      lastName: string;
    };
  };
  numericGrade: number | string;
  letterGrade?: string;
  emojiGrade?: string;
  comments?: string;
  attendanceStatus?: string;
  evaluationType?: string;
  rubricScores?: any[];
  gradeScale?: string;
  gradedAt: string;
  createdAt?: string;
  gradedByTeacher?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

const TestYourselfGradesPage: React.FC = () => {
  const [examGrades, setExamGrades] = useState<ExamGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Estados para detalles de rúbrica
  const [rubricDetailsVisible, setRubricDetailsVisible] = useState(false);
  const [rubricDetails, setRubricDetails] = useState<any>(null);
  const { isMobile } = useResponsive();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchExamGrades();
  }, []);

  const fetchExamGrades = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the current student's exam grades
      console.log('🎓 [STUDENT FRONTEND] Fetching exam grades...');
      const response = await apiClient.get('/tasks/student-test-grades');
      console.log('🎓 [STUDENT FRONTEND] Received data:', response.data);
      
      // El endpoint devuelve { success: true, data: [...] }
      const examGradesData = response.data?.data || response.data || [];
      console.log('🎓 [STUDENT FRONTEND] Processed exam grades:', examGradesData);
      setExamGrades(examGradesData);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cargar Test Yourself';
      setError(errorMessage);
      console.error('Error fetching exam grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: number): string => {
    if (grade >= 90) return '#52c41a';
    if (grade >= 70) return '#1890ff';
    if (grade >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const getGradeLabel = (grade: number): string => {
    if (grade >= 90) return 'Excelente';
    if (grade >= 70) return 'Notable';
    if (grade >= 50) return 'Aprobado';
    return 'Necesita Mejorar';
  };

  const getProgressStatus = (grade: number): 'success' | 'normal' | 'exception' | 'active' => {
    if (grade >= 90) return 'success';
    if (grade >= 50) return 'normal';
    return 'exception';
  };

  const getEvaluationType = (examGrade: ExamGrade): string => {
    if (examGrade.emojiGrade) return 'Emoji';
    if (examGrade.task?.valuationType === 'rubric') return 'Rúbrica';
    return 'Numérica';
  };

  const getFormattedGrade = (examGrade: ExamGrade): string => {
    if (examGrade.emojiGrade) {
      const emojiLabels = {
        '😊': 'Muy Bien',
        '😐': 'Bien', 
        '😞': 'Regular'
      };
      return `${examGrade.emojiGrade} ${emojiLabels[examGrade.emojiGrade] || ''}`;
    }

    if (examGrade.task?.valuationType === 'rubric') {
      // Usar numericGrade que contiene la nota final calculada correctamente por el backend
      const finalGrade = parseFloat(examGrade.numericGrade.toString()) || 0;
      return `${finalGrade} pts (Rúbrica)`;
    }

    if (examGrade.letterGrade) {
      return `${examGrade.numericGrade} (${examGrade.letterGrade})`;
    }
    
    return formatNumber(parseFloat(examGrade.numericGrade.toString()));
  };

  const calculateStats = () => {
    if (examGrades.length === 0) {
      return {
        average: 0,
        totalExams: 0,
        excellentCount: 0,
        passedCount: 0,
        bestSubject: null,
        bestAverage: 0,
      };
    }

    const average = examGrades.reduce((sum, grade) => sum + parseFloat(grade.numericGrade.toString()), 0) / examGrades.length;
    const excellentCount = examGrades.filter(grade => parseFloat(grade.numericGrade.toString()) >= 90).length;
    const passedCount = examGrades.filter(grade => parseFloat(grade.numericGrade.toString()) >= 50).length;

    // Find best subject by average
    const subjectAverages = {};
    examGrades.forEach(grade => {
      const subjectName = grade.task?.subjectAssignment?.subject?.name || grade.task?.subject?.name || 'Sin Asignatura';
      if (!subjectAverages[subjectName]) {
        subjectAverages[subjectName] = { total: 0, count: 0 };
      }
      subjectAverages[subjectName].total += parseFloat(grade.numericGrade.toString());
      subjectAverages[subjectName].count += 1;
    });

    let bestSubject = null;
    let bestAverage = 0;
    Object.entries(subjectAverages).forEach(([subject, data]: [string, any]) => {
      const avg = data.total / data.count;
      if (avg > bestAverage) {
        bestAverage = avg;
        bestSubject = subject;
      }
    });

    return {
      average: Math.round(average * 10) / 10,
      totalExams: examGrades.length,
      excellentCount,
      passedCount,
      bestSubject,
      bestAverage: Math.round(bestAverage * 10) / 10,
    };
  };

  const stats = calculateStats();

  const columns = [
    {
      title: 'Test Yourself',
      dataIndex: ['task', 'title'],
      key: 'title',
      render: (title: string, record: ExamGrade) => (
        <div>
          <Text strong>{title || 'Sin título'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.task?.subjectAssignment?.subject?.name || record.task?.subject?.name || 'Sin asignatura'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tipo',
      key: 'evaluationType',
      render: (record: ExamGrade) => (
        <Tag color="blue">{getEvaluationType(record)}</Tag>
      ),
    },
    {
      title: 'Calificación',
      key: 'grade',
      render: (record: ExamGrade) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: getGradeColor(parseFloat(record.numericGrade.toString())),
            marginBottom: '4px'
          }}>
            {getFormattedGrade(record)}
          </div>
          <Progress
            percent={parseFloat(record.numericGrade.toString())}
            status={getProgressStatus(parseFloat(record.numericGrade.toString()))}
            size="small"
            showInfo={false}
            strokeColor={getGradeColor(parseFloat(record.numericGrade.toString()))}
          />
          <Tag 
            color={getGradeColor(parseFloat(record.numericGrade.toString()))}
            style={{ marginTop: '4px', fontSize: '10px' }}
          >
            {getGradeLabel(parseFloat(record.numericGrade.toString()))}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Profesor',
      key: 'teacher',
      render: (record: ExamGrade) => (
        <Text>
          {record.gradedByTeacher?.user?.profile?.firstName || 'N/A'} {record.gradedByTeacher?.user?.profile?.lastName || ''}
        </Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'gradedAt',
      key: 'gradedAt',
      render: (date: Date) => (
        <div>
          <Text>{dayjs(date).format('DD/MM/YYYY')}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {dayjs(date).format('HH:mm')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: ExamGrade) => {
        // Solo mostrar botón "Ver detalles" para evaluaciones de rúbrica que tienen datos
        if (record.task?.valuationType === 'rubric' && record.rubricScores && record.rubricScores.length > 0) {
          return (
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showRubricDetails(record)}
            >
              Ver detalles
            </Button>
          );
        }
        return null;
      },
    },
  ];

  // Función para obtener detalles de rúbrica usando datos existentes
  const showRubricDetails = (examGrade: ExamGrade) => {
    try {
      console.log('🔍 [TEST YOURSELF DEBUG] Building rubric details from existing data:', examGrade);
      console.log('🔍 [TEST YOURSELF DEBUG] rubricScores:', examGrade.rubricScores);

      // Función para generar contenido de celda educativo
      const generateCellContent = (levelName: string, criterionName: string): string => {
        const level = levelName.toLowerCase();
        const criterion = criterionName.toLowerCase();

        if (level.includes('excelente')) {
          return `El estudiante demuestra un dominio excepcional en ${criterion}, superando las expectativas del nivel.`;
        } else if (level.includes('bueno')) {
          return `El estudiante muestra un buen desempeño en ${criterion}, cumpliendo satisfactoriamente con los objetivos.`;
        } else if (level.includes('suficiente')) {
          return `El estudiante alcanza un nivel suficiente en ${criterion}, cumpliendo con los requisitos mínimos.`;
        } else if (level.includes('mejorable')) {
          return `El estudiante presenta dificultades en ${criterion} y necesita refuerzo adicional.`;
        } else if (level.includes('insuficiente')) {
          return `El estudiante no alcanza el nivel esperado en ${criterion} y requiere apoyo significativo.`;
        } else if (level.includes('nulo')) {
          return `El estudiante no demuestra evidencia de logro en ${criterion}.`;
        } else {
          return `Nivel ${levelName} alcanzado en ${criterion}.`;
        }
      };

      // Extraer criterios únicos de rubricScores
      const criteriaSet = new Set<string>();
      const criteriaList: any[] = [];

      examGrade.rubricScores?.forEach((score: any) => {
        // Extraer criterios únicos
        if (score.criterion_id && !criteriaSet.has(score.criterion_id)) {
          criteriaSet.add(score.criterion_id);
          criteriaList.push({
            id: score.criterion_id,
            name: score.criterion_name,
            weight: parseFloat(score.weight)
          });
        }
      });

      // Obtener los niveles de la rúbrica completa (viene del backend)
      // Si no vienen, usar los niveles usados en la evaluación como fallback
      let levelsList: any[] = [];
      if (examGrade.task?.rubric?.allLevels && examGrade.task.rubric.allLevels.length > 0) {
        levelsList = examGrade.task.rubric.allLevels;
        console.log('✅ [LEVELS] Using rubric allLevels from backend:', levelsList.length, 'levels');
      } else {
        // Fallback: extraer niveles únicos de los scores
        const levelsSet = new Set<string>();
        examGrade.rubricScores?.forEach((score: any) => {
          if (score.level_id && !levelsSet.has(score.level_id)) {
            levelsSet.add(score.level_id);
            levelsList.push({
              id: score.level_id,
              name: score.level_name,
              scoreValue: parseFloat(score.points)
            });
          }
        });
        console.log('⚠️ [LEVELS] Fallback: Using levels from scores:', levelsList.length, 'levels');
      }

      // Calcular puntuación total y máxima
      const totalScore = examGrade.rubricScores?.reduce((sum: number, score: any) =>
        sum + parseFloat(score.points || 0), 0) || 0;

      // Calcular máximo posible (asumiendo que el nivel máximo es el más alto encontrado)
      const maxLevelScore = Math.max(...(examGrade.rubricScores?.map((s: any) => parseFloat(s.points) || 0) || [4]));
      const maxPossibleScore = criteriaList.length * maxLevelScore;

      // Construir la estructura de rubric details usando los datos que ya tenemos
      const rubricDetailsData = {
        taskInfo: {
          title: examGrade.task.title,
          id: examGrade.task.id
        },
        submissionInfo: {
          gradedAt: examGrade.gradedAt
        },
        assessment: {
          totalScore: totalScore,
          maxPossibleScore: maxPossibleScore || 100,
          percentage: maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : parseFloat(examGrade.numericGrade?.toString() || '0'),
          teacherFeedback: examGrade.comments || null
        },
        rubric: {
          name: examGrade.task.rubric?.name || `Rúbrica - ${examGrade.task.title}`,
          levels: levelsList,
          criteria: criteriaList
        },
        evaluationDetails: examGrade.rubricScores?.map((score: any) => {
          // Obtener el cellContent real del backend, o generar uno si no existe
          const cellContent = score.cell_content || generateCellContent(score.level_name, score.criterion_name);

          console.log(`🔍 [CELL CONTENT] Criterio: ${score.criterion_name}, Nivel: ${score.level_name}`);
          console.log(`🔍 [CELL CONTENT] cell_content del backend: "${score.cell_content}"`);
          console.log(`🔍 [CELL CONTENT] cellContent final: "${cellContent}"`);

          return {
            criterion: {
              id: score.criterion_id,
              name: score.criterion_name,
              weight: parseFloat(score.weight),
              description: null
            },
            selectedLevel: {
              id: score.level_id,
              name: score.level_name,
              scoreValue: parseFloat(score.points),
              description: `Nivel: ${score.level_name}`,
              cellContent: cellContent
            }
          };
        }) || []
      };

      console.log('✅ [TEST YOURSELF DEBUG] Built rubric details:', rubricDetailsData);
      console.log('✅ [TEST YOURSELF DEBUG] Criteria count:', rubricDetailsData.rubric.criteria.length);
      console.log('✅ [TEST YOURSELF DEBUG] Levels count:', rubricDetailsData.rubric.levels.length);

      setRubricDetails(rubricDetailsData);
      setRubricDetailsVisible(true);
    } catch (error: any) {
      console.error('❌ [TEST YOURSELF DEBUG] Error building rubric details:', error);
      message.error('Error al construir los detalles de la evaluación');
    }
  };

  const closeRubricDetails = () => {
    setRubricDetailsVisible(false);
    setRubricDetails(null);
  };

  // Modal de detalles de rúbrica (exactamente igual que TasksPage)
  const renderRubricModal = () => {
    return (
      <Modal
        title={
          <div className="flex items-center gap-2">
            <TableOutlined className="text-purple-600" />
            <span>Detalles de Evaluación con Rúbrica</span>
            {rubricDetails?.rubric?.name && (
              <Text type="secondary" className="font-normal">
                - {rubricDetails.rubric.name}
              </Text>
            )}
          </div>
        }
        open={rubricDetailsVisible}
        onCancel={closeRubricDetails}
        footer={[
          <Button key="close" onClick={closeRubricDetails}>
            Cerrar
          </Button>
        ]}
        width={900}
        className="rubric-details-modal"
      >
        {rubricDetails && (
          <div className="space-y-6">
            {/* Resumen de calificación */}
            <Card className="bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex justify-between items-center">
                <div>
                  <Title level={4} className="!mb-2 text-green-700">
                    📊 Resultado Final
                  </Title>
                  <div className="text-3xl font-bold text-green-600">
                    {rubricDetails.assessment.totalScore}/{rubricDetails.assessment.maxPossibleScore}
                  </div>
                  <div className="text-lg text-green-700">
                    {Math.round(rubricDetails.assessment.percentage)}% de logro
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-600">Test Yourself:</div>
                  <div className="font-medium">{rubricDetails.taskInfo.title}</div>
                  <div className="text-sm text-gray-500 mt-2">
                    Evaluado el {dayjs(rubricDetails.submissionInfo.gradedAt).format('DD/MM/YYYY')}
                  </div>
                </div>
              </div>
            </Card>

            {/* Detalles por criterio */}
            <div>
              <Title level={5} className="flex items-center gap-2 !mb-4">
                <CheckCircleOutlined className="text-blue-600" />
                Evaluación Detallada por Criterios
              </Title>
              
              <div className="space-y-4">
                {rubricDetails.evaluationDetails.map((detail: any, index: number) => (
                  <Card key={detail.criterion.id} className="border-l-4 border-l-blue-400">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Text strong className="text-lg">{detail.criterion.name}</Text>
                          <Tag color="blue">
                            Peso: {(Number(detail.criterion.weight) * 100).toFixed(0)}%
                          </Tag>
                        </div>
                        
                        {detail.criterion.description && (
                          <div className="text-gray-600 mb-3">
                            {detail.criterion.description}
                          </div>
                        )}
                        
                        {detail.selectedLevel && (() => {
                          // Dynamic colors and icons based on actual level name
                          const getLevelStyling = (levelName: string) => {
                            const name = levelName.toLowerCase();
                            
                            // Excelente → Verde
                            if (name.includes('excelente')) return {
                              bgColor: 'bg-green-50', 
                              textColor: 'text-green-800', 
                              lightTextColor: 'text-green-700',
                              borderColor: 'border-green-200',
                              icon: <StarFilled className="text-green-600" />, 
                              label: 'Excelente'
                            };
                            
                            // Bueno → Verde claro
                            if (name.includes('bueno')) return {
                              bgColor: 'bg-emerald-50', 
                              textColor: 'text-emerald-800', 
                              lightTextColor: 'text-emerald-700',
                              borderColor: 'border-emerald-200',
                              icon: <LikeOutlined className="text-emerald-600" />, 
                              label: 'Bueno'
                            };
                            
                            // Suficiente → Amarillo
                            if (name.includes('suficiente')) return {
                              bgColor: 'bg-yellow-50', 
                              textColor: 'text-yellow-800', 
                              lightTextColor: 'text-yellow-700',
                              borderColor: 'border-yellow-200',
                              icon: <CheckOutlined className="text-yellow-600" />, 
                              label: 'Suficiente'
                            };
                            
                            // Mejorable → Naranja
                            if (name.includes('mejorable')) return {
                              bgColor: 'bg-orange-50', 
                              textColor: 'text-orange-800', 
                              lightTextColor: 'text-orange-700',
                              borderColor: 'border-orange-200',
                              icon: <BookFilled className="text-orange-600" />, 
                              label: 'Mejorable'
                            };
                            
                            // Insuficiente → Rojo claro
                            if (name.includes('insuficiente')) return {
                              bgColor: 'bg-red-100', 
                              textColor: 'text-red-800', 
                              lightTextColor: 'text-red-700',
                              borderColor: 'border-red-300',
                              icon: <WarningFilled className="text-red-600" />, 
                              label: 'Insuficiente'
                            };
                            
                            // Nulo → Rojo intenso
                            if (name.includes('nulo')) return {
                              bgColor: 'bg-red-50', 
                              textColor: 'text-red-900', 
                              lightTextColor: 'text-red-800',
                              borderColor: 'border-red-400',
                              icon: <WarningFilled className="text-red-700" />, 
                              label: 'Nulo'
                            };
                            
                            // Default → Gris
                            return {
                              bgColor: 'bg-gray-50', 
                              textColor: 'text-gray-800', 
                              lightTextColor: 'text-gray-700',
                              borderColor: 'border-gray-200',
                              icon: <CheckOutlined className="text-gray-600" />, 
                              label: 'Sin clasificar'
                            };
                          };
                          
                          const styling = getLevelStyling(detail.selectedLevel.name);
                          
                          return (
                            <div className={`${styling.bgColor} p-3 rounded border-2 ${styling.borderColor}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Text strong className={styling.textColor}>
                                    <Space>
                                      {styling.icon}
                                      {detail.selectedLevel.name}
                                    </Space>
                                  </Text>
                                  <div className={`text-xs ${styling.lightTextColor} opacity-75 mt-1`}>
                                    {styling.label} ({detail.selectedLevel.scoreValue} puntos)
                                  </div>
                                  {/* Descripción general del nivel */}
                                  {detail.selectedLevel.description && (
                                    <div className={`${styling.lightTextColor} text-sm mt-1`}>
                                      <strong>Nivel:</strong> {detail.selectedLevel.description}
                                    </div>
                                  )}
                                  {/* Contenido específico de la celda seleccionada */}
                                  {detail.selectedLevel.cellContent && (
                                    <div className={`${styling.textColor} text-sm mt-2 p-2 rounded border-l-4 ${styling.borderColor.replace('border-', 'border-l-')}`}>
                                      <strong>Descripción de la evaluación:</strong>
                                      <div className="mt-1 italic">
                                        "{detail.selectedLevel.cellContent}"
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className={`${styling.textColor} font-bold`}>
                                    {detail.selectedLevel.scoreValue} puntos
                                  </div>
                                  <div className={`${styling.lightTextColor} text-sm`}>
                                    Peso: {(Number(detail.criterion.weight) * 100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Comentarios del profesor */}
            {rubricDetails.assessment.teacherFeedback && (
              <div>
                <Title level={5} className="flex items-center gap-2 !mb-3">
                  <EditOutlined className="text-orange-600" />
                  Comentarios del Profesor
                </Title>
                <Card className="bg-orange-50 border-orange-200">
                  <div className="text-orange-800">
                    "{rubricDetails.assessment.teacherFeedback}"
                  </div>
                </Card>
              </div>
            )}

            {/* Información de la rúbrica */}
            <div>
              <Divider />
              <div className="text-center text-gray-500">
                <div className="text-sm">
                  Evaluado con la rúbrica: <strong>{rubricDetails.rubric.name}</strong>
                </div>
                <div className="text-xs mt-1">
                  {rubricDetails.rubric.criteria.length} criterios • 
                  {rubricDetails.rubric.levels.length} niveles de desempeño
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Cargando Test Yourself..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error al cargar Test Yourself"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <ThunderboltOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Mis Test Yourself
          </Title>
          <Text type="secondary">
            Historial completo de tus evaluaciones Test Yourself
          </Text>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Estado General"
              value="En progreso"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress
              percent={75}
              status="active"
              showInfo={false}
              strokeColor="#1890ff"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Test Completados"
              value={stats.totalExams}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Excelentes"
              value={stats.excellentCount}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {stats.excellentCount} evaluaciones excelentes
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Aprobados"
              value={stats.passedCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {stats.passedCount} evaluaciones aprobadas
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Best Subject Card */}
      {stats.bestSubject && (
        <Card style={{ marginBottom: 24 }}>
          <Row align="middle">
            <Col>
              <Avatar
                size={48}
                style={{
                  backgroundColor: getGradeColor(stats.bestAverage),
                  marginRight: 16
                }}
                icon={<TrophyOutlined />}
              />
            </Col>
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Tu mejor asignatura: {stats.bestSubject}
              </Title>
              <Text type="secondary">
                {stats.bestAverage >= 90 && '¡Excelente! Tienes un rendimiento excepcional en esta materia.'}
                {stats.bestAverage >= 70 && stats.bestAverage < 90 && '¡Muy bien! Tienes un buen rendimiento en esta materia.'}
                {stats.bestAverage >= 50 && stats.bestAverage < 70 && 'Vas por buen camino. Sigue esforzándote en esta materia.'}
                {stats.bestAverage < 50 && 'Esta es tu asignatura con mejor promedio. ¡Sigue trabajando para mejorar!'}
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ color: getGradeColor(stats.bestAverage) }}>
                  Promedio: {stats.bestAverage}%
                </Text>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Debug Information - Hidden in production */}
      {process.env.NODE_ENV === 'development' && (
        <Card style={{ marginBottom: 24, backgroundColor: '#f0f9ff', border: '1px solid #1890ff' }}>
          <Alert
            message="Debug Info - Test Yourself"
            description={
              <div>
                <p><strong>Datos recibidos:</strong> {examGrades.length} calificaciones</p>
                <p><strong>Estado loading:</strong> {loading ? 'Cargando...' : 'Completado'}</p>
                <p><strong>Error:</strong> {error || 'Ninguno'}</p>
                {examGrades.length > 0 && (
                  <details>
                    <summary>Ver datos raw (click para expandir)</summary>
                    <pre style={{ fontSize: '10px', marginTop: '10px' }}>
                      {JSON.stringify(examGrades, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            }
            type="info"
            showIcon
          />
        </Card>
      )}

      {/* Test Yourself by Subject */}
      {examGrades.length > 0 ? (
        <div>
          {(() => {
            // Group exam grades by subject
            const gradesBySubject = examGrades.reduce((acc, grade) => {
              const subjectName = grade.task?.subjectAssignment?.subject?.name || grade.task?.subject?.name || 'Sin Asignatura';
              if (!acc[subjectName]) {
                acc[subjectName] = [];
              }
              acc[subjectName].push(grade);
              return acc;
            }, {} as Record<string, ExamGrade[]>);

            return Object.entries(gradesBySubject).map(([subjectName, subjectGrades]) => (
              <Card 
                key={subjectName}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BookOutlined style={{ color: '#1890ff' }} />
                    <span>{subjectName}</span>
                    <Badge count={subjectGrades.length} style={{ backgroundColor: '#52c41a' }} />
                  </div>
                }
                style={{ marginBottom: 24 }}
              >
                <Table
                  dataSource={subjectGrades}
                  columns={columns}
                  rowKey="id"
                  pagination={{
                    pageSize: 5,
                    showSizeChanger: false,
                    showQuickJumper: false,
                    showTotal: (total, range) => 
                      `${range[0]}-${range[1]} de ${total} test yourself`,
                  }}
                  scroll={{ x: 800 }}
                  expandable={{
                    expandedRowRender: (record: ExamGrade) => (
                      <Card size="small" style={{ margin: 0 }}>
                        <Descriptions column={isMobile ? 1 : 2} size="small">
                          <Descriptions.Item label="Escala de calificación">
                            {record.gradeScale}
                          </Descriptions.Item>
                          <Descriptions.Item label="Fecha de evaluación">
                            {dayjs(record.gradedAt).format('DD/MM/YYYY HH:mm')}
                          </Descriptions.Item>
                        </Descriptions>
                        {record.comments && (
                          <div style={{ marginTop: 12 }}>
                            <Alert
                              message="Comentarios del profesor"
                              description={record.comments}
                              type="info"
                              showIcon
                              icon={<FileTextOutlined />}
                            />
                          </div>
                        )}
                      </Card>
                    ),
                    rowExpandable: (record) => !!record.comments || record.gradeScale !== '1-10',
                  }}
                />
              </Card>
            ));
          })()}
        </div>
      ) : (
        <Card title="Historial de Test Yourself" style={{ marginBottom: 24 }}>
          <Empty
            description={
              user?.role === 'admin' 
                ? "Vista de Test Yourself para estudiantes"
                : user?.role === 'teacher'
                ? "Vista de Test Yourself para estudiantes"
                : "No tienes Test Yourself completados aún"
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Text type="secondary">
              {user?.role === 'admin' 
                ? "Esta sección muestra las calificaciones Test Yourself de los estudiantes. Como administrador, no tienes calificaciones propias."
                : user?.role === 'teacher'
                ? "Esta sección muestra las calificaciones Test Yourself de los estudiantes. Como profesor, no tienes calificaciones propias. Puedes ver las calificaciones de tus estudiantes desde la sección de evaluación."
                : "Los Test Yourself aparecerán aquí una vez que tu profesor los califique."
              }
            </Text>
          </Empty>
        </Card>
      )}

      {/* Modal de detalles de rúbrica */}
      {renderRubricModal()}
    </div>
  );
};

export default TestYourselfGradesPage;