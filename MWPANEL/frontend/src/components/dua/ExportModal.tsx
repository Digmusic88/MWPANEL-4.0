/**
 * @component: ExportModal
 * @description: Modal para exportar datos del dashboard DUA con opciones configurables
 * @features: Excel/PDF, filtros de fecha, selección de contenido
 */

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Row,
  Col,
  Select,
  DatePicker,
  Switch,
  Button,
  Card,
  Typography,
  Space,
  Divider,
  Alert,
  message,
  Progress,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  CalendarOutlined,
  BarChartOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import './DuaDashboard.css';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface ExportModalProps {
  visible: boolean;
  onCancel: () => void;
  onExport: (exportParams: ExportParams) => Promise<void>;
  loading?: boolean;
}

export interface ExportParams {
  format: 'excel' | 'pdf';
  startDate?: string;
  endDate?: string;
  includeCharts: boolean;
  includeProfiles: boolean;
  includeAccommodations: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onCancel,
  onExport,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf'>('excel');
  const [exportProgress, setExportProgress] = useState(0);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportProgress(0);

      const values = await form.validateFields();
      
      // Simular progreso de exportación
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const exportParams: ExportParams = {
        format: selectedFormat,
        startDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
        includeCharts: values.includeCharts !== false,
        includeProfiles: values.includeProfiles !== false,
        includeAccommodations: values.includeAccommodations !== false,
      };

      await onExport(exportParams);
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      setTimeout(() => {
        setExporting(false);
        setExportProgress(0);
        message.success('Exportación completada exitosamente');
        onCancel();
      }, 1000);
      
    } catch (error) {
      setExporting(false);
      setExportProgress(0);
      message.error('Error al exportar los datos');
    }
  };

  const formatOptions = [
    {
      value: 'excel',
      label: 'Excel (.xlsx)',
      icon: <FileExcelOutlined style={{ color: '#10b96b' }} />,
      description: 'Datos estructurados en hojas de cálculo',
    },
    {
      value: 'pdf',
      label: 'PDF (.pdf)',
      icon: <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
      description: 'Reporte visual con gráficos y tablas',
    },
  ];

  const datePresets = [
    {
      label: 'Últimos 7 días',
      value: [dayjs().subtract(7, 'day'), dayjs()],
    },
    {
      label: 'Últimos 30 días',
      value: [dayjs().subtract(30, 'day'), dayjs()],
    },
    {
      label: 'Últimos 3 meses',
      value: [dayjs().subtract(3, 'month'), dayjs()],
    },
    {
      label: 'Este año',
      value: [dayjs().startOf('year'), dayjs()],
    },
  ];

  return (
    <Modal
      title={
        <Space align="center">
          <DownloadOutlined style={{ color: '#579172' }} />
          <span>Exportar Informe DUA</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
      destroyOnClose
      className="export-modal"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            format: 'excel',
            includeCharts: true,
            includeProfiles: true,
            includeAccommodations: true,
          }}
        >
          {/* Formato de Exportación */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={5}>
              <BarChartOutlined style={{ marginRight: 8, color: '#579172' }} />
              Formato de Exportación
            </Title>
            <Row gutter={16}>
              {formatOptions.map(option => (
                <Col span={12} key={option.value}>
                  <Card
                    hoverable
                    size="small"
                    className={`export-format-option ${selectedFormat === option.value ? 'selected' : ''}`}
                    style={{
                      border: selectedFormat === option.value ? '2px solid #579172' : '1px solid #d9d9d9',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setSelectedFormat(option.value as 'excel' | 'pdf');
                      form.setFieldValue('format', option.value);
                    }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        {option.icon}
                        <Text strong>{option.label}</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {option.description}
                      </Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Filtros de Fecha */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={5}>
              <CalendarOutlined style={{ marginRight: 8, color: '#2E7D52' }} />
              Período de Análisis
            </Title>
            <Form.Item
              name="dateRange"
              label="Rango de fechas"
            >
              <RangePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder={['Fecha inicio', 'Fecha fin']}
                presets={datePresets}
                allowClear
              />
            </Form.Item>
            <Alert
              message="Si no seleccionas fechas, se exportarán todos los datos disponibles"
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          </Card>

          {/* Contenido a Incluir */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={5}>
              <SettingOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
              Contenido a Incluir
            </Title>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Form.Item
                  name="includeCharts"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Space direction="vertical" size="small">
                    <Switch defaultChecked />
                    <Text strong>Gráficos y Métricas</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Incluir visualizaciones y estadísticas
                    </Text>
                  </Space>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="includeProfiles"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Space direction="vertical" size="small">
                    <Switch defaultChecked />
                    <Text strong>Perfiles DUA</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Lista detallada de perfiles de estudiantes
                    </Text>
                  </Space>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="includeAccommodations"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Space direction="vertical" size="small">
                    <Switch defaultChecked />
                    <Text strong>Acomodaciones</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Registro de acomodaciones y su estado
                    </Text>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Vista Previa */}
          <Card size="small" className="export-preview" style={{ marginBottom: 16 }}>
            <Title level={5}>Vista Previa del Reporte</Title>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary">
                <strong>Formato:</strong> {formatOptions.find(f => f.value === selectedFormat)?.label}
              </Text>
              <Text type="secondary">
                <strong>Período:</strong> {
                  form.getFieldValue('dateRange')
                    ? `${form.getFieldValue('dateRange')[0]?.format('DD/MM/YYYY')} - ${form.getFieldValue('dateRange')[1]?.format('DD/MM/YYYY')}`
                    : 'Todos los datos'
                }
              </Text>
              <Text type="secondary">
                <strong>Secciones:</strong> Resumen ejecutivo, 
                {form.getFieldValue('includeCharts') && ' Gráficos,'}
                {form.getFieldValue('includeProfiles') && ' Perfiles DUA,'}
                {form.getFieldValue('includeAccommodations') && ' Acomodaciones,'}
                {' Actividad reciente'}
              </Text>
            </Space>
          </Card>

          {/* Progreso de exportación */}
          {exporting && (
            <Card size="small" className="export-progress" style={{ marginBottom: 16 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>Generando reporte...</Text>
                <Progress
                  percent={exportProgress}
                  status={exportProgress === 100 ? 'success' : 'active'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </Space>
            </Card>
          )}

          <Divider />

          {/* Botones de acción */}
          <Row justify="end" gutter={8}>
            <Col>
              <Button onClick={onCancel} disabled={exporting}>
                Cancelar
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exporting || loading}
                disabled={exporting}
              >
                {exporting ? 'Exportando...' : 'Exportar Reporte'}
              </Button>
            </Col>
          </Row>
        </Form>
      </motion.div>
    </Modal>
  );
};

export default ExportModal;