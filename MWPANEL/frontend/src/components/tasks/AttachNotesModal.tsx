import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Typography,
  Space,
  Tag,
  Avatar,
  Input,
  Empty,
  Checkbox,
  message,
  Alert,
  Tooltip,
  Card,
  Row,
  Col,
} from 'antd';
import {
  BookOutlined,
  FileTextOutlined,
  AudioOutlined,
  PictureOutlined,
  FileImageOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import studentNotesApi from '../../services/studentNotesApi';
import { StudentNote, NoteType } from '../../types/student-notes';

const { Title, Text } = Typography;
const { Search } = Input;

interface AttachNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (selectedNotes: { noteId: string; description?: string }[]) => void;
  taskTitle?: string;
  loading?: boolean;
}

// Iconos por tipo de apunte
const noteTypeIcons: Record<NoteType, React.ReactNode> = {
  [NoteType.TEXT]: <FileTextOutlined style={{ color: '#1890ff' }} />,
  [NoteType.VOICE]: <AudioOutlined style={{ color: '#52c41a' }} />,
  [NoteType.DRAWING]: <PictureOutlined style={{ color: '#faad14' }} />,
  [NoteType.PRESENTATION]: <FileImageOutlined style={{ color: '#722ed1' }} />,
  [NoteType.MIXED]: <BookOutlined style={{ color: '#13c2c2' }} />,
};

// Colores por tipo de apunte
const noteTypeColors: Record<NoteType, string> = {
  [NoteType.TEXT]: 'blue',
  [NoteType.VOICE]: 'green',
  [NoteType.DRAWING]: 'orange',
  [NoteType.PRESENTATION]: 'purple',
  [NoteType.MIXED]: 'cyan',
};

