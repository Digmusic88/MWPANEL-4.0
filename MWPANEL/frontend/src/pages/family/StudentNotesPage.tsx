import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  Table,
  Tag,
  Button,
  Space,
  DatePicker,
  Input,
  Modal,
  message,
  Pagination,
  Tooltip,
  Avatar,
  Empty,
  Spin,
  Alert,
  List,
  Comment,
  Divider,
  Popconfirm
} from 'antd';
import {
  FileTextOutlined,
  EyeOutlined,
  DownloadOutlined,
  SearchOutlined,
  FilterOutlined,
  BookOutlined,
  UserOutlined,
  CalendarOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileOutlined,
  MessageOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  SoundOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  FileMarkdownOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

interface StudentNote {
  id: string;
  title: string;
  description: string;
  content?: string; // Contenido completo del apunte
  type: 'text' | 'voice' | 'drawing' | 'presentation' | 'mixed';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  subject?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  comments?: NoteComment[]; // Comentarios asociados al apunte
}

interface NoteComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface Child {
  id: string;
  enrollmentNumber: string;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  educationalLevel: {
    name: string;
  };
  course: {
    name: string;
  };
}

interface Analytics {
  totalNotes: number;
  notesByType: Record<string, number>;
  notesThisWeek: number;
  notesThisMonth: number;
  mostActiveSubject: string;
}

// Componente para audio autenticado
const AuthenticatedAudio: React.FC<{ noteId: string; accessToken: string }> = ({ noteId, accessToken }) => {
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAudio = async () => {
      try {
        const response = await fetch(`/api/student-notes/family/note/${noteId}/stream`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setAudioSrc(url);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAudio();
  }, [noteId, accessToken]);

  if (loading) return <Spin size="small" />;
  if (error) return <Text type="secondary">Error al cargar audio</Text>;

  return (
    <audio 
      controls 
      style={{ marginTop: '12px', width: '100%', maxWidth: '400px' }}
      src={audioSrc}
      preload="metadata"
    >
      Tu navegador no soporta el elemento de audio.
    </audio>
  );
};

// Componente para imagen autenticada
const AuthenticatedImage: React.FC<{ noteId: string; accessToken: string }> = ({ noteId, accessToken }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const response = await fetch(`/api/student-notes/family/note/${noteId}/stream`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setImageSrc(url);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [noteId, accessToken]);

  if (loading) return <Spin size="small" />;
  if (error) return <Text type="secondary">Error al cargar imagen</Text>;

  return (
    <img 
      src={imageSrc} 
      alt="Dibujo del estudiante"
      style={{ 
        maxWidth: '100%', 
        maxHeight: '400px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        marginTop: '12px'
      }}
    />
  );
};

const StudentNotesPage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<StudentNote | null>(null);

  // Cargar hijos de la familia
  useEffect(() => {
    fetchChildren();
  }, []);

  // Cargar apuntes cuando cambian los filtros
  useEffect(() => {
    console.log('🔄 useEffect triggered - currentPage:', currentPage, 'selectedChild:', selectedChild, 'selectedType:', selectedType, 'searchTerm:', searchTerm);
    fetchNotes();
  }, [selectedChild, selectedType, searchTerm, currentPage]);

  // Cargar analytics cuando cambia el hijo seleccionado
  useEffect(() => {
    fetchAnalytics();
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      const response = await fetch('/api/families/my-children', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChildren(data);
      } else {
        message.error('Error al cargar los hijos');
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      message.error('Error de conexión');
    }
  };

  const fetchNotes = async () => {
    console.log('📋 fetchNotes called - currentPage:', currentPage, 'pageSize:', pageSize);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      
      console.log('📋 Request params:', Object.fromEntries(params));

      if (selectedChild !== 'all') {
        params.append('childId', selectedChild);
      }
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/student-notes/family/my-children-notes?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Response data:', {
          notesCount: data.data.data?.length || 0,
          total: data.data.total || 0,
          currentPage: data.data.currentPage,
          totalPages: data.data.totalPages,
          sampleNote: data.data.data?.[0] // Para debugging de estructura
        });
        // Log specific subject data
        if (data.data.data?.length > 0) {
          console.log('🎯 Sample subjects from notes:', data.data.data.slice(0, 3).map(note => ({
            id: note.id,
            subject: note.subject,
            subjectType: typeof note.subject
          })));
        }
        setNotes(data.data.data || []);
        setTotal(data.data.total || 0);
      } else {
        console.error('📋 Error response status:', response.status);
        message.error('Error al cargar los apuntes');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      message.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const baseParams = new URLSearchParams();
      if (selectedChild !== 'all') {
        baseParams.append('childId', selectedChild);
      }

      // Hacer múltiples llamadas para obtener diferentes períodos
      const [monthlyResponse, weeklyResponse] = await Promise.all([
        fetch(`/api/student-notes/family/children-analytics?${new URLSearchParams({...baseParams, period: 'month'})}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`/api/student-notes/family/children-analytics?${new URLSearchParams({...baseParams, period: 'week'})}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (monthlyResponse.ok && weeklyResponse.ok) {
        const monthlyData = await monthlyResponse.json();
        const weeklyData = await weeklyResponse.json();

        // Crear el objeto de analytics que el frontend espera
        const mostActiveContentType = monthlyData.data.contentTypes?.length > 0 
          ? monthlyData.data.contentTypes.reduce((max, current) => 
              current.count > max.count ? current : max
            )
          : null;

        const contentTypeNames = {
          'text': 'Texto',
          'voice': 'Audio',
          'drawing': 'Dibujo',
          'presentation': 'Presentación',
          'mixed': 'Mixto'
        };

        const combinedAnalytics = {
          totalNotes: monthlyData.data.summary.totalNotes,
          notesThisWeek: weeklyData.data.summary.totalNotes,
          notesThisMonth: monthlyData.data.summary.totalNotes,
          mostActiveSubject: mostActiveContentType 
            ? `${contentTypeNames[mostActiveContentType.type] || mostActiveContentType.type} (${mostActiveContentType.count})`
            : 'N/A'
        };

        setAnalytics(combinedAnalytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const getFileIcon = (type: string, fileName?: string) => {
    if (type === 'image') return <FileImageOutlined style={{ color: '#52c41a' }} />;
    if (type === 'document') {
      if (fileName?.includes('.pdf')) return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      if (fileName?.includes('.doc')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
      if (fileName?.includes('.xls')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    }
    return <FileOutlined style={{ color: '#8c8c8c' }} />;
  };

  const getTypeTag = (type: string) => {
    const typeColors = {
      text: 'blue',
      voice: 'orange',
      drawing: 'green',
      presentation: 'purple',
      mixed: 'cyan',
      // Legacy types
      image: 'green',
      audio: 'orange',
      video: 'red',
      document: 'purple',
    };
    
    const typeNames = {
      text: 'Texto',
      voice: 'Audio',
      drawing: 'Dibujo',
      presentation: 'Presentación',
      mixed: 'Mixto',
      // Legacy types
      image: 'Imagen',
      audio: 'Audio',
      video: 'Video',
      document: 'Documento',
    };

    return (
      <Tag color={typeColors[type as keyof typeof typeColors] || 'default'}>
        {typeNames[type as keyof typeof typeNames] || type}
      </Tag>
    );
  };

  const handlePreviewNote = async (note: StudentNote) => {
    try {
      // Cargar detalles completos del apunte
      const response = await fetch(`/api/student-notes/family/note/${note.id}/view`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const noteWithDetails = data.data;
        
        // Cargar comentarios si existen - manejar errores silenciosamente
        try {
          const commentsResponse = await fetch(`/api/student-notes/family/note/${note.id}/comments`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json();
            noteWithDetails.comments = commentsData.data || [];
          } else if (commentsResponse.status === 404) {
            // Endpoint no existe o nota no encontrada - usar comentarios vacíos
            console.log('Comments endpoint not found, using empty comments');
            noteWithDetails.comments = [];
          } else {
            // Otro error - usar comentarios vacíos
            console.log('Comments request failed:', commentsResponse.status);
            noteWithDetails.comments = [];
          }
        } catch (commentError) {
          // Error de red u otro - usar comentarios vacíos sin mostrar error
          console.log('Comments request error (using empty comments):', commentError.message);
          noteWithDetails.comments = [];
        }
        
        setSelectedNote(noteWithDetails);
        setPreviewModalVisible(true);
      } else {
        message.error('Error al cargar el apunte');
      }
    } catch (error) {
      console.error('Error previewing note:', error);
      message.error('Error de conexión');
    }
  };

  const handleDownloadNote = (note: StudentNote) => {
    if (note.fileUrl) {
      const downloadUrl = `/api/student-notes/family/note/${note.id}/stream`;
      
      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = `${downloadUrl}?authorization=Bearer ${accessToken}`;
      link.download = note.fileName || `apunte-${note.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/student-notes/family/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        message.success('Comentario eliminado correctamente');
        // Actualizar la lista de comentarios en el apunte seleccionado
        if (selectedNote) {
          const updatedComments = selectedNote.comments?.filter(c => c.id !== commentId) || [];
          setSelectedNote({
            ...selectedNote,
            comments: updatedComments
          });
        }
      } else {
        message.error('Error al eliminar el comentario');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      message.error('Error de conexión');
    }
  };

  // Renderizar contenido según el tipo de apunte
  const renderNoteContent = (note: StudentNote) => {
    const { type, content } = note;

    try {
      switch (type) {
        case 'voice':
        case 'audio':
          // Contenido de audio - crear componente personalizado para streaming autenticado
          if (note.fileUrl || note.id) {
            return (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <SoundOutlined style={{ fontSize: '48px', color: '#ff7a00', marginBottom: '16px' }} />
                <div>
                  <Text strong>Archivo de audio:</Text>
                  <br />
                  <AuthenticatedAudio noteId={note.id} accessToken={accessToken} />
                </div>
              </div>
            );
          }
          // Si no hay archivo, mostrar el contenido como texto
          if (content && content.trim()) {
            return (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <SoundOutlined style={{ fontSize: '48px', color: '#ff7a00', marginBottom: '16px' }} />
                <div>
                  <Text strong>Transcripción de audio:</Text>
                  <br />
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '6px' }}>
                    <Text>{content}</Text>
                  </div>
                </div>
              </div>
            );
          }
          break;

        case 'drawing':
          // Contenido de dibujo - crear componente personalizado para streaming autenticado
          if (note.fileUrl || note.id) {
            return (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <PictureOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
                <div>
                  <Text strong>Dibujo:</Text>
                  <br />
                  <AuthenticatedImage noteId={note.id} accessToken={accessToken} />
                </div>
              </div>
            );
          }
          // Si no hay archivo, intentar parsear contenido JSON
          if (content && content.trim()) {
            try {
              const drawingData = JSON.parse(content);
              if (drawingData.imageData) {
                return (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <PictureOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
                    <div>
                      <Text strong>Dibujo:</Text>
                      <br />
                      <img 
                        src={drawingData.imageData} 
                        alt="Dibujo del estudiante"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '400px',
                          border: '1px solid #d9d9d9',
                          borderRadius: '6px',
                          marginTop: '12px'
                        }}
                      />
                    </div>
                  </div>
                );
              }
            } catch (error) {
              // Si no es JSON válido, mostrar como texto descriptivo
              console.log('Drawing content is not JSON, showing as text:', content);
              return (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <PictureOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
                  <div>
                    <Text strong>Descripción del dibujo:</Text>
                    <br />
                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '6px' }}>
                      <Text>{content}</Text>
                    </div>
                  </div>
                </div>
              );
            }
          }
          break;

        case 'presentation':
          // Contenido de presentación
          if (content && content.trim()) {
            try {
              const presentationData = JSON.parse(content);
              if (presentationData.slides && presentationData.slides.length > 0) {
                return (
                  <div style={{ padding: '20px 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <FileMarkdownOutlined style={{ fontSize: '48px', color: '#722ed1', marginBottom: '16px' }} />
                      <Text strong>Presentación ({presentationData.slides.length} diapositivas):</Text>
                    </div>
                    
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {presentationData.slides.map((slide: any, index: number) => (
                        <Card 
                          key={slide.id || index}
                          size="small"
                          style={{ 
                            marginBottom: '12px',
                            backgroundColor: slide.backgroundColor || '#ffffff',
                            border: '1px solid #d9d9d9'
                          }}
                          title={
                            <Space>
                              <Text strong>Diapositiva {index + 1}</Text>
                              {slide.title && <Text type="secondary">- {slide.title}</Text>}
                            </Space>
                          }
                        >
                          <div style={{ 
                            color: slide.textColor || '#333333',
                            fontSize: slide.fontSize || 16,
                            fontFamily: slide.fontFamily || 'Arial, sans-serif',
                            textAlign: slide.alignment || 'left',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {slide.content}
                          </div>
                          {slide.notes && (
                            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                              <Text type="secondary" size="small">
                                <strong>Notas:</strong> {slide.notes}
                              </Text>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              }
            } catch (error) {
              console.error('Error parsing presentation data:', error);
              // Mostrar como texto si no es JSON válido
              return (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <FileMarkdownOutlined style={{ fontSize: '48px', color: '#722ed1', marginBottom: '16px' }} />
                  <div>
                    <Text strong>Contenido de presentación:</Text>
                    <br />
                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '6px' }}>
                      <Text style={{ whiteSpace: 'pre-wrap' }}>{content}</Text>
                    </div>
                  </div>
                </div>
              );
            }
          }
          break;

        default:
          // Contenido de texto o tipos no reconocidos
          return null;
      }
    } catch (error) {
      console.error('Error rendering note content:', error);
      return null;
    }

    return null;
  };

  const columns: TableColumnsType<StudentNote> = [
    {
      title: 'Apunte',
      key: 'note',
      render: (_, record) => (
        <Space>
          {getFileIcon(record.type, record.fileName)}
          <div>
            <Text strong>{record.title}</Text>
            <br />
            <Text type="secondary" ellipsis>
              {record.description}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Estudiante',
      key: 'student',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text>{record.author.profile.firstName} {record.author.profile.lastName}</Text>
            <br />
            <Text type="secondary" size="small">{record.author.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type) => getTypeTag(type),
    },
    {
      title: 'Materia',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject) => {
        if (!subject) return '-';
        // Si subject es un objeto, mostrar el nombre. Si es string, mostrar directamente
        const subjectName = typeof subject === 'object' ? subject.name : subject;
        return <Tag icon={<BookOutlined />}>{subjectName}</Tag>;
      },
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Tooltip title={dayjs(date).format('DD/MM/YYYY HH:mm')}>
          <Space>
            <CalendarOutlined />
            {dayjs(date).format('DD/MM/YYYY')}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver apunte">
            <Button
              type="primary"
              ghost
              icon={<EyeOutlined />}
              onClick={() => handlePreviewNote(record)}
            />
          </Tooltip>
          {record.fileUrl && (
            <Tooltip title="Descargar">
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadNote(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <FileTextOutlined /> Apuntes de mis Hijos
      </Title>
      <Paragraph type="secondary">
        Visualiza y gestiona los apuntes de estudio de tus hijos
      </Paragraph>

      {/* Analytics Cards */}
      {analytics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Text type="secondary">Total de Apuntes</Text>
              <Title level={3} style={{ margin: 0 }}>
                {analytics.totalNotes}
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Text type="secondary">Esta Semana</Text>
              <Title level={3} style={{ margin: 0 }}>
                {analytics.notesThisWeek}
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Text type="secondary">Este Mes</Text>
              <Title level={3} style={{ margin: 0 }}>
                {analytics.notesThisMonth}
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Text type="secondary">Tipo Más Usado</Text>
              <Title level={4} style={{ margin: 0 }}>
                {analytics.mostActiveSubject || 'N/A'}
              </Title>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filtros */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>Hijo:</Text>
              <Select
                value={selectedChild}
                onChange={setSelectedChild}
                style={{ width: '100%' }}
                placeholder="Seleccionar hijo"
              >
                <Option value="all">Todos los hijos</Option>
                {children.map((child) => (
                  <Option key={child.id} value={child.id}>
                    {child.user.profile.firstName} {child.user.profile.lastName}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>Tipo:</Text>
              <Select
                value={selectedType}
                onChange={setSelectedType}
                style={{ width: '100%' }}
                placeholder="Tipo de apunte"
              >
                <Option value="all">Todos los tipos</Option>
                <Option value="text">Texto</Option>
                <Option value="image">Imagen</Option>
                <Option value="audio">Audio</Option>
                <Option value="video">Video</Option>
                <Option value="document">Documento</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>Buscar:</Text>
              <Search
                placeholder="Buscar en título o descripción"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={fetchNotes}
                allowClear
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={fetchNotes}
              style={{ marginTop: 22 }}
            >
              Buscar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabla de Apuntes */}
      <Card>
        <Table
          columns={columns}
          dataSource={notes}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay apuntes disponibles"
              />
            ),
          }}
        />
        
        {total > 0 && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={(page) => {
                console.log('📄 Page change requested:', { from: currentPage, to: page });
                setCurrentPage(page);
              }}
              showSizeChanger={false}
              showQuickJumper
              showTotal={(total, range) =>
                `${range[0]}-${range[1]} de ${total} apuntes`
              }
            />
          </div>
        )}
      </Card>

      {/* Modal de Vista Previa */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            Vista Previa del Apunte
          </Space>
        }
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            Cerrar
          </Button>,
          selectedNote?.fileUrl && (
            <Button
              key="download"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => selectedNote && handleDownloadNote(selectedNote)}
            >
              Descargar
            </Button>
          ),
        ]}
        width={1000}
        style={{ top: 20 }}
      >
        {selectedNote && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Title level={4}>{selectedNote.title}</Title>
              <Space>
                {getTypeTag(selectedNote.type)}
                {selectedNote.subject && (
                  <Tag icon={<BookOutlined />}>
                    {typeof selectedNote.subject === 'object' ? selectedNote.subject.name : selectedNote.subject}
                  </Tag>
                )}
                <Text type="secondary">
                  {dayjs(selectedNote.createdAt).format('DD/MM/YYYY HH:mm')}
                </Text>
              </Space>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>Estudiante: </Text>
              <Text>
                {selectedNote.author.profile.firstName} {selectedNote.author.profile.lastName}
              </Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Descripción:</Text>
              <Paragraph style={{ marginTop: 8 }}>
                {selectedNote.description}
              </Paragraph>
            </div>

            {/* Contenido especializado según el tipo */}
            {(() => {
              try {
                const renderedContent = renderNoteContent(selectedNote);
                if (renderedContent) {
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>Contenido del apunte:</Text>
                      <Card 
                        size="small" 
                        style={{ 
                          marginTop: 8, 
                          backgroundColor: '#fafafa',
                          border: '1px solid #e8e8e8'
                        }}
                      >
                        {renderedContent}
                      </Card>
                    </div>
                  );
                }
                return null;
              } catch (error) {
                console.error('Error rendering specialized content:', error);
                return (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Contenido del apunte:</Text>
                    <Card 
                      size="small" 
                      style={{ 
                        marginTop: 8, 
                        backgroundColor: '#fff2f0',
                        border: '1px solid #ffccc7'
                      }}
                    >
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <Text type="secondary">Error al mostrar el contenido especializado</Text>
                      </div>
                    </Card>
                  </div>
                );
              }
            })()}

            {/* Contenido completo del apunte (para tipos de texto) */}
            {(() => {
              try {
                const hasContent = selectedNote.content && 
                                 selectedNote.content !== selectedNote.description && 
                                 !renderNoteContent(selectedNote);
                
                if (!hasContent) return null;
                
                // Verificar que el contenido sea renderizable como texto
                let contentToRender = selectedNote.content;
                
                // Si el contenido es un objeto, convertirlo a string JSON
                if (typeof contentToRender === 'object') {
                  contentToRender = JSON.stringify(contentToRender, null, 2);
                }
                
                // Asegurarse de que es string
                contentToRender = String(contentToRender);
                
                return (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Contenido completo:</Text>
                    <Card 
                      size="small" 
                      style={{ 
                        marginTop: 8, 
                        backgroundColor: '#fafafa',
                        border: '1px solid #e8e8e8'
                      }}
                    >
                      {/* Verificar si es contenido HTML (contiene iframe o tags HTML) */}
                      {contentToRender.includes('<iframe') || contentToRender.includes('<') ? (
                        <div 
                          style={{ 
                            margin: 0, 
                            maxHeight: '400px',
                            overflowY: 'auto'
                          }}
                          dangerouslySetInnerHTML={{ __html: contentToRender }}
                        />
                      ) : (
                        <Paragraph 
                          style={{ 
                            margin: 0, 
                            whiteSpace: 'pre-wrap',
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}
                        >
                          {contentToRender}
                        </Paragraph>
                      )}
                    </Card>
                  </div>
                );
              } catch (error) {
                console.error('Error rendering content:', error);
                return (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Contenido completo:</Text>
                    <Card 
                      size="small" 
                      style={{ 
                        marginTop: 8, 
                        backgroundColor: '#fff2f0',
                        border: '1px solid #ffccc7'
                      }}
                    >
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <Text type="secondary">Error al mostrar el contenido</Text>
                      </div>
                    </Card>
                  </div>
                );
              }
            })()}

            {selectedNote.fileUrl && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>Archivo adjunto:</Text>
                <div style={{ marginTop: 8, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      {getFileIcon(selectedNote.type, selectedNote.fileName)}
                      <Text>{selectedNote.fileName}</Text>
                      {selectedNote.fileSize && (
                        <Text type="secondary">
                          ({Math.round(selectedNote.fileSize / 1024)} KB)
                        </Text>
                      )}
                    </Space>
                    
                    {/* Renderizar archivo según tipo usando método autenticado */}
                    <GoogleDriveFileViewer note={selectedNote} />
                  </Space>
                </div>
              </div>
            )}

            {/* Sección de comentarios */}
            <Divider orientation="left">
              <Space>
                <MessageOutlined />
                Comentarios ({selectedNote.comments?.length || 0})
              </Space>
            </Divider>

            {selectedNote.comments && selectedNote.comments.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <List
                  dataSource={selectedNote.comments.filter(comment => comment.isActive)}
                  renderItem={(comment) => (
                    <List.Item
                      actions={[
                        <Popconfirm
                          title="¿Eliminar comentario?"
                          description="Esta acción no se puede deshacer. ¿Está seguro de que desea eliminar este comentario?"
                          onConfirm={() => handleDeleteComment(comment.id)}
                          okText="Eliminar"
                          cancelText="Cancelar"
                          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                        >
                          <Button 
                            type="text" 
                            danger 
                            size="small"
                            icon={<DeleteOutlined />}
                          >
                            Eliminar
                          </Button>
                        </Popconfirm>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar icon={<UserOutlined />} />
                        }
                        title={
                          <Space>
                            <Text strong>
                              {comment.user.profile.firstName} {comment.user.profile.lastName}
                            </Text>
                            <Text type="secondary" size="small">
                              {dayjs(comment.createdAt).format('DD/MM/YYYY HH:mm')}
                            </Text>
                          </Space>
                        }
                        description={
                          <Paragraph 
                            style={{ 
                              margin: 0, 
                              whiteSpace: 'pre-wrap' 
                            }}
                          >
                            {comment.content}
                          </Paragraph>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No hay comentarios en este apunte"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

// Componente para visualizar archivos de Google Drive de forma autenticada
interface GoogleDriveFileViewerProps {
  note: StudentNote;
}

const GoogleDriveFileViewer: React.FC<GoogleDriveFileViewerProps> = ({ note }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFile = async () => {
      // Solo cargar si hay webContentLink o fileUrl
      if (!note.webContentLink && !note.fileUrl) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Obtener token del localStorage (mismo método que DrawingImageComponent)
        let token = null;
        const authData = localStorage.getItem('mw-panel-auth');
        if (authData) {
          try {
            const { state } = JSON.parse(authData);
            token = state.accessToken;
          } catch (error) {
            console.warn('🎨 Failed to parse auth data:', error);
          }
        }

        if (!token) {
          setError('No se encontró token de autenticación');
          setIsLoading(false);
          return;
        }

        // Hacer fetch autenticado y crear blob URL (endpoint específico para familias)
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/family/note/${note.id}/stream`;
        
        console.log('🎨 GoogleDriveFileViewer: Realizando fetch autenticado a:', apiUrl);

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setFileUrl(blobUrl);
        
        console.log('🎨 GoogleDriveFileViewer: Archivo cargado exitosamente');
      } catch (error) {
        console.error('🎨 GoogleDriveFileViewer: Error loading file:', error);
        setError('Error al cargar el archivo');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();

    // Cleanup: revoke blob URL cuando el componente se desmonte
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [note.id, note.webContentLink, note.fileUrl]);

  // Detectar tipo de archivo por extensión
  const fileName = note.fileName || '';
  const fileExtension = fileName.split('.').pop()?.toLowerCase();

  if (isLoading) {
    return (
      <div style={{ marginTop: 12, textAlign: 'center', padding: '20px 0' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
        <div style={{ marginTop: 8 }}>
          <Typography.Text type="secondary">Cargando archivo...</Typography.Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: 12, textAlign: 'center', padding: '20px 0' }}>
        <Typography.Text type="danger">{error}</Typography.Text>
      </div>
    );
  }

  if (!fileUrl) {
    return null;
  }

  // Renderizar según tipo de archivo
  try {
    // Imágenes
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '')) {
      return (
        <div style={{ marginTop: 12 }}>
          <img 
            src={fileUrl} 
            alt={fileName}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '400px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px'
            }}
            onError={(e) => {
              console.error('Error displaying image:', e);
              setError('Error al mostrar la imagen');
            }}
          />
        </div>
      );
    }
    
    // Audio
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(fileExtension || '') || 
        note.type === 'audio' || note.type === 'voice') {
      return (
        <div style={{ marginTop: 12 }}>
          <audio controls style={{ width: '100%' }}>
            <source src={fileUrl} />
            Tu navegador no soporta el elemento de audio.
          </audio>
        </div>
      );
    }
    
    // Videos
    if (['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(fileExtension || '')) {
      return (
        <div style={{ marginTop: 12 }}>
          <video controls style={{ width: '100%', maxHeight: '400px' }}>
            <source src={fileUrl} />
            Tu navegador no soporta el elemento de video.
          </video>
        </div>
      );
    }
    
    // Para otros tipos, mostrar link de descarga
    return (
      <div style={{ marginTop: 12 }}>
        <Button 
          type="primary" 
          icon={<DownloadOutlined />}
          onClick={() => {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = fileName;
            link.click();
          }}
        >
          Descargar archivo
        </Button>
      </div>
    );
  } catch (error) {
    console.error('Error rendering file:', error);
    return (
      <div style={{ marginTop: 12 }}>
        <Typography.Text type="secondary">Error al mostrar el archivo</Typography.Text>
      </div>
    );
  }
};

export default StudentNotesPage;