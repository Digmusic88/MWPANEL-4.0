import React from 'react';
import { Alert, Card, Typography, Button } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import MessagesPage from '../../pages/communications/MessagesPage';
// import MessagesPage from '../../pages/communications/MessagesPageSimpleBulk';

const { Title, Text } = Typography;

interface State {
  hasError: boolean;
  error: Error | null;
}

class SafeMessagesPage extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🔔 NOTIFICATION NAV: Error in MessagesPage:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔔 NOTIFICATION NAV: MessagesPage error details:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px' }}>
          <Title level={2}>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> Error en Communications
          </Title>
          
          <Alert
            message="Error en la página de comunicaciones"
            description={`Ocurrió un error al cargar la página de mensajes: ${this.state.error?.message || 'Error desconocido'}`}
            type="error"
            showIcon
            style={{ marginBottom: '24px' }}
            action={
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                onClick={this.handleRetry}
              >
                Reintentar
              </Button>
            }
          />
          
          <Card title="Información de Debug">
            <div>
              <Text strong>URL actual:</Text>
              <br />
              <Text code>{window.location.href}</Text>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Text strong>Parámetros URL:</Text>
              <br />
              <Text code>{window.location.search}</Text>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Text strong>MessageId:</Text>
              <br />
              <Text code>{new URLSearchParams(window.location.search).get('messageId') || 'None'}</Text>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Text strong>Error técnico:</Text>
              <br />
              <pre style={{ backgroundColor: '#f5f5f5', padding: '8px', fontSize: '12px' }}>
                {this.state.error?.stack || 'No stack trace available'}
              </pre>
            </div>
          </Card>
        </div>
      );
    }

    try {
      return <MessagesPage />;
    } catch (error) {
      console.error('🔔 NOTIFICATION NAV: Render error in MessagesPage:', error);
      // This will trigger componentDidCatch in the next render
      throw error;
    }
  }
}

export default SafeMessagesPage;