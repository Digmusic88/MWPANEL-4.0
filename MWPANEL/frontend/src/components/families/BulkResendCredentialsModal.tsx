import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Button,
  List,
  Checkbox,
  Select,
  Typography,
  Space,
  Card,
  Avatar,
  Tag,
  message,
  Spin,
  Alert,
  Progress,
  Divider,
  Statistic,
  Row,
  Col,
  Badge,
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';

const { Text, Title } = Typography;
const { Option } = Select;

interface Family {
  id: string;
  primaryContact: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  secondaryContact?: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  students: Array<{
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  }>;
}

interface SelectedFamily {
  familyId: string;
  contactType: 'primary' | 'secondary';
  family: Family;
}

interface BulkResult {
  message: string;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  success: Array<{
    familyId: string;
    contactType: string;
    email: string;
  }>;
  failures: Array<{
    familyId: string;
    contactType: string;
    email?: string;
    error: string;
  }>;
}

interface BulkResendCredentialsModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function BulkResendCredentialsModal({
  visible,
  onCancel,
  onSuccess,
}: BulkResendCredentialsModalProps) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<SelectedFamily[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [step, setStep] = useState<'selection' | 'sending' | 'results'>('selection');

  // Cargar familias al abrir el modal
  useEffect(() => {
    if (visible) {
      loadFamilies();
    }
  }, [visible]);

  const loadFamilies = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/families');
      setFamilies(response.data);
    } catch (error) {
      console.error('Error cargando familias:', error);
      message.error('Error cargando familias');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilySelection = (family: Family, contactType: 'primary' | 'secondary', checked: boolean) => {
    const selectionKey = `${family.id}-${contactType}`;
    
    if (checked) {
      setSelectedFamilies(prev => [
        ...prev.filter(s => `${s.familyId}-${s.contactType}` !== selectionKey),
        { familyId: family.id, contactType, family }
      ]);
    } else {
      setSelectedFamilies(prev => 
        prev.filter(s => `${s.familyId}-${s.contactType}` !== selectionKey)
      );
    }
  };

  const isSelected = (familyId: string, contactType: 'primary' | 'secondary') => {
    return selectedFamilies.some(s => s.familyId === familyId && s.contactType === contactType);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allSelections: SelectedFamily[] = [];
      families.forEach(family => {
        // Siempre incluir contacto primario
        allSelections.push({
          familyId: family.id,
          contactType: 'primary',
          family
        });
        // Incluir contacto secundario si existe
        if (family.secondaryContact) {
          allSelections.push({
            familyId: family.id,
            contactType: 'secondary',
            family
          });
        }
      });
      setSelectedFamilies(allSelections);
    } else {
      setSelectedFamilies([]);
    }
  };

  const handleBulkSend = async () => {
    if (selectedFamilies.length === 0) {
      message.warning('Debes seleccionar al menos una familia');
      return;
    }

    setSending(true);
    setStep('sending');

    try {
      const payload = {
        familyContacts: selectedFamilies.map(s => ({
          familyId: s.familyId,
          contactType: s.contactType
        }))
      };

      const response = await apiClient.post('/families/bulk-resend-credentials', payload);
      setResult(response.data);
      setStep('results');
      
      if (response.data.summary.successful > 0) {
        message.success(`${response.data.summary.successful} credenciales enviadas exitosamente`);
      }
      if (response.data.summary.failed > 0) {
        message.warning(`${response.data.summary.failed} envíos fallaron`);
      }
    } catch (error: any) {
      console.error('Error en envío masivo:', error);
      message.error('Error en envío masivo: ' + (error.response?.data?.message || error.message));
      setStep('selection');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSelectedFamilies([]);
    setResult(null);
    setStep('selection');
    onCancel();
  };

  const handleFinish = () => {
    handleClose();
    onSuccess();
  };

  const getContactInfo = (family: Family, contactType: 'primary' | 'secondary') => {
    const contact = contactType === 'primary' ? family.primaryContact : family.secondaryContact;
    if (!contact) return null;
    
    return {
      name: `${contact.profile.firstName} ${contact.profile.lastName}`,
      email: contact.email
    };
  };

  const renderSelectionStep = () => (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <div className="mb-4">
        <Space>
          <Button 
            size="small" 
            onClick={() => handleSelectAll(true)}
            disabled={loading}
          >
            Seleccionar Todos
          </Button>
          <Button 
            size="small" 
            onClick={() => handleSelectAll(false)}
            disabled={loading}
          >
            Deseleccionar Todos
          </Button>
          <Text type="secondary">
            {selectedFamilies.length} seleccionados
          </Text>
        </Space>
      </div>

      <Spin spinning={loading}>
        <List
          dataSource={families}
          renderItem={(family) => (
            <List.Item key={family.id}>
              <Card size="small" style={{ width: '100%' }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar icon={<UserOutlined />} />
                      <div>
                        <Text strong>
                          Familia {family.primaryContact.profile.firstName} {family.primaryContact.profile.lastName}
                        </Text>
                        <div>
                          <Tag color="blue">{family.students.length} estudiante(s)</Tag>
                        </div>
                      </div>
                    </div>

                    <Space direction="vertical" size="small" className="w-full">
                      {/* Contacto Primario */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MailOutlined />
                          <span>
                            <Text strong>Primario: </Text>
                            {getContactInfo(family, 'primary')?.name} ({getContactInfo(family, 'primary')?.email})
                          </span>
                        </div>
                        <Checkbox
                          checked={isSelected(family.id, 'primary')}
                          onChange={(e) => handleFamilySelection(family, 'primary', e.target.checked)}
                        >
                          Enviar
                        </Checkbox>
                      </div>

                      {/* Contacto Secundario */}
                      {family.secondaryContact && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PhoneOutlined />
                            <span>
                              <Text strong>Secundario: </Text>
                              {getContactInfo(family, 'secondary')?.name} ({getContactInfo(family, 'secondary')?.email})
                            </span>
                          </div>
                          <Checkbox
                            checked={isSelected(family.id, 'secondary')}
                            onChange={(e) => handleFamilySelection(family, 'secondary', e.target.checked)}
                          >
                            Enviar
                          </Checkbox>
                        </div>
                      )}
                    </Space>
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      </Spin>
    </div>
  );

  const renderSendingStep = () => (
    <div className="text-center py-8">
      <Spin size="large" />
      <div className="mt-4">
        <Title level={4}>Enviando credenciales...</Title>
        <Text type="secondary">
          Procesando {selectedFamilies.length} contactos seleccionados
        </Text>
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div>
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Statistic 
            title="Total" 
            value={result?.summary.total || 0} 
            prefix={<SendOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="Exitosos" 
            value={result?.summary.successful || 0} 
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="Fallidos" 
            value={result?.summary.failed || 0} 
            prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Col>
      </Row>

      <Progress 
        percent={Math.round(((result?.summary.successful || 0) / (result?.summary.total || 1)) * 100)}
        status={result?.summary.failed === 0 ? 'success' : 'normal'}
        className="mb-4"
      />

      {result?.success && result.success.length > 0 && (
        <div className="mb-4">
          <Title level={5} className="text-green-600">
            <CheckCircleOutlined /> Envíos Exitosos ({result.success.length})
          </Title>
          <List
            size="small"
            dataSource={result.success}
            renderItem={(item) => (
              <List.Item>
                <Badge status="success" />
                <Text>{item.email} ({item.contactType})</Text>
              </List.Item>
            )}
          />
        </div>
      )}

      {result?.failures && result.failures.length > 0 && (
        <div>
          <Title level={5} className="text-red-600">
            <CloseCircleOutlined /> Envíos Fallidos ({result.failures.length})
          </Title>
          <List
            size="small"
            dataSource={result.failures}
            renderItem={(item) => (
              <List.Item>
                <Badge status="error" />
                <div>
                  <Text>{item.email || 'Email no disponible'} ({item.contactType})</Text>
                  <br />
                  <Text type="secondary" className="text-xs">{item.error}</Text>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );

  return (
    <Modal
      title={
        <Space>
          <SendOutlined />
          Envío Masivo de Credenciales
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={
        step === 'selection' ? [
          <Button key="cancel" onClick={handleClose}>
            Cancelar
          </Button>,
          <Button
            key="send"
            type="primary"
            icon={<SendOutlined />}
            onClick={handleBulkSend}
            disabled={selectedFamilies.length === 0 || sending}
            loading={sending}
          >
            Enviar Credenciales ({selectedFamilies.length})
          </Button>
        ] : step === 'sending' ? [] : [
          <Button key="finish" type="primary" onClick={handleFinish}>
            Finalizar
          </Button>
        ]
      }
    >
      {step === 'selection' && (
        <>
          <Alert
            message="Selecciona las familias y contactos a los que deseas reenviar las credenciales"
            description="Se generarán nuevas contraseñas temporales para cada contacto seleccionado."
            type="info"
            showIcon
            className="mb-4"
          />
          {renderSelectionStep()}
        </>
      )}

      {step === 'sending' && renderSendingStep()}

      {step === 'results' && (
        <>
          <Alert
            message={result?.message || 'Proceso completado'}
            description={`Se procesaron ${result?.summary.total} contactos con ${result?.summary.successful} envíos exitosos.`}
            type={result?.summary.failed === 0 ? 'success' : 'warning'}
            showIcon
            className="mb-4"
          />
          {renderResultsStep()}
        </>
      )}
    </Modal>
  );
}