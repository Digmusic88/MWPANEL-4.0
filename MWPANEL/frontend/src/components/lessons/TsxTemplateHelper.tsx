import React, { useState } from 'react';
import { Modal, Button, Tabs, Card, Typography, Divider, Space, message } from 'antd';
import { 
  CodeOutlined, 
  CopyOutlined, 
  DownloadOutlined, 
  BookOutlined,
  BulbOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;

interface TsxTemplateHelperProps {
  visible: boolean;
  onClose: () => void;
  onUseTemplate?: (template: string, filename: string) => void;
}

const TsxTemplateHelper: React.FC<TsxTemplateHelperProps> = ({
  visible,
  onClose,
  onUseTemplate
}) => {
  const [activeTab, setActiveTab] = useState('basic');

  // Template configurations
  const templates = {
    basic: {
      name: 'Componente Básico',
      filename: 'ComponenteBasico.tsx',
      code: `import React from 'react';
import { Card } from 'antd';

// Componente TSX educativo básico
// Seguro para usar en MW Panel

interface ComponenteBasicoProps {
  title?: string;
  content?: string;
  className?: string;
}

const ComponenteBasico: React.FC<ComponenteBasicoProps> = ({ 
  title = "Mi Componente",
  content = "¡Hola desde TSX!",
  className 
}) => {
  return (
    <Card 
      title={title}
      className={className}
      style={{ 
        margin: '16px', 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h3 style={{ color: '#1890ff' }}>{content}</h3>
        <p>Este es un componente educativo seguro.</p>
      </div>
    </Card>
  );
};

// === SANDBOX-COMPATIBLE EXPORTS ===
try {
  if (typeof window !== 'undefined') {
    window.ComponenteBasico = ComponenteBasico;
    window.ReactComponent = ComponenteBasico;
  }
  if (typeof global !== 'undefined') {
    global.ComponenteBasico = ComponenteBasico;
    global.ReactComponent = ComponenteBasico;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponenteBasico;
    module.exports.default = ComponenteBasico;
  }
} catch (e) {
  console.warn('Template export setup:', e);
}`
    },
    interactive: {
      name: 'Componente Interactivo',
      filename: 'ComponenteInteractivo.tsx',
      code: `import React, { useState } from 'react';
import { Card, Button, Space, Typography } from 'antd';
import { SmileOutlined, HeartOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Componente interactivo educativo
// Demuestra estado y eventos seguros

interface ComponenteInteractivoProps {
  initialCount?: number;
}

const ComponenteInteractivo: React.FC<ComponenteInteractivoProps> = ({ 
  initialCount = 0 
}) => {
  const [count, setCount] = useState(initialCount);
  const [isHappy, setIsHappy] = useState(false);

  const handleIncrement = () => {
    setCount(prev => prev + 1);
    if (count + 1 >= 5) {
      setIsHappy(true);
    }
  };

  const handleReset = () => {
    setCount(0);
    setIsHappy(false);
  };

  return (
    <Card 
      title="Contador Educativo"
      style={{ 
        margin: '16px', 
        borderRadius: '8px',
        background: isHappy ? '#f6ffed' : '#fff'
      }}
    >
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
          Contador: {count}
        </Text>
        
        {isHappy && (
          <div style={{ margin: '16px 0' }}>
            <SmileOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
            <HeartOutlined style={{ fontSize: '32px', color: '#ff4d4f', marginLeft: '8px' }} />
            <Text style={{ display: 'block', marginTop: '8px', color: '#52c41a' }}>
              ¡Genial! Llegaste a 5 o más
            </Text>
          </div>
        )}

        <Space style={{ marginTop: '20px' }}>
          <Button 
            type="primary" 
            onClick={handleIncrement}
            icon={<SmileOutlined />}
          >
            Incrementar
          </Button>
          <Button onClick={handleReset}>
            Reiniciar
          </Button>
        </Space>
      </div>
    </Card>
  );
};

// === SANDBOX-COMPATIBLE EXPORTS ===
try {
  if (typeof window !== 'undefined') {
    window.ComponenteInteractivo = ComponenteInteractivo;
    window.ReactComponent = ComponenteInteractivo;
  }
  if (typeof global !== 'undefined') {
    global.ComponenteInteractivo = ComponenteInteractivo;
    global.ReactComponent = ComponenteInteractivo;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponenteInteractivo;
    module.exports.default = ComponenteInteractivo;
  }
} catch (e) {
  console.warn('Template export setup:', e);
}`
    },
    educational: {
      name: 'Componente Educativo',
      filename: 'ComponenteEducativo.tsx',
      code: `import React, { useState } from 'react';
import { Card, List, Progress, Typography, Space, Tag } from 'antd';
import { BookOutlined, CheckCircleOutlined, StarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// Componente educativo para mostrar lecciones
// Ejemplo de buenas prácticas educativas

interface Leccion {
  id: number;
  titulo: string;
  completada: boolean;
  dificultad: 'facil' | 'medio' | 'dificil';
}

const ComponenteEducativo: React.FC = () => {
  const [lecciones, setLecciones] = useState<Leccion[]>([
    { id: 1, titulo: 'Introducción a React', completada: true, dificultad: 'facil' },
    { id: 2, titulo: 'Componentes y Props', completada: true, dificultad: 'facil' },
    { id: 3, titulo: 'Estado y Eventos', completada: false, dificultad: 'medio' },
    { id: 4, titulo: 'Hooks Avanzados', completada: false, dificultad: 'dificil' },
  ]);

  const completadas = lecciones.filter(l => l.completada).length;
  const progreso = Math.round((completadas / lecciones.length) * 100);

  const toggleCompletada = (id: number) => {
    setLecciones(prev => 
      prev.map(leccion => 
        leccion.id === id 
          ? { ...leccion, completada: !leccion.completada }
          : leccion
      )
    );
  };

  const getDificultadColor = (dificultad: string) => {
    switch (dificultad) {
      case 'facil': return 'green';
      case 'medio': return 'orange';
      case 'dificil': return 'red';
      default: return 'default';
    }
  };

  return (
    <Card 
      title={
        <Space>
          <BookOutlined />
          <Title level={4} style={{ margin: 0 }}>Mi Curso de Programación</Title>
        </Space>
      }
      style={{ margin: '16px', borderRadius: '8px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Text strong>Progreso del Curso</Text>
          <Progress 
            percent={progreso} 
            format={percent => \`\${percent}% (\${completadas}/\${lecciones.length})\`}
            strokeColor={{
              '0%': '#87d068',
              '100%': '#108ee9',
            }}
          />
        </div>

        <List
          dataSource={lecciones}
          renderItem={leccion => (
            <List.Item
              style={{ 
                padding: '12px 0',
                cursor: 'pointer',
                background: leccion.completada ? '#f6ffed' : '#fff',
                borderRadius: '4px',
                marginBottom: '4px',
                paddingLeft: '12px'
              }}
              onClick={() => toggleCompletada(leccion.id)}
            >
              <Space>
                <CheckCircleOutlined 
                  style={{ 
                    color: leccion.completada ? '#52c41a' : '#d9d9d9',
                    fontSize: '16px'
                  }} 
                />
                <Text 
                  style={{ 
                    textDecoration: leccion.completada ? 'line-through' : 'none',
                    color: leccion.completada ? '#999' : '#000'
                  }}
                >
                  {leccion.titulo}
                </Text>
                <Tag color={getDificultadColor(leccion.dificultad)}>
                  {leccion.dificultad}
                </Tag>
                {leccion.completada && (
                  <StarOutlined style={{ color: '#fadb14' }} />
                )}
              </Space>
            </List.Item>
          )}
        />
      </Space>
    </Card>
  );
};

// === SANDBOX-COMPATIBLE EXPORTS ===
try {
  if (typeof window !== 'undefined') {
    window.ComponenteEducativo = ComponenteEducativo;
    window.ReactComponent = ComponenteEducativo;
  }
  if (typeof global !== 'undefined') {
    global.ComponenteEducativo = ComponenteEducativo;
    global.ReactComponent = ComponenteEducativo;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponenteEducativo;
    module.exports.default = ComponenteEducativo;
  }
} catch (e) {
  console.warn('Template export setup:', e);
}`
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('Código copiado al portapapeles');
    } catch {
      message.error('Error al copiar el código');
    }
  };

  const downloadTemplate = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success(`Template ${filename} descargado`);
  };

  const useTemplate = (templateKey: string) => {
    const template = templates[templateKey];
    if (onUseTemplate) {
      onUseTemplate(template.code, template.filename);
      onClose();
    } else {
      copyToClipboard(template.code);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <CodeOutlined />
          <span>Plantillas TSX Seguras</span>
          <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Paragraph>
          <BulbOutlined style={{ color: '#faad14' }} /> 
          {' '}Estas plantillas son seguras y cumplen con todas las reglas de seguridad de MW Panel.
          Puedes usarlas como base para crear tus propios componentes educativos.
        </Paragraph>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {Object.entries(templates).map(([key, template]) => (
          <TabPane tab={template.name} key={key}>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space>
                <Button 
                  type="primary" 
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(template.code)}
                >
                  Copiar Código
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={() => downloadTemplate(template.code, template.filename)}
                >
                  Descargar
                </Button>
                {onUseTemplate && (
                  <Button 
                    type="dashed"
                    onClick={() => useTemplate(key)}
                  >
                    Usar Template
                  </Button>
                )}
              </Space>
            </Card>
            
            <Card>
              <pre style={{ 
                background: '#f6f8fa', 
                padding: '16px', 
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                <code>{template.code}</code>
              </pre>
            </Card>
          </TabPane>
        ))}
      </Tabs>

      <Divider />
      
      <Card size="small" style={{ background: '#f0f9ff' }}>
        <Title level={5}>🛡️ Reglas de Seguridad TSX</Title>
        <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
          <li>❌ No uses <code>setTimeout</code>, <code>setInterval</code> o <code>window</code></li>
          <li>❌ No uses <code>eval</code> o <code>Function</code> constructor</li>
          <li>❌ No uses <code>dangerouslySetInnerHTML</code></li>
          <li>❌ No importes <code>lucide-react</code>, usa <code>@ant-design/icons</code></li>
          <li>✅ Usa TypeScript interfaces para las props</li>
          <li>✅ Usa componentes de Ant Design cuando sea posible</li>
          <li>✅ Usa exports compatibles con sandbox (sin ES6 modules)</li>
        </ul>
      </Card>
    </Modal>
  );
};

export default TsxTemplateHelper;