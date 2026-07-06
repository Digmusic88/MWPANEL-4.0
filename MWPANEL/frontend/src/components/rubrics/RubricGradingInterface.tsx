import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Space,
  Tag,
  Statistic,
  Alert,
  Tooltip,
  Row,
  Col,
  Progress,
  Badge,
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  CalculatorOutlined,
  TrophyOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import type { ColumnsType } from 'antd/es/table';
import { useResponsive } from '../../hooks/useResponsive';

const { Title, Text } = Typography;

// Interfaces para las rúbricas
interface RubricLevel {
  id: string;
  name: string;
  description: string;
  scoreValue: number;
  color: string;
  order: number;
}

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  order: number;
}

interface RubricCell {
  id: string;
  criterionId: string;
  levelId: string;
  content: string; // Backend usa 'content', no 'description'
  description?: string; // Alias opcional para compatibilidad
}

interface Rubric {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  criteria: RubricCriterion[];
  levels: RubricLevel[];
  cells: RubricCell[];
}

interface SelectedCell {
  criterionId: string;
  levelId: string;
}

interface RubricGradingInterfaceProps {
  rubric: Rubric;
  onCellSelect: (criterionId: string, levelId: string) => void;
  selectedCells: Record<string, string>; // criterionId -> levelId
  onGradeCalculated: (finalGrade: number, percentage: number) => void;
  readOnly?: boolean;
  className?: string;
}

