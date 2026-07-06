import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button, Card, Collapse, Typography } from 'antd';
import { ReloadOutlined, BugOutlined } from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class RenderErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is the specific {type, count} rendering error
    if (error.message && error.message.includes('Objects are not valid as a React child')) {
      console.error('🚨 Caught React child rendering error:', error);
      
      // Try to extract information about the problematic object
      const match = error.message.match(/found: object with keys \{([^}]+)\}/);
      if (match) {
        console.error('🔍 Problematic object keys:', match[1]);
      }
    }
    
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 RenderErrorBoundary caught error:', error);
    console.error('📍 Component stack:', errorInfo.componentStack);
    
    // Log to external service if needed
    this.logErrorToService(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // You can send this to your error tracking service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    // For now, just log to console
    console.log('🚨 Error logged:', errorData);
    
    // Check if this is the {type, count} error
    if (error.message && error.message.includes('Objects are not valid as a React child')) {
      console.warn('💡 This appears to be an object rendering error. Check for places where objects are being rendered directly in JSX.');
      console.warn('💡 Common culprits: API responses, statistics data, count objects');
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="m-4">
          <Alert
            message="Error de Renderizado"
            description="Se ha producido un error al renderizar este componente."
            type="error"
            showIcon
            icon={<BugOutlined />}
            className="mb-4"
          />
          
          <div className="mb-4">
            <Title level={4}>¿Qué ha ocurrido?</Title>
            <Paragraph>
              {error?.message || 'Error desconocido'}
            </Paragraph>
            
            {error?.message?.includes('Objects are not valid as a React child') && (
              <Alert
                message="Problema Detectado"
                description="Se intentó renderizar un objeto directamente. Esto suele ocurrir cuando se intenta mostrar datos de una API sin procesarlos correctamente."
                type="warning"
                showIcon
                className="mb-2"
              />
            )}
          </div>

          <div className="mb-4">
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={this.handleReset}
            >
              Reintentar
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && errorInfo && (
            <Collapse>
              <Panel header="Detalles técnicos (Solo desarrollo)" key="1">
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                  <Text code>{error?.stack}</Text>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px', marginTop: '10px' }}>
                  <Text type="secondary">Component Stack:</Text>
                  <br />
                  <Text code>{errorInfo.componentStack}</Text>
                </div>
              </Panel>
            </Collapse>
          )}
        </Card>
      );
    }

    return this.props.children;
  }
}

export default RenderErrorBoundary;