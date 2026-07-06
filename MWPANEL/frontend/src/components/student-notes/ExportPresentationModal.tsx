import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Switch,
  Button,
  Space,
  Radio,
  Progress,
  Typography,
  Divider,
  Alert,
  Spin,
  message,
  Card,
  Row,
  Col
} from 'antd';
import {
  FilePdfOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { presentationExportService } from '../../services/presentationExportService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ExportPresentationModalProps {
  visible: boolean;
  onClose: () => void;
  presentationData: {
    slides: any[];
    metadata?: {
      title?: string;
      author?: string;
      totalSlides: number;
      createdAt: string;
      version: string;
    };
  };
  presentationTitle?: string;
}

interface ExportProgress {
  current: number;
  total: number;
  percent: number;
  message: string;
}

const ExportPresentationModal: React.FC<ExportPresentationModalProps> = ({
  visible,
  onClose,
  presentationData,
  presentationTitle
}) => {
  const [form] = Form.useForm();
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportComplete, setExportComplete] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'pptx'>('pdf');

  // Escuchar eventos de progreso
  useEffect(() => {
    const handleProgress = (event: any) => {
      setExportProgress(event.detail);
    };

    window.addEventListener('exportProgress', handleProgress);
    return () => window.removeEventListener('exportProgress', handleProgress);
  }, []);

  // Reset modal state when opening
  useEffect(() => {
    if (visible) {
      setExporting(false);
      setExportProgress(null);
      setExportComplete(false);
      form.resetFields();
      
      // Valores por defecto
      form.setFieldsValue({
        format: 'pdf',
        pageSize: 'A4',
        quality: 'medium',
        includeNotes: false,
        theme: 'light'
      });
    }
  }, [visible, form]);

  const handleExport = async () => {
    try {
      const values = await form.validateFields();
      setExporting(true);
      setExportProgress({ current: 0, total: 100, percent: 0, message: 'Iniciando exportación...' });

      // Preparar datos de presentación con metadata
      const exportData = {
        ...presentationData,
        metadata: {
          ...presentationData.metadata,
          title: presentationTitle || presentationData.metadata?.title || 'Presentación',
          author: 'MW Panel User',
          totalSlides: presentationData.slides.length,
          createdAt: new Date().toISOString(),
          version: '1.0'
        }
      };

      // Simular progreso inicial
      setTimeout(() => {
        setExportProgress({ current: 20, total: 100, percent: 20, message: 'Preparando slides...' });
      }, 500);

      setTimeout(() => {
        setExportProgress({ current: 50, total: 100, percent: 50, message: 'Generando archivo...' });
      }, 1500);

      // Exportar según formato seleccionado
      if (values.format === 'pdf') {
        await presentationExportService.exportToPDF(exportData, values);
      } else {
        await presentationExportService.exportToPPTX(exportData, values);
      }

      // Completar exportación
      setExportProgress({ current: 100, total: 100, percent: 100, message: '¡Exportación completada!' });
      setExportComplete(true);
      
      message.success(`Presentación exportada exitosamente como ${values.format.toUpperCase()}`);
      
      // Auto-cerrar modal después de un momento
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error durante la exportación:', error);
      message.error('Error al exportar la presentación: ' + (error as Error).message);
      setExporting(false);
      setExportProgress(null);
    }
  };

  const handleClose = () => {
    if (!exporting) {
      onClose();
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'Documento PDF portable, ideal para compartir y visualizar en cualquier dispositivo.';
      case 'pptx':
        return 'Presentación PowerPoint editable, manteniendo formato y permitiendo edición posterior.';
      default:
        return '';
    }
  };

  const getPageSizeDescription = (pageSize: string) => {
    switch (pageSize) {
      case 'A4':
        return 'Formato estándar A4 (297 × 210 mm)';
      case 'Letter':
        return 'Formato carta americano (279 × 216 mm)';
      case '16:9':
        return 'Formato panorámico widescreen (16:9)';
      case '4:3':
        return 'Formato tradicional presentación (4:3)';
      default:
        return '';
    }
  };

  return (
    <Modal
      title={
        <Space>
          <DownloadOutlined />
          <span>Exportar Presentación</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={600}
      footer={null}
      maskClosable={!exporting}
      closable={!exporting}
    >
      {/* Información de la presentación */}
      <Card size="small" className="mb-4" style={{ backgroundColor: '#f8f9fa' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Text strong>Presentación:</Text>
            <br />
            <Text>{presentationTitle || 'Sin título'}</Text>
          </Col>
          <Col span={12}>
            <Text strong>Total slides:</Text>
            <br />
            <Text>{presentationData.slides.length}</Text>
          </Col>
        </Row>
      </Card>

      {/* Progreso de exportación */}
      {exporting && (
        <Card className="mb-4">
          <div className="text-center">
            {exportComplete ? (
              <div>
                <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                <Title level={4} style={{ color: '#52c41a', marginTop: '16px' }}>
                  ¡Exportación Completada!
                </Title>
                <Text>El archivo se ha descargado automáticamente.</Text>
              </div>
            ) : (
              <div>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
                <Title level={4} style={{ marginTop: '16px' }}>
                  Exportando Presentación...
                </Title>
                {exportProgress && (
                  <div style={{ marginTop: '16px' }}>
                    <Progress 
                      percent={exportProgress.percent} 
                      status="active"
                      strokeColor="#1890ff"
                    />
                    <Text style={{ marginTop: '8px', display: 'block' }}>
                      {exportProgress.message}
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Formulario de configuración */}
      {!exporting && (
        <Form form={form} layout="vertical" onFinish={handleExport}>
          {/* Selección de formato */}
          <Form.Item
            label={
              <Space>
                <SettingOutlined />
                <span>Formato de exportación</span>
              </Space>
            }
            name="format"
            rules={[{ required: true, message: 'Selecciona un formato' }]}
          >
            <Radio.Group 
              onChange={(e) => setSelectedFormat(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="pdf" style={{ height: '60px', display: 'flex', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <FilePdfOutlined style={{ fontSize: '24px', color: '#d32f2f' }} />
                  <div>PDF</div>
                </div>
              </Radio.Button>
              <Radio.Button value="pptx" style={{ height: '60px', display: 'flex', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <FileExcelOutlined style={{ fontSize: '24px', color: '#ff9800' }} />
                  <div>PowerPoint</div>
                </div>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* Descripción del formato */}
          <Alert
            message={getFormatDescription(selectedFormat)}
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            className="mb-4"
          />

          <Row gutter={16}>
            {/* Tamaño de página */}
            <Col span={12}>
              <Form.Item
                label="Tamaño de página"
                name="pageSize"
                tooltip="Selecciona el formato que mejor se adapte a tu necesidad"
              >
                <Select>
                  <Option value="A4">A4 (Estándar)</Option>
                  <Option value="Letter">Carta</Option>
                  <Option value="16:9">Widescreen (16:9)</Option>
                  <Option value="4:3">Tradicional (4:3)</Option>
                </Select>
              </Form.Item>
            </Col>

            {/* Calidad */}
            <Col span={12}>
              <Form.Item
                label="Calidad"
                name="quality"
                tooltip="Mayor calidad = mayor tamaño de archivo"
              >
                <Select>
                  <Option value="low">Baja (rápida)</Option>
                  <Option value="medium">Media (balanceada)</Option>
                  <Option value="high">Alta (mejor calidad)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Opciones adicionales */}
          <Divider>Opciones adicionales</Divider>

          <Form.Item
            name="includeNotes"
            valuePropName="checked"
          >
            <Switch />
            <span style={{ marginLeft: '8px' }}>
              Incluir notas del presentador
            </span>
          </Form.Item>

          <Form.Item
            name="theme"
            label="Tema"
          >
            <Radio.Group>
              <Radio value="light">Claro</Radio>
              <Radio value="dark">Oscuro</Radio>
            </Radio.Group>
          </Form.Item>

          {/* Información adicional */}
          <Alert
            message={
              <div>
                <Text strong>Información del formato seleccionado:</Text>
                <br />
                <Text>{getPageSizeDescription(form.getFieldValue('pageSize'))}</Text>
                <br />
                <Text type="secondary">
                  Slides que contienen videos de YouTube se exportarán como placeholders de imagen.
                </Text>
              </div>
            }
            type="info"
            showIcon
            className="mb-4"
          />

          {/* Botones de acción */}
          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={handleClose} disabled={exporting}>
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<DownloadOutlined />}
                loading={exporting}
                size="large"
              >
                {exporting ? 'Exportando...' : `Exportar como ${selectedFormat.toUpperCase()}`}
              </Button>
            </Space>
          </div>
        </Form>
      )}
    </Modal>
  );
};

export default ExportPresentationModal;