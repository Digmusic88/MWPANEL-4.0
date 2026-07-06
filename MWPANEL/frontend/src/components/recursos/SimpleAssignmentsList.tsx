/**
 * @archivo: SimpleAssignmentsList.tsx
 * @módulo: Educational Resources - Simple Assignment Tracking
 * @función: Lista simple de asignaciones con tracking básico
 * @proyecto: MW Panel 2.0 - Sistema Simple de Asignaciones
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Lista sencilla que muestra las asignaciones de recursos con
 * estado básico de completado/no completado.
 * 
 * FUNCIONALIDADES:
 * - Lista de asignaciones por profesor/estudiante
 * - Estado simple: Asignado/Completado/Vencido
 * - Filtros básicos
 * - Acciones simples (ver, eliminar)
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - SIMPLE ASSIGNMENT SYSTEM
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Avatar,
  Tooltip,
  Input,
  Select,
  DatePicker,
  message,
  Modal,
  Card,
  Row,
  Col,
  Statistic,
  Progress
} from 'antd';
import {
  EyeOutlined,
  DeleteOutlined,
  SearchOutlined,
  BookOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface SimpleAssignment {
  id: string;
  resourceId: string;
  resourceTitle: string;
  resourceType: string;
  assignmentType: 'individual' | 'class';
  targetId: string;
  targetName: string; // Nombre del estudiante o clase
  studentCount?: number; // Para asignaciones de clase
  assignedById: string;
  assignedByName: string;
  assignedAt: string;
  dueDate?: string;
  instructions?: string;
  completedAt?: string;
  status: 'assigned' | 'completed' | 'overdue';
}

interface SimpleAssignmentsListProps {
  userRole?: 'teacher' | 'student' | 'family';
  className?: string;
}

/**
 * Configuración de estados
 */
const statusConfig = {
  assigned: {
    color: 'processing',
    icon: <ClockCircleOutlined />,
    text: 'Asignado'
  },
  completed: {
    color: 'success',
    icon: <CheckCircleOutlined />,
    text: 'Completado'
  },
  overdue: {
    color: 'error',
    icon: <ExclamationCircleOutlined />,
    text: 'Vencido'
  }
};

