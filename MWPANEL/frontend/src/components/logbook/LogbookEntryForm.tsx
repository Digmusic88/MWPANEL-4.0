/**
 * Formulario para crear y editar entradas de bitácora
 * Con editor TipTap integrado y validación completa
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  Row,
  Col,
  Space,
  Typography,
  message,
  Divider,
  Checkbox,
  Alert,
} from 'antd';
import { SaveOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  LogbookEntry,
  CreateLogbookEntryDto,
  UpdateLogbookEntryDto,
  LogbookVisibility,
} from '../../types/logbook.types';
import useLogbook from '../../hooks/useLogbook';
import TipTapEditor from './TipTapEditor';
import TagManager from './TagManager';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface LogbookEntryFormProps {
  visible: boolean;
  onClose: () => void;
  entry?: LogbookEntry | null;
  mode: 'create' | 'edit';
  initialDate?: string;
  initialTagId?: string;
}

const LogbookEntryForm: React.FC<LogbookEntryFormProps> = ({
  visible,
  onClose,
  entry,
  mode,
  initialDate,
  initialTagId,
}) => {
  const {
    tags,
    tagsLoading,
    createEntry,
    updateEntry,
    isCreatingEntry,
    setIsCreatingEntry,
    isEditingEntry,
    setIsEditingEntry,
  } = useLogbook();

  const [form] = Form.useForm();
  const [editorContent, setEditorContent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showRepeatOptions, setShowRepeatOptions] = useState(false);

  // Opciones de visibilidad
  const visibilityOptions = [
    { value: 'private', label: 'Privado (solo yo)' },
    { value: 'staff', label: 'Profesorado' },
    { value: 'admin', label: 'Administración' },
  ];

  // Inicializar formulario cuando se abre
  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && entry) {
        // Modo edición
        form.setFieldsValue({
          title: entry.title,
          tagId: entry.tagId,
          dateLocal: dayjs(entry.dateLocal),
          startedAtLocal: entry.startedAtLocal ? dayjs(entry.startedAtLocal, 'HH:mm:ss') : null,
          endedAtLocal: entry.endedAtLocal ? dayjs(entry.endedAtLocal, 'HH:mm:ss') : null,
          visibility: entry.visibility,
        });
        setEditorContent(entry.contentRich);
        setIsEditingEntry(true);
      } else {
        // Modo creación
        const today = initialDate ? dayjs(initialDate) : dayjs();
        form.setFieldsValue({
          dateLocal: today,
          tagId: initialTagId || (tags.length > 0 ? tags[0].id : undefined),
          visibility: 'private',
        });
        setEditorContent(null);
        setIsCreatingEntry(true);
      }
    }
  }, [visible, mode, entry, form, initialDate, initialTagId, tags, setIsCreatingEntry, setIsEditingEntry]);

  // Limpiar estado al cerrar
  const handleClose = () => {
    form.resetFields();
    setEditorContent(null);
    setIsSubmitting(false);
    setIsPreviewMode(false);
    setShowRepeatOptions(false);
    setIsCreatingEntry(false);
    setIsEditingEntry(false);
    onClose();
  };

  // Manejar envío del formulario
  const handleSubmit = async (values: any) => {
    // Solo requerir contenido si no es una entrada recurrente
    if (!editorContent && !values.repeatUntilCourseEnd) {
      message.error('El contenido de la entrada es obligatorio');
      return;
    }

    setIsSubmitting(true);

    try {
      const entryData = {
        title: values.title,
        tagId: values.tagId,
        contentRich: editorContent || { type: 'doc', content: [] },
        dateLocal: values.dateLocal.format('YYYY-MM-DD'),
        startedAtLocal: values.startedAtLocal?.format('HH:mm'),
        endedAtLocal: values.endedAtLocal?.format('HH:mm'),
        visibility: values.visibility || 'private',
        // Opciones de repetición (solo para modo create)
        ...(mode === 'create' && values.repeatUntilCourseEnd && {
          repeatUntilCourseEnd: true,
          repeatOptions: {
            frequency: 'WEEKLY' as const,
            byDayFromDate: values.repeatOptions?.byDayFromDate ?? true,
            onlySchoolDays: values.repeatOptions?.onlySchoolDays ?? true,
          },
        }),
      };

      if (mode === 'edit' && entry) {
        await updateEntry(entry.id, entryData as UpdateLogbookEntryDto);
        message.success('Entrada actualizada exitosamente');
      } else {
        const result = await createEntry(entryData as CreateLogbookEntryDto);

        // Mensaje específico para entradas con repetición
        if (values.repeatUntilCourseEnd && result?.series) {
          message.success(
            `Entrada creada exitosamente. Se generaron ${result.series.createdOccurrences} entradas plantilla hasta ${dayjs(result.series.endDate).format('DD/MM/YYYY')}.`,
            6 // duración extendida para este mensaje importante
          );
        } else {
          message.success('Entrada creada exitosamente');
        }
      }

      handleClose();
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular duración automáticamente
  const calculateDuration = () => {
    const startTime = form.getFieldValue('startedAtLocal');
    const endTime = form.getFieldValue('endedAtLocal');

    if (startTime && endTime) {
      const start = dayjs(startTime);
      const end = dayjs(endTime);
      const diffMinutes = end.diff(start, 'minute');

      if (diffMinutes > 0) {
        return (
          <Text type="secondary" className="text-sm">
            Duración: {diffMinutes} minutos
          </Text>
        );
      } else if (diffMinutes < 0) {
        return (
          <Text type="warning" className="text-sm">
            La hora de fin debe ser posterior a la de inicio
          </Text>
        );
      }
    }

    return null;
  };

  const modalTitle = mode === 'edit' ? 'Editar Entrada' : 'Nueva Entrada de Bitácora';

  return (
    <>
      <Modal
        title={
          <div className="flex items-center justify-between">
            <Title level={4} className="mb-0">
              {modalTitle}
            </Title>
            <Space>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                type={isPreviewMode ? 'primary' : 'default'}
              >
                {isPreviewMode ? 'Editar' : 'Vista previa'}
              </Button>
              {tags.length === 0 && (
                <Button size="small" onClick={() => setShowTagManager(true)}>
                  Gestionar Etiquetas
                </Button>
              )}
            </Space>
          </div>
        }
        open={visible}
        onCancel={handleClose}
        width={900}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="space-y-4"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Título de la entrada"
                name="title"
                rules={[
                  { required: true, message: 'El título es obligatorio' },
                  { min: 3, message: 'Mínimo 3 caracteres' },
                  { max: 200, message: 'Máximo 200 caracteres' },
                ]}
              >
                <Input
                  placeholder="ej. Clase de matemáticas - Fracciones"
                  disabled={isPreviewMode}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Etiqueta"
                name="tagId"
                rules={[{ required: true, message: 'Selecciona una etiqueta' }]}
              >
                <Select
                  placeholder="Selecciona una etiqueta"
                  loading={tagsLoading}
                  disabled={isPreviewMode}
                  optionRender={(option) => (
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: option.data?.color }}
                      />
                      <span>{option.label}</span>
                    </div>
                  )}
                  notFoundContent={
                    tags.length === 0 ? (
                      <div className="text-center py-2">
                        <Text type="secondary">No hay etiquetas</Text>
                        <br />
                        <Button
                          size="small"
                          type="link"
                          onClick={() => setShowTagManager(true)}
                        >
                          Crear primera etiqueta
                        </Button>
                      </div>
                    ) : undefined
                  }
                >
                  {tags.map((tag) => (
                    <Select.Option
                      key={tag.id}
                      value={tag.id}
                      color={tag.colorHex}
                    >
                      {tag.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Fecha"
                name="dateLocal"
                rules={[{ required: true, message: 'La fecha es obligatoria' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  disabled={isPreviewMode}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="Hora de inicio"
                name="startedAtLocal"
              >
                <TimePicker
                  style={{ width: '100%' }}
                  format="HH:mm"
                  placeholder="09:00"
                  disabled={isPreviewMode}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="Hora de fin"
                name="endedAtLocal"
              >
                <TimePicker
                  style={{ width: '100%' }}
                  format="HH:mm"
                  placeholder="10:00"
                  disabled={isPreviewMode}
                />
              </Form.Item>
            </Col>
          </Row>

          {calculateDuration() && (
            <div className="text-center py-2">
              {calculateDuration()}
            </div>
          )}

          <Form.Item
            label="Visibilidad"
            name="visibility"
            tooltip="Controla quién puede ver esta entrada"
          >
            <Select
              options={visibilityOptions}
              disabled={isPreviewMode}
            />
          </Form.Item>

          {mode === 'create' && (
            <>
              <Divider orientation="left">Opciones de Repetición</Divider>

              <Form.Item name="repeatUntilCourseEnd" valuePropName="checked">
                <Checkbox
                  onChange={(e) => setShowRepeatOptions(e.target.checked)}
                  disabled={isPreviewMode}
                >
                  <Space direction="vertical" size="xs">
                    <span><strong>Repetir hasta fin de curso académico</strong></span>
                    <Typography.Text type="secondary" className="text-sm">
                      Crea automáticamente entradas plantilla semanales hasta el final del curso
                    </Typography.Text>
                  </Space>
                </Checkbox>
              </Form.Item>

              {showRepeatOptions && (
                <Alert
                  message="Repetición Semanal Activada"
                  description={
                    <Space direction="vertical" size="xs">
                      <div>• Se creará una entrada plantilla cada semana en la misma fecha</div>
                      <div>• Las entradas se generarán hasta el final del curso académico</div>
                      <div>• Podrás rellenar cada plantilla individualmente cuando sea necesario</div>
                      <div>• Los horarios de inicio y fin se aplicarán a todas las entradas</div>
                    </Space>
                  }
                  type="info"
                  showIcon
                  className="mb-4"
                />
              )}

              {showRepeatOptions && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['repeatOptions', 'onlySchoolDays']}
                      valuePropName="checked"
                      initialValue={true}
                    >
                      <Checkbox disabled={isPreviewMode}>
                        Solo días lectivos (excluye fines de semana y festivos)
                      </Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['repeatOptions', 'byDayFromDate']}
                      valuePropName="checked"
                      initialValue={true}
                    >
                      <Checkbox disabled={isPreviewMode}>
                        Repetir el mismo día de la semana
                      </Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </>
          )}

          <Divider />

          <Form.Item
            label="Contenido de la entrada"
            required
            className="mb-0"
          >
            <TipTapEditor
              content={editorContent}
              onUpdate={setEditorContent}
              placeholder="Describe aquí el contenido de tu entrada de bitácora..."
              editable={!isPreviewMode}
              autofocus={mode === 'create'}
              autoSave={false}
              minHeight={300}
              maxHeight={500}
            />
          </Form.Item>

          <div className="flex justify-between items-center pt-4 border-t">
            <Space>
              <Text type="secondary" className="text-sm">
                {mode === 'edit' ? 'Modificando entrada existente' : 'Creando nueva entrada'}
              </Text>
            </Space>

            <Space>
              <Button onClick={handleClose}>
                Cancelar
              </Button>
              {!isPreviewMode && (
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={isSubmitting}
                  disabled={!editorContent && !showRepeatOptions}
                >
                  {mode === 'edit' ? 'Guardar Cambios' : 'Crear Entrada'}
                </Button>
              )}
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Tag Manager Modal */}
      <TagManager
        visible={showTagManager}
        onClose={() => setShowTagManager(false)}
      />
    </>
  );
};

export default LogbookEntryForm;