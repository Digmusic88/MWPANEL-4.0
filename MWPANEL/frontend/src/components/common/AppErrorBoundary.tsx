import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Log the error but don't interfere with React rendering for {type, count} errors
    if (error.message?.includes('Objects are not valid as a React child') && 
        error.message?.includes('type') && 
        error.message?.includes('count')) {
      console.error('🚨 Caught {type, count} rendering error:', error);
      // Don't catch these errors - let them pass through
      return { hasError: false, error: null, errorInfo: null };
    }
    
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Skip catching {type, count} errors to avoid interfering
    if (error.message?.includes('Objects are not valid as a React child') && 
        error.message?.includes('type') && 
        error.message?.includes('count')) {
      console.error('Skipping error boundary for {type, count} error');
      return;
    }
    
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {

      return (
        <Result
          status="error"
          title="Oops! Algo salió mal"
          subTitle="Ha ocurrido un error inesperado. Por favor, recarga la página."
          extra={[
            <Button type="primary" onClick={this.handleReset} key="retry">
              Recargar Página
            </Button>
          ]}
        >
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{ textAlign: 'left', padding: '20px', background: '#f5f5f5', marginTop: '20px' }}>
              <h4>Error Details (Development Only):</h4>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.toString()}</pre>
              {this.state.errorInfo && (
                <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.errorInfo.componentStack}</pre>
              )}
            </div>
          )}
        </Result>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;