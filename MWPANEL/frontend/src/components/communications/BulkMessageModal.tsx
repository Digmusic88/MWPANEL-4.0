import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Transfer,
  Button,
  Space,
  message,
  Divider,
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Spin,
  Alert
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  TeamOutlined,
  FilterOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { communicationsService } from '../../services/communications.service';
import useClassGroups from '../../hooks/useClassGroups';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface BulkMessageModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

interface RecipientItem {
  key: string;
  title: string;
  description: string;
  role: string;
  email: string;
  classGroup?: string;
  subject?: string;
}

interface FormValues {
  subject: string;
  content: string;
  type: string;
  priority: string;
}

const BulkMessageModal: React.FC<BulkMessageModalProps> = ({
  visible,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const { classGroups } = useClassGroups();
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [filteredRecipients, setFilteredRecipients] = useState<RecipientItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [quickAction, setQuickAction] = useState<string>('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Estados para selección de padres por grupos de clase
  const [selectedClassGroups, setSelectedClassGroups] = useState<string[]>([]);
  const [loadingParentsByGroups, setLoadingParentsByGroups] = useState(false);

  // Cargar usuarios disponibles
  useEffect(() => {
    if (visible) {
      loadAvailableRecipients();
    }
  }, [visible]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = recipients;

    if (roleFilter) {
      filtered = filtered.filter(r => r.role === roleFilter);
    }

    if (classFilter) {
      filtered = filtered.filter(r => r.classGroup === classFilter);
    }

    setFilteredRecipients(filtered);
  }, [recipients, roleFilter, classFilter]);

  const loadAvailableRecipients = async () => {
    try {
      setLoadingRecipients(true);
      const data = await communicationsService.getAvailableRecipientsForBulk();

      const recipientItems: RecipientItem[] = data.map(user => ({
        key: user.id,
        title: user.displayName || `${user.firstName} ${user.lastName}`,
        description: `${user.email} ${user.classGroup ? `• ${user.classGroup}` : ''}`,
        role: user.role,
        email: user.email,
        classGroup: user.classGroup,
        subject: user.subject
      }));

      setRecipients(recipientItems);
      setFilteredRecipients(recipientItems);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      message.error('Error al cargar usuarios disponibles');
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'all_students':
        setSelectedKeys(recipients.filter(r => r.role === 'student').map(r => r.key));
        break;
      case 'all_teachers':
        setSelectedKeys(recipients.filter(r => r.role === 'teacher').map(r => r.key));
        break;
      case 'all_families':
        setSelectedKeys(recipients.filter(r => r.role === 'family').map(r => r.key));
        break;
      case 'clear_all':
        setSelectedKeys([]);
        break;
      default:
        break;
    }
    setQuickAction('');
  };

  const handleMyStudents = async () => {
    if (user?.role !== 'teacher') return;

    try {
      setLoading(true);
      const students = await communicationsService.getMyStudents();
      const studentIds = students.map(s => s.id);
      setSelectedKeys(studentIds);
      message.success(`${studentIds.length} estudiantes de tus clases seleccionados`);
    } catch (error) {
      console.error('Error:', error);
      message.error('Error al obtener tus estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const handleParentsByClassGroups = async () => {
    if (selectedClassGroups.length === 0) {
      message.warning('Debe seleccionar al menos un grupo de clase');
      return;
    }

    try {
      setLoadingParentsByGroups(true);
      const parents = await communicationsService.getParentsByClassGroups(selectedClassGroups);

      if (parents.length === 0) {
        message.info('No se encontraron padres en los grupos seleccionados');
        return;
      }

      // Obtener IDs de los padres y añadirlos a la selección
      const parentIds = parents.map(p => p.id);

      // Añadir a la lista de destinatarios si no están ya
      const newRecipients = parents.map(parent => ({
        key: parent.id,
        title: parent.displayName || `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
        description: `${parent.email} ${parent.classGroups ? `• Grupos: ${parent.classGroups}` : ''}`,
        role: parent.role,
        email: parent.email,
        classGroup: parent.classGroups
      }));

      // Combinar con destinatarios existentes (evitando duplicados)
      const existingIds = new Set(recipients.map(r => r.key));
      const recipientsToAdd = newRecipients.filter(r => !existingIds.has(r.key));

      if (recipientsToAdd.length > 0) {
        setRecipients(prev => [...prev, ...recipientsToAdd]);
        setFilteredRecipients(prev => [...prev, ...recipientsToAdd]);
      }

      // Seleccionar los padres
      setSelectedKeys(prevKeys => {
        const keySet = new Set([...prevKeys, ...parentIds]);
        return Array.from(keySet);
      });

      message.success(
        `${parents.length} padre${parents.length !== 1 ? 's' : ''} de los grupos seleccionados añadido${parents.length !== 1 ? 's' : ''}`
      );

      // Limpiar selección de grupos
      setSelectedClassGroups([]);
    } catch (error) {
      console.error('Error obteniendo padres por grupos:', error);
      message.error('Error al obtener padres de los grupos seleccionados');
    } finally {
      setLoadingParentsByGroups(false);
    }
  };

  const handleSendBulkMessage = async (values: FormValues) => {
    if (selectedKeys.length === 0) {
      message.error('Debe seleccionar al menos un destinatario');
      return;
    }

    try {
      setLoading(true);

      const messageData = {
        subject: values.subject,
        content: values.content,
        type: values.type || 'announcement',
        priority: values.priority || 'normal',
        recipientIds: selectedKeys
      };

      await communicationsService.sendBulkMessage(messageData);

      message.success(`Mensaje enviado exitosamente a ${selectedKeys.length} destinatarios`);
      form.resetFields();
      setSelectedKeys([]);
      onSuccess?.();
      onCancel();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      message.error('Error al enviar el mensaje');
    } finally {
      setLoading(false);
    }
  };

  const renderRecipientItem = (item: RecipientItem) => {
    const roleColor = {
      admin: 'red',
      teacher: 'blue',
      student: 'green',
      family: 'orange'
    }[item.role] || 'default';

    return (
      <div style={{ padding: '8px 0' }}>
        <div>
          <UserOutlined style={{ marginRight: 8 }} />
          <strong>{item.title}</strong>
          <Tag color={roleColor} style={{ marginLeft: 8 }}>
            {item.role === 'admin' ? 'Admin' :
             item.role === 'teacher' ? 'Profesor' :
             item.role === 'student' ? 'Estudiante' :
             'Familia'}
          </Tag>
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
          {item.description}
        </div>
      </div>
    );
  };

  const uniqueRoles = [...new Set(recipients.map(r => r.role))];
  const uniqueClasses = [...new Set(recipients.map(r => r.classGroup).filter(Boolean))];

  return (
    <Modal
      title={
        <div>
          <SendOutlined style={{ marginRight: 8 }} />
          Enviar Mensaje a Múltiples Usuarios
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSendBulkMessage}
      >
        {/* Información de usuario */}
        <Alert
          message={`Enviando como: ${user?.firstName} ${user?.lastName} (${user?.role})`}
          type="info"
          style={{ marginBottom: 16 }}
        />

        {/* Acciones rápidas */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Title level={5}>Acciones Rápidas</Title>
          <Space wrap>
            {user?.role === 'teacher' && (
              <Button
                icon={<TeamOutlined />}
                onClick={handleMyStudents}
                loading={loading}
              >
                Mis Estudiantes
              </Button>
            )}
            {(user?.role === 'admin' || user?.role === 'teacher') && (
              <>
                <Button onClick={() => handleQuickAction('all_students')}>
                  Todos los Estudiantes
                </Button>
                <Button onClick={() => handleQuickAction('all_teachers')}>
                  Todos los Profesores
                </Button>
                <Button onClick={() => handleQuickAction('all_families')}>
                  Todas las Familias
                </Button>
              </>
            )}
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={() => handleQuickAction('clear_all')}
            >
              Limpiar Selección
            </Button>
          </Space>
        </Card>

        {/* Selección de padres por grupos de clase */}
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={5}>
              <TeamOutlined style={{ marginRight: 8 }} />
              Padres por Grupos de Clase
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Selecciona uno o más grupos de clase para añadir a los padres cuyos hijos pertenecen a esos grupos.
              Los padres con múltiples hijos en diferentes grupos se incluyen automáticamente sin duplicados.
            </Text>
            <Row gutter={16} align="middle">
              <Col span={18}>
                <Select
                  mode="multiple"
                  placeholder="Seleccionar grupos de clase"
                  value={selectedClassGroups}
                  onChange={setSelectedClassGroups}
                  style={{ width: '100%' }}
                  maxTagCount="responsive"
                  loading={!classGroups || classGroups.length === 0}
                >
                  {classGroups?.map(group => (
                    <Option key={group.id} value={group.id}>
                      {group.name}
                      {group._count?.students ? ` (${group._count.students} estudiantes)` : ''}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={6}>
                <Button
                  type="primary"
                  icon={<TeamOutlined />}
                  onClick={handleParentsByClassGroups}
                  loading={loadingParentsByGroups}
                  disabled={selectedClassGroups.length === 0}
                  block
                >
                  Añadir Padres
                </Button>
              </Col>
            </Row>
          </Card>
        )}

        {/* Filtros */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Title level={5}>
            <FilterOutlined style={{ marginRight: 8 }} />
            Filtros
          </Title>
          <Row gutter={16}>
            <Col span={12}>
              <Select
                placeholder="Filtrar por rol"
                value={roleFilter}
                onChange={setRoleFilter}
                allowClear
                style={{ width: '100%' }}
              >
                {uniqueRoles.map(role => (
                  <Option key={role} value={role}>
                    {role === 'admin' ? 'Administradores' :
                     role === 'teacher' ? 'Profesores' :
                     role === 'student' ? 'Estudiantes' :
                     'Familias'}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={12}>
              <Select
                placeholder="Filtrar por clase"
                value={classFilter}
                onChange={setClassFilter}
                allowClear
                style={{ width: '100%' }}
              >
                {uniqueClasses.map(classGroup => (
                  <Option key={classGroup} value={classGroup}>
                    {classGroup}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Selección de destinatarios */}
        <Card style={{ marginBottom: 16 }}>
          <Title level={5}>
            Seleccionar Destinatarios ({selectedKeys.length} seleccionados)
          </Title>

          {loadingRecipients ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Cargando usuarios...</div>
            </div>
          ) : (
            <Transfer
              dataSource={filteredRecipients}
              targetKeys={selectedKeys}
              onChange={setSelectedKeys}
              render={renderRecipientItem}
              listStyle={{
                width: 350,
                height: 300,
              }}
              titles={['Usuarios Disponibles', 'Destinatarios Seleccionados']}
              showSearch
              searchPlaceholder="Buscar usuario..."
            />
          )}
        </Card>

        <Divider />

        {/* Formulario del mensaje */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Asunto"
              name="subject"
              rules={[{ required: true, message: 'El asunto es obligatorio' }]}
            >
              <Input placeholder="Escriba el asunto del mensaje" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Tipo"
              name="type"
              initialValue="announcement"
            >
              <Select>
                <Option value="announcement">Comunicado</Option>
                <Option value="alert">Alerta</Option>
                <Option value="reminder">Recordatorio</Option>
                <Option value="general">General</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Prioridad"
              name="priority"
              initialValue="normal"
            >
              <Select>
                <Option value="low">Baja</Option>
                <Option value="normal">Normal</Option>
                <Option value="high">Alta</Option>
                <Option value="urgent">Urgente</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Contenido del Mensaje"
          name="content"
          rules={[{ required: true, message: 'El contenido es obligatorio' }]}
        >
          <TextArea
            rows={6}
            placeholder="Escriba el contenido del mensaje..."
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={loading}
              disabled={selectedKeys.length === 0}
            >
              Enviar Mensaje ({selectedKeys.length} destinatarios)
            </Button>
            <Button onClick={onCancel}>
              Cancelar
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BulkMessageModal;