export const SimpleAssignmentsList: React.FC<SimpleAssignmentsListProps> = ({
  userRole,
  className = ''
}) => {
  const { user } = useAuth();
  
  // Estados
  const [assignments, setAssignments] = useState<SimpleAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null
  });

  // Cargar asignaciones
  useEffect(() => {
    loadAssignments();
  }, [filters]);

  // Función para cargar asignaciones
  const loadAssignments = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange[0].toISOString());
        params.append('endDate', filters.dateRange[1].toISOString());
      }

      const response = await fetch(`/api/resource-assignments?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Procesar datos para obtener estado
        const processedAssignments = data.map((assignment: any) => ({
          ...assignment,
          status: getAssignmentStatus(assignment)
        }));
        
        setAssignments(processedAssignments);
      } else {
        message.error('Error al cargar las asignaciones');
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      message.error('Error al cargar las asignaciones');
    } finally {
      setLoading(false);
    }
  };

  // Función para determinar estado de asignación
  const getAssignmentStatus = (assignment: any): 'assigned' | 'completed' | 'overdue' => {
    if (assignment.completedAt) {
      return 'completed';
    }
    
    if (assignment.dueDate && dayjs().isAfter(dayjs(assignment.dueDate))) {
      return 'overdue';
    }
    
    return 'assigned';
  };

  // Función para eliminar asignación
  const handleDeleteAssignment = (assignment: SimpleAssignment) => {
    Modal.confirm({
      title: '¿Eliminar asignación?',
      content: `¿Está seguro de que desea eliminar la asignación de "${assignment.resourceTitle}"?`,
      okText: 'Eliminar',
      cancelText: 'Cancelar',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await fetch(`/api/resource-assignments/${assignment.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          });

          if (response.ok) {
            message.success('Asignación eliminada correctamente');
            loadAssignments();
          } else {
            message.error('Error al eliminar la asignación');
          }
        } catch (error) {
          message.error('Error al eliminar la asignación');
        }
      }
    });
  };

  // Función para marcar como completado (para estudiantes)
  const handleMarkCompleted = async (assignment: SimpleAssignment) => {
    try {
      const response = await fetch(`/api/resource-assignments/${assignment.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        message.success('Marcado como completado');
        loadAssignments();
      } else {
        message.error('Error al marcar como completado');
      }
    } catch (error) {
      message.error('Error al marcar como completado');
    }
  };

  // Estadísticas calculadas
  const stats = React.useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const overdue = assignments.filter(a => a.status === 'overdue').length;
    const pending = total - completed - overdue;
    
    return {
      total,
      completed,
      overdue,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [assignments]);

  // Columnas de la tabla
  const columns: ColumnsType<SimpleAssignment> = [
    {
      title: 'Recurso',
      dataIndex: 'resourceTitle',
      key: 'resource',
      render: (title, record) => (
        <div className="flex items-center gap-3">
          <Avatar size={32} icon={<BookOutlined />} />
          <div>
            <div className="font-medium">{title}</div>
            <Text type="secondary" className="text-sm">{record.resourceType}</Text>
          </div>
        </div>
      ),
      width: 300
    },
    {
      title: 'Asignado a',
      key: 'target',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          {record.assignmentType === 'class' ? <TeamOutlined /> : <UserOutlined />}
          <div>
            <div>{record.targetName}</div>
            {record.studentCount && (
              <Text type="secondary" className="text-sm">
                {record.studentCount} estudiantes
              </Text>
            )}
          </div>
        </div>
      ),
      width: 200
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusConfig[status];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
      width: 120,
      filters: [
        { text: 'Asignado', value: 'assigned' },
        { text: 'Completado', value: 'completed' },
        { text: 'Vencido', value: 'overdue' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Fecha asignación',
      dataIndex: 'assignedAt',
      key: 'assignedAt',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
      width: 120
    },
    {
      title: 'Fecha límite',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
      width: 120
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver recurso">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              href={`/recursos/${record.resourceId}`}
              target="_blank"
            />
          </Tooltip>
          
          {userRole === 'student' && record.status === 'assigned' && (
            <Tooltip title="Marcar como completado">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleMarkCompleted(record)}
              />
            </Tooltip>
          )}
          
          {(userRole === 'teacher' || user?.role === 'admin') && (
            <Tooltip title="Eliminar asignación">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteAssignment(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
      width: 120,
      fixed: 'right'
    }
  ];

  return (
    <div className={`simple-assignments-list ${className}`}>
      {/* Estadísticas */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Asignaciones"
              value={stats.total}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Completadas"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Pendientes"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm">Tasa Completado</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.completionRate}%
                </div>
              </div>
              <Progress 
                type="circle" 
                percent={stats.completionRate}
                size={60}
                strokeColor="#52c41a"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      <Card className="mb-4">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Search
              placeholder="Buscar por recurso o asignado a..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              allowClear
            />
          </Col>
          
          <Col xs={24} sm={6}>
            <Select
              placeholder="Estado"
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              style={{ width: '100%' }}
            >
              <Option value="all">Todos los estados</Option>
              <Option value="assigned">Asignado</Option>
              <Option value="completed">Completado</Option>
              <Option value="overdue">Vencido</Option>
            </Select>
          </Col>
          
          <Col xs={24} sm={8}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Fecha inicio', 'Fecha fin']}
              value={filters.dateRange}
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
            />
          </Col>
          
          <Col xs={24} sm={2}>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadAssignments}
              loading={loading}
            />
          </Col>
        </Row>
      </Card>

      {/* Tabla */}
      <Card>
        <Table
          columns={columns}
          dataSource={assignments}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} de ${total} asignaciones`
          }}
        />
      </Card>
    </div>
  );
};