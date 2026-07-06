import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Select,
  Button,
  Space,
  Tag,
  Tooltip,
  Row,
  Col,
  Statistic,
  Input,
  DatePicker,
  Alert,
  Typography,
  Divider,
  Badge
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  BarChartOutlined,
  TrophyOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useUnifiedGrades } from '../../hooks/useUnifiedGrades';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;
const { Option } = Select;

interface GradeScale {
  scale: string;
  value: number | string;
  label?: string;
  color?: string;
}

interface UnifiedGradeDisplay {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  description: string;
  originalValue: number;
  source: string;
  allScales: {
    standard: number;
    cambridge: string;
    rubric: number;
    numeric_10: number;
  };
  createdAt: string;
  type: string;
  targetScale: string;
  convertedValue: number;
  convertedText: string;
  conversionNote?: string;
}

/**
 * 🎯 VISOR DE CALIFICACIONES UNIFICADAS
 * Muestra calificaciones reales de la base de datos con conversiones automáticas a todas las escalas
 */
const UnifiedGradesViewer: React.FC = () => {
  // Estados principales
  const [filters, setFilters] = useState({
    studentId: undefined,
    subjectId: undefined,
    scale: 'standard',
    period: undefined,
    search: ''
  });
  
  const [availableStudents, setAvailableStudents] = useState<Array<{id: string, name: string}>>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{id: string, name: string}>>([]);

  const { user } = useAuthStore();
  
  // Hook de calificaciones unificadas
  const {
    studentGrades,
    availableScales,
    selectedScale,
    loading,
    error,
    fetchAllGrades,
    setSelectedScale,
    clearError,
    getGradeColor,
    getQualityLabel
  } = useUnifiedGrades();

  // Cargar calificaciones al montar el componente
  useEffect(() => {
    fetchAllGrades(filters);
  }, []);

  // Extraer estudiantes y asignaturas únicos cuando lleguen los datos
  useEffect(() => {
    if (studentGrades?.grades) {
      const students = Array.from(new Set(
        studentGrades.grades.map((grade: any) => 
          JSON.stringify({id: grade.studentId, name: grade.studentName})
        )
      )).map(str => JSON.parse(str)).filter(s => s.id && s.name);

      const subjects = Array.from(new Set(
        studentGrades.grades.map((grade: any) => 
          JSON.stringify({id: grade.subjectId, name: grade.subjectName})
        )
      )).map(str => JSON.parse(str)).filter(s => s.id && s.name);

      setAvailableStudents(students);
      setAvailableSubjects(subjects);
    }
  }, [studentGrades?.grades]);

  // Actualizar cuando cambien los filtros
  useEffect(() => {
    if (Object.keys(filters).some(key => filters[key as keyof typeof filters])) {
      fetchAllGrades(filters);
    }
  }, [filters.studentId, filters.subjectId, filters.scale, filters.period]);

  /**
   * 🔍 MANEJO DE FILTROS
   */
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRefresh = () => {
    fetchAllGrades(filters);
  };

  const clearFilters = () => {
    setFilters({
      studentId: undefined,
      subjectId: undefined,
      scale: 'standard',
      period: undefined,
      search: ''
    });
    fetchAllGrades({});
  };

  /**
   * 🎨 FUNCIONES DE VISUALIZACIÓN
   */
  const getScaleColor = (scale: string) => {
    switch (scale) {
      case 'standard': return '#1890ff';
      case 'cambridge': return '#52c41a';
      case 'rubric': return '#722ed1';
      case 'numeric_10': return '#fa8c16';
      default: return '#666666';
    }
  };

  const getScaleLabel = (scale: string) => {
    switch (scale) {
      case 'standard': return 'Estándar (0-100)';
      case 'cambridge': return 'Cambridge (A*-U)';
      case 'rubric': return 'Rúbrica (1-4)';
      case 'numeric_10': return 'Numérica (1-10)';
      default: return scale;
    }
  };

  const renderScaleValue = (value: number | string, scale: string) => {
    const color = getScaleColor(scale);
    
    if (scale === 'cambridge') {
      return <Tag color={color}>{value}</Tag>;
    }
    
    return (
      <Badge 
        count={value} 
        style={{ 
          backgroundColor: color,
          color: '#fff'
        }} 
        showZero 
      />
    );
  };

  /**
   * 📊 CONFIGURACIÓN DE TABLA
   */
  const columns = [
    {
      title: 'Estudiante',
      key: 'student',
      width: 150,
      render: (record: UnifiedGradeDisplay) => (
        <div>
          <Text strong>{record.studentName || 'No disponible'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.studentId || 'N/A'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Asignatura',
      key: 'subject',
      width: 120,
      render: (record: UnifiedGradeDisplay) => (
        <div>
          <Text>{record.subjectName || 'No disponible'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description || record.type || 'Actividad'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Original',
      key: 'original',
      width: 100,
      align: 'center' as const,
      render: (record: UnifiedGradeDisplay) => (
        <div>
          <Badge 
            count={record.originalValue} 
            style={{ backgroundColor: getGradeColor(record.originalValue) }}
            showZero 
          />
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {record.originalScale}
          </Text>
        </div>
      ),
    },
    {
      title: 'Estándar (0-100)',
      key: 'standard',
      width: 100,
      align: 'center' as const,
      render: (record: UnifiedGradeDisplay) => (
        <Tooltip title={getQualityLabel(record.allScales?.standard || 0)}>
          {renderScaleValue(record.allScales?.standard || 0, 'standard')}
        </Tooltip>
      ),
    },
    {
      title: 'Cambridge',
      key: 'cambridge',
      width: 90,
      align: 'center' as const,
      render: (record: UnifiedGradeDisplay) => (
        <Tooltip title="Sistema Cambridge A*-U">
          {renderScaleValue(record.allScales?.cambridge || 'U', 'cambridge')}
        </Tooltip>
      ),
    },
    {
      title: 'Rúbrica (1-4)',
      key: 'rubric',
      width: 90,
      align: 'center' as const,
      render: (record: UnifiedGradeDisplay) => (
        <Tooltip title="Evaluación por rúbrica">
          {renderScaleValue(record.allScales?.rubric || 1, 'rubric')}
        </Tooltip>
      ),
    },
    {
      title: 'Numérica (1-10)',
      key: 'numeric',
      width: 100,
      align: 'center' as const,
      render: (record: UnifiedGradeDisplay) => (
        <Tooltip title="Sistema numérico español">
          {renderScaleValue(record.allScales?.numeric_10 || 0, 'numeric_10')}
        </Tooltip>
      ),
    },
    {
      title: 'Fecha',
      key: 'date',
      width: 120,
      render: (record: UnifiedGradeDisplay) => (
        <div>
          <Text style={{ fontSize: '12px' }}>
            {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {record.source || 'Sistema'}
          </Text>
        </div>
      ),
    },
  ];

  // Filtrar datos localmente
  const filteredGrades = React.useMemo(() => {
    if (!studentGrades?.grades) {
      return [];
    }

    return studentGrades.grades.filter((grade: any) => {
      // Filtro por estudiante
      if (filters.studentId && grade.studentId !== filters.studentId) {
        return false;
      }

      // Filtro por asignatura
      if (filters.subjectId && grade.subjectId !== filters.subjectId) {
        return false;
      }

      // Filtro por búsqueda de texto
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          grade.studentName?.toLowerCase().includes(searchLower) ||
          grade.subjectName?.toLowerCase().includes(searchLower) ||
          grade.description?.toLowerCase().includes(searchLower) ||
          grade.type?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [studentGrades?.grades, filters.studentId, filters.subjectId, filters.search]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <TrophyOutlined /> Calificaciones Unificadas
        </Title>
        <Text type="secondary">
          Vista completa de calificaciones reales con conversiones automáticas a todas las escalas
        </Text>
      </div>

      {/* Estadísticas Rápidas */}
      {studentGrades && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Total Calificaciones"
                value={studentGrades.total_grades || 0}
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Calificaciones Mostradas"
                value={filteredGrades.length}
                prefix={<BookOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Escalas Disponibles"
                value={4}
                suffix="escalas"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Conversiones Automáticas"
                value={filteredGrades.length * 4}
                suffix="conversiones"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Panel de Filtros */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Input
              placeholder="Buscar estudiante, asignatura..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Estudiante"
              value={filters.studentId}
              onChange={(value) => handleFilterChange('studentId', value)}
              allowClear
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
            >
              {availableStudents.map(student => (
                <Option key={student.id} value={student.id}>
                  {student.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Asignatura"
              value={filters.subjectId}
              onChange={(value) => handleFilterChange('subjectId', value)}
              allowClear
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
            >
              {availableSubjects.map(subject => (
                <Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Escala principal"
              value={filters.scale}
              onChange={(value) => handleFilterChange('scale', value)}
              style={{ width: '100%' }}
            >
              <Option value="standard">Estándar (0-100)</Option>
              <Option value="cambridge">Cambridge (A*-U)</Option>
              <Option value="rubric">Rúbrica (1-4)</Option>
              <Option value="numeric_10">Numérica (1-10)</Option>
            </Select>
          </Col>
          <Col span={3}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={loading}
            >
              Actualizar
            </Button>
          </Col>
          <Col span={3}>
            <Button 
              icon={<FilterOutlined />} 
              onClick={clearFilters}
            >
              Limpiar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Alertas de Estado */}
      {error && (
        <Alert
          message="Error al cargar calificaciones"
          description={error}
          type="error"
          showIcon
          closable
          onClose={clearError}
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Información del Sistema */}
      <Alert
        message="Sistema de Conversiones Automáticas Activo"
        description={
          <div>
            <Text>
              Mostrando calificaciones reales de la base de datos con conversiones automáticas a las 4 escalas disponibles: 
              Estándar (0-100), Cambridge (A*-U), Rúbrica (1-4) y Numérica (1-10).
            </Text>
            {studentGrades && (
              <>
                <Divider type="vertical" />
                <Text type="secondary">
                  Última actualización: {new Date().toLocaleString()}
                </Text>
              </>
            )}
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* Tabla Principal */}
      <Card title="Calificaciones con Conversiones Automáticas">
        <Table
          columns={columns}
          dataSource={filteredGrades}
          rowKey={(record) => record.id || `${record.studentId}-${record.subjectId}-${record.createdAt}`}
          loading={loading}
          pagination={{
            total: filteredGrades.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} calificaciones`,
          }}
          scroll={{ x: 800 }}
          size="small"
        />
      </Card>

      {/* Información Técnica */}
      {studentGrades && (
        <Card 
          title="Información del Sistema" 
          size="small" 
          style={{ marginTop: '16px' }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Text strong>Origen de Datos:</Text> Base de datos real (PostgreSQL)
            </Col>
            <Col span={8}>
              <Text strong>Tipo:</Text> Sin duplicación - Vista unificada
            </Col>
            <Col span={8}>
              <Text strong>Estado:</Text> <Tag color="green">Operativo</Tag>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default UnifiedGradesViewer;