/**
 * @archivo: CompetencyFrameworkView.tsx
 * @módulo: Pages/Competencies (Vista del Marco Competencial)
 * @función: Vista mejorada del Marco Competencial con filtros correctos
 * @crítico: SÍ - Visualización núcleo del sistema competencial LOMLOE
 */

import React, { useState, useMemo, useEffect } from 'react';
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
import { useKeyCompetencies, useExitProfiles, useOperativeDescriptorsByCompetencyAndStage } from '../../hooks/useCompetencies';

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

interface CompetencyFrameworkViewProps {
  className?: string;
}

const CompetencyFrameworkView: React.FC<CompetencyFrameworkViewProps> = ({ className }) => {
  const [selectedStage, setSelectedStage] = useState<'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA'>('PRIMARIA');
  const [selectedCompetency, setSelectedCompetency] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Queries
  const { data: keyCompetencies, isLoading: loadingCompetencies } = useKeyCompetencies();
  const { data: exitProfiles } = useExitProfiles(selectedStage);
  const { 
    data: operativeDescriptors, 
    isLoading: loadingDescriptors 
  } = useOperativeDescriptorsByCompetencyAndStage(
    selectedCompetency,
    selectedStage,
    !!selectedCompetency
  );

  // Get the current exit profile name for display
  const currentExitProfile = useMemo(() => {
    if (!exitProfiles || exitProfiles.length === 0) return null;
    return exitProfiles[0];
  }, [exitProfiles]);

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
    if (!code) return '#6B7280';
    const competencyKey = Object.keys(COMPETENCY_COLORS).find(key => 
      code.startsWith(key)
    );
    return competencyKey ? COMPETENCY_COLORS[competencyKey as keyof typeof COMPETENCY_COLORS] : '#6B7280';
  };

  // Limpiar selecciones cuando cambia la etapa
  const handleStageChange = (stage: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA') => {
    setSelectedStage(stage);
    setSearchTerm('');
    // No limpiar la competencia seleccionada para mantener la selección
  };

  // Obtener el nombre de la competencia seleccionada
  const selectedCompetencyData = useMemo(() => {
    if (!selectedCompetency || !keyCompetencies) return null;
    return keyCompetencies.find(comp => comp.id === selectedCompetency);
  }, [selectedCompetency, keyCompetencies]);

  return (
    <div className={`competency-framework-view ${className}`}>
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
                    Marco Competencial
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
                  disabled={!selectedCompetency || !operativeDescriptors?.length}
                >
                  Exportar
                </Button>
                <Tooltip title="Información sobre el Marco Competencial">
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

                {/* Competencia Clave */}
                <div>
                  <Text strong className="block mb-2">Competencia Clave</Text>
                  <Select
                    value={selectedCompetency}
                    onChange={setSelectedCompetency}
                    className="w-full"
                    placeholder="Selecciona una competencia"
                    loading={loadingCompetencies}
                    size="large"
                    showSearch
                    optionFilterProp="children"
                  >
                    {keyCompetencies?.map(competency => (
                      <Option key={competency.id} value={competency.id}>
                        <Space>
                          <Tag 
                            color={getCompetencyColor(competency.code)}
                            className="min-w-12 text-center"
                          >
                            {competency.code}
                          </Tag>
                          <span>{competency.name}</span>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* Búsqueda */}
                {selectedCompetency && (
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

                {/* Información del Perfil */}
                {currentExitProfile && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <Text strong className="block mb-2">Perfil de Salida</Text>
                    <Text type="secondary" className="text-sm">
                      {currentExitProfile.name}
                    </Text>
                  </div>
                )}

                {/* Estadísticas */}
                {operativeDescriptors && selectedCompetency && (
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
            {!selectedCompetency ? (
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
                        Las competencias clave son los desempeños que el alumnado debe poder desplegar en actividades o en situaciones cuyo abordaje requiere de los saberes básicos de cada área.
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
                        {searchTerm 
                          ? 'No se encontraron descriptores que coincidan con tu búsqueda'
                          : selectedStage === 'INFANTIL' 
                            ? 'No hay descriptores operativos definidos para Educación Infantil'
                            : 'No se encontraron descriptores para esta competencia y etapa'
                        }
                      </Text>
                      {searchTerm && (
                        <Button onClick={() => setSearchTerm('')}>
                          Limpiar filtros
                        </Button>
                      )}
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
                          {selectedCompetencyData?.name}
                        </Title>
                        <Tag 
                          color={getCompetencyColor(selectedCompetencyData?.code || '')}
                          className="text-sm"
                        >
                          {selectedCompetencyData?.code}
                        </Tag>
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Text type="secondary">
                          {filteredDescriptors.length} descriptores para {selectedStage}
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
                  
                  {selectedCompetencyData?.description && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Paragraph type="secondary" className="mb-0">
                        {selectedCompetencyData.description}
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
                                  </div>
                                  <Paragraph 
                                    className="mb-0 text-sm leading-relaxed"
                                    ellipsis={{ rows: 4, tooltip: descriptor.description }}
                                  >
                                    {descriptor.description}
                                  </Paragraph>
                                  {descriptor.shortDescription && (
                                    <Text type="secondary" className="text-xs italic">
                                      {descriptor.shortDescription}
                                    </Text>
                                  )}
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
                                  <Tag 
                                    color={getCompetencyColor(descriptor.code)}
                                    className="text-sm font-medium"
                                  >
                                    {descriptor.code}
                                  </Tag>
                                </Col>
                                <Col xs={24} sm={20}>
                                  <Paragraph className="mb-0 leading-relaxed">
                                    {descriptor.description}
                                  </Paragraph>
                                  {descriptor.shortDescription && (
                                    <Text type="secondary" className="text-sm italic mt-2 block">
                                      {descriptor.shortDescription}
                                    </Text>
                                  )}
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

export default CompetencyFrameworkView;