const RubricGradingInterface: React.FC<RubricGradingInterfaceProps> = ({
  rubric,
  onCellSelect,
  selectedCells,
  onGradeCalculated,
  readOnly = false,
  className = '',
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [zoomLevel, setZoomLevel] = useState(isMobile ? 0.8 : 1);
  const [showDescriptions, setShowDescriptions] = useState(!isMobile);

  // Calcular la nota final basada en las celdas seleccionadas
  const { finalGrade, percentage, completedCriteria } = useMemo(() => {
    // Función de validación robusta para convertir valores a números seguros
    const safeNumber = (value: any): number => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    };

    let totalPoints = 0;
    let completed = 0;

    // Cálculo de rúbrica iniciado (logs reducidos para producción)

    // Get the maximum possible level score for scaling
    const levelScores = rubric.levels.map(l => safeNumber(l.scoreValue)).filter(score => score > 0);
    const maxLevelScore = levelScores.length > 0 ? Math.max(...levelScores) : 4; // Default to 4 if no levels
    // Max level score: ${maxLevelScore}

    rubric.criteria.forEach(criterion => {
      const selectedLevelId = selectedCells[criterion.id];
      if (selectedLevelId) {
        const level = rubric.levels.find(l => l.id === selectedLevelId);
        if (level) {
          const levelScore = safeNumber(level.scoreValue);
          const criterionWeight = safeNumber(criterion.weight);
          
          // CORRECT CALCULATION (Same as backend):
          // If criterion weight is 25% (0.25) and level is "Excelente" (4 out of 4), 
          // then points = (4/4) * 25 = 25 points (not 4 * 0.25 = 1 point)
          const levelPercentage = levelScore / maxLevelScore; // e.g., 4/4 = 1.0 (100% of level)
          const criterionMaxPoints = criterionWeight * 100; // e.g., 0.25 * 100 = 25 points
          const earnedPoints = levelPercentage * criterionMaxPoints; // e.g., 1.0 * 25 = 25 points
          
          totalPoints += earnedPoints;
          completed++;
          
          // Calculando: ${criterion.name} = ${earnedPoints.toFixed(2)} pts
        }
      }
    });

    // Resultado final: ${totalPoints.toFixed(2)} puntos

    // Return the total points directly (already scaled to 100-point system)
    const finalScore = Math.round(totalPoints * 100) / 100;
    const finalPercentage = finalScore; // Since we're already in 100-point scale

    return {
      finalGrade: finalScore,
      percentage: finalPercentage,
      completedCriteria: completed,
    };
  }, [selectedCells, rubric]);

  // Notificar cambios en la nota
  useEffect(() => {
    onGradeCalculated(finalGrade, percentage);
  }, [finalGrade, percentage, onGradeCalculated]);

  // Función para manejar la selección de celdas
  const handleCellClick = (criterionId: string, levelId: string) => {
    if (readOnly) return;
    onCellSelect(criterionId, levelId);
  };

  // Obtener el color de fondo para una celda
  const getCellBackgroundColor = (criterionId: string, levelId: string) => {
    const isSelected = selectedCells[criterionId] === levelId;
    const level = rubric.levels.find(l => l.id === levelId);
    
    // Color debug reducido
    
    if (isSelected) {
      const color = level?.color || '#722ed1';
      // Aplicando color: ${level?.name}
      return color;
    }
    
    return 'transparent';
  };

  // Obtener el estilo de texto para una celda
  const getCellTextColor = (criterionId: string, levelId: string) => {
    const isSelected = selectedCells[criterionId] === levelId;
    return isSelected ? '#ffffff' : '#000000';
  };

  // Preparar datos para la tabla
  const tableData = rubric.criteria
    .sort((a, b) => a.order - b.order)
    .map(criterion => ({
      key: criterion.id,
      criterion,
      ...rubric.levels.reduce((acc, level) => {
        acc[`level_${level.id}`] = {
          level,
          cell: rubric.cells.find(cell => 
            cell.criterionId === criterion.id && cell.levelId === level.id
          ),
          isSelected: selectedCells[criterion.id] === level.id,
        };
        return acc;
      }, {} as Record<string, any>),
    }));

  // Configurar columnas de la tabla
  const columns: ColumnsType<any> = [
    {
      title: (
        <div className="text-center">
          <div className="font-semibold">Criterios de Evaluación</div>
          <div className="text-xs text-gray-500 mt-1">
            {completedCriteria}/{rubric.criteria.length} completados
          </div>
        </div>
      ),
      dataIndex: 'criterion',
      key: 'criterion',
      fixed: 'left',
      width: 250,
      render: (criterion: RubricCriterion) => (
        <motion.div
          className="p-3 h-full"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="font-medium text-gray-800 mb-2">
            {criterion.name}
            <Badge 
              count={`${Math.round(criterion.weight * 100)}%`}
              style={{ backgroundColor: '#1890ff', marginLeft: 8 }}
            />
          </div>
          {showDescriptions && criterion.description && (
            <div className="text-sm text-gray-600 leading-relaxed">
              {criterion.description}
            </div>
          )}
          {selectedCells[criterion.id] && (
            <div className="mt-2">
              <CheckCircleOutlined className="text-green-500 mr-1" />
              <Text className="text-xs text-green-600">Evaluado</Text>
            </div>
          )}
        </motion.div>
      ),
    },
    ...rubric.levels
      .sort((a, b) => a.order - b.order)
      .map(level => ({
        title: (
          <div className="text-center">
            <div 
              className="font-semibold text-white px-3 py-2 rounded-t shadow-md"
              style={{ backgroundColor: level.color }}
            >
              {level.name}
            </div>
            <div className="text-xs text-gray-600 mt-1 px-2 font-medium">
              {level.scoreValue} puntos
            </div>
            <div 
              className="w-4 h-4 mx-auto mt-2 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: level.color }}
              title={`Color: ${level.color}`}
            />
          </div>
        ),
        dataIndex: `level_${level.id}`,
        key: level.id,
        width: 200,
        className: 'rubric-level-column',
        render: (cellData: any, record: any) => {
          const { cell, isSelected } = cellData;
          const criterion = record.criterion;
          
          return (
            <motion.div
              className={`
                cursor-pointer p-3 h-full min-h-[120px] border-2 rounded
                ${isSelected ? 'border-purple-500' : 'border-gray-200'}
                ${readOnly ? 'cursor-default' : 'hover:border-purple-300'}
                transition-all duration-200
              `}
              style={{
                backgroundColor: getCellBackgroundColor(criterion.id, level.id),
                color: getCellTextColor(criterion.id, level.id),
              }}
              onClick={() => handleCellClick(criterion.id, level.id)}
              whileHover={readOnly ? {} : { scale: 1.05 }}
              whileTap={readOnly ? {} : { scale: 0.98 }}
              layout
            >
              {(cell?.content || cell?.description) && (
                <div className={`text-sm leading-relaxed ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                  {showDescriptions ? (cell.content || cell.description) : '...'}
                </div>
              )}
              
              {isSelected && (
                <motion.div
                  className="mt-2 text-center"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <CheckCircleOutlined className="text-white text-lg" />
                  <div className="text-xs mt-1 text-white">
                    Seleccionado
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        },
      })),
  ];

  return (
    <div className={`rubric-grading-interface ${className}`}>
      {/* Header con estadísticas */}
      <Card className="mb-4" size="small">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Nota Final"
              value={finalGrade}
              suffix={`/ ${rubric.maxScore}`}
              precision={2}
              prefix={<TrophyOutlined />}
              valueStyle={{ 
                color: finalGrade >= rubric.maxScore * 0.6 ? '#52c41a' : '#ff4d4f',
                fontSize: '1.5rem'
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Porcentaje"
              value={percentage}
              suffix="%"
              precision={1}
              prefix={<CalculatorOutlined />}
              valueStyle={{ 
                color: percentage >= 60 ? '#52c41a' : '#ff4d4f',
                fontSize: '1.5rem'
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <div className="text-gray-500 text-sm mb-1">Progreso</div>
              <Progress
                percent={(completedCriteria / rubric.criteria.length) * 100}
                status={completedCriteria === rubric.criteria.length ? 'success' : 'active'}
                format={() => `${completedCriteria}/${rubric.criteria.length}`}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Tooltip title="Alejar">
                <Button
                  icon={<ZoomOutOutlined />}
                  size="small"
                  onClick={() => setZoomLevel(Math.max(0.8, zoomLevel - 0.1))}
                  disabled={zoomLevel <= 0.8}
                />
              </Tooltip>
              <Text className="text-xs">{Math.round(zoomLevel * 100)}%</Text>
              <Tooltip title="Acercar">
                <Button
                  icon={<ZoomInOutlined />}
                  size="small"
                  onClick={() => setZoomLevel(Math.min(1.2, zoomLevel + 0.1))}
                  disabled={zoomLevel >= 1.2}
                />
              </Tooltip>
              <Button
                size="small"
                onClick={() => setShowDescriptions(!showDescriptions)}
              >
                {showDescriptions ? 'Ocultar' : 'Mostrar'} descripciones
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Alertas de estado */}
      <AnimatePresence>
        {completedCriteria < rubric.criteria.length && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <Alert
              message="Evaluación incompleta"
              description={`Faltan ${rubric.criteria.length - completedCriteria} criterios por evaluar`}
              type="warning"
              showIcon
              icon={<InfoCircleOutlined />}
            />
          </motion.div>
        )}
        
        {completedCriteria === rubric.criteria.length && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <Alert
              message="Evaluación completa"
              description="Todos los criterios han sido evaluados"
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerta informativa para móviles */}
      {isMobile && (
        <Alert
          message="Vista Móvil - Desliza horizontalmente"
          description={
            <Space direction="vertical" size="small">
              <Text style={{ fontSize: '13px' }}>
                <SwapOutlined /> Desliza la tabla horizontalmente para ver todos los niveles de evaluación.
              </Text>
              <Text style={{ fontSize: '13px' }}>
                Toca una celda para seleccionarla como criterio de evaluación.
              </Text>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Tabla principal de rúbrica */}
      <Card>
        <div style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          overflowX: isMobile ? 'auto' : undefined,
          WebkitOverflowScrolling: 'touch'
        }}>
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            scroll={{ x: 'max-content' }}
            size={isMobile ? 'small' : 'middle'}
            bordered
            className="rubric-table"
            rowClassName="rubric-row"
          />
        </div>
      </Card>

      {/* Información adicional */}
      <Card className="mt-4" size="small">
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Title level={5} className="mb-2">
              <InfoCircleOutlined className="mr-2" />
              Información de la Rúbrica
            </Title>
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Nombre: </Text>
            <Text>{rubric.name}</Text>
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Puntuación máxima: </Text>
            <Text>{rubric.maxScore} puntos</Text>
          </Col>
          {rubric.description && (
            <Col span={24}>
              <Text strong>Descripción: </Text>
              <Text>{rubric.description}</Text>
            </Col>
          )}
        </Row>
      </Card>

      <style jsx>{`
        .rubric-grading-interface {
          min-width: 800px;
        }
        
        .rubric-table .ant-table-thead > tr > th {
          background: #fafafa;
          text-align: center;
          padding: 8px;
        }
        
        .rubric-table .ant-table-tbody > tr > td {
          padding: 0;
          vertical-align: top;
        }
        
        .rubric-level-column {
          text-align: center;
        }
        
        @media (max-width: 768px) {
          .rubric-grading-interface {
            min-width: 100%;
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default RubricGradingInterface;