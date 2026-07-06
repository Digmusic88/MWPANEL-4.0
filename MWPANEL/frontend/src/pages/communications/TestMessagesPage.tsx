import React from 'react';
import { Card, Typography, Alert } from 'antd';
import { MessageOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const TestMessagesPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <MessageOutlined /> Test Communications Page
      </Title>
      
      <Alert
        message="Test Page Loading Successfully"
        description="This is a simple test page to verify routing is working correctly."
        type="success"
        showIcon
        style={{ marginBottom: '24px' }}
      />
      
      <Card title="Debug Information">
        <div>
          <Text strong>Current URL:</Text>
          <br />
          <Text code>{window.location.href}</Text>
        </div>
        <div style={{ marginTop: '16px' }}>
          <Text strong>URL Parameters:</Text>
          <br />
          <Text code>{window.location.search}</Text>
        </div>
        <div style={{ marginTop: '16px' }}>
          <Text strong>MessageId Parameter:</Text>
          <br />
          <Text code>{new URLSearchParams(window.location.search).get('messageId') || 'None'}</Text>
        </div>
      </Card>
    </div>
  );
};

export default TestMessagesPage;