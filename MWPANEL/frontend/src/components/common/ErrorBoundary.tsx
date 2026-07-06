/**
 * @archivo: ErrorBoundary.tsx
 * @módulo: Common Components (Boundary de Errores React)
 * @función: Captura y maneja errores React con diagnósticos avanzados
 * @crítico: SÍ - Previene crashes completos, diagnostica problemas objeto renderizado
 * @dependencias: React Class Component, Ant Design Result
 * @no_modificar: Logic de getDerivedStateFromError sin verificar edge cases
 * @relacionado_con: AppErrorBoundary.tsx, RenderErrorBoundary.tsx, SafeRender.tsx
 */

/**
 * COMPONENTE: ErrorBoundary
 * UBICACIÓN: /frontend/src/components/common/ErrorBoundary.tsx
 * FUNCIÓN: Boundary de errores con diagnósticos específicos para errores objeto renderizado
 * NO USAR PARA: Manejo de errores async (usar try/catch en componentes)
 * PROPS CRÍTICAS:
 *   - children: ReactNode - Componentes a proteger con boundary
 *   - fallback: ReactNode - UI personalizada en caso de error (opcional)
 *   - context: string - Contexto/nombre del componente para debugging
 * 
 * ERRORES DIAGNOSTICADOS ESPECÍFICAMENTE:
 * - "Objects are not valid as a React child" - Error más común del sistema
 * - Renderizado accidental de objetos en lugar de primitivos
 * - Extracción automática de keys del objeto problemático
 * - Stack de componentes detallado en development
 * 
 * CARACTERÍSTICAS DE DEBUGGING:
 * - Console logging específico para error de objetos
 * - Extracción regex de keys del objeto problemático
 * - Context tracking para localizar origen del error
 * - Component stack completo en modo development
 * - Sugerencias de solución automáticas
 * 
 * UI DE ERROR PROGRESIVA:
 * - Fallback personalizable via prop
 * - Result component de Ant Design con iconografía
 * - Botones de recuperación: "Intentar de Nuevo" y "Recargar Página"
 * - Información técnica solo en development
 * - Stack expandible con details/summary
 * 
 * FUNCIONES DE RECUPERACIÓN:
 * - handleReset(): Resetea estado interno del boundary
 * - handleReload(): Recarga página completa
 * - getDerivedStateFromError(): Captura inicial del error
 * - componentDidCatch(): Logging y diagnóstico detallado
 * 
 * DETECCIÓN Y DIAGNÓSTICO AUTOMÁTICO:
 * - Regex pattern matching para extraer object keys
 * - Logging diferenciado por tipo de error
 * - Context injection para trazabilidad
 * - Stack analysis en tiempo real
 * 
 * MODOS DE OPERACIÓN:
 * - Development: Información técnica completa + stack traces
 * - Production: UI limpia con opciones de recuperación básicas
 * - Custom Fallback: Renderiza prop fallback si se proporciona
 * 
 * INTEGRACIÓN CON SISTEMA DE DEBUGGING:
 * - Compatible con SafeRender.tsx para prevención
 * - Complementa AppErrorBoundary.tsx en app level
 * - Usado en RenderErrorBoundary.tsx para casos específicos
 * - Context tracking para ObjectDetector.tsx
 * 
 * CASOS DE USO TÍPICOS:
 * - Wrapper de componentes que manejan datos dinámicos
 * - Protección de componentes con APIs externas
 * - Boundaries en rutas/páginas críticas
 * - Testing de robustez en development
 * 
 * ESTADO ACTUAL: ✅ BOUNDARY PRODUCTION-READY
 * - Detección específica de error "Objects as React child"
 * - UI de recuperación intuitiva para usuarios
 * - Información técnica completa para developers
 * - Logging estructurado para debugging
 * - Integrado en architecture de error handling
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography, Card } from 'antd';
import { BugOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if this is the specific "Objects are not valid as a React child" error
    if (error.message.includes('Objects are not valid as a React child')) {
      console.error('🚨 FOUND THE ERROR! Object rendering issue in:', this.props.context || 'unknown component');
      console.error('Error details:', error);
      console.error('Component stack:', errorInfo.componentStack);
      
      // Try to extract more information about the object
      const match = error.message.match(/found: object with keys \{([^}]+)\}/);
      if (match) {
        console.error('Object keys that caused the error:', match[1]);
      }
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isObjectRenderingError = this.state.error?.message.includes('Objects are not valid as a React child');

      return (
        <Card style={{ margin: '20px', border: '1px solid #ff4d4f' }}>
          <Result
            status="error"
            icon={<BugOutlined />}
            title="Error de Renderizado"
            subTitle={
              isObjectRenderingError 
                ? "Se detectó un objeto siendo renderizado como elemento React"
                : "Ha ocurrido un error inesperado en la aplicación"
            }
            extra={[
              <Button key="reset" onClick={this.handleReset}>
                Intentar de Nuevo
              </Button>,
              <Button key="reload" type="primary" icon={<ReloadOutlined />} onClick={this.handleReload}>
                Recargar Página
              </Button>
            ]}
          >
            {process.env.NODE_ENV === 'development' && (
              <div style={{ textAlign: 'left', marginTop: '20px' }}>
                <Paragraph>
                  <Text strong>Contexto: </Text>
                  <Text code>{this.props.context || 'No especificado'}</Text>
                </Paragraph>
                
                <Paragraph>
                  <Text strong>Error: </Text>
                  <Text code>{this.state.error?.message}</Text>
                </Paragraph>

                {isObjectRenderingError && (
                  <Paragraph>
                    <Text strong>Solución sugerida: </Text>
                    <Text>
                      Verificar que no se estén renderizando objetos directamente. 
                      En lugar de {`{objeto}`}, usar {`{objeto.propiedad}`} o {`{JSON.stringify(objeto)}`}.
                    </Text>
                  </Paragraph>
                )}

                {this.state.errorInfo && (
                  <details style={{ marginTop: '20px' }}>
                    <summary>
                      <Text strong>Stack de Componentes (Development)</Text>
                    </summary>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: '10px', 
                      fontSize: '12px', 
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </Result>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;