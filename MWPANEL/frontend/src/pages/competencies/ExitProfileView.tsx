/**
 * @archivo: ExitProfileView.tsx
 * @módulo: Pages/Competencies (Vista del Perfil de Salida)
 * @función: Vista completa del Perfil de Salida con descriptores operativos
 * @crítico: SÍ - Visualización núcleo del sistema competencial LOMLOE
 * @dependencias: useCompetencies, Ant Design, Framer Motion
 * @relacionado_con: Sistema competencial, evaluación formativa
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Tag,
  Typography,
  Space,
  Button,
  Divider,
  Input,
  Tooltip,
  Badge,
  Empty,
  Spin,
  Alert,
} from 'antd';
import {
  BookOutlined,
  SearchOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useExitProfiles, useOperativeDescriptors } from '../../hooks/useCompetencies';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

// Colores por competencia clave europea
const COMPETENCY_COLORS = {
  'CCL': '#3B82F6',   // Competencia en comunicación lingüística - Azul
  'CP': '#10B981',    // Competencia plurilingüe - Verde
  'STEM': '#8B5CF6',  // Competencia matemática y en ciencia, tecnología e ingeniería - Morado
  'CD': '#F59E0B',    // Competencia digital - Amarillo
  'CPSAA': '#EF4444', // Competencia personal, social y de aprender a aprender - Rojo
  'CC': '#F97316',    // Competencia ciudadana - Naranja
  'CE': '#EC4899',    // Competencia emprendedora - Rosa
  'CCEC': '#06B6D4',  // Competencia en conciencia y expresión culturales - Cian
};

interface ExitProfileViewProps {
  className?: string;
}

const ExitProfileView: React.FC<ExitProfileViewProps> = ({ className }) => {
  const [selectedStage, setSelectedStage] = useState<'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA'>('PRIMARIA');
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Queries
  const { data: exitProfiles, isLoading: loadingProfiles, error: profilesError } = useExitProfiles(selectedStage);
  const { 
    data: operativeDescriptors, 
    isLoading: loadingDescriptors 
  } = useOperativeDescriptors(
    selectedProfile, 
    selectedCycle || undefined,
    !!selectedProfile
  );

  // Filtros y búsqueda
  const filteredDescriptors = useMemo(() => {
    if (!operativeDescriptors) return [];
    
    return operativeDescriptors.filter(descriptor => {
      const matchesSearch = !searchTerm || 
        (descriptor.description && descriptor.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (descriptor.code && descriptor.code.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });
  }, [operativeDescriptors, searchTerm]);

  // Obtener color de competencia
  const getCompetencyColor = (code: string): string => {
    if (!code) return '#6B7280'; // Default gray if no code
    const competencyKey = Object.keys(COMPETENCY_COLORS).find(key => 
      code.startsWith(key)
    );
    return competencyKey ? COMPETENCY_COLORS[competencyKey as keyof typeof COMPETENCY_COLORS] : '#6B7280';
  };

  // Obtener ciclos disponibles
  const availableCycles = useMemo(() => {
    if (!operativeDescriptors) return [];
    
    const cycles = [...new Set(operativeDescriptors
      .filter(d => d.cycle)
      .map(d => d.cycle!)
    )].sort();
    
    return cycles;
  }, [operativeDescriptors]);

  // Limpiar selecciones cuando cambia la etapa
  const handleStageChange = (stage: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA') => {
    setSelectedStage(stage);
    setSelectedProfile('');
    setSelectedCycle('');
    setSearchTerm('');
  };

  if (profilesError) {
    return (
      <Alert
        message="Error al cargar los perfiles de salida"
        description="Ha ocurrido un error al obtener los datos. Por favor, inténtalo de nuevo."
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <div className={`exit-profile-view ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="mb-6 shadow-sm">
          <Row align="middle" justify="space-between">
            <Col>
              <Space size="large">
                <div>
                  <Title level={2} className="mb-1">
                    <BookOutlined className="mr-2 text-blue-600" />
                    Perfil de Salida
                  </Title>
                  <Text type="secondary" className="text-base">
                    Competencias clave del sistema educativo español (LOMLOE)
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button 
                  icon={<DownloadOutlined />}
                  disabled={!selectedProfile}
                >
                  Exportar
                </Button>
                <Tooltip title="Información sobre el Perfil de Salida">
                  <Button icon={<InfoCircleOutlined />} type="text" />
                </Tooltip>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      <Row gutter={[24, 24]}>
        {/* Panel de Control */}
        <Col xs={24} lg={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card title="Filtros y Búsqueda" className="shadow-sm h-fit">
              <Space direction="vertical" size="middle" className="w-full">
                {/* Etapa Educativa */}
                <div>
                  <Text strong className="block mb-2">Etapa Educativa</Text>
                  <Select
                    value={selectedStage}
                    onChange={handleStageChange}
                    className="w-full"
                    size="large"
                  >
                    <Option value="INFANTIL">Educación Infantil</Option>
                    <Option value="PRIMARIA">Educación Primaria</Option>
                    <Option value="SECUNDARIA">Educación Secundaria</Option>
                  </Select>
                </div>

                {/* Perfil de Salida */}
                <div>
                  <Text strong className="block mb-2">Competencia Clave</Text>
                  <Select
                    value={selectedProfile}
                    onChange={setSelectedProfile}
                    className="w-full"
                    placeholder="Selecciona una competencia"
                    loading={loadingProfiles}
                    size="large"
                    showSearch
                    optionFilterProp="children"
                  >
                    {exitProfiles?.map(profile => (
                      <Option key={profile.id} value={profile.id}>
                        <Space>
                          <Tag 
                            color={getCompetencyColor(profile.code)}
                            className="min-w-12 text-center"
                          >
                            {profile.code}
                          </Tag>
                          <span>{profile.name}</span>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* Ciclo (si aplica) */}
                {availableCycles.length > 0 && (
                  <div>
                    <Text strong className="block mb-2">Ciclo Educativo</Text>
                    <Select
                      value={selectedCycle}
                      onChange={setSelectedCycle}
                      className="w-full"
                      placeholder="Todos los ciclos"
                      allowClear
                      size="large"
                    >
                      {availableCycles.map(cycle => (
                        <Option key={cycle} value={cycle}>
                          {cycle}
                        </Option>
                      ))}
                    </Select>
                  </div>
                )}

                {/* Búsqueda */}
                {selectedProfile && (
                  <div>
                    <Text strong className="block mb-2">Buscar Descriptores</Text>
                    <Search
                      placeholder="Buscar por código o descripción..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      allowClear
                      size="large"
                    />
                  </div>
                )}

                <Divider />

                {/* Estadísticas */}
                {operativeDescriptors && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <Text strong className="block mb-2">Estadísticas</Text>
                    <Space direction="vertical" size="small">
                      <div className="flex justify-between">
                        <Text type="secondary">Total descriptores:</Text>
                        <Badge count={operativeDescriptors.length} showZero color="blue" />
                      </div>
                      <div className="flex justify-between">
                        <Text type="secondary">Filtrados:</Text>
                        <Badge count={filteredDescriptors.length} showZero color="green" />
                      </div>
                      {availableCycles.length > 0 && (
                        <div className="flex justify-between">
                          <Text type="secondary">Ciclos:</Text>
                          <Badge count={availableCycles.length} showZero color="orange" />
                        </div>
                      )}
                    </Space>
                  </div>
                )}
              </Space>
            </Card>
          </motion.div>
        </Col>

        {/* Contenido Principal */}
        <Col xs={24} lg={18}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {!selectedProfile ? (
              // Estado vacío - Seleccionar competencia
              <Card className="text-center shadow-sm h-96 flex items-center justify-center">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction="vertical" size="middle">
                      <Text type="secondary" className="text-lg">
                        Selecciona una competencia clave para ver sus descriptores operativos
                      </Text>
                      <Text type="secondary">
                        Las competencias clave del Perfil de Salida son los desempeños que el alumnado debe poder desplegar en actividades o en situaciones cuyo abordaje requiere de los saberes básicos de cada área.
                      </Text>
                    </Space>
                  }
                />
              </Card>
            ) : loadingDescriptors ? (
              // Estado de carga
              <Card className="text-center shadow-sm h-96 flex items-center justify-center">
                <Spin size="large" />
                <Text className="mt-4 block">Cargando descriptores operativos...</Text>
              </Card>
            ) : filteredDescriptors.length === 0 ? (
              // Sin resultados
              <Card className="text-center shadow-sm">
                <Empty
                  description={
                    <Space direction="vertical">
                      <Text type="secondary">
                        No se encontraron descriptores que coincidan con tu búsqueda
                      </Text>
                      <Button onClick={() => setSearchTerm('')}>
                        Limpiar filtros
                      </Button>
                    </Space>
                  }
                />
              </Card>
            ) : (
              // Lista de descriptores
              <Space direction="vertical" size="large" className="w-full">
                {/* Header de resultados */}
                <Card className="shadow-sm">
                  <Row align="middle" justify="space-between">
                    <Col>
                      <Space>
                        <Title level={4} className="mb-0">
                          {exitProfiles?.find(p => p.id === selectedProfile)?.name}
                        </Title>
                        <Tag 
                          color={getCompetencyColor(
                            exitProfiles?.find(p => p.id === selectedProfile)?.code || ''
                          )}
                          className="text-sm"
                        >
                          {exitProfiles?.find(p => p.id === selectedProfile)?.code}
                        </Tag>
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Text type="secondary">
                          {filteredDescriptors.length} descriptores
                        </Text>
                        <Button.Group>
                          <Button 
                            type={viewMode === 'grid' ? 'primary' : 'default'}
                            onClick={() => setViewMode('grid')}
                            size="small"
                          >
                            Grid
                          </Button>
                          <Button 
                            type={viewMode === 'list' ? 'primary' : 'default'}
                            onClick={() => setViewMode('list')}
                            size="small"
                          >
                            Lista
                          </Button>
                        </Button.Group>
                      </Space>
                    </Col>
                  </Row>
                  
                  {exitProfiles?.find(p => p.id === selectedProfile)?.description && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Paragraph type="secondary" className="mb-0">
                        {exitProfiles.find(p => p.id === selectedProfile)?.description}
                      </Paragraph>
                    </div>
                  )}
                </Card>

                {/* Descriptores Operativos */}
                <AnimatePresence mode="wait">
                  {viewMode === 'grid' ? (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Row gutter={[16, 16]}>
                        {filteredDescriptors.map((descriptor, index) => (
                          <Col xs={24} md={12} xl={8} key={descriptor.id}>
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                              <Card 
                                size="small" 
                                className="h-full shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                hoverable
                              >
                                <Space direction="vertical" className="w-full">
                                  <div className="flex justify-between items-start">
                                    <Tag 
                                      color={getCompetencyColor(descriptor.code)}
                                      className="text-xs font-medium"
                                    >
                                      {descriptor.code}
                                    </Tag>
                                    {descriptor.cycle && (
                                      <Tag color="default" size="small">
                                        {descriptor.cycle}
                                      </Tag>
                                    )}
                                  </div>
                                  <Paragraph 
                                    className="mb-0 text-sm leading-relaxed"
                                    ellipsis={{ rows: 4, tooltip: descriptor.description }}
                                  >
                                    {descriptor.description}
                                  </Paragraph>
                                </Space>
                              </Card>
                            </motion.div>
                          </Col>
                        ))}
                      </Row>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="shadow-sm">
                        <Space direction="vertical" size="middle" className="w-full">
                          {filteredDescriptors.map((descriptor, index) => (
                            <motion.div
                              key={descriptor.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0"
                            >
                              <Row gutter={[16, 8]} align="top">
                                <Col xs={24} sm={4}>
                                  <Space direction="vertical" size="small">
                                    <Tag 
                                      color={getCompetencyColor(descriptor.code)}
                                      className="text-sm font-medium"
                                    >
                                      {descriptor.code}
                                    </Tag>
                                    {descriptor.cycle && (
                                      <Tag color="default" size="small">
                                        {descriptor.cycle}
                                      </Tag>
                                    )}
                                  </Space>
                                </Col>
                                <Col xs={24} sm={20}>
                                  <Paragraph className="mb-0 leading-relaxed">
                                    {descriptor.description}
                                  </Paragraph>
                                </Col>
                              </Row>
                            </motion.div>
                          ))}
                        </Space>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Space>
            )}
          </motion.div>
        </Col>
      </Row>
    </div>
  );
};

export default ExitProfileView;