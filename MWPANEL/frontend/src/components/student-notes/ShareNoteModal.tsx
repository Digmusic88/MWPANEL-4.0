import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Card,
  Avatar,
  Checkbox,
  Select,
  DatePicker,
  Divider,
  Typography,
  Space,
  Tag,
  Alert,
  Spin,
  Radio,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  CalendarOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  ShareNoteModalProps,
  Classmate,
  StudentTeacher,
  ShareNoteDto,
  SharedNoteType,
} from '../../types/student-notes';
import studentNotesApi from '../../services/studentNotesApi';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const ShareNoteModal: React.FC<ShareNoteModalProps> = ({
  isOpen,
  note,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [teachers, setTeachers] = useState<StudentTeacher[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [shareType, setShareType] = useState<SharedNoteType>(SharedNoteType.STUDENT);
  const [loadingData, setLoadingData] = useState(false);

  // Cargar compañeros y profesores
  useEffect(() => {
    if (isOpen && note) {
      loadShareData();
    }
  }, [isOpen, note]);

  const loadShareData = async () => {
    setLoadingData(true);
    try {
      const [classmatesData, teachersData] = await Promise.all([
        studentNotesApi.getClassmates(),
        studentNotesApi.getStudentTeachers(),
      ]);
      setClassmates(classmatesData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error loading share data:', error);
      message.error('Error al cargar la información de contactos');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!note) return;

    // Validar que al menos un destinatario esté seleccionado
    if (selectedRecipients.length === 0) {
      message.error('Debes seleccionar al menos un destinatario');
      return;
    }

    setLoading(true);
    try {
      const shareData: ShareNoteDto = {
        recipientIds: selectedRecipients,
        sharedWithType: shareType,
        message: values.message,
        allowComments: values.allowComments || false,
        allowDownload: values.allowDownload || false,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
      };

      await studentNotesApi.shareNote(note.id, shareData);
      
      message.success(`Apunte compartido exitosamente con ${selectedRecipients.length} ${
        shareType === SharedNoteType.STUDENT ? 'compañeros' : 'profesores'
      }`);
      
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error sharing note:', error);
      const errorMessage = error?.response?.data?.message || 'Error al compartir el apunte';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setSelectedRecipients([]);
    setShareType(SharedNoteType.STUDENT);
    onClose();
  };

  const handleRecipientToggle = (recipientId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(recipientId)
        ? prev.filter(id => id !== recipientId)
        : [...prev, recipientId]
    );
  };

  const handleSelectAll = () => {
    const currentList = shareType === SharedNoteType.STUDENT ? classmates : teachers;
    if (selectedRecipients.length === currentList.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(currentList.map(item => item.id));
    }
  };

  const getCurrentList = () => {
    return shareType === SharedNoteType.STUDENT ? classmates : teachers;
  };

  const canShare = note ? studentNotesApi.canShareNote(note) : { canShare: false };

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          <span>Compartir Apunte</span>
        </Space>
      }
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width={680}
      destroyOnClose
    >
      {!canShare.canShare ? (
        <Alert
          message="No se puede compartir este apunte"
          description={canShare.reason}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <>
          {/* Información del apunte */}
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f8f9fa' }}>
            <Space>
              <BookOutlined style={{ color: '#52c41a' }} />
              <div>
                <Text strong>{note?.title}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {note?.type === 'text' ? 'Apunte de texto' : 
                   note?.type === 'voice' ? 'Nota de audio' :
                   note?.type === 'drawing' ? 'Dibujo' :
                   note?.type === 'presentation' ? 'Presentación' : 'Apunte mixto'}
                  {note?.subject && ` • ${note.subject.name}`}
                </Text>
              </div>
            </Space>
          </Card>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            {/* Tipo de compartición */}
            <Form.Item label="Compartir con">
              <Radio.Group
                value={shareType}
                onChange={(e) => {
                  setShareType(e.target.value);
                  setSelectedRecipients([]);
                }}
              >
                <Radio.Button value={SharedNoteType.STUDENT}>
                  <TeamOutlined /> Compañeros de clase
                </Radio.Button>
                <Radio.Button value={SharedNoteType.TEACHER}>
                  <UserOutlined /> Profesores
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            {/* Lista de destinatarios */}
            <Form.Item label={
              <Space>
                <span>
                  {shareType === SharedNoteType.STUDENT ? 'Compañeros de clase' : 'Profesores'}
                  <Text type="secondary"> ({getCurrentList().length} disponibles)</Text>
                </span>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={handleSelectAll}
                  disabled={loadingData}
                >
                  {selectedRecipients.length === getCurrentList().length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              </Space>
            }>
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: '6px', padding: '8px' }}>
                {loadingData ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin />
                    <div style={{ marginTop: '8px' }}>
                      <Text type="secondary">Cargando contactos...</Text>
                    </div>
                  </div>
                ) : getCurrentList().length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Text type="secondary">
                      {shareType === SharedNoteType.STUDENT 
                        ? 'No tienes compañeros de clase disponibles'
                        : 'No tienes profesores disponibles'
                      }
                    </Text>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {getCurrentList().map((person) => (
                      <Card
                        key={person.id}
                        size="small"
                        hoverable
                        style={{
                          cursor: 'pointer',
                          border: selectedRecipients.includes(person.id) ? '2px solid #1890ff' : '1px solid #d9d9d9',
                          backgroundColor: selectedRecipients.includes(person.id) ? '#f0f8ff' : '#fff'
                        }}
                        onClick={() => handleRecipientToggle(person.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Space>
                            <Avatar 
                              size="small" 
                              src={person.photoUrl} 
                              icon={<UserOutlined />}
                            />
                            <div>
                              <Text strong>{studentNotesApi.formatFullName(person.firstName, person.lastName)}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                {person.email}
                              </Text>
                              {shareType === SharedNoteType.STUDENT && 'classGroups' in person && (
                                <div style={{ marginTop: '2px' }}>
                                  {person.classGroups.map(cg => (
                                    <Tag key={cg.id} size="small" style={{ fontSize: '10px', marginRight: '2px' }}>
                                      {cg.name}
                                    </Tag>
                                  ))}
                                </div>
                              )}
                              {shareType === SharedNoteType.TEACHER && 'subjects' in person && (
                                <div style={{ marginTop: '2px' }}>
                                  {person.subjects.slice(0, 2).map(subject => (
                                    <Tag key={subject.id} size="small" color="blue" style={{ fontSize: '10px', marginRight: '2px' }}>
                                      {subject.name}
                                    </Tag>
                                  ))}
                                  {person.subjects.length > 2 && (
                                    <Tag size="small" style={{ fontSize: '10px' }}>
                                      +{person.subjects.length - 2}
                                    </Tag>
                                  )}
                                </div>
                              )}
                            </div>
                          </Space>
                          <Checkbox 
                            checked={selectedRecipients.includes(person.id)}
                            onChange={() => {}} // Controlled by card click
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Form.Item>

            <Divider />

            {/* Mensaje opcional */}
            <Form.Item 
              name="message" 
              label="Mensaje opcional"
              extra="Añade un mensaje personal para los destinatarios"
            >
              <TextArea
                rows={3}
                placeholder="Ej: Hola! Te comparto este apunte que creo que te puede ser útil..."
                maxLength={500}
                showCount
              />
            </Form.Item>

            {/* Configuración de permisos */}
            <Form.Item label={
              <Space>
                <SettingOutlined />
                <span>Permisos</span>
              </Space>
            }>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item name="allowComments" valuePropName="checked" noStyle>
                  <Checkbox>
                    Permitir comentarios sobre el apunte
                  </Checkbox>
                </Form.Item>
                <Form.Item name="allowDownload" valuePropName="checked" noStyle>
                  <Checkbox>
                    Permitir descarga de archivos adjuntos
                  </Checkbox>
                </Form.Item>
              </Space>
            </Form.Item>

            {/* Fecha de expiración opcional */}
            <Form.Item 
              name="expiresAt" 
              label={
                <Space>
                  <CalendarOutlined />
                  <span>Fecha de expiración (opcional)</span>
                </Space>
              }
              extra="Si no especificas una fecha, el apunte se compartirá indefinidamente"
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Seleccionar fecha de expiración"
                disabledDate={(current) => current && current < dayjs().endOf('day')}
                showTime={{
                  defaultValue: dayjs('23:59:59', 'HH:mm:ss'),
                }}
              />
            </Form.Item>

            {/* Resumen de selección */}
            {selectedRecipients.length > 0 && (
              <Alert
                message={`${selectedRecipients.length} ${
                  shareType === SharedNoteType.STUDENT ? 'compañeros' : 'profesores'
                } seleccionados`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Botones de acción */}
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={handleClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={selectedRecipients.length === 0 || loadingData}
                  icon={<TeamOutlined />}
                >
                  Compartir Apunte
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default ShareNoteModal;