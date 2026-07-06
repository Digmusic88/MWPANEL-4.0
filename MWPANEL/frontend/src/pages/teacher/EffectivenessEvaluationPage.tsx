/**
 * @archivo: EffectivenessEvaluationPage.tsx
 * @módulo: Teacher Pages (DUA - Evaluaciones de Efectividad)
 * @función: Página para gestionar evaluaciones de efectividad de acomodaciones DUA
 * @crítico: SÍ - Sistema de seguimiento de efectividad de adaptaciones educativas
 * @dependencias: React Router, EffectivenessEvaluationForm, duaService
 * @relacionado_con: DuaDashboard, DuaAccommodationsPage, AccommodationSystem
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Space,
  Spin,
  Alert,
  Table,
  Tag,
  message,
  Modal,
  Progress,
  Statistic,
  Row,
  Col,
  Empty,
  Tooltip,
  Badge,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  StarOutlined,
  CalendarOutlined,
  UserOutlined,
  BookOutlined,
  BarChartOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import EffectivenessEvaluationForm from '../../components/dua/EffectivenessEvaluationForm';
import { duaService } from '../../services/duaService';
import { DuaPageHeader } from '../../components/dua/DuaPageHeader';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface EffectivenessRecord {
  id: string;
  accommodationId: string;
  studentId: string;
  evaluationDate: string;
  overallRating: number;
  effectivenessRating: number;
  observations?: string;
  recommendations?: string;
  suggestContinuation: boolean;
  suggestModification: boolean;
  modificationSuggestions?: string;
  evaluatedBy: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  student: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    classGroup?: {
      name: string;
    };
  };
  accommodation: {
    id: string;
    name: string;
    type: string;
    category: string;
  };
  metrics?: any;
  createdAt: string;
  updatedAt: string;
}

const EffectivenessEvaluationPage: React.FC = () => {
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === 'function') {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn('Navigation error:', error, 'Path:', path);
      }
    } else {
      console.warn('Navigate function not available:', path);
    }
  }, [navigate]);
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<EffectivenessRecord[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EffectivenessRecord | null>(null);
  const [filters, setFilters] = useState<any>({});

  // Determinar si estamos en modo "nueva evaluación"
  const isNewEvaluation = location.pathname.includes('/new');

  useEffect(() => {
    if (isNewEvaluation) {
      setShowForm(true);
    } else {
      fetchEffectivenessRecords();
    }
  }, [isNewEvaluation]);

  const fetchEffectivenessRecords = async (currentFilters = filters) => {
    try {
      setLoading(true);
      const response = await duaService.getEffectivenessRecords({
        ...currentFilters,
        limit: 20,
      });
      setRecords(response.data || []);
      setStatistics(response.statistics || null);
    } catch (error: any) {
      console.error('Error fetching effectiveness records:', error);
      message.error('Error al cargar las evaluaciones de efectividad');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvaluation = () => {
    setSelectedRecord(null);
    setShowForm(true);
  };

  const handleEditEvaluation = (record: EffectivenessRecord) => {
    setSelectedRecord(record);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (selectedRecord) {
        // Actualizar evaluación existente
        await duaService.createEffectivenessRecord({
          ...data,
          id: selectedRecord.id,
        });
        message.success('Evaluación actualizada exitosamente');
      } else {
        // Crear nueva evaluación
        await duaService.createEffectivenessRecord(data);
        message.success('Evaluación creada exitosamente');
      }
      
      setShowForm(false);
      setSelectedRecord(null);
      
      if (isNewEvaluation) {
        // Si estamos en modo "nueva evaluación", redirigir al listado
        safeNavigate('/teacher/dua/effectiveness');
      } else {
        // Actualizar la lista
        fetchEffectivenessRecords();
      }
    } catch (error: any) {
      console.error('Error saving effectiveness evaluation:', error);
      message.error(error.response?.data?.message || 'Error al guardar la evaluación');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedRecord(null);
    
    if (isNewEvaluation) {
      // Si estamos en modo "nueva evaluación", redirigir al dashboard o listado
      safeNavigate('/teacher/dua');
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#2E7D52';
    if (rating >= 3) return '#B45309';
    if (rating >= 2) return '#ff7875';
    return '#ff4d4f';
  };

  const getRatingText = (rating: number) => {
    if (rating >= 4) return 'Excelente';
    if (rating >= 3) return 'Buena';
    if (rating >= 2) return 'Regular';
    return 'Baja';
  };

  const columns = [
    {
      title: 'Estudiante',
      key: 'student',
      render: (record: EffectivenessRecord) => (
        <Space>
          <UserOutlined />
          <div>
            <Text strong>
              {record.student?.user?.profile?.firstName} {record.student?.user?.profile?.lastName}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.student?.classGroup?.name || 'Sin clase'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Acomodación',
      key: 'accommodation',
      render: (record: EffectivenessRecord) => (
        <div>
          <Text strong>{record.accommodation?.name}</Text>
          <br />
          <Tag color="#579172" style={{ fontSize: 11 }}>
            {record.accommodation?.category}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Efectividad',
      key: 'effectiveness',
      width: 120,
      render: (record: EffectivenessRecord) => {
        const rating = record.effectivenessRating || record.overallRating || 0;
        return (
          <Space direction="vertical" align="center" size={4}>
            <Progress
              type="circle"
              size={50}
              percent={rating * 20}
              format={() => rating.toFixed(1)}
              strokeColor={getRatingColor(rating)}
            />
            <Text style={{ color: getRatingColor(rating), fontSize: 11 }}>
              {getRatingText(rating)}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Fecha',
      key: 'date',
      width: 100,
      render: (record: EffectivenessRecord) => {
        const evaluationDate = dayjs(record.evaluationDate);
        const daysAgo = dayjs().diff(evaluationDate, 'days');
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12 }}>
              {evaluationDate.format('DD/MM/YYYY')}
            </Text>
            <Text type="secondary" style={{ fontSize: 10 }}>
              {daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? 'Ayer' : `${daysAgo} días`}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Evaluador',
      key: 'evaluator',
      render: (record: EffectivenessRecord) => (
        <Text style={{ fontSize: 12 }}>
          {record.evaluatedBy?.user?.profile?.firstName} {record.evaluatedBy?.user?.profile?.lastName}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (record: EffectivenessRecord) => (
        <Space>
          <Tooltip title="Ver detalles">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                Modal.info({
                  title: 'Detalles de la Evaluación',
                  width: 700,
                  content: (
                    <div style={{ marginTop: 16 }}>
                      <Paragraph>
                        <strong>Observaciones:</strong><br />
                        {record.observations || 'Sin observaciones'}
                      </Paragraph>
                      <Paragraph>
                        <strong>Recomendaciones:</strong><br />
                        {record.recommendations || 'Sin recomendaciones'}
                      </Paragraph>
                      {record.suggestModification && record.modificationSuggestions && (
                        <Paragraph>
                          <strong>Sugerencias de modificación:</strong><br />
                          {record.modificationSuggestions}
                        </Paragraph>
                      )}
                      <Space>
                        <Tag color={record.suggestContinuation ? 'green' : 'red'}>
                          {record.suggestContinuation ? 'Continuar' : 'No continuar'}
                        </Tag>
                        <Tag color={record.suggestModification ? 'orange' : 'blue'}>
                          {record.suggestModification ? 'Modificar' : 'Sin modificaciones'}
                        </Tag>
                      </Space>
                    </div>
                  ),
                });
              }}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditEvaluation(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (showForm) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <DuaPageHeader
            title={selectedRecord ? 'Editar Evaluación de Efectividad' : 'Nueva Evaluación de Efectividad'}
            actions={
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleFormCancel}
              >
                Volver
              </Button>
            }
          />

          <EffectivenessEvaluationForm
            initialData={selectedRecord}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <DuaPageHeader
        title="Evaluaciones de Efectividad"
        subtitle="Gestiona y revisa la efectividad de las acomodaciones DUA implementadas"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateEvaluation}
          >
            Nueva Evaluación
          </Button>
        }
      />

      {/* Estadísticas */}
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Evaluaciones"
                value={statistics.totalRecords || 0}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Efectividad Promedio"
                value={statistics.averageRating || 0}
                precision={1}
                suffix="/ 5.0"
                prefix={<StarOutlined />}
                valueStyle={{ color: getRatingColor(statistics.averageRating || 0) }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Evaluaciones Este Mes"
                value={statistics.thisMonthCount || 0}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabla de evaluaciones */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <BarChartOutlined />
            <Text strong>Lista de Evaluaciones</Text>
            {records.length > 0 && (
              <Badge count={records.length} showZero style={{ backgroundColor: '#2E7D52' }} />
            )}
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={records}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} evaluaciones`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" align="center">
                    <Text type="secondary">No hay evaluaciones de efectividad registradas</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Las evaluaciones aparecen después de implementar acomodaciones DUA
                    </Text>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleCreateEvaluation}
                    >
                      Crear Primera Evaluación
                    </Button>
                  </Space>
                }
              />
            ),
          }}
        />
      </Card>
    </motion.div>
  );
};

export default EffectivenessEvaluationPage;