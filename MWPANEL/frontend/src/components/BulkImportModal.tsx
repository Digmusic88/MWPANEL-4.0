import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Steps,
  Alert,
  Table,
  Tag,
  Progress,
  Typography,
  Space,
  Collapse,
  Row,
  Col,
  Card,
  Statistic,
  Result,
  message,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import apiClient from '@services/apiClient';

const { Title, Paragraph } = Typography;
const { Panel } = Collapse;

interface BulkImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: BulkImportError[];
  warnings: BulkImportWarning[];
  importedStudents: Array<{
    rowNumber: number;
    studentName: string;
    enrollmentNumber: string;
    familyId: string;
  }>;
}

interface BulkImportError {
  rowNumber: number;
  field?: string;
  message: string;
  originalData: any;
}

interface BulkImportWarning {
  rowNumber: number;
  field?: string;
  message: string;
  originalData: any;
}

interface BulkImportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (result: BulkImportResult) => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  const steps = [
    {
      title: 'Plantilla',
      description: 'Descargar plantilla',
      icon: <DownloadOutlined />,
    },
    {
      title: 'Archivo',
      description: 'Subir archivo',
      icon: <UploadOutlined />,
    },
    {
      title: 'Resultados',
      description: 'Ver resultados',
      icon: <CheckCircleOutlined />,
    },
  ];

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get('/enrollment/template', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plantilla_inscripcion_masiva.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('Plantilla descargada exitosamente');
      setCurrentStep(1);
    } catch (error) {
      message.error('Error al descargar la plantilla');
      console.error('Template download error:', error);
    }
  };

  const uploadProps: UploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      // Validate file type
      const isExcel = 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.name.endsWith('.csv');

      if (!isExcel) {
        message.error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)');
        return false;
      }

      // Validate file size (max 10MB)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('El archivo debe ser menor a 10MB');
        return false;
      }

      setFileList([file]);
      return false; // Prevent automatic upload
    },
    fileList,
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('Por favor seleccione un archivo');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0] as any);

    setUploading(true);

    try {
      const response = await apiClient.post('/enrollment/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResult(response.data);
      setCurrentStep(2);
      message.success('Archivo procesado exitosamente');

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al procesar el archivo');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setFileList([]);
    setImportResult(null);
    onClose();
  };

  const errorColumns = [
    {
      title: 'Fila',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 80,
    },
    {
      title: 'Campo',
      dataIndex: 'field',
      key: 'field',
      width: 150,
      render: (field: string) => field ? <Tag color="orange">{field}</Tag> : '-',
    },
    {
      title: 'Error',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
  ];

  const successColumns = [
    {
      title: 'Fila',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 80,
    },
    {
      title: 'Estudiante',
      dataIndex: 'studentName',
      key: 'studentName',
    },
    {
      title: 'Matrícula',
      dataIndex: 'enrollmentNumber',
      key: 'enrollmentNumber',
      render: (enrollmentNumber: string) => (
        <Tag color="green">{enrollmentNumber}</Tag>
      ),
    },
    {
      title: 'Familia ID',
      dataIndex: 'familyId',
      key: 'familyId',
      ellipsis: true,
    },
  ];

  return (
    <Modal
      title="Importación Masiva de Estudiantes"
      open={visible}
      onCancel={handleClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-6">
        {/* Steps */}
        <Steps current={currentStep} items={steps} />

        {/* Step 0: Template Download */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <Alert
              message="Paso 1: Descargar Plantilla (Opcional)"
              description="Puede descargar la plantilla con el formato correcto, o si ya tiene un archivo preparado, continuar directamente a la subida."
              type="info"
              showIcon
            />

            <Row gutter={16}>
              <Col span={12}>
                <Card>
                  <div className="text-center space-y-4">
                    <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                    <Title level={4}>Plantilla de Importación</Title>
                    <Paragraph type="secondary">
                      La plantilla incluye tres hojas:
                      <br />
                      • <strong>Plantilla Inscripción:</strong> Formato con datos de ejemplo
                      <br />
                      • <strong>Instrucciones:</strong> Descripción detallada de cada campo
                      <br />
                      • <strong>Valores Válidos:</strong> Opciones disponibles para dropdowns
                    </Paragraph>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      size="large"
                      onClick={handleDownloadTemplate}
                      block
                    >
                      Descargar Plantilla Excel
                    </Button>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <div className="text-center space-y-4">
                    <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                    <Title level={4}>¿Ya tienes tu archivo?</Title>
                    <Paragraph type="secondary">
                      Si ya tienes preparado tu archivo Excel o CSV con los datos de los estudiantes, puedes continuar directamente a la subida.
                    </Paragraph>
                    <Button
                      type="default"
                      icon={<UploadOutlined />}
                      size="large"
                      onClick={() => setCurrentStep(1)}
                      block
                    >
                      Continuar a Subida de Archivo
                    </Button>
                  </div>
                </Card>
              </Col>
            </Row>

            <Alert
              message="Información Importante"
              description={
                <ul className="mb-0">
                  <li>Complete todos los campos obligatorios marcados en las instrucciones</li>
                  <li>Los números de matrícula se generan automáticamente si se dejan vacíos</li>
                  <li>Los niveles educativos y cursos deben existir previamente en el sistema</li>
                  <li>Los emails deben ser únicos en todo el sistema</li>
                </ul>
              }
              type="warning"
              showIcon
            />
          </div>
        )}

        {/* Step 1: File Upload */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Alert
              message="Paso 2: Subir Archivo"
              description={
                <div>
                  Seleccione el archivo Excel o CSV completado con los datos de los estudiantes y familias.
                  <br />
                  <Button 
                    type="link" 
                    onClick={() => setCurrentStep(0)}
                    style={{ padding: 0, marginTop: 8 }}
                  >
                    ← Volver a descargar plantilla
                  </Button>
                </div>
              }
              type="info"
              showIcon
            />

            <Card>
              <Upload.Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                  <UploadOutlined />
                </p>
                <p className="ant-upload-text">
                  Haga clic o arrastre el archivo a esta área para subirlo
                </p>
                <p className="ant-upload-hint">
                  Soporte para archivos Excel (.xlsx, .xls) y CSV (.csv). Máximo 10MB.
                </p>
              </Upload.Dragger>

              {fileList.length > 0 && (
                <div className="mt-4">
                  <Button
                    type="primary"
                    onClick={handleUpload}
                    loading={uploading}
                    size="large"
                    block
                  >
                    {uploading ? 'Procesando...' : 'Procesar Archivo'}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Step 2: Results */}
        {currentStep === 2 && importResult && (
          <div className="space-y-4">
            <Alert
              message="Paso 3: Resultados de la Importación"
              description="Revise el resumen de la importación y los detalles de errores si los hubiera."
              type="info"
              showIcon
            />

            {/* Summary Statistics */}
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Procesadas"
                    value={importResult.totalRows}
                    prefix={<InfoCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Exitosas"
                    value={importResult.successfulImports}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Fallidas"
                    value={importResult.failedImports}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Tasa de Éxito"
                    value={
                      importResult.totalRows > 0
                        ? Math.round((importResult.successfulImports / importResult.totalRows) * 100)
                        : 0
                    }
                    suffix="%"
                    valueStyle={{
                      color: importResult.failedImports === 0 ? '#3f8600' : '#faad14',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Progress Bar */}
            <Progress
              percent={
                importResult.totalRows > 0
                  ? Math.round((importResult.successfulImports / importResult.totalRows) * 100)
                  : 0
              }
              status={importResult.failedImports === 0 ? 'success' : 'active'}
              strokeColor={importResult.failedImports === 0 ? '#52c41a' : '#faad14'}
            />

            {/* Results Details */}
            <Collapse>
              {importResult.successfulImports > 0 && (
                <Panel
                  header={
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      Inscripciones Exitosas ({importResult.successfulImports})
                    </Space>
                  }
                  key="success"
                >
                  <Table
                    dataSource={importResult.importedStudents}
                    columns={successColumns}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    rowKey="rowNumber"
                  />
                </Panel>
              )}

              {importResult.errors.length > 0 && (
                <Panel
                  header={
                    <Space>
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      Errores ({importResult.errors.length})
                    </Space>
                  }
                  key="errors"
                >
                  <Table
                    dataSource={importResult.errors}
                    columns={errorColumns}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    rowKey={(_, index) => `error-${index}`}
                  />
                </Panel>
              )}

              {importResult.warnings.length > 0 && (
                <Panel
                  header={
                    <Space>
                      <WarningOutlined style={{ color: '#faad14' }} />
                      Advertencias ({importResult.warnings.length})
                    </Space>
                  }
                  key="warnings"
                >
                  <Table
                    dataSource={importResult.warnings}
                    columns={errorColumns}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    rowKey={(_, index) => `warning-${index}`}
                  />
                </Panel>
              )}
            </Collapse>

            {/* Final Result */}
            {importResult.failedImports === 0 ? (
              <Result
                status="success"
                title="¡Importación Completada Exitosamente!"
                subTitle={`Se han inscrito ${importResult.successfulImports} estudiantes correctamente.`}
              />
            ) : (
              <Result
                status="warning"
                title="Importación Completada con Errores"
                subTitle={`${importResult.successfulImports} inscripciones exitosas, ${importResult.failedImports} fallidas. Revise los errores para corregir los datos.`}
              />
            )}

            <div className="text-center">
              <Space>
                <Button onClick={handleClose}>Cerrar</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setCurrentStep(1);
                    setFileList([]);
                    setImportResult(null);
                  }}
                >
                  Importar Otro Archivo
                </Button>
              </Space>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BulkImportModal;