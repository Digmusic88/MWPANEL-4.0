/**
 * Error Boundary específico para el sistema de carpetas
 * Captura errores de race conditions y propiedades undefined
 */

import React from 'react';
import { Alert, Button, Card, Space } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';

interface FoldersErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface FoldersErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

export class FoldersErrorBoundary extends React.Component<
  FoldersErrorBoundaryProps,
  FoldersErrorBoundaryState
> {
  constructor(props: FoldersErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FoldersErrorBoundaryState {
    console.error('🚨 FOLDERS ERROR BOUNDARY: Error captured', error);
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 FOLDERS ERROR BOUNDARY: Full error details', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo
    });

    // If it's the specific "Cannot read properties of undefined (reading 'id')" error,
    // log additional debugging info
    if (error.message.includes("Cannot read properties of undefined (reading 'id')")) {
      console.error('🔍 SPECIFIC ID ACCESS ERROR: This is the race condition error we\'ve been tracking');
    }
  }

  handleRetry = () => {
    console.log('🔄 FOLDERS ERROR BOUNDARY: User requested retry');
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    console.log('🔄 FOLDERS ERROR BOUNDARY: Full page reload requested');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = "Error en Sistema de Carpetas" } = this.props;
      
      return (
        <Card style={{ margin: '16px 0' }}>
          <Alert
            message={fallbackTitle}
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  Se ha producido un error temporal en el sistema de carpetas. 
                  Esto puede deberse a una condición de carrera en la carga de datos.
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  <strong>Error técnico:</strong> {this.state.error?.message}
                </div>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />}
                    onClick={this.handleRetry}
                  >
                    Reintentar
                  </Button>
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={this.handleReload}
                  >
                    Recargar Página
                  </Button>
                </Space>
              </Space>
            }
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
          />
        </Card>
      );
    }

    return this.props.children;
  }
}

export default FoldersErrorBoundary;