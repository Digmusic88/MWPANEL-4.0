import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Popconfirm,
  Tag,
  Drawer,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  BookOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '@services/apiClient';
import InteractiveButton from '@components/animations/InteractiveButton';
import ScrollReveal from '@components/animations/ScrollReveal';
import FadeInUp from '@components/animations/FadeInUp';
import AnimatedModal from '@components/animations/AnimatedModal';
import AnimatedDrawer from '@components/animations/AnimatedDrawer';
import { useResponsive } from '../../hooks/useResponsive';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface EducationalLevel {
  id: string;
  name: string;
  code: string;
  description?: string;
  cycles?: Array<{
    id: string;
    name: string;
  }>;
}

const EducationalLevelsPage: React.FC = () => {
  const [educationalLevels, setEducationalLevels] = useState<EducationalLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [editingLevel, setEditingLevel] = useState<EducationalLevel | null>(null);
  const [viewingLevel, setViewingLevel] = useState<EducationalLevel | null>(null);
  const [form] = Form.useForm();
  const { isMobile } = useResponsive();

  // Fetch educational levels
  const fetchEducationalLevels = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/educational-levels');
      setEducationalLevels(response.data);
    } catch (error) {
      message.error('Error al cargar niveles educativos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEducationalLevels();
  }, []);

  // Table columns
  const columns: ColumnsType<EducationalLevel> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: EducationalLevel) => (
        <Space>
          <BookOutlined className="text-blue-500" />
          <div>
            <div className="font-medium">{text}</div>
            <Text type="secondary" className="text-xs">
              Código: {record.code}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Código',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <Tag color="blue" className="font-mono">
          {code}
        </Tag>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => (
        <Text type="secondary" className="text-sm">
          {description || 'Sin descripción'}
        </Text>
      ),
    },
    {
      title: 'Ciclos',
      dataIndex: 'cycles',
      key: 'cycles',
      render: (cycles: any[]) => (
        <Text type="secondary" className="text-sm">
          {cycles?.length || 0} ciclo(s)
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record: EducationalLevel) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewLevel(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditLevel(record)}
          />
          <Popconfirm
            title="¿Estás seguro?"
            description="Se eliminará este nivel educativo"
            onConfirm={() => handleDeleteLevel(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Handlers
  const handleViewLevel = (level: EducationalLevel) => {
    setViewingLevel(level);
    setIsDetailDrawerVisible(true);
  };

  const handleEditLevel = (level: EducationalLevel) => {
    setEditingLevel(level);
    form.setFieldsValue({
      name: level.name,
      code: level.code,
      description: level.description,
    });
    setIsModalVisible(true);
  };

  const handleDeleteLevel = async (levelId: string) => {
    try {
      await apiClient.delete(`/educational-levels/${levelId}`);
      message.success('Nivel educativo eliminado correctamente');
      fetchEducationalLevels();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al eliminar nivel educativo');
    }
  };

  const handleAddLevel = () => {
    setEditingLevel(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingLevel) {
        // Update level
        await apiClient.patch(`/educational-levels/${editingLevel.id}`, values);
        message.success('Nivel educativo actualizado correctamente');
      } else {
        // Create new level
        await apiClient.post('/educational-levels', values);
        message.success('Nivel educativo creado correctamente');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchEducationalLevels();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al guardar nivel educativo');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingLevel(null);
  };

  const handleDetailDrawerClose = () => {
    setIsDetailDrawerVisible(false);
    setViewingLevel(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeInUp>
        <div className="flex justify-between items-center">
          <div>
            <Title level={2} className="!mb-2">
              Niveles Educativos
            </Title>
            <Text type="secondary">
              Gestiona los niveles educativos del centro
            </Text>
          </div>
          <InteractiveButton
            variant="primary"
            icon={<PlusOutlined />}
            onClick={handleAddLevel}
          >
            Nuevo Nivel
          </InteractiveButton>
        </div>
      </FadeInUp>

      {/* Educational Levels Table */}
      <ScrollReveal direction="up" delay={0.2}>
        <Card>
          <Table
            columns={columns}
            dataSource={educationalLevels}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} de ${total} niveles`,
            }}
          />
        </Card>
      </ScrollReveal>

      {/* Level Details Drawer */}
      <AnimatedDrawer
        animationType="slide"
        title="Detalles del Nivel Educativo"
        placement="right"
        size={isMobile ? 'default' : 'large'}
        width={isMobile ? '100%' : 720}
        onClose={handleDetailDrawerClose}
        open={isDetailDrawerVisible}
        extra={
          viewingLevel && (
            <Space>
              <InteractiveButton
                variant="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  handleDetailDrawerClose();
                  handleEditLevel(viewingLevel);
                }}
              >
                Editar
              </InteractiveButton>
            </Space>
          )
        }
      >
        {viewingLevel && (
          <div className="space-y-6">
            {/* Level Header */}
            <div className="text-center border-b pb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOutlined className="text-3xl text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {viewingLevel.name}
              </h2>
              <Tag color="blue" className="text-sm font-mono">
                {viewingLevel.code}
              </Tag>
            </div>

            {/* Level Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Información General</h3>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Nombre</Text>
                    <div className="font-medium">{viewingLevel.name}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Código</Text>
                    <div className="font-medium">
                      <Tag color="blue" className="font-mono">
                        {viewingLevel.code}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col span={24}>
                  <div>
                    <Text type="secondary">Descripción</Text>
                    <div className="font-medium">
                      {viewingLevel.description || 'Sin descripción'}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Cycles Information */}
            {viewingLevel.cycles && viewingLevel.cycles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Ciclos Asociados</h3>
                <Space wrap>
                  {viewingLevel.cycles.map((cycle) => (
                    <Tag key={cycle.id} color="purple">
                      {cycle.name}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            <Divider />

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
              <Space direction="vertical" className="w-full">
                <Button
                  type="default"
                  block
                  icon={<SettingOutlined />}
                  onClick={() => message.info('Gestión de ciclos en desarrollo')}
                >
                  Gestionar Ciclos
                </Button>
              </Space>
            </div>
          </div>
        )}
      </AnimatedDrawer>

      {/* Add/Edit Level Modal */}
      <AnimatedModal
        animationType="scale"
        title={editingLevel ? 'Editar Nivel Educativo' : 'Nuevo Nivel Educativo'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es requerido' }]}
          >
            <Input placeholder="Ej: Educación Primaria" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Código"
            rules={[{ required: true, message: 'El código es requerido' }]}
          >
            <Select placeholder="Selecciona un código">
              <Option value="INFANTIL">INFANTIL</Option>
              <Option value="PRIMARIA">PRIMARIA</Option>
              <Option value="SECUNDARIA">SECUNDARIA</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Descripción"
          >
            <TextArea
              rows={4}
              placeholder="Descripción del nivel educativo"
            />
          </Form.Item>

          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-end gap-2'} mt-6`}>
            <InteractiveButton
              variant="secondary"
              onClick={handleCancel}
              className={isMobile ? 'w-full' : ''}
            >
              Cancelar
            </InteractiveButton>
            <InteractiveButton
              variant="primary"
              onClick={form.submit}
              className={isMobile ? 'w-full' : ''}
            >
              {editingLevel ? 'Actualizar' : 'Crear'} Nivel
            </InteractiveButton>
          </div>
        </Form>
      </AnimatedModal>
    </div>
  );
};

export default EducationalLevelsPage;