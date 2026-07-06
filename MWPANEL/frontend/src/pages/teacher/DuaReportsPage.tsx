/**
 * @page: DuaReportsPage
 * @module: DUA Reports & Export
 * @description: Página de generación de informes generales del sistema DUA
 * @role: Teacher, Admin
 * @features: Informes generales, exportación de datos, reportes visuales
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Button,
  Statistic,
  Progress,
  Select,
  DatePicker,
  Table,
  Tag,
  Avatar,
  Empty,
  Spin,
  message,
  Tooltip,
  Badge,
  Divider,
  Alert,
  Steps,
  Form,
  Switch,
  Radio,
  List,
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined,
  BarChartOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  FilterOutlined,
  ReloadOutlined,
  LeftOutlined,
  StarOutlined,
  TeamOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Line, Column, Pie, Radar } from '@ant-design/plots';
import dayjs from 'dayjs';
import {
  useDuaDashboardOverview,
  useDuaTeacherDashboard,
  useAccommodationAnalytics,
  useDuaProfiles,
  useEffectivenessRecords,
} from '../../hooks/useDua';
import { useAuth } from '../../hooks/useAuth';
import ExportModal, { ExportParams } from '../../components/dua/ExportModal';
import { duaExportService } from '../../services/duaExportService';
import { DuaPageHeader } from '../../components/dua/DuaPageHeader';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { RangePicker } = DatePicker;

const DuaReportsPage: React.FC = () => {
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === "function") {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn("Navigation error:", error, "Path:", path);
      }
    } else {
      console.warn("Navigate function not available:", path);
    }
  }, [navigate]);
  const { user } = useAuth();
  
  // State management
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [reportConfig, setReportConfig] = useState({
    type: 'general',
    format: 'pdf',
    includeCharts: true,
    includeProfiles: true,
    includeAccommodations: true,
    includeEffectiveness: true,
    dateRange: [dayjs().subtract(30, 'days'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs],
  });
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // Data hooks
  const overviewDashboard = useDuaDashboardOverview({
    startDate: reportConfig.dateRange[0].toDate(),
    endDate: reportConfig.dateRange[1].toDate(),
  });
  
  const accommodationAnalytics = useAccommodationAnalytics({
    startDate: reportConfig.dateRange[0].toDate(),
    endDate: reportConfig.dateRange[1].toDate(),
  });

  const duaProfiles = useDuaProfiles({
    isActive: true,
    limit: 100,
  });

  const effectivenessRecords = useEffectivenessRecords({
    startDate: reportConfig.dateRange[0].toDate(),
    endDate: reportConfig.dateRange[1].toDate(),
    limit: 100,
  });

  const isLoading = overviewDashboard.isLoading || accommodationAnalytics.isLoading || 
                  duaProfiles.isLoading || effectivenessRecords.isLoading;

  // Update todo status
  useEffect(() => {
    // Mark the route creation task as in progress when component loads
    console.log('DuaReportsPage loaded successfully');
  }, []);

  const reportTypes = [
    {
      key: 'general',
      title: 'Informe General DUA',
      description: 'Resumen completo del sistema DUA con todas las métricas',
      icon: <FileTextOutlined />,
      duration: '5-10 min',
      sections: ['Resumen ejecutivo', 'Estadísticas', 'Perfiles', 'Acomodaciones', 'Efectividad'],
    },
    {
      key: 'profiles',
      title: 'Informe de Perfiles',
      description: 'Análisis detallado de perfiles DUA de estudiantes',
      icon: <UserOutlined />,
      duration: '3-5 min',
      sections: ['Perfiles activos', 'Necesidades educativas', 'Historial de evaluaciones'],
    },
    {
      key: 'accommodations',
      title: 'Informe de Acomodaciones',
      description: 'Estado y efectividad de las acomodaciones implementadas',
      icon: <BookOutlined />,
      duration: '2-4 min',
      sections: ['Acomodaciones activas', 'Tipos más utilizados', 'Evaluaciones de efectividad'],
    },
    {
      key: 'analytics',
      title: 'Informe de Análisis',
      description: 'Métricas avanzadas y tendencias del sistema DUA',
      icon: <BarChartOutlined />,
      duration: '4-6 min',
      sections: ['Tendencias temporales', 'Análisis comparativo', 'Recomendaciones'],
    },
  ];

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      
      // Simulate report generation progress
      const steps = [
        'Recopilando datos del sistema...',
        'Generando estadísticas...',
        'Creando visualizaciones...',
        'Compilando el informe...',
        'Finalizando...',
      ];

      for (let i = 0; i < steps.length; i++) {
        message.loading(steps[i], 0.8);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Generate preview data
      const preview = {
        title: reportTypes.find(t => t.key === reportConfig.type)?.title || 'Informe DUA',
        generatedAt: dayjs().format('DD/MM/YYYY HH:mm'),
        period: `${reportConfig.dateRange[0].format('DD/MM/YYYY')} - ${reportConfig.dateRange[1].format('DD/MM/YYYY')}`,
        stats: {
          totalProfiles: duaProfiles.data?.data?.length || 0,
          totalAccommodations: accommodationAnalytics.data?.totalAccommodations || 0,
          activeAccommodations: accommodationAnalytics.data?.activeAccommodations || 0,
          averageEffectiveness: accommodationAnalytics.data?.averageEffectiveness || 0,
          totalEvaluations: effectivenessRecords.data?.data?.length || 0,
        },
      };

      setPreviewData(preview);
      setCurrentStep(2);
      message.success('Informe generado exitosamente');
    } catch (error) {
      console.error('Error generating report:', error);
      message.error('Error al generar el informe. Inténtalo de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportReport = async (exportParams: ExportParams) => {
    try {
      await duaExportService.exportDashboard(exportParams);
      message.success('Informe exportado exitosamente');
      setExportModalVisible(false);
    } catch (error) {
      console.error('Error exporting report:', error);
      message.error('Error al exportar el informe. Inténtalo de nuevo.');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Title level={4}>Selecciona el Tipo de Informe</Title>
              <Paragraph type="secondary">
                Elige el tipo de informe que deseas generar según tus necesidades.
              </Paragraph>
            </Col>
            {reportTypes.map(type => (
              <Col xs={24} md={12} lg={6} key={type.key}>
                <Card
                  hoverable
                  className={`report-type-card ${reportConfig.type === type.key ? 'selected' : ''}`}
                  style={{
                    border: reportConfig.type === type.key ? '2px solid #579172' : '1px solid #d9d9d9',
                    cursor: 'pointer',
                  }}
                  onClick={() => setReportConfig(prev => ({ ...prev, type: type.key }))}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      {type.icon}
                      <Text strong>{type.title}</Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {type.description}
                    </Text>
                    <div>
                      <Tag color="#579172">{type.duration}</Tag>
                    </div>
                    <List
                      size="small"
                      dataSource={type.sections}
                      renderItem={section => (
                        <List.Item style={{ padding: '4px 0', border: 'none' }}>
                          <Text style={{ fontSize: 11 }}>• {section}</Text>
                        </List.Item>
                      )}
                    />
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        );

      case 1:
        return (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Title level={4}>Configuración del Informe</Title>
              <Paragraph type="secondary">
                Personaliza el contenido y formato de tu informe.
              </Paragraph>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Período de Análisis" size="small">
                <Form.Item label="Rango de fechas">
                  <RangePicker
                    value={reportConfig.dateRange}
                    onChange={(dates) => {
                      if (dates && dates[0] && dates[1]) {
                        setReportConfig(prev => ({
                          ...prev,
                          dateRange: dates as [dayjs.Dayjs, dayjs.Dayjs]
                        }));
                      }
                    }}
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Formato de Exportación" size="small">
                <Radio.Group
                  value={reportConfig.format}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, format: e.target.value }))}
                >
                  <Space direction="vertical">
                    <Radio value="pdf">
                      <Space>
                        <FilePdfOutlined style={{ color: '#ff4d4f' }} />
                        PDF - Reporte visual
                      </Space>
                    </Radio>
                    <Radio value="excel">
                      <Space>
                        <FileExcelOutlined style={{ color: '#2E7D52' }} />
                        Excel - Datos estructurados
                      </Space>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Card>
            </Col>
            <Col span={24}>
              <Card title="Contenido a Incluir" size="small">
                <Row gutter={[16, 16]}>
                  <Col xs={12} md={6}>
                    <Space direction="vertical">
                      <Switch
                        checked={reportConfig.includeCharts}
                        onChange={(checked) => setReportConfig(prev => ({ ...prev, includeCharts: checked }))}
                      />
                      <Text>Gráficos y Métricas</Text>
                    </Space>
                  </Col>
                  <Col xs={12} md={6}>
                    <Space direction="vertical">
                      <Switch
                        checked={reportConfig.includeProfiles}
                        onChange={(checked) => setReportConfig(prev => ({ ...prev, includeProfiles: checked }))}
                      />
                      <Text>Perfiles DUA</Text>
                    </Space>
                  </Col>
                  <Col xs={12} md={6}>
                    <Space direction="vertical">
                      <Switch
                        checked={reportConfig.includeAccommodations}
                        onChange={(checked) => setReportConfig(prev => ({ ...prev, includeAccommodations: checked }))}
                      />
                      <Text>Acomodaciones</Text>
                    </Space>
                  </Col>
                  <Col xs={12} md={6}>
                    <Space direction="vertical">
                      <Switch
                        checked={reportConfig.includeEffectiveness}
                        onChange={(checked) => setReportConfig(prev => ({ ...prev, includeEffectiveness: checked }))}
                      />
                      <Text>Efectividad</Text>
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        );

      case 2:
        return (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Title level={4}>Vista Previa del Informe</Title>
              <Paragraph type="secondary">
                Revisa el contenido antes de generar el informe final.
              </Paragraph>
            </Col>
            {previewData && (
              <>
                <Col span={24}>
                  <Alert
                    message="Informe Generado Exitosamente"
                    description={`El informe "${previewData.title}" ha sido generado para el período ${previewData.period}`}
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                </Col>
                <Col xs={24} lg={16}>
                  <Card title="Resumen del Informe" size="small">
                    <Row gutter={[16, 16]}>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Perfiles DUA"
                          value={previewData.stats.totalProfiles}
                          prefix={<UserOutlined />}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Acomodaciones Totales"
                          value={previewData.stats.totalAccommodations}
                          prefix={<BookOutlined />}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Acomodaciones Activas"
                          value={previewData.stats.activeAccommodations}
                          prefix={<CheckCircleOutlined />}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Efectividad Promedio"
                          value={previewData.stats.averageEffectiveness}
                          precision={1}
                          suffix="/5.0"
                          prefix={<StarOutlined />}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="Detalles del Informe" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>Tipo:</Text> {reportTypes.find(t => t.key === reportConfig.type)?.title}
                      </div>
                      <div>
                        <Text strong>Generado:</Text> {previewData.generatedAt}
                      </div>
                      <div>
                        <Text strong>Período:</Text> {previewData.period}
                      </div>
                      <div>
                        <Text strong>Formato:</Text> {reportConfig.format.toUpperCase()}
                      </div>
                    </Space>
                  </Card>
                </Col>
              </>
            )}
          </Row>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Cargando datos para generar informes...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <DuaPageHeader
        title="Informes DUA"
        subtitle="Genera informes detallados del sistema de Diseño Universal para el Aprendizaje"
        icon={<FileTextOutlined />}
        actions={
          <>
            <Button
              icon={<LeftOutlined />}
              onClick={() => safeNavigate('/teacher/dua')}
            >
              Volver al Dashboard
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => setExportModalVisible(true)}
              disabled={!previewData}
            >
              Exportar Informe
            </Button>
          </>
        }
      />

      {/* Steps */}
        <Card style={{ marginBottom: 24 }}>
          <Steps current={currentStep} style={{ marginBottom: 24 }}>
            <Step 
              title="Tipo de Informe" 
              description="Seleccionar tipo" 
              icon={<FileTextOutlined />}
            />
            <Step 
              title="Configuración" 
              description="Personalizar contenido" 
              icon={<SettingOutlined />}
            />
            <Step 
              title="Vista Previa" 
              description="Revisar y exportar" 
              icon={<EyeOutlined />}
            />
          </Steps>

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <Divider />
          <Row justify="space-between">
            <Col>
              {currentStep > 0 && (
                <Button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={generating}
                >
                  Anterior
                </Button>
              )}
            </Col>
            <Col>
              <Space>
                {currentStep < 2 && (
                  <Button
                    type="primary"
                    onClick={() => {
                      if (currentStep === 1) {
                        handleGenerateReport();
                      } else {
                        setCurrentStep(currentStep + 1);
                      }
                    }}
                    loading={generating}
                    disabled={currentStep === 0 && !reportConfig.type}
                  >
                    {currentStep === 1 ? 'Generar Informe' : 'Siguiente'}
                  </Button>
                )}
                {currentStep === 2 && (
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => setExportModalVisible(true)}
                  >
                    Exportar Informe Final
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

      {/* Export Modal */}
      <ExportModal
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        onExport={handleExportReport}
      />
    </div>
  );
};

export default DuaReportsPage;