import React, { useState, useEffect } from 'react';
import {
  Modal,
  Drawer,
  Form,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  List,
  Avatar,
  Divider,
  message
} from 'antd';
import {
  ShareAltOutlined,
  UserOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { Rubric, useRubrics } from '../../hooks/useRubrics';
import { useResponsive } from '../../hooks/useResponsive';

const { Title, Text } = Typography;
const { Option } = Select;

interface RubricSharingModalProps {
  visible: boolean;
  onCancel: () => void;
  rubric: Rubric | null;
  currentTeacherId: string;
}

interface Colleague {
  id: string;
  name: string;
  email: string;
}

const RubricSharingModal: React.FC<RubricSharingModalProps> = ({
  visible,
  onCancel,
  rubric,
  currentTeacherId
}) => {
  const [form] = Form.useForm();
  const { isMobile } = useResponsive();
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharedColleagues, setSharedColleagues] = useState<Colleague[]>([]);
  const { shareRubric, unshareRubric, fetchColleagues } = useRubrics();

  useEffect(() => {
    if (visible) {
      loadColleagues();
      loadSharedColleagues();
    }
  }, [visible, rubric]);

  const loadColleagues = async () => {
    try {
      const data = await fetchColleagues();
      setColleagues(data);
    } catch (error) {
      message.error('Error al cargar la lista de profesores');
    }
  };

  const loadSharedColleagues = () => {
    if (rubric?.sharedWith) {
      const shared = colleagues.filter(colleague => 
        rubric.sharedWith?.includes(colleague.id)
      );
      setSharedColleagues(shared);
    } else {
      setSharedColleagues([]);
    }
  };

  useEffect(() => {
    loadSharedColleagues();
  }, [colleagues, rubric]);

  const handleShare = async (values: { teacherIds: string[] }) => {
    if (!rubric || !values.teacherIds.length) return;

    setLoading(true);
    try {
      const success = await shareRubric(rubric.id, values.teacherIds);
      if (success) {
        form.resetFields();
        loadSharedColleagues();
        message.success('Rúbrica compartida exitosamente');
      }
    } catch (error) {
      message.error('Error al compartir la rúbrica');
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (teacherId: string) => {
    if (!rubric) return;

    setLoading(true);
    try {
      const success = await unshareRubric(rubric.id, [teacherId]);
      if (success) {
        loadSharedColleagues();
        message.success('Acceso retirado exitosamente');
      }
    } catch (error) {
      message.error('Error al retirar el acceso');
    } finally {
      setLoading(false);
    }
  };

  const availableColleagues = colleagues.filter(colleague => 
    !rubric?.sharedWith?.includes(colleague.id)
  );

  // Contenido compartido
  const sharingContent = rubric ? (
    <div>
      {/* Información de la rúbrica */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <Title level={5} className="mb-2" style={{ fontSize: isMobile ? '14px' : '16px' }}>
          {rubric.name}
        </Title>
        {rubric.description && (
          <Text type="secondary" className="block mb-2" style={{ fontSize: isMobile ? '12px' : '14px' }}>
            {rubric.description}
          </Text>
        )}
        <div className="flex flex-wrap gap-1">
          <Tag color="blue" style={{ fontSize: isMobile ? '10px' : '12px' }}>
            {typeof rubric.criteriaCount === 'number' ? rubric.criteriaCount : 0}C
          </Tag>
          <Tag color="purple" style={{ fontSize: isMobile ? '10px' : '12px' }}>
            {typeof rubric.levelsCount === 'number' ? rubric.levelsCount : 0}N
          </Tag>
          <Tag color="orange" style={{ fontSize: isMobile ? '10px' : '12px' }}>
            {typeof rubric.maxScore === 'number' ? rubric.maxScore : 0}pts
          </Tag>
        </div>
      </div>

      {/* Compartir con nuevos profesores */}
      <div className="mb-4">
        <Title level={5} style={{ fontSize: isMobile ? '14px' : '16px' }}>
          Compartir con profesores
        </Title>
        <Form
          form={form}
          onFinish={handleShare}
          layout="vertical"
        >
          <Form.Item
            name="teacherIds"
            label={isMobile ? 'Profesores' : 'Seleccionar profesores'}
            rules={[{ required: true, message: 'Selecciona al menos un profesor' }]}
          >
            <Select
              mode="multiple"
              placeholder="Buscar profesores..."
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              disabled={availableColleagues.length === 0}
            >
              {availableColleagues.map(colleague => (
                <Option key={colleague.id} value={colleague.id}>
                  {isMobile ? (
                    <span>{colleague.name}</span>
                  ) : (
                    <Space>
                      <Avatar size="small" icon={<UserOutlined />} />
                      <span>{colleague.name}</span>
                      <Text type="secondary">({colleague.email})</Text>
                    </Space>
                  )}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={availableColleagues.length === 0}
              icon={<ShareAltOutlined />}
              block={isMobile}
            >
              Compartir
            </Button>
          </Form.Item>
        </Form>

        {availableColleagues.length === 0 && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            No hay más profesores disponibles.
          </Text>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Lista de profesores con acceso */}
      <div>
        <Title level={5} style={{ fontSize: isMobile ? '14px' : '16px' }}>
          Con acceso ({sharedColleagues.length})
        </Title>

        {sharedColleagues.length > 0 ? (
          <List
            size={isMobile ? 'small' : 'default'}
            dataSource={sharedColleagues}
            renderItem={colleague => (
              <List.Item
                actions={[
                  <Button
                    key="remove"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleUnshare(colleague.id)}
                    loading={loading}
                    size="small"
                  >
                    {isMobile ? '' : 'Retirar'}
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar size={isMobile ? 'small' : 'default'} icon={<UserOutlined />} />}
                  title={<span style={{ fontSize: isMobile ? '13px' : '14px' }}>{colleague.name}</span>}
                  description={isMobile ? null : colleague.email}
                />
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            No compartida con ningún profesor.
          </Text>
        )}
      </div>
    </div>
  ) : null;

  // Drawer para móvil
  if (isMobile) {
    return (
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <ShareAltOutlined />
            <span className="truncate">Compartir</span>
          </div>
        }
        open={visible}
        onClose={onCancel}
        placement="bottom"
        height="80vh"
        styles={{ body: { padding: 12 } }}
        footer={
          <Button block onClick={onCancel}>
            Cerrar
          </Button>
        }
      >
        {sharingContent}
      </Drawer>
    );
  }

  // Modal para desktop
  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined />
          <span>Compartir Rúbrica: {rubric?.name}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Cerrar
        </Button>
      ]}
      width={600}
    >
      {sharingContent}
    </Modal>
  );
};

export default RubricSharingModal;