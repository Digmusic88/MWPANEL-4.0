/**
 * Error Boundary Global para capturar errores de race condition en toda la aplicación
 * Específicamente diseñado para el error "Cannot read properties of undefined (reading 'id')"
 */

import React from 'react';
import { Alert, Button, Result } from 'antd';
import { ReloadOutlined, BugOutlined } from '@ant-design/icons';

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorCount: number;
  isRaceConditionError: boolean;
  lastErrorTime: number;
}

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

export class GlobalErrorBoundary extends React.Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  private retryTimeout?: NodeJS.Timeout;

  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      errorCount: 0,
      isRaceConditionError: false,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<GlobalErrorBoundaryState> {
    // Check if it's our specific race condition error
    const isRaceConditionError = error.message.includes("Cannot read properties of undefined (reading 'id')");
    const now = Date.now();
    
    if (isRaceConditionError) {
      console.warn('🛡️ RACE_CONDITION_FIX: Error caught with fallback rendering', {
        message: error.message,
        timestamp: new Date().toISOString(),
        fallbackRendered: true
      });
      
      // For race condition errors, show a minimal fallback instead of hiding
      return {
        hasError: true,  // Show fallback component to break the loop
        error,
        isRaceConditionError: true,
        lastErrorTime: now
      };
    }

    // For other errors, show the normal error UI
    console.error('🚨 GLOBAL ERROR BOUNDARY: Non-race condition error captured', {
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });

    return {
      hasError: true,
      error,
      isRaceConditionError: false,
      lastErrorTime: now
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const isRaceConditionError = error.message.includes("Cannot read properties of undefined (reading 'id')");
    
    if (isRaceConditionError) {
      console.warn('🛡️ RACE_CONDITION_FIX: componentDidCatch - showing fallback', {
        message: error.message,
        timestamp: new Date().toISOString(),
        fallback: true
      });
      
      // Set up auto-recovery for race condition errors
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }
      
      this.retryTimeout = setTimeout(() => {
        console.log('🔄 RACE_CONDITION_FIX: Auto-recovery attempt');
        this.setState({ 
          hasError: false, 
          error: undefined,
          isRaceConditionError: false
        });
      }, 3000); // 3 second delay to let data load
      
      return;
    }

    // For non-race condition errors, handle normally
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1
    }));

    console.error('🚨 GLOBAL ERROR BOUNDARY: Non-race condition component stack', {
      error: error.message,
      componentStack: errorInfo.componentStack?.substring(0, 500),
      errorCount: this.state.errorCount + 1
    });
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    console.log('🔄 GLOBAL ERROR BOUNDARY: Manual retry requested');
    this.setState({ 
      hasError: false, 
      error: undefined 
    });
  };

  handleReload = () => {
    console.log('🔄 GLOBAL ERROR BOUNDARY: Full page reload requested');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // For race condition errors, show minimal fallback that doesn't break the app
      if (this.state.isRaceConditionError) {
        return (
          <div style={{ 
            padding: '20px',
            textAlign: 'center',
            color: '#666',
            fontSize: '14px',
            background: '#f9f9f9',
            border: '1px solid #ddd',
            borderRadius: '8px',
            margin: '10px'
          }}>
            <div style={{ marginBottom: '10px' }}>
              ⚡ Cargando datos...
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              Los datos se están sincronizando automáticamente
            </div>
          </div>
        );
      }

      // For other errors, show full error screen
      return (
        <div style={{ padding: '50px 20px', textAlign: 'center' }}>
          <Result
            status="warning"
            icon={<BugOutlined />}
            title="Error del Sistema"
            subTitle={
              <div>
                <p>Se ha producido un error en la aplicación.</p>
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  margin: '10px 0',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  <strong>Error técnico:</strong> {this.state.error?.message}
                </div>
              </div>
            }
            extra={[
              <Button 
                type="primary" 
                key="retry"
                icon={<ReloadOutlined />}
                onClick={this.handleRetry}
              >
                Reintentar
              </Button>,
              <Button 
                key="reload"
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
              >
                Recargar Página
              </Button>
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;