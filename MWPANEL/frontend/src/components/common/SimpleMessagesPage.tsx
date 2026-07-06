import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Typography, Alert } from 'antd';
import { MessageOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const SimpleMessagesPage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    console.log('🔔 SIMPLE MESSAGES: Component mounted');
    console.log('🔔 SIMPLE MESSAGES: Location:', location);
    console.log('🔔 SIMPLE MESSAGES: Search params:', location.search);
    
    const urlParams = new URLSearchParams(location.search);
    const messageId = urlParams.get('messageId');
    console.log('🔔 SIMPLE MESSAGES: MessageId:', messageId);
  }, [location]);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <MessageOutlined /> Simple Messages Page
      </Title>
      
      <Alert
        message="✅ Messages Page Loading Successfully"
        description="This simplified version is working correctly."
        type="success"
        showIcon
        style={{ marginBottom: '24px' }}
      />
      
      <Card title="Debug Information" style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Text strong>Current URL:</Text>
          <br />
          <Text code>{window.location.href}</Text>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <Text strong>Search Parameters:</Text>
          <br />
          <Text code>{location.search || 'None'}</Text>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <Text strong>MessageId Parameter:</Text>
          <br />
          <Text code>{new URLSearchParams(location.search).get('messageId') || 'None'}</Text>
        </div>
      </Card>

      <Card title="Next Steps">
        <Text>
          Si ves esta página, significa que el routing funciona correctamente. 
          El problema está en el componente MessagesPage original.
        </Text>
      </Card>
    </div>
  );
};

export default SimpleMessagesPage;