export const AttachNotesModal: React.FC<AttachNotesModalProps> = ({
  isOpen,
  onClose,
  onAttach,
  taskTitle,
  loading = false,
}) => {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<StudentNote[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteDescriptions, setNoteDescriptions] = useState<Record<string, string>>({});

  // Cargar apuntes del estudiante
  useEffect(() => {
    if (isOpen) {
      loadStudentNotes();
    }
  }, [isOpen]);

  // Filtrar apuntes por búsqueda
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = notes.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.subject?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredNotes(filtered);
    } else {
      setFilteredNotes(notes);
    }
  }, [notes, searchTerm]);

  const loadStudentNotes = async () => {
    setLoadingNotes(true);
    try {
      const response = await studentNotesApi.getNotes({
        page: 1,
        limit: 100, // Cargar muchos apuntes para seleccionar
        isPrivate: false, // Solo apuntes públicos pueden adjuntarse
      });
      
      setNotes(response.notes || []);
    } catch (error) {
      console.error('Error loading student notes:', error);
      message.error('Error al cargar tus apuntes');
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleNoteSelect = (noteId: string, selected: boolean) => {
    if (selected) {
      setSelectedNoteIds(prev => [...prev, noteId]);
    } else {
      setSelectedNoteIds(prev => prev.filter(id => id !== noteId));
      // Limpiar descripción si se deselecciona
      setNoteDescriptions(prev => {
        const updated = { ...prev };
        delete updated[noteId];
        return updated;
      });
    }
  };

  const handleDescriptionChange = (noteId: string, description: string) => {
    setNoteDescriptions(prev => ({
      ...prev,
      [noteId]: description,
    }));
  };

  const handleAttach = () => {
    if (selectedNoteIds.length === 0) {
      message.warning('Selecciona al menos un apunte para adjuntar');
      return;
    }

    const selectedNotes = selectedNoteIds.map(noteId => ({
      noteId,
      description: noteDescriptions[noteId] || '',
    }));

    onAttach(selectedNotes);
  };

  const handleCancel = () => {
    setSelectedNoteIds([]);
    setNoteDescriptions({});
    setSearchTerm('');
    onClose();
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const columns = [
    {
      title: '',
      key: 'select',
      width: 50,
      render: (_: any, record: StudentNote) => (
        <Checkbox
          checked={selectedNoteIds.includes(record.id)}
          onChange={(e) => handleNoteSelect(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: 'Apunte',
      key: 'note',
      render: (_: any, record: StudentNote) => (
        <div>
          <Space>
            <Avatar 
              size="small" 
              icon={noteTypeIcons[record.type as NoteType]} 
              style={{ backgroundColor: '#f5f5f5' }}
            />
            <div>
              <Text strong>{record.title}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.content.length > 100 
                  ? `${record.content.substring(0, 100)}...` 
                  : record.content
                }
              </Text>
            </div>
          </Space>
        </div>
      ),
    },
    {
      title: 'Materia',
      key: 'subject',
      width: 120,
      render: (_: any, record: StudentNote) => (
        record.subject ? (
          <Tag color="blue">{record.subject.name}</Tag>
        ) : (
          <Tag color="default">General</Tag>
        )
      ),
    },
    {
      title: 'Tipo',
      key: 'type',
      width: 100,
      render: (_: any, record: StudentNote) => (
        <Tag 
          icon={noteTypeIcons[record.type as NoteType]}
          color={noteTypeColors[record.type as NoteType]}
        >
          {record.type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Fecha',
      key: 'date',
      width: 100,
      render: (_: any, record: StudentNote) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {formatDate(record.createdAt)}
        </Text>
      ),
    },
  ];

  const expandedRowRender = (record: StudentNote) => {
    const isSelected = selectedNoteIds.includes(record.id);
    
    if (!isSelected) return null;

    return (
      <Card size="small" style={{ marginLeft: 50 }}>
        <Text strong>Descripción opcional (por qué adjuntas este apunte):</Text>
        <Input.TextArea
          placeholder="Ej: Este apunte contiene las fórmulas que usé para resolver el ejercicio 3..."
          value={noteDescriptions[record.id] || ''}
          onChange={(e) => handleDescriptionChange(record.id, e.target.value)}
          rows={2}
          maxLength={500}
          showCount
          style={{ marginTop: 8 }}
        />
      </Card>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <BookOutlined />
          <span>Adjuntar Apuntes a la Tarea</span>
        </Space>
      }
      open={isOpen}
      onCancel={handleCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancelar
        </Button>,
        <Button
          key="attach"
          type="primary"
          onClick={handleAttach}
          loading={loading}
          disabled={selectedNoteIds.length === 0}
          icon={<CheckCircleOutlined />}
        >
          Adjuntar {selectedNoteIds.length > 0 ? `(${selectedNoteIds.length})` : ''}
        </Button>,
      ]}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Información de la tarea */}
        {taskTitle && (
          <Alert
            message={
              <div>
                <Text strong>Tarea: </Text>
                <Text>{taskTitle}</Text>
              </div>
            }
            description="Selecciona los apuntes que quieres adjuntar a esta entrega. Solo se pueden adjuntar apuntes públicos."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Búsqueda */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={18}>
            <Search
              placeholder="Buscar apuntes por título, contenido o materia..."
              onSearch={setSearchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              enterButton={<SearchOutlined />}
              size="middle"
            />
          </Col>
          <Col span={6}>
            <Tooltip title="Solo se muestran apuntes públicos">
              <Button icon={<InfoCircleOutlined />} style={{ width: '100%' }}>
                {filteredNotes.length} apunte{filteredNotes.length !== 1 ? 's' : ''}
              </Button>
            </Tooltip>
          </Col>
        </Row>

        {/* Tabla de apuntes */}
        <Table
          columns={columns}
          dataSource={filteredNotes}
          loading={loadingNotes}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} de ${total} apuntes`,
          }}
          expandable={{
            expandedRowRender,
            expandRowByClick: false,
            rowExpandable: (record) => selectedNoteIds.includes(record.id),
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  searchTerm 
                    ? `No se encontraron apuntes con "${searchTerm}"`
                    : "No tienes apuntes públicos disponibles"
                }
              >
                {!searchTerm && (
                  <Text type="secondary">
                    Crea apuntes públicos desde "Mis Apuntes" para poder adjuntarlos a las tareas
                  </Text>
                )}
              </Empty>
            ),
          }}
        />

        {/* Información adicional */}
        <Alert
          message="💡 Consejos para adjuntar apuntes"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>Solo puedes adjuntar apuntes públicos (no privados)</li>
              <li>Añade una descripción explicando por qué adjuntas cada apunte</li>
              <li>Los profesores podrán ver el contenido completo de tus apuntes</li>
              <li>Los apuntes adjuntados no se pueden eliminar después de la entrega</li>
            </ul>
          }
          type="info"
          showIcon={false}
          style={{ marginTop: 16, fontSize: '12px' }}
        />
      </motion.div>
    </Modal>
  );
};

export default AttachNotesModal;