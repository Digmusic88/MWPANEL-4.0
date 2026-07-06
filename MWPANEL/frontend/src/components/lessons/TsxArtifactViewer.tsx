import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Alert,
  Tabs,
  Spin,
  Typography,
  Tag,
  Row,
  Col,
  Divider,
  Tooltip,
  Badge,
  Modal,
  message,
  Upload
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  CodeOutlined,
  BugOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { Controlled as CodeMirror } from 'react-codemirror2';
import { motion, AnimatePresence } from 'framer-motion';
import { useTsxValidation } from '../../hooks/useLessons';
import type { 
  LessonResource, 
  TsxArtifactViewerProps,
  TsxValidationResult,
  TsxSandboxResult,
  SandboxConfig 
} from '../../types/lessons';

// Import CodeMirror modes and themes
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/jsx/jsx';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const TsxArtifactViewer: React.FC<TsxArtifactViewerProps> = ({
  resource,
  editing = false,
  onSave,
  onCancel
}) => {
  const [sourceCode, setSourceCode] = useState(resource.sourceCode || '');
  const [isRunning, setIsRunning] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [componentProps, setComponentProps] = useState<Record<string, any>>(
    resource.componentProps || {}
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [autoFixApplied, setAutoFixApplied] = useState(false);
  
  const sandboxRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-fix problematic code when component loads
  useEffect(() => {
    const autoFixCodeIfNeeded = async () => {
      if (autoFixApplied || !sourceCode || sourceCode.length < 50) return;
      
      try {
        // Import auto-fixer dynamically
        const { autoFixTsxCode } = await import('../../utils/tsxAutoFixer');
        
        // Check if code needs auto-fixing (has common problematic patterns)
        const needsFix = sourceCode.includes('setTimeout') ||
                        sourceCode.includes('window.') ||
                        sourceCode.includes('document.') ||
                        sourceCode.includes('lucide-react') ||
                        sourceCode.includes('alert(') ||
                        !sourceCode.includes('import React');
        
        if (needsFix) {
          console.log('🔧 TsxArtifactViewer: Applying auto-fixes to existing resource');
          
          const autoFixResult = autoFixTsxCode(sourceCode);
          
          if (autoFixResult.wasFixed) {
            console.log('🔧 Auto-fixes applied:', autoFixResult.fixesApplied);
            setSourceCode(autoFixResult.fixedCode!);
            setAutoFixApplied(true);
            
            // Show success message with applied fixes
            Modal.success({
              title: '🔧 Código TSX Auto-Corregido',
              width: 600,
              content: (
                <div>
                  <p>Se han aplicado correcciones automáticas al código existente:</p>
                  <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                    {autoFixResult.fixesApplied.map((fix, index) => (
                      <li key={index} style={{ color: '#52c41a', marginBottom: 4 }}>
                        ✅ {fix}
                      </li>
                    ))}
                  </ul>
                  <p style={{ marginTop: 12, color: '#666' }}>
                    El código ahora es compatible con MW Panel. Puedes guardarlo para aplicar los cambios permanentemente.
                  </p>
                </div>
              ),
              okText: 'Entendido'
            });
          }
        }
      } catch (error) {
        console.error('Error applying auto-fixes:', error);
      }
    };
    
    // Apply auto-fixes after a short delay to ensure component is fully loaded
    const timer = setTimeout(autoFixCodeIfNeeded, 500);
    return () => clearTimeout(timer);
  }, [sourceCode, autoFixApplied]);

  const {
    validation,
    testing,
    testResult,
    validateCode,
    testInSandbox,
    generateSandboxConfig
  } = useTsxValidation();

  // Auto-validate code when it changes
  useEffect(() => {
    if (sourceCode) {
      const timeoutId = setTimeout(() => {
        validateCode(sourceCode, resource.dependencies);
      }, 1000); // Debounce validation

      return () => clearTimeout(timeoutId);
    }
  }, [sourceCode, resource.dependencies, validateCode]);

  // Generate sandbox config based on code
  const sandboxConfig = useMemo<SandboxConfig>(() => {
    return {
      allowNetworkRequests: false,
      allowLocalStorage: false,
      maxExecutionTime: 5000,
      allowedDomains: [],
      memoryLimit: 64 * 1024 * 1024,
      ...resource.sandboxConfig
    };
  }, [resource.sandboxConfig]);

  const handleRunCode = async () => {
    if (!sourceCode) {
      message.warning('No hay código para ejecutar');
      return;
    }

    if (validation && !validation.isValid) {
      message.error('El código contiene errores. Corrígelos antes de ejecutar.');
      return;
    }

    setIsRunning(true);
    try {
      await testInSandbox(sourceCode, componentProps, sandboxConfig);
      message.success('Código ejecutado exitosamente');
    } catch (error) {
      message.error('Error al ejecutar el código');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = () => {
    if (validation && !validation.isValid) {
      Modal.confirm({
        title: 'Código con errores',
        content: 'El código contiene errores. ¿Estás seguro de que quieres guardarlo?',
        okText: 'Guardar de todos modos',
        cancelText: 'Cancelar',
        onOk: () => onSave?.(sourceCode)
      });
    } else {
      onSave?.(sourceCode);
    }
  };

  // File upload handlers
  const handleFileUpload = (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.tsx') && !file.name.endsWith('.ts') && !file.name.endsWith('.jsx')) {
      message.error('Por favor selecciona un archivo .tsx, .ts o .jsx');
      return false;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      message.error('El archivo no puede ser mayor a 1MB');
      return false;
    }

    setUploadedFile(file);
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setSourceCode(content);
        message.success(`Archivo ${file.name} cargado correctamente`);
      } else {
        message.error('Error al leer el archivo');
      }
    };
    reader.onerror = () => {
      message.error('Error al leer el archivo');
    };
    reader.readAsText(file);
    
    return false; // Prevent upload
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    message.info('Archivo removido');
  };

  const getValidationStatusIcon = (validation: TsxValidationResult | null) => {
    if (!validation) return <ClockCircleOutlined className="text-gray-400" />;
    
    if (!validation.isValid) {
      return <ExclamationCircleOutlined className="text-red-500" />;
    }
    
    if (validation.warnings.length > 0) {
      return <WarningOutlined className="text-yellow-500" />;
    }
    
    return <CheckCircleOutlined className="text-green-500" />;
  };

  const getValidationStatusText = (validation: TsxValidationResult | null) => {
    if (!validation) return 'Validando...';
    
    if (!validation.isValid) {
      return `${validation.errors.length + validation.securityIssues.length} errores`;
    }
    
    if (validation.warnings.length > 0) {
      return `${validation.warnings.length} advertencias`;
    }
    
    return 'Código válido';
  };

  const renderValidationResults = () => {
    if (!validation) return null;

    return (
      <div className="space-y-4">
        {/* Security Issues */}
        {validation.securityIssues.length > 0 && (
          <Alert
            type="error"
            showIcon
            message="Problemas de Seguridad"
            description={
              <ul className="mt-2 mb-0">
                {validation.securityIssues.map((issue, index) => (
                  <li key={index} className="text-sm">{issue}</li>
                ))}
              </ul>
            }
          />
        )}

        {/* Errors */}
        {validation.errors.length > 0 && (
          <Alert
            type="error"
            showIcon
            message="Errores"
            description={
              <ul className="mt-2 mb-0">
                {validation.errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            }
          />
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="Advertencias"
            description={
              <ul className="mt-2 mb-0">
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="text-sm">{warning}</li>
                ))}
              </ul>
            }
          />
        )}

        {/* Dependencies */}
        {validation.dependencies.length > 0 && (
          <div>
            <Text strong className="block mb-2">Dependencias detectadas:</Text>
            <Space wrap>
              {validation.dependencies.map((dep, index) => (
                <Tag key={index} color="blue">{dep}</Tag>
              ))}
            </Space>
          </div>
        )}

        {/* Exported Component */}
        {validation.exportedComponent && (
          <div>
            <Text strong>Componente exportado:</Text>
            <Tag color="green" className="ml-2">{validation.exportedComponent}</Tag>
          </div>
        )}
      </div>
    );
  };

  const renderSandboxResults = () => {
    if (!testResult) return null;

    return (
      <div className="space-y-4">
        <Alert
          type={testResult.success ? 'success' : 'error'}
          showIcon
          message={testResult.success ? 'Ejecución Exitosa' : 'Error de Ejecución'}
          description={
            <div>
              {testResult.error && (
                <div className="mb-2">
                  <Text code className="text-red-600">{testResult.error}</Text>
                </div>
              )}
              <div className="text-sm text-gray-600">
                Tiempo de ejecución: {testResult.executionTime}ms
              </div>
              {testResult.output && (
                <div className="mt-2">
                  <Text strong>Salida:</Text>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-sm overflow-auto">
                    {JSON.stringify(testResult.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          }
        />
      </div>
    );
  };

  const renderPreview = () => {
    if (!testResult || !testResult.success) {
      return (
        <div className="h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <CodeOutlined className="text-4xl text-gray-400 mb-4" />
            <Text type="secondary">
              {testResult?.error ? 'Error en el código' : 'Ejecuta el código para ver la vista previa'}
            </Text>
            {!testing && (
              <div className="mt-4">
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />}
                  onClick={handleRunCode}
                  disabled={validation && !validation.isValid}
                >
                  Ejecutar Código
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <div 
          ref={sandboxRef}
          className="border rounded-lg p-4 bg-white min-h-64"
          style={{ 
            maxHeight: fullscreen ? 'calc(100vh - 200px)' : '400px',
            overflow: 'auto'
          }}
        >
          {/* Aquí se renderizaría el componente React real */}
          <div className="flex items-center justify-center h-32 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="text-center">
              <CheckCircleOutlined className="text-green-500 text-3xl mb-2" />
              <Text>Componente renderizado exitosamente</Text>
              <div className="mt-2 text-xs text-gray-500">
                Simulación - En producción se renderizará el componente real
              </div>
            </div>
          </div>
        </div>

        {/* Overlay controls */}
        <div className="absolute top-4 right-4 space-x-2">
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRunCode}
            loading={testing}
          >
            Recargar
          </Button>
          <Button
            size="small"
            icon={<FullscreenOutlined />}
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? 'Minimizar' : 'Pantalla completa'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={fullscreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}
    >
      <Card
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CodeOutlined className="text-blue-600" />
              <div>
                <Title level={4} className="mb-0">
                  {resource.name}
                </Title>
                <Text type="secondary" className="text-sm">
                  Componente TSX Interactivo
                </Text>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Validation status */}
              <Tooltip title={getValidationStatusText(validation)}>
                <Badge 
                  status={validation?.isValid ? 'success' : 'error'}
                  text={getValidationStatusIcon(validation)}
                />
              </Tooltip>

              {/* Security indicator */}
              <Tooltip title="Entorno seguro">
                <SafetyOutlined className="text-green-600" />
              </Tooltip>

              {/* Actions */}
              {editing && (
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    disabled={validation && validation.securityIssues.length > 0}
                  >
                    Guardar
                  </Button>
                  <Button
                    icon={<CloseOutlined />}
                    onClick={onCancel}
                  >
                    Cancelar
                  </Button>
                </Space>
              )}
              
              {!editing && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {/* Handle edit mode */}}
                >
                  Editar
                </Button>
              )}
            </div>
          </div>
        }
        className={fullscreen ? 'h-full' : ''}
        bodyStyle={{ height: fullscreen ? 'calc(100% - 64px)' : 'auto' }}
      >
        <Row gutter={24} className={fullscreen ? 'h-full' : ''}>
          {/* Code Editor */}
          <Col span={editing ? 12 : 0} className={fullscreen ? 'h-full' : ''}>
            <AnimatePresence>
              {editing && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '100%', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={fullscreen ? 'h-full' : ''}
                >
                  <Card 
                    title="Editor de Código" 
                    size="small"
                    className={fullscreen ? 'h-full' : ''}
                    bodyStyle={{ height: fullscreen ? 'calc(100% - 40px)' : '400px', padding: 0 }}
                    extra={
                      <Space>
                        <Upload
                          accept=".tsx,.ts,.jsx"
                          beforeUpload={handleFileUpload}
                          maxCount={1}
                          showUploadList={false}
                          fileList={[]}
                        >
                          <Button size="small" icon={<UploadOutlined />}>
                            Subir archivo
                          </Button>
                        </Upload>
                        {uploadedFile && (
                          <Tooltip title={`Archivo cargado: ${uploadedFile.name}`}>
                            <Tag 
                              color="green" 
                              closable 
                              onClose={handleRemoveFile}
                              style={{ margin: 0 }}
                            >
                              {uploadedFile.name}
                            </Tag>
                          </Tooltip>
                        )}
                      </Space>
                    }
                  >
                    <CodeMirror
                      value={sourceCode}
                      options={{
                        mode: 'jsx',
                        theme: 'material',
                        lineNumbers: true,
                        autoCloseBrackets: true,
                        matchBrackets: true,
                        foldGutter: true,
                        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
                        tabSize: 2,
                        indentUnit: 2,
                        lineWrapping: true
                      }}
                      onBeforeChange={(editor, data, value) => {
                        setSourceCode(value);
                      }}
                    />
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </Col>

          {/* Preview and Results */}
          <Col span={editing ? 12 : 24} className={fullscreen ? 'h-full' : ''}>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              className={fullscreen ? 'h-full' : ''}
              tabBarExtraContent={
                <Space>
                  <Button
                    type={isRunning ? 'default' : 'primary'}
                    icon={isRunning ? <StopOutlined /> : <PlayCircleOutlined />}
                    onClick={handleRunCode}
                    loading={testing}
                    disabled={validation && !validation.isValid}
                  >
                    {isRunning ? 'Detener' : 'Ejecutar'}
                  </Button>
                </Space>
              }
            >
              <TabPane tab="Vista Previa" key="preview">
                <div className={fullscreen ? 'h-full overflow-auto' : ''}>
                  {renderPreview()}
                </div>
              </TabPane>

              <TabPane 
                tab={
                  <Space>
                    Validación
                    {validation && (
                      <Badge 
                        count={validation.errors.length + validation.securityIssues.length}
                        size="small"
                        status={validation.isValid ? 'success' : 'error'}
                      />
                    )}
                  </Space>
                } 
                key="validation"
              >
                <div className={fullscreen ? 'h-full overflow-auto' : ''}>
                  {renderValidationResults()}
                </div>
              </TabPane>

              <TabPane tab="Resultados de Prueba" key="testing">
                <div className={fullscreen ? 'h-full overflow-auto' : ''}>
                  {renderSandboxResults()}
                </div>
              </TabPane>

              <TabPane tab="Configuración" key="config">
                <div className={fullscreen ? 'h-full overflow-auto' : ''}>
                  <div className="space-y-4">
                    <div>
                      <Text strong className="block mb-2">Configuración del Sandbox:</Text>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {JSON.stringify(sandboxConfig, null, 2)}
                      </pre>
                    </div>

                    <Divider />

                    <div>
                      <Text strong className="block mb-2">Props del Componente:</Text>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {JSON.stringify(componentProps, null, 2)}
                      </pre>
                    </div>

                    <Divider />

                    <div>
                      <Text strong className="block mb-2">Dependencias:</Text>
                      <Space wrap>
                        {resource.dependencies?.map((dep, index) => (
                          <Tag key={index} color="blue">{dep}</Tag>
                        )) || <Text type="secondary">No hay dependencias</Text>}
                      </Space>
                    </div>
                  </div>
                </div>
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </Card>
    </motion.div>
  );
};

export default TsxArtifactViewer;