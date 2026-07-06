import React, { useState } from 'react';
import { Modal, Steps, Button, Space, Typography, Card, Row, Col, Divider } from 'antd';
import { 
  BulbOutlined, 
  EditOutlined, 
  PlusOutlined, 
  DeleteOutlined,
  SaveOutlined,
  DownloadOutlined,
  SettingOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface MindMapHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MindMapHelpModal: React.FC<MindMapHelpModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '¿Qué es un Mind Map?',
      icon: <BulbOutlined />,
      content: (
        <div>
          <Title level={4}>🧠 ¡Bienvenido al Editor de Mind Maps!</Title>
          <Paragraph>
            Un <strong>Mind Map</strong> (Mapa Mental) es como un árbol de ideas que te ayuda a:
          </Paragraph>
          <ul>
            <li>📚 <strong>Organizar tus apuntes</strong> de forma visual</li>
            <li>🎯 <strong>Conectar ideas</strong> relacionadas</li>
            <li>🧩 <strong>Recordar mejor</strong> la información</li>
            <li>✨ <strong>Ser más creativo</strong> al estudiar</li>
          </ul>
          <Card size="small" style={{ backgroundColor: '#f0f9ff', margin: '16px 0' }}>
            <Text>
              💡 <strong>¿Sabías que?</strong> Nuestro cerebro funciona como un Mind Map, 
              conectando ideas unas con otras. ¡Por eso es tan fácil de usar!
            </Text>
          </Card>
        </div>
      )
    },
    {
      title: 'Primeros Pasos',
      icon: <EditOutlined />,
      content: (
        <div>
          <Title level={4}>🖱️ Cómo Empezar</Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" title="🎯 Hacer Clic">
                <Text>Haz clic en cualquier nodo (cuadrito) para seleccionarlo</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="✏️ Doble Clic">
                <Text>Doble clic en un nodo para editar su texto</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="🖱️ Arrastrar">
                <Text>Arrastra los nodos para moverlos por el mapa</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="➕ Expandir">
                <Text>Haz clic en los botones + o - para añadir/quitar nodos</Text>
              </Card>
            </Col>
          </Row>
          <Divider />
          <Paragraph>
            <strong>🏁 Para empezar:</strong> El nodo central dice "Mi Mind Map". 
            ¡Haz doble clic en él para cambiar el título!
          </Paragraph>
        </div>
      )
    },
    {
      title: 'Añadir Ideas',
      icon: <PlusOutlined />,
      content: (
        <div>
          <Title level={4}>➕ Crear Nuevas Ideas</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card>
              <Title level={5}>🖱️ Con el Ratón:</Title>
              <ol>
                <li>Selecciona un nodo haciendo clic en él</li>
                <li>Busca el botón <strong>➕</strong> que aparece al lado</li>
                <li>Haz clic en <strong>➕</strong> para añadir un nodo hijo</li>
                <li>Escribe tu nueva idea</li>
              </ol>
            </Card>
            
            <Card>
              <Title level={5}>⌨️ Con el Teclado (más rápido):</Title>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Button size="small">Tab</Button> <Text>Añadir nodo hijo</Text>
                </Col>
                <Col span={12}>
                  <Button size="small">Enter</Button> <Text>Añadir nodo hermano</Text>
                </Col>
                <Col span={12}>
                  <Button size="small">F2</Button> <Text>Editar nodo actual</Text>
                </Col>
                <Col span={12}>
                  <Button size="small">Delete</Button> <Text>Eliminar nodo</Text>
                </Col>
              </Row>
            </Card>
          </Space>
        </div>
      )
    },
    {
      title: 'Personalizar',
      icon: <SettingOutlined />,
      content: (
        <div>
          <Title level={4}>🎨 Hacer tu Mind Map Único</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card>
              <Title level={5}>🌈 Cambiar Colores:</Title>
              <Paragraph>
                <strong>¡Nuevo!</strong> Los colores se aplican solo a los nodos que selecciones:
              </Paragraph>
              <ol>
                <li>Haz clic en uno o varios nodos para seleccionarlos</li>
                <li>Elige un color en la parte superior derecha</li>
                <li>¡Solo los nodos seleccionados cambiarán de color!</li>
              </ol>
              <Space wrap>
                <Button size="small" style={{ backgroundColor: '#3298db', color: 'white' }}>Azul</Button>
                <Button size="small" style={{ backgroundColor: '#fa8c16', color: 'white' }}>Naranja</Button>
                <Button size="small" style={{ backgroundColor: '#ff4d4f', color: 'white' }}>Rojo</Button>
                <Button size="small" style={{ backgroundColor: '#52c41a', color: 'white' }}>Verde</Button>
                <Button size="small" style={{ backgroundColor: '#13c2c2', color: 'white' }}>Cyan</Button>
              </Space>
            </Card>
            
            <Card>
              <Title level={5}>🖼️ Pantalla Completa:</Title>
              <Paragraph>
                Haz clic en el botón <strong>⛶</strong> para usar toda la pantalla y tener más espacio.
              </Paragraph>
            </Card>
          </Space>
        </div>
      )
    },
    {
      title: 'Guardar y Compartir',
      icon: <SaveOutlined />,
      content: (
        <div>
          <Title level={4}>💾 Guardar tu Trabajo</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card>
              <Title level={5}>✅ Guardar en tus Apuntes:</Title>
              <ol>
                <li>Asegúrate de tener un <strong>título</strong> en el campo de abajo</li>
                <li>Haz clic en el botón <strong>"Guardar"</strong> azul</li>
                <li>Tu Mind Map aparecerá en "Mis Apuntes"</li>
              </ol>
            </Card>
            
            <Card>
              <Title level={5}>📸 Exportar como Imagen:</Title>
              <Paragraph>
                Haz clic en el botón <DownloadOutlined /> para descargar tu Mind Map como imagen PNG. 
                ¡Perfecto para incluir en presentaciones o trabajos!
              </Paragraph>
            </Card>
            
            <Card>
              <Title level={5}>↩️ Deshacer/Rehacer:</Title>
              <Space>
                <Text>Usa los botones</Text>
                <Button size="small" icon={<span>↶</span>} />
                <Text>y</Text>
                <Button size="small" icon={<span>↷</span>} />
                <Text>para deshacer o rehacer cambios</Text>
              </Space>
            </Card>
          </Space>
        </div>
      )
    },
    {
      title: 'Consejos de Estudio',
      icon: <BulbOutlined />,
      content: (
        <div>
          <Title level={4}>🎯 Tips para Estudiar Mejor</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card>
              <Title level={5}>📚 Para cada Asignatura:</Title>
              <ul>
                <li><strong>Matemáticas:</strong> Tema central → Fórmulas → Ejemplos → Ejercicios</li>
                <li><strong>Historia:</strong> Época → Eventos → Personas → Consecuencias</li>
                <li><strong>Ciencias:</strong> Concepto → Características → Ejemplos → Aplicaciones</li>
                <li><strong>Lengua:</strong> Tema → Ideas principales → Detalles → Conclusiones</li>
              </ul>
            </Card>
            
            <Card>
              <Title level={5}>🌟 Trucos Geniales:</Title>
              <ul>
                <li>🎨 <strong>Usa colores:</strong> Un color por tema o tipo de información</li>
                <li>📝 <strong>Palabras clave:</strong> Escribe solo lo esencial, no frases largas</li>
                <li>🔗 <strong>Conecta ideas:</strong> Si dos nodos se relacionan, ponlos cerca</li>
                <li>⭐ <strong>Lo más importante al centro:</strong> Las ideas principales cerca del centro</li>
              </ul>
            </Card>
            
            <Card style={{ backgroundColor: '#f6ffed' }}>
              <Text strong>
                🎉 ¡Recuerda! No hay Mind Maps "incorrectos". Es TU manera de organizar TUS ideas. 
                ¡Experimenta y diviértete aprendiendo!
              </Text>
            </Card>
          </Space>
        </div>
      )
    }
  ];

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            🧠 Guía de Mind Maps
          </Title>
          <Text type="secondary">Aprende a crear mapas mentales increíbles</Text>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      width={800}
      footer={[
        <Space key="navigation">
          <Button 
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            ← Anterior
          </Button>
          <Button 
            type="primary"
            onClick={() => {
              if (currentStep === steps.length - 1) {
                onClose();
              } else {
                setCurrentStep(currentStep + 1);
              }
            }}
          >
            {currentStep === steps.length - 1 ? '¡Empezar a Crear!' : 'Siguiente →'}
          </Button>
        </Space>
      ]}
      bodyStyle={{ padding: '20px' }}
    >
      <Steps
        current={currentStep}
        items={steps.map((step, index) => ({
          title: step.title,
          icon: step.icon,
        }))}
        style={{ marginBottom: '24px' }}
        size="small"
      />
      
      <div style={{ minHeight: '400px' }}>
        {steps[currentStep].content}
      </div>
      
      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">
          Paso {currentStep + 1} de {steps.length}
        </Text>
      </div>
    </Modal>
  );
};

export default MindMapHelpModal;