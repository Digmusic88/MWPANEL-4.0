import React, { useState, useEffect } from 'react';
import { Button, Card, List, Space, Tag, Typography, Switch } from 'antd';
import { BugOutlined, CloseOutlined, ClearOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface DetectedIssue {
  id: string;
  timestamp: Date;
  type: 'object-render' | 'type-count' | 'suspicious';
  component: string;
  data: any;
  stackTrace?: string;
}

const DiagnosticOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [issues, setIssues] = useState<DetectedIssue[]>([]);
  const [autoShow, setAutoShow] = useState(true);

  useEffect(() => {
    // Listen for console errors
    const originalError = console.error;
    console.error = function(...args) {
      const message = args[0];
      if (typeof message === 'string' && 
          (message.includes('INTERCEPTED {type, count} OBJECT') ||
           message.includes('Objects are not valid as a React child'))) {
        
        const issue: DetectedIssue = {
          id: Date.now().toString(),
          timestamp: new Date(),
          type: message.includes('{type, count}') ? 'type-count' : 'object-render',
          component: extractComponentName(message),
          data: args[1] || {},
        };

        setIssues(prev => [...prev, issue]);
        
        if (autoShow) {
          setVisible(true);
        }
      }
      
      return originalError.apply(console, args);
    };

    // Cleanup
    return () => {
      console.error = originalError;
    };
  }, [autoShow]);

  const extractComponentName = (message: string): string => {
    const match = message.match(/in component (\w+)/);
    return match ? match[1] : 'Unknown';
  };

  const clearIssues = () => {
    setIssues([]);
  };

  if (!visible && issues.length === 0) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
      }}>
        <Button
          type="primary"
          danger
          shape="circle"
          icon={<BugOutlined />}
          size="large"
          onClick={() => setVisible(true)}
          title="Open Diagnostic Panel"
        />
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 400,
      maxHeight: '80vh',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    }}>
      <Card
        title={
          <Space>
            <BugOutlined style={{ color: '#ff4d4f' }} />
            <Text strong>Diagnostic Panel</Text>
            <Tag color="error">{issues.length} issues</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={clearIssues}
              title="Clear all issues"
            />
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setVisible(false)}
              title="Close panel"
            />
          </Space>
        }
        bodyStyle={{ maxHeight: '60vh', overflow: 'auto' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">Auto-show on detection:</Text>
            <Switch
              checked={autoShow}
              onChange={setAutoShow}
              size="small"
              style={{ marginLeft: 8 }}
            />
          </div>

          {issues.length === 0 ? (
            <Text type="secondary">No rendering issues detected yet.</Text>
          ) : (
            <List
              dataSource={issues}
              renderItem={(issue) => (
                <List.Item key={issue.id}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Tag color={issue.type === 'type-count' ? 'error' : 'warning'}>
                        {issue.type}
                      </Tag>
                      <Text strong>{issue.component}</Text>
                      <Text type="secondary">
                        {issue.timestamp.toLocaleTimeString()}
                      </Text>
                    </Space>
                    
                    {issue.data && (
                      <div style={{
                        backgroundColor: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        overflow: 'auto',
                      }}>
                        {JSON.stringify(issue.data, null, 2)}
                      </div>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          )}

          <div style={{ marginTop: 16 }}>
            <Title level={5}>Quick Fix Suggestions:</Title>
            <ul style={{ marginLeft: 20, fontSize: 12 }}>
              <li>Check API responses for {'{type, count}'} objects</li>
              <li>Use SafeRender component for dynamic content</li>
              <li>Ensure statistics data is properly destructured</li>
              <li>Check Badge components for object counts</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default DiagnosticOverlay;