import React, { useState, useEffect } from 'react';
import {
  Layout,
  Tabs,
  Card,
  Typography,
  Space,
  Button,
  Statistic,
  Row,
  Col,
  Alert,
  Spin,
} from 'antd';
import {
  InboxOutlined,
  SendOutlined,
  TeamOutlined,
  BookOutlined,
  ShareAltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import SharedNotesView from '../../components/student-notes/SharedNotesView';
import studentNotesApi from '../../services/studentNotesApi';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const SharedNotesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('received');
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setLoading(true);
        const stats = await studentNotesApi.getStatistics();
        setStatistics(stats);
      } catch (error) {
        console.error('Error loading shared notes statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, []);

  const tabItems = [
    {
      key: 'received',
      label: (
        <Space>
          <InboxOutlined />
          <span>Compartidos Conmigo</span>
        </Space>
      ),
      children: <SharedNotesView type="received" />,
    },
    {
      key: 'sent',
      label: (
        <Space>
          <SendOutlined />
          <span>Que He Compartido</span>
        </Space>
      ),
      children: <SharedNotesView type="sent" />,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
              <ShareAltOutlined style={{ marginRight: 12 }} />
              Apuntes Compartidos
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Gestiona los apuntes que has compartido y los que han compartido contigo
            </Text>
          </div>

          {/* Info Cards */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card>
                  <Spin spinning={loading}>
                    <Statistic
                      title="Total Recibidos"
                      value={statistics?.sharedStats?.received || 0}
                      prefix={<InboxOutlined style={{ color: '#52c41a' }} />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Spin>
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card>
                  <Spin spinning={loading}>
                    <Statistic
                      title="Total Enviados"
                      value={statistics?.sharedStats?.sent || 0}
                      prefix={<SendOutlined style={{ color: '#1890ff' }} />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Spin>
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card>
                  <Spin spinning={loading}>
                    <Statistic
                      title="De Compañeros"
                      value={statistics?.sharedStats?.classmates || 0}
                      prefix={<TeamOutlined style={{ color: '#faad14' }} />}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Spin>
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card>
                  <Spin spinning={loading}>
                    <Statistic
                      title="De Profesores"
                      value={statistics?.sharedStats?.teachers || 0}
                      prefix={<UserOutlined style={{ color: '#722ed1' }} />}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Spin>
                </Card>
              </motion.div>
            </Col>
          </Row>

          {/* Información útil */}
          <Alert
            message="Consejos para compartir apuntes"
            description={
              <div>
                <p><strong>📤 Para compartir:</strong> Ve a "Mis Apuntes", selecciona un apunte público y haz clic en "Compartir"</p>
                <p><strong>👥 Compañeros:</strong> Solo puedes compartir con compañeros de tus mismas clases</p>
                <p><strong>👨‍🏫 Profesores:</strong> Puedes compartir con cualquier profesor que te imparta clases</p>
                <p><strong>⏰ Expiración:</strong> Los apuntes pueden tener fecha de expiración opcional</p>
              </div>
            }
            type="info"
            showIcon
            closable
            style={{ marginBottom: 24 }}
          />

          {/* Tabs con el contenido */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
              items={tabItems}
              style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '16px',
              }}
            />
          </motion.div>
        </motion.div>
      </Content>
    </Layout>
  );
};

export default SharedNotesPage;