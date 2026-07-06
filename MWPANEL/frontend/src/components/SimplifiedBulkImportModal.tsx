import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Progress,
  Alert,
  Typography,
  Divider,
  Card,
  Row,
  Col,
  Tag,
  message,
  Table,
  Space,
  Collapse,
  Spin
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  KeyOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import apiClient from '@services/apiClient';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Panel } = Collapse;

interface SimplifiedBulkImportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

interface SimplifiedImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{
    rowNumber: number;
    message: string;
    originalData: any;
  }>;
  importedUsers: Array<{
    rowNumber: number;
    studentName: string;
    studentEmail: string;
    studentPassword: string;
    primaryName: string;
    primaryEmail: string;
    primaryPassword: string;
    secondaryName?: string;
    secondaryEmail?: string;
    secondaryPassword?: string;
    notes: string[];
  }>;
}

const SimplifiedBulkImportModal: React.FC<SimplifiedBulkImportModalProps> = ({ 
  visible, 
  onClose, 
  onSuccess 
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<SimplifiedImportResult | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get('/enrollment/template-simplified', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plantilla_inscripcion_simplificada.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Plantilla descargada exitosamente');
    } catch (error) {
      console.error('Error downloading template:', error);
      message.error('Error al descargar la plantilla');
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiClient.post('/enrollment/bulk-import-simplified', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('Simplified import result:', response.data);
      setImportResult(response.data);
      
      setTimeout(() => {
        setProgress(0);
        setUploading(false);
      }, 1000);

    } catch (error: any) {
      setProgress(0);
      setUploading(false);
      console.error('Import error:', error);
      message.error(error.response?.data?.message || 'Error al procesar el archivo');
    }

    return false; // Prevent default upload behavior
  };

  const handleClose = () => {
    if (importResult && importResult.successfulImports > 0) {
      onSuccess(importResult);
    } else {
      onClose();
    }
  };

  const successColumns = [
    {
      title: 'Fila',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 60,
      render: (num: number) => <Tag color="blue">#{num}</Tag>
    },
    {
      title: 'Estudiante',
      key: 'student',
      render: (record: any) => (
        <div>
          <div><strong>{record.studentName}</strong></div>
          <div className="text-gray-500 text-sm">{record.studentEmail}</div>
        </div>
      )
    },
    {
      title: 'Progenitor 1',
      key: 'primary',
      render: (record: any) => (
        <div>
          <div><strong>{record.primaryName}</strong></div>
          <div className="text-gray-500 text-sm">{record.primaryEmail}</div>
        </div>
      )
    },
    {
      title: 'Progenitor 2',
      key: 'secondary',
      render: (record: any) => (
        record.secondaryName ? (
          <div>
            <div><strong>{record.secondaryName}</strong></div>
            <div className="text-gray-500 text-sm">{record.secondaryEmail}</div>
          </div>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    },
    {
      title: 'Contraseñas',
      key: 'passwords',
      render: (record: any) => (
        <Space direction="vertical" size="small">
          <div className="text-sm">
            <UserOutlined /> Estudiante: 
            <span className="ml-2">
              {showPasswords ? record.studentPassword : '••••••••'}
            </span>
          </div>
          <div className="text-sm">
            <TeamOutlined /> Progenitor 1: 
            <span className="ml-2">
              {showPasswords ? record.primaryPassword : '••••••••'}
            </span>
          </div>
          {record.secondaryPassword && (
            <div className="text-sm">
              <TeamOutlined /> Progenitor 2: 
              <span className="ml-2">
                {showPasswords ? record.secondaryPassword : '••••••••'}
              </span>
            </div>
          )}
        </Space>
      )
    },
    {
      title: 'Notas',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string[]) => (
        <div>
          {notes.map((note, index) => (
            <Tag key={index} color="gold" className="mb-1 text-xs">
              <KeyOutlined className="mr-1" />
              {note}
            </Tag>
          ))}
        </div>
      )
    }
  ];

  const errorColumns = [
    {
      title: 'Fila',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 60,
      render: (num: number) => <Tag color="red">#{num}</Tag>
    },
    {
      title: 'Error',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: 'Datos Originales',
      dataIndex: 'originalData',
      key: 'originalData',
      render: (data: any) => (
        <pre className="text-xs bg-gray-50 p-2 rounded max-w-xs overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )
    }
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <TeamOutlined />
          Subida Masiva Simplificada de Usuarios
        </div>
      }
      open={visible}
      onCancel={handleClose}
      width={1200}
      style={{ top: 20 }}
      footer={
        importResult ? [
          <Button key="close" type="primary" onClick={handleClose}>
            {importResult.successfulImports > 0 ? 'Completar' : 'Cerrar'}
          </Button>
        ] : [
          <Button key="cancel" onClick={onClose}>
            Cancelar
          </Button>
        ]
      }
    >
      {!importResult ? (
        <div className="space-y-6">
          {/* Instructions */}
          <Alert
            message="Importación Simplificada de Usuarios"
            description="Sube un archivo Excel/CSV con datos básicos. Las contraseñas vacías se generan automáticamente."
            type="info"
            showIcon
          />

          {/* Features */}
          <Card>
            <Row gutter={16}>
              <Col span={12}>
                <div className="text-center">
                  <KeyOutlined className="text-3xl text-blue-500 mb-2" />
                  <Title level={5}>Contraseñas Automáticas</Title>
                  <Paragraph type="secondary" className="text-sm">
                    Si dejas el campo vacío, se genera una contraseña segura automáticamente
                  </Paragraph>
                </div>
              </Col>
              <Col span={12}>
                <div className="text-center">
                  <UserOutlined className="text-3xl text-green-500 mb-2" />
                  <Title level={5}>Datos Mínimos</Title>
                  <Paragraph type="secondary" className="text-sm">
                    Solo nombre, apellidos y email. Los demás datos se pueden completar después
                  </Paragraph>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Template Download */}
          <div className="text-center">
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleDownloadTemplate}
              size="large"
            >
              Descargar Plantilla Simplificada
            </Button>
            <div className="text-gray-500 text-sm mt-2">
              Descarga la plantilla para ver el formato correcto
            </div>
          </div>

          <Divider />

          {/* File Upload */}
          <Dragger
            beforeUpload={handleFileUpload}
            showUploadList={false}
            accept=".xlsx,.xls,.csv"
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Haz clic o arrastra tu archivo aquí para subir
            </p>
            <p className="ant-upload-hint">
              Soporta archivos Excel (.xlsx, .xls) y CSV (.csv)
            </p>
          </Dragger>

          {uploading && (
            <div className="text-center">
              <Spin size="large" />
              <div className="mt-4">
                <Text>Procesando archivo...</Text>
                <Progress percent={progress} className="mt-2" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Results Summary */}
          <Row gutter={16}>
            <Col span={8}>
              <Card className="text-center">
                <div className="text-2xl font-bold text-blue-600">{importResult.totalRows}</div>
                <div className="text-gray-500">Total Filas</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.successfulImports}</div>
                <div className="text-gray-500">Importaciones Exitosas</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card className="text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.failedImports}</div>
                <div className="text-gray-500">Fallos</div>
              </Card>
            </Col>
          </Row>

          {/* Results Details */}
          {importResult.successfulImports > 0 && (
            <Card>
              <div className="flex justify-between items-center mb-4">
                <Title level={4} className="mb-0">
                  <CheckCircleOutlined className="text-green-500 mr-2" />
                  Usuarios Importados Exitosamente ({importResult.successfulImports})
                </Title>
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? 'Ocultar' : 'Mostrar'} Contraseñas
                </Button>
              </div>
              
              <Table
                dataSource={importResult.importedUsers}
                columns={successColumns}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
                size="small"
                rowKey="rowNumber"
              />
            </Card>
          )}

          {importResult.failedImports > 0 && (
            <Card>
              <Title level={4} className="text-red-600 mb-4">
                <ExclamationCircleOutlined className="mr-2" />
                Errores en la Importación ({importResult.failedImports})
              </Title>
              
              <Table
                dataSource={importResult.errors}
                columns={errorColumns}
                pagination={{ pageSize: 5 }}
                size="small"
                rowKey="rowNumber"
              />
            </Card>
          )}

          {/* Important Notes */}
          <Alert
            message="Información Importante"
            description={
              <div>
                <div>• Los usuarios han sido creados y pueden acceder al sistema inmediatamente</div>
                <div>• Las contraseñas generadas automáticamente están listadas arriba</div>
                <div>• Los datos adicionales (teléfono, dirección, etc.) pueden completarse desde el panel de usuarios</div>
                <div>• Se ha asignado automáticamente el nivel "Educación Primaria" (puede cambiarse después)</div>
              </div>
            }
            type="warning"
            showIcon
          />
        </div>
      )}
    </Modal>
  );
};

export default SimplifiedBulkImportModal;