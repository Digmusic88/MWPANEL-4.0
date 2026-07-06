import React, { useState, useEffect } from 'react';
import {
  Modal,
  Drawer,
  Form,
  Input,
  Select,
  Button,
  Tabs,
  Row,
  Col,
  Card,
  Alert,
  Space,
  Typography,
  Divider,
  Radio,
  Checkbox,
  message,
} from 'antd';
import { useResponsive } from '../../hooks/useResponsive';
import {
  ExperimentOutlined,
  CopyOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useRubrics, ImportRubricData, Rubric } from '../../hooks/useRubrics';
import RubricGrid from './RubricGrid';
import apiClient from '../../services/apiClient';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface RubricImporterProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (rubric: Rubric) => void;
}

const RubricImporter: React.FC<RubricImporterProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { isMobile, isTablet } = useResponsive();
  const [activeTab, setActiveTab] = useState('instructions');
  const [loading, setLoading] = useState(false);
  const [importFormat, setImportFormat] = useState<'markdown' | 'csv'>('markdown');
  const [previewRubric, setPreviewRubric] = useState<Rubric | null>(null);
  const [subjectAssignments, setSubjectAssignments] = useState<any[]>([]);
  const [includeCompetencies, setIncludeCompetencies] = useState(false);
  const { importRubric } = useRubrics();

  // Cargar asignaturas del profesor al abrir el modal
  useEffect(() => {
    if (visible) {
      fetchSubjectAssignments();
    }
  }, [visible]);

  const fetchSubjectAssignments = async () => {
    try {
      const dashboardResponse = await apiClient.get('/teachers/dashboard/my-dashboard');
      const teacherId = dashboardResponse?.data?.teacher?.id;
      if (!teacherId) {
        console.error('Teacher ID not found in dashboard response');
        return;
      }
      const response = await apiClient.get(`/subjects/assignments/teacher/${teacherId}`);
      setSubjectAssignments(response.data);
    } catch (error) {
      console.error('Error fetching subject assignments:', error);
    }
  };

  const handleImport = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      let rubric;
      if (includeCompetencies) {
        // Usar endpoint de competencias
        const importData = {
          name: values.name,
          description: values.description,
          format: values.format,
          data: values.data,
          subjectAssignmentId: values.subjectAssignmentId,
          isTemplate: values.isTemplate || false,
          isVisibleToFamilies: values.isVisibleToFamilies || false,
          includeCompetencies: true,
          useAutomaticMapping: true, // Por defecto usar mapeo automático
          // Si hay datos de vista previa con mapeos, incluirlos
          ...(previewRubric?.competencyMappings && {
            competencyMappings: previewRubric.competencyMappings
          })
        };

        const response = await apiClient.post('/rubrics/import-with-competencies', importData);
        rubric = response.data;
      } else {
        // Usar importación normal
        const importData: ImportRubricData = {
          name: values.name,
          description: values.description,
          format: values.format,
          data: values.data,
          subjectAssignmentId: values.subjectAssignmentId,
          isTemplate: values.isTemplate || false,
          isVisibleToFamilies: values.isVisibleToFamilies || false,
        };

        rubric = await importRubric(importData);
      }
      
      if (rubric) {
        message.success(
          includeCompetencies 
            ? 'Rúbrica con competencias importada exitosamente'
            : 'Rúbrica importada exitosamente'
        );
        onSuccess?.(rubric);
        form.resetFields();
        setPreviewRubric(null);
        setIncludeCompetencies(false); // Reset competencies state
        setActiveTab('instructions');
        onClose();
      }
    } catch (error: any) {
      console.error('Error importing rubric:', error);
      message.error(error.response?.data?.message || 'Error al importar la rúbrica');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async () => {
    try {
      const values = await form.validateFields(['name', 'format', 'data']);
      setLoading(true);

      let response;
      if (includeCompetencies) {
        // Usar endpoint de competencias
        response = await apiClient.post('/rubrics/preview-import-with-competencies', {
          name: values.name,
          description: values.description || '',
          format: values.format,
          data: values.data,
          includeCompetencies: true,
          useAutomaticMapping: true, // Por defecto usar mapeo automático
        });
      } else {
        // Usar endpoint normal
        response = await apiClient.post('/rubrics/preview-import', {
          format: values.format,
          data: values.data,
        });
      }

      setPreviewRubric({
        ...response.data,
        name: values.name,
        description: values.description || '',
      });
      
      setActiveTab('preview');
      message.success('Vista previa generada exitosamente');
    } catch (error: any) {
      console.error('Error generating preview:', error);
      message.error(error.response?.data?.message || 'Error al generar vista previa');
    } finally {
      setLoading(false);
    }
  };

  const getChatGPTPrompt = () => {
    if (includeCompetencies) {
      return `Crea una rúbrica de evaluación con competencias asociadas en formato de tabla para [TEMA/ASIGNATURA].
La tabla debe tener:
- Primera columna: Competencia o competencias asociadas (usa códigos como CCL, STEM, CD, CPSAA, CC, CE, CCEC según corresponda)
- Segunda columna: Criterios de evaluación
- Tercera columna: Peso (%) - porcentaje de importancia de cada criterio (del 1 al 100, todos deben sumar 100%)
- Columnas siguientes: Niveles de desempeño con puntuación entre paréntesis, ordenados de PEOR a MEJOR (izquierda a derecha)

Formato la tabla así (IMPORTANTE: orden de peor a mejor):
| Competencia o competencias | Criterios | Peso (%) | Nulo (0) | Mejorable (2.5) | Aceptable (5) | Bueno (7.5) | Excelente (10) |
|-------------|-----------|----------|----------|----------------|---------------|-------------|----------------|
| CCL | [Criterio 1] | [%] | [No demuestra conocimiento] | [Conocimiento muy básico] | [Conocimiento suficiente] | [Buen conocimiento] | [Excelente dominio] |
| STEM | [Criterio 2] | [%] | [No demuestra conocimiento] | [Conocimiento muy básico] | [Conocimiento suficiente] | [Buen conocimiento] | [Excelente dominio] |

COMPETENCIAS CLAVE DISPONIBLES:
- CCL: Competencia en comunicación lingüística
- STEM: Competencia matemática y en ciencia, tecnología e ingeniería
- CD: Competencia digital
- CPSAA: Competencia personal, social y de aprender a aprender
- CC: Competencia ciudadana
- CE: Competencia emprendedora
- CCEC: Competencia en conciencia y expresión culturales

IMPORTANTE sobre los pesos:
- Asigna porcentajes del 1 al 100 según la importancia de cada criterio
- La suma de todos los pesos debe ser exactamente 100%
- Cada criterio debe estar asociado a la competencia más apropiada

Incluye al menos 4-5 criterios relevantes con sus competencias correspondientes.`;
    } else {
      return `Crea una rúbrica de evaluación en formato de tabla para [TEMA/ASIGNATURA].
La tabla debe tener:
- Primera columna: Criterios de evaluación
- Segunda columna: Peso (%) - porcentaje de importancia de cada criterio (del 1 al 100, todos deben sumar 100%)
- Columnas siguientes: Niveles de desempeño con puntuación entre paréntesis, ordenados de PEOR a MEJOR (izquierda a derecha)
- Cada celda debe describir claramente qué se espera en ese nivel

Formato la tabla así (IMPORTANTE: orden de peor a mejor):
| Criterios | Peso (%) | Nulo (0) | Mejorable (2.5) | Aceptable (5) | Bueno (7.5) | Excelente (10) |
|-----------|----------|----------|----------------|---------------|-------------|----------------|
| [Criterio 1] | [%] | [No demuestra conocimiento] | [Conocimiento muy básico] | [Conocimiento suficiente] | [Buen conocimiento] | [Excelente dominio] |
| [Criterio 2] | [%] | [No demuestra conocimiento] | [Conocimiento muy básico] | [Conocimiento suficiente] | [Buen conocimiento] | [Excelente dominio] |

IMPORTANTE sobre los pesos:
- Asigna porcentajes del 1 al 100 según la importancia de cada criterio
- La suma de todos los pesos debe ser exactamente 100%
- Ejemplo: Si hay 4 criterios, podrían ser 30%, 25%, 25%, 20%

Incluye al menos 4-5 criterios relevantes. El orden debe ser siempre de PEOR (0) a MEJOR (10) con 5 niveles de evaluación.`;
    }
  };

  const getMarkdownExample = () => {
    if (includeCompetencies) {
      return `| Competencia | Criterios | Peso (%) | Nulo (0) | Mejorable (2.5) | Aceptable (5) | Bueno (7.5) | Excelente (10) |
|-------------|-----------|----------|----------|----------------|---------------|-------------|----------------|
| CCL | Claridad expositiva | 40 | No comunica | Muy confuso | Algo confuso | El texto es claro | El texto es muy claro |
| CCL | Gramática y ortografía | 30 | Incomprensible | Muchos errores | Varios errores | Pocos errores | Sin errores |
| CPSAA | Creatividad e innovación | 30 | Sin evidencia | Sin originalidad | Algo creativo | Ideas interesantes | Muy original |`;
    } else {
      return `| Criterios | Peso (%) | Nulo (0) | Mejorable (2.5) | Aceptable (5) | Bueno (7.5) | Excelente (10) |
|-----------|----------|----------|----------------|---------------|-------------|----------------|
| Claridad | 40 | No comunica | Muy confuso | Algo confuso | El texto es claro | El texto es muy claro |
| Gramática | 30 | Incomprensible | Muchos errores | Varios errores | Pocos errores | Sin errores |
| Creatividad | 30 | Sin evidencia | Sin originalidad | Algo creativo | Ideas interesantes | Muy original |`;
    }
  };

  const getCsvExample = () => {
    if (includeCompetencies) {
      return `Competencia,Criterios,Peso (%),Nulo (0),Mejorable (2.5),Aceptable (5),Bueno (7.5),Excelente (10)
CCL,Claridad expositiva,40,No comunica,Muy confuso,Algo confuso,El texto es claro,El texto es muy claro
CCL,Gramática y ortografía,30,Incomprensible,Muchos errores,Varios errores,Pocos errores,Sin errores
CPSAA,Creatividad e innovación,30,Sin evidencia,Sin originalidad,Algo creativo,Ideas interesantes,Muy original`;
    } else {
      return `Criterios,Peso (%),Nulo (0),Mejorable (2.5),Aceptable (5),Bueno (7.5),Excelente (10)
Claridad,40,No comunica,Muy confuso,Algo confuso,El texto es claro,El texto es muy claro
Gramática,30,Incomprensible,Muchos errores,Varios errores,Pocos errores,Sin errores
Creatividad,30,Sin evidencia,Sin originalidad,Algo creativo,Ideas interesantes,Muy original`;
    }
  };

  const instructions = [
    {
      icon: <BulbOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      title: 'Paso 1: Prepara el prompt',
      content: 'Copia el prompt sugerido y personalízalo con tu tema o asignatura específica',
    },
    {
      icon: <ExperimentOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
      title: 'Paso 2: Genera con ChatGPT',
      content: 'Pega el prompt en ChatGPT y pide que genere la rúbrica en formato tabla',
    },
    {
      icon: <FileTextOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
      title: 'Paso 3: Copia la tabla',
      content: 'Copia la tabla completa generada por ChatGPT (incluye los encabezados)',
    },
    {
      icon: <ExportOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
      title: 'Paso 4: Importa aquí',
      content: 'Pega la tabla en el campo de importación, haz clic en Vista Previa y ajusta los pesos si es necesario',
    },
  ];

  const copyToClipboard = (text: string, successMessage: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(successMessage);
    }).catch(() => {
      message.error('Error al copiar al portapapeles');
    });
  };

  const copyPrompt = () => copyToClipboard(getChatGPTPrompt(), 'Prompt copiado al portapapeles');
  const copyExample = (type: 'markdown' | 'csv') => {
    const example = type === 'markdown' ? getMarkdownExample() : getCsvExample();
    copyToClipboard(example, 'Ejemplo copiado al portapapeles');
  };

  const tabItems = [
    {
      key: 'instructions',
      label: 'Instrucciones',
      children: (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Alert
            message="Importación desde ChatGPT"
            description="Sigue estos pasos para importar una rúbrica generada por ChatGPT"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          {/* Opción de competencias */}
          <Card size="small" style={{ backgroundColor: '#f0f7ff', border: '1px solid #bae7ff', marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong style={{ color: '#1890ff' }}>
                ¿Quieres incluir competencias en esta rúbrica?
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Las competencias permiten vincular cada criterio de evaluación con las competencias clave del currículo español.
              </Text>
              <Radio.Group 
                value={includeCompetencies} 
                onChange={(e) => setIncludeCompetencies(e.target.value)}
              >
                <Space direction="vertical">
                  <Radio value={true}>
                    ✅ Sí, incluir competencias asociadas a cada criterio
                  </Radio>
                  <Radio value={false}>
                    ❌ No, crear rúbrica normal (sin competencias)
                  </Radio>
                </Space>
              </Radio.Group>
            </Space>
          </Card>

          {/* Instrucciones paso a paso */}
          <Row gutter={16}>
            {instructions.map((instruction, index) => (
              <Col key={index} span={12} style={{ marginBottom: '16px' }}>
                <Card size="small">
                  <Space>
                    {instruction.icon}
                    <div>
                      <Text strong>{instruction.title}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {instruction.content}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>

          <Divider>Prompt para ChatGPT</Divider>
          
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Copia este prompt y pégalo en ChatGPT:</Text>
                <Button size="small" icon={<CopyOutlined />} onClick={copyPrompt}>
                  Copiar
                </Button>
              </div>
              <div 
                style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {getChatGPTPrompt()}
              </div>
            </Space>
          </Card>

          <Divider>Ejemplos de Formato</Divider>
          
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Formato Markdown" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    size="small" 
                    icon={<CopyOutlined />} 
                    onClick={() => copyExample('markdown')}
                    style={{ alignSelf: 'flex-end' }}
                  >
                    Copiar
                  </Button>
                  <div 
                    style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      whiteSpace: 'pre'
                    }}
                  >
                    {getMarkdownExample()}
                  </div>
                </Space>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card title="Formato CSV" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    size="small" 
                    icon={<CopyOutlined />} 
                    onClick={() => copyExample('csv')}
                    style={{ alignSelf: 'flex-end' }}
                  >
                    Copiar
                  </Button>
                  <div 
                    style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      whiteSpace: 'pre'
                    }}
                  >
                    {getCsvExample()}
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      )
    },
    {
      key: 'import',
      label: 'Importar Datos',
      children: (
        <Form form={form} layout="vertical" onValuesChange={(changedFields) => {
          if (changedFields.format) {
            setImportFormat(changedFields.format);
          }
        }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nombre de la Rúbrica"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input placeholder="Ej: Rúbrica de Redacción" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="subjectAssignmentId" label="Asignatura">
                <Select placeholder="Seleccionar asignatura (opcional)" allowClear>
                  {subjectAssignments.map(assignment => (
                    <Option key={assignment.id} value={assignment.id}>
                      {assignment.subject.name} ({assignment.subject.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Descripción"
          >
            <TextArea 
              rows={2} 
              placeholder="Describe brevemente el propósito de esta rúbrica"
            />
          </Form.Item>

          <Divider>Configuración de Competencias</Divider>


          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isTemplate" valuePropName="checked">
                <Checkbox>Guardar como plantilla reutilizable</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isVisibleToFamilies" valuePropName="checked">
                <Checkbox>Visible para las familias</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Divider>Datos de la Rúbrica</Divider>

          <Form.Item 
            name="format" 
            label="Formato de Importación"
            rules={[{ required: true, message: 'Selecciona el formato' }]}
          >
            <Radio.Group>
              <Radio value="markdown">Markdown (tabla con |)</Radio>
              <Radio value="csv">CSV (separado por comas)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="data"
            label="Pega aquí la tabla generada por ChatGPT"
            rules={[
              { required: true, message: 'Los datos son obligatorios' },
              {
                validator: (_, value) => {
                  if (!value || value.trim() === '') {
                    return Promise.reject('Debes pegar la tabla generada por ChatGPT');
                  }
                  
                  // Validación básica según el formato
                  const format = form.getFieldValue('format');
                  if (format === 'markdown') {
                    if (!value.includes('|')) {
                      return Promise.reject('El formato Markdown debe contener tablas con |');
                    }
                  } else if (format === 'csv') {
                    if (!value.includes(',')) {
                      return Promise.reject('El formato CSV debe contener valores separados por comas');
                    }
                  }
                  
                  return Promise.resolve();
                }
              }
            ]}
          >
            <TextArea
              rows={10}
              placeholder={
                importFormat === 'markdown' ? 
                  (includeCompetencies ? 
                    "| Competencia | Criterios | Peso (%) | Nulo (0) | Mejorable (2.5) | Aceptable (5) | Bueno (7.5) | Excelente (10) |\n|-------------|-----------|----------|----------|----------------|---------------|-------------|----------------|\n| CCL | Claridad expositiva | 40 | ... |" :
                    "| Criterios | Peso (%) | Nulo (0) | Mejorable (2.5) | Aceptable (5) | Bueno (7.5) | Excelente (10) |\n|-----------|----------|----------|----------------|---------------|-------------|----------------|\n| ..."
                  ) :
                  (includeCompetencies ?
                    "Competencia,Criterios,Peso (%),Nulo (0),Mejorable (2.5),Aceptable (5),Bueno (7.5),Excelente (10)\nCCL,Claridad expositiva,40,..." :
                    "Criterios,Peso (%),Nulo (0),Mejorable (2.5),Aceptable (5),Bueno (7.5),Excelente (10)\n..."
                  )
              }
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </Form.Item>

          <Alert
            message="Consejo"
            description={
              includeCompetencies
                ? "Asegúrate de que la tabla tenga: 1) Fila de encabezado con 'Competencia', 'Criterios', 'Peso (%)' y 5 niveles con puntuaciones (0, 2.5, 5, 7.5, 10), 2) Los pesos deben sumar 100%, 3) Competencias válidas (CCL, STEM, CD, CPSAA, CC, CE, CCEC)"
                : "Asegúrate de que la tabla tenga: 1) Fila de encabezado con 'Criterios', 'Peso (%)' y 5 niveles con puntuaciones (0, 2.5, 5, 7.5, 10), 2) Los pesos deben sumar 100%"
            }
            type="warning"
            showIcon
          />
        </Form>
      )
    },
    {
      key: 'preview',
      label: 'Vista Previa',
      children: previewRubric ? (
        <div>
          {/* Información de competencias */}
          {previewRubric.usesCompetencies && (
            <Alert
              message="Rúbrica con Competencias"
              description={`Esta rúbrica incluye ${previewRubric.competencyMappings?.length || 0} competencias asociadas. Las competencias se asignarán automáticamente a los criterios según el mapeo generado.`}
              type="info"
              showIcon
              style={{ marginBottom: '12px' }}
            />
          )}
          
          {/* Validación de pesos */}
          {previewRubric.criteria && previewRubric.criteria.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              {(() => {
                const totalWeight = previewRubric.criteria.reduce((sum, criterion) => sum + (criterion.weight || 0), 0);
                const totalPercentage = Math.round(totalWeight * 100);
                const isValid = Math.abs(totalWeight - 1) < 0.01;
                
                return (
                  <Alert
                    message={`Validación de Pesos: ${totalPercentage}%`}
                    description={
                      isValid 
                        ? "✅ Los pesos suman 100% correctamente. La rúbrica está lista para importar."
                        : `⚠️ Los pesos suman ${totalPercentage}% (deben sumar 100%). Se normalizarán automáticamente al importar.`
                    }
                    type={isValid ? "success" : "warning"}
                    showIcon
                    style={{ marginBottom: '12px' }}
                  />
                );
              })()}
            </div>
          )}

          {/* Lista de mapeos de competencias si está disponible */}
          {previewRubric.competencyMappings && previewRubric.competencyMappings.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <Card size="small" title="Mapeo de Competencias Detectado">
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {previewRubric.competencyMappings.map((mapping, index) => (
                    <div key={index} style={{ marginBottom: '4px', fontSize: '12px' }}>
                      <Text strong>{previewRubric.criteria?.[mapping.criterionIndex]?.name || `Criterio ${mapping.criterionIndex + 1}`}</Text>
                      {' → '}
                      <Text code>{mapping.competencyId}</Text>
                      {mapping.confidence && (
                        <Text type="secondary"> ({Math.round(mapping.confidence * 100)}% confianza)</Text>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
          
          <RubricGrid
            rubric={previewRubric}
            editable={true}
            viewMode="edit"
            onRubricChange={(updatedRubric) => {
              setPreviewRubric(updatedRubric);
            }}
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">
            Completa los datos de importación y haz clic en "Vista Previa" para ver cómo quedará la rúbrica
          </Text>
        </div>
      )
    }
  ];

  // Contenido de tabs compartido
  const tabsContent = (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={tabItems}
      size={isMobile ? 'small' : 'default'}
    />
  );

  // Footer móvil
  const mobileFooter = (
    <div className="flex flex-col gap-2">
      <Button onClick={generatePreview} block>
        Vista Previa
      </Button>
      <div className="flex gap-2">
        <Button onClick={onClose} style={{ flex: 1 }}>
          Cancelar
        </Button>
        <Button type="primary" loading={loading} onClick={handleImport} style={{ flex: 1 }}>
          Importar
        </Button>
      </div>
    </div>
  );

  // Drawer para móvil
  if (isMobile) {
    return (
      <Drawer
        title="Importar Rúbrica"
        open={visible}
        onClose={onClose}
        placement="bottom"
        height="90vh"
        styles={{ body: { padding: 12, paddingBottom: 80 } }}
        footer={mobileFooter}
      >
        {tabsContent}
      </Drawer>
    );
  }

  // Modal para desktop/tablet
  return (
    <Modal
      title="Importar Rúbrica desde ChatGPT"
      open={visible}
      onCancel={onClose}
      width={isTablet ? '95%' : 900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancelar
        </Button>,
        <Button key="preview" onClick={generatePreview}>
          Vista Previa
        </Button>,
        <Button key="import" type="primary" loading={loading} onClick={handleImport}>
          Importar Rúbrica
        </Button>
      ]}
    >
      {tabsContent}
    </Modal>
  );
};

export default RubricImporter;