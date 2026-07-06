import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Collapse,
  Switch,
  Radio,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { ResourceFilters as Filters, ResourceType } from '../../services/educationalResourcesService';
import educationalResourcesService from '../../services/educationalResourcesService';
import api from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';

const { Panel } = Collapse;

interface ResourceFiltersProps {
  onFiltersChange: (filters: Filters) => void;
  defaultFilters?: Filters;
  showAdvanced?: boolean;
  academicYearId?: string;
}

const ResourceFilters: React.FC<ResourceFiltersProps> = ({
  onFiltersChange,
  defaultFilters = {},
  showAdvanced = true,
  academicYearId,
}) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [form] = Form.useForm();
  const [activeFilters, setActiveFilters] = useState<Filters>(defaultFilters);
  const [selectedEducationLevel, setSelectedEducationLevel] = useState<string>('');

  // Fetch subjects and educational levels from educational resources API  
  const { data: resourceMetadata, isLoading: metadataLoading, error: metadataError } = useQuery({
    queryKey: ['resource-metadata-all'],
    queryFn: async () => {
      console.log('🔍 FRONTEND: Fetching resource metadata...');
      const result = await educationalResourcesService.getResourceMetadata();
      console.log('📊 FRONTEND: Resource metadata received:', {
        subjects: result?.subjects?.length || 0,
        levels: result?.levels?.length || 0,
        subjectsPreview: result?.subjects?.slice(0, 3),
        levelsPreview: result?.levels
      });
      return result;
    },
    enabled: isAuthenticated && !isLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error('❌ FRONTEND: Error fetching resource metadata:', error);
    }
  });

  // For students, fetch only subjects with assigned resources (smart filtering)
  const { data: assignedSubjects, isLoading: assignedSubjectsLoading } = useQuery({
    queryKey: ['assigned-subjects', academicYearId],
    queryFn: async () => {
      const subjects = await educationalResourcesService.getSubjectsWithAssignedResources(academicYearId);
      return subjects;
    },
    enabled: isAuthenticated && !isLoading && user?.role === 'student',
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for dynamic data)
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error('❌ FRONTEND: Error fetching assigned subjects:', error);
    }
  });

  // Use smart filtering for students: only show subjects with assigned resources
  const subjects = user?.role === 'student' 
    ? (assignedSubjects || [])
    : (resourceMetadata?.subjects || []);
  const educationalLevels = resourceMetadata?.levels || [];

  // Fetch resource types metadata from API
  const { data: metadataResponse, isLoading: typesLoading, error: typesError } = useQuery({
    queryKey: ['recursos-metadata'],
    queryFn: async () => {
      const response = await api.get('/recursos/metadata/resource-types');
      return response.data;
    },
    enabled: isAuthenticated && !isLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Use resource types from metadata or fallback to static data if API fails
  const fallbackMetadata = [
    { value: 'PDF', label: 'PDF' },
    { value: 'VIDEO', label: 'Video' },
    { value: 'IMAGE', label: 'Imagen' },
    { value: 'INTERACTIVE_HTML', label: 'HTML Interactivo' },
    { value: 'DOCUMENT', label: 'Documento' },
    { value: 'PRESENTATION', label: 'Presentación' },
    { value: 'SPREADSHEET', label: 'Hoja de Cálculo' },
    { value: 'AUDIO', label: 'Audio' },
  ];

  const metadata = resourceMetadata?.types || metadataResponse?.data || fallbackMetadata;

  // Ensure metadata is always an array
  const safeMetadata = metadata && Array.isArray(metadata) ? metadata : [];
  
  // Debug logging - temporarily disabled
  // console.log('ResourceFilters - isAuthenticated:', isAuthenticated);
  // console.log('ResourceFilters - metadata:', metadata);
  // console.log('ResourceFilters - safeMetadata:', safeMetadata);

  // Show loading only if still loading initial authentication
  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Cargando filtros...</p>
        </div>
      </Card>
    );
  }

  // Show loading state for metadata (include assigned subjects loading for students)
  if (metadataLoading || (user?.role === 'student' && assignedSubjectsLoading)) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Cargando datos de filtros...</p>
          {user?.role === 'student' && assignedSubjectsLoading && (
            <p style={{ fontSize: '12px', color: '#666' }}>Obteniendo asignaturas con recursos disponibles...</p>
          )}
        </div>
      </Card>
    );
  }

  // Show error state for metadata
  if (metadataError) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: 'red' }}>❌ Error cargando filtros: {metadataError.message}</p>
          <p>Subjects: {subjects.length}, Levels: {educationalLevels.length}</p>
        </div>
      </Card>
    );
  }

  // Set default filters - simple approach without hooks
  if (defaultFilters && Object.keys(defaultFilters).length > 0 && !form.isFieldsTouched()) {
    form.setFieldsValue(defaultFilters);
  }

  const handleFormChange = () => {
    const values = form.getFieldsValue();
    const filters: Filters = {
      ...values,
      tags: values.tags || undefined,
    };
    
    // Remove empty values
    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof Filters] === undefined || filters[key as keyof Filters] === '') {
        delete filters[key as keyof Filters];
      }
    });

    setActiveFilters(filters);
    onFiltersChange(filters);
  };

  const handleClearFilters = () => {
    form.resetFields();
    setActiveFilters({});
    setSelectedEducationLevel('');
    onFiltersChange({});
  };

  const getActiveFilterCount = () => {
    return Object.keys(activeFilters).filter(
      (key) => key !== 'page' && key !== 'limit' && key !== 'sortBy' && key !== 'sortOrder'
    ).length;
  };

  const getGradeLevels = () => {
    if (!selectedEducationLevel || !educationalLevels) return [];
    
    const level = educationalLevels.find(
      (el) => el.id === selectedEducationLevel
    );
    
    if (!level) return [];
    
    // Generate grade levels based on education level
    if (level.name.includes('Primaria')) {
      return ['1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria'];
    } else if (level.name.includes('ESO')) {
      return ['1º ESO', '2º ESO', '3º ESO', '4º ESO'];
    }
    
    return [];
  };

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Search Input */}
          <Form.Item name="search" style={{ marginBottom: 0 }}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Buscar por título o descripción..."
              allowClear
              size="large"
            />
          </Form.Item>

          {/* Quick Filters */}
          <Space wrap>
            <Form.Item name="type" style={{ marginBottom: 0 }}>
              <Select
                placeholder="Tipo de recurso"
                allowClear
                style={{ width: 180 }}
                loading={typesLoading}
              >
                {safeMetadata.map((type) => (
                  <Select.Option key={type.value} value={type.value}>
                    {type.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="educationalLevelId" style={{ marginBottom: 0 }}>
              <Select
                placeholder="Nivel educativo"
                allowClear
                style={{ width: 180 }}
                onChange={(value) => {
                  setSelectedEducationLevel(value);
                  form.setFieldValue('gradeLevel', undefined);
                }}
              >
                {educationalLevels?.map((level) => (
                  <Select.Option key={level.id} value={level.id}>
                    {level.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="gradeLevel" style={{ marginBottom: 0 }}>
              <Select
                placeholder="Curso"
                allowClear
                style={{ width: 150 }}
                disabled={!selectedEducationLevel}
              >
                {getGradeLevels().map((grade) => (
                  <Select.Option key={grade} value={grade}>
                    {grade}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="subjectId" style={{ marginBottom: 0 }}>
              <Select
                placeholder="Asignatura"
                allowClear
                style={{ width: 200 }}
              >
                {subjects?.map((subject) => (
                  <Select.Option key={subject.id} value={subject.id}>
                    {subject.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          {/* Advanced Filters */}
          {showAdvanced && (
            <Collapse ghost>
              <Panel
                header={
                  <Space>
                    <FilterOutlined />
                    <span>Filtros avanzados</span>
                    {getActiveFilterCount() > 0 && (
                      <Tag color="blue">{getActiveFilterCount()}</Tag>
                    )}
                  </Space>
                }
                key="advanced"
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Form.Item name="tags" label="Etiquetas">
                    <Select
                      mode="tags"
                      placeholder="Filtrar por etiquetas"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Space wrap>
                    <Form.Item
                      name="isPublic"
                      label="Visibilidad"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="Públicos" unCheckedChildren="Todos" />
                    </Form.Item>

                    <Form.Item
                      name="isAssigned"
                      label="Asignados"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="Asignados" unCheckedChildren="Todos" />
                    </Form.Item>

                    <Form.Item
                      name="isFavorite"
                      label="Favoritos"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="Favoritos" unCheckedChildren="Todos" />
                    </Form.Item>
                  </Space>

                  <Form.Item name="sortBy" label="Ordenar por">
                    <Radio.Group>
                      <Radio.Button value="createdAt">Fecha</Radio.Button>
                      <Radio.Button value="title">Título</Radio.Button>
                      <Radio.Button value="views">Vistas</Radio.Button>
                      <Radio.Button value="downloads">Descargas</Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item name="sortOrder" label="Orden">
                    <Radio.Group>
                      <Radio.Button value="DESC">Descendente</Radio.Button>
                      <Radio.Button value="ASC">Ascendente</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Space>
              </Panel>
            </Collapse>
          )}

          {/* Clear Filters Button */}
          {getActiveFilterCount() > 0 && (
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
              type="text"
            >
              Limpiar filtros ({getActiveFilterCount()})
            </Button>
          )}
        </Space>
      </Form>
    </Card>
  );
};

export default ResourceFilters;