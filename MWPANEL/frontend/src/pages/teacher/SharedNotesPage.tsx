/**
 * @archivo: SharedNotesPage.tsx
 * @módulo: Teacher/SharedNotes (Página de Apuntes Compartidos para Profesores)
 * @función: Vista completa de apuntes compartidos por estudiantes con el profesor
 * @características:
 *   - Lista de apuntes compartidos con el profesor
 *   - Filtros por tipo, estudiante, materia
 *   - Descarga y visualización de apuntes
 *   - Marcado como visto
 *   - Respuesta/comentarios a estudiantes
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Avatar,
  Typography,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Row,
  Col,
  Empty,
  Spin,
  message,
  Modal,
  Dropdown,
  Menu,
  Divider,
  Comment,
  Form,
} from 'antd';
import {
  FileTextOutlined,
  SoundOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilterOutlined,
  SearchOutlined,
  MessageOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  SendOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import apiClient from '../../services/apiClient';
import VoicePlayer from '../../components/student-notes/VoicePlayer';
import PresentationViewer from '../../components/student-notes/PresentationViewer';
import SharedNoteViewModal from '../../components/student-notes/SharedNoteViewModal';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface SharedNote {
  id: string;
  noteTitle: string;
  noteType: 'text' | 'voice' | 'drawing' | 'presentation' | 'file';
  message: string;
  status: 'active' | 'expired' | 'revoked';
  permissions: {
    canView: boolean;
    canDownload: boolean;
    canComment: boolean;
  };
  sharedAt: string;
  expiresAt?: string;
  lastAccessedAt?: string;
  accessCount: number;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
  subject?: {
    id: string;
    name: string;
    color?: string;
  };
  fileInfo?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

interface SharedNotesResponse {
  sharedNotes: SharedNote[];
  total: number;
  totalPages: number;
}

const SharedNotesPage: React.FC = () => {
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    noteType: '',
    studentId: '',
    subjectId: '',
  });
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // Estados para modal de visualización
  const [selectedNote, setSelectedNote] = useState<SharedNote | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  
  const navigate = useNavigate();

  // Fetch shared notes
  const fetchSharedNotes = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filters.search && { search: filters.search }),
        ...(filters.noteType && { noteType: filters.noteType }),
        ...(filters.studentId && { studentId: filters.studentId }),
        ...(filters.subjectId && { subjectId: filters.subjectId }),
      });

      const response = await apiClient.get(`/student-notes/sharing/shared-with-me?${params}`);
      
      if (response.data.success) {
        // Adaptar la estructura de datos del backend al formato esperado por el frontend
        const adaptedNotes = response.data.data.sharedNotes.map((item: any) => ({
          id: item.id,
          noteTitle: item.note.title,
          noteType: item.note.type,
          message: item.message || '',
          status: item.status,
          // ✅ AGREGAR LA ESTRUCTURA COMPLETA DE NOTE
          note: {
            id: item.note.id,
            title: item.note.title,
            type: item.note.type,
            content: item.note.content,  // ⭐ CONTENIDO QUE SE ESTABA PERDIENDO
            fileUrl: item.note.fileUrl,
            fileName: item.note.fileName,
            fileMimeType: item.note.fileMimeType,
            fileSize: item.note.fileSize,
            metadata: item.note.metadata,
            tags: item.note.tags,
            createdAt: item.note.createdAt,
            subject: item.note.subject,
          },
          permissions: {
            canView: item.permissions.view,
            canDownload: item.permissions.download,
            canComment: item.permissions.comment,
          },
          sharedAt: item.sharedAt,
          expiresAt: item.expiresAt,
          lastAccessedAt: item.lastAccessedAt,
          accessCount: item.accessCount,
          student: {
            id: item.sharedBy.id,
            firstName: item.sharedBy.firstName,
            lastName: item.sharedBy.lastName,
            profilePicture: item.sharedBy.profilePicture,
          },
          fileInfo: item.note.fileName ? {
            fileName: item.note.fileName,
            fileSize: item.note.fileSize || 0,
            mimeType: item.note.fileMimeType || '',
            url: item.note.fileUrl,  // ⭐ TAMBIÉN AGREGAR LA URL
            duration: item.note.metadata?.duration,
            driveFileId: item.note.metadata?.driveFileId,
          } : undefined,
        }));
        
        setSharedNotes(adaptedNotes);
        setTotal(response.data.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching shared notes:', error);
      message.error('Error al cargar los apuntes compartidos');
    } finally {
      setLoading(false);
    }
  };

  // Fetch students and subjects for filters
  const fetchFiltersData = async () => {
    try {
      const subjectAssignmentsRes = await apiClient.get('/activities/teacher/subject-assignments');
      const subjectAssignments = subjectAssignmentsRes.data;
      
      // Extraer estudiantes únicos de todas las asignaciones del profesor
      const studentMap = new Map();
      const uniqueStudents = [];
      
      subjectAssignments.forEach(assignment => {
        assignment.students.forEach(student => {
          if (!studentMap.has(student.id)) {
            studentMap.set(student.id, {
              id: student.id,
              firstName: student.user.profile.firstName,
              lastName: student.user.profile.lastName,
            });
            uniqueStudents.push(studentMap.get(student.id));
          }
        });
      });
      
      // Extraer asignaturas únicas de las asignaciones del profesor
      const uniqueSubjects = [];
      const subjectMap = new Map();
      
      subjectAssignments.forEach(assignment => {
        if (!subjectMap.has(assignment.subject.id)) {
          subjectMap.set(assignment.subject.id, {
            id: assignment.subject.id,
            name: assignment.subject.name,
            code: assignment.subject.code,
          });
          uniqueSubjects.push(subjectMap.get(assignment.subject.id));
        }
      });
      
      setStudents(uniqueStudents);
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  useEffect(() => {
    fetchSharedNotes();
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchSharedNotes(1);
  }, [filters]);

  // Download shared note
  const handleDownload = async (noteId: string, fileName: string) => {
    try {
      const authData = localStorage.getItem('mw-panel-auth');
      let token = null;
      
      if (authData) {
        try {
          const { state } = JSON.parse(authData);
          token = state.accessToken;
        } catch (error) {
          console.warn('Failed to parse auth data:', error);
        }
      }

      if (!token) {
        message.error('No estás autenticado');
        return;
      }

      const response = await fetch(`https://plataforma.mundoworld.school/api/student-notes/shared/${noteId}/stream`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('Archivo descargado correctamente');
      
      // Record access
      await apiClient.post(`/student-notes/shared/${noteId}/access`);
    } catch (error) {
      console.error('Error downloading file:', error);
      message.error('Error al descargar el archivo');
    }
  };

  // View note content
  const handleViewNote = async (note: SharedNote) => {
    try {
      setSelectedNote(note);
      setViewModalVisible(true);
      
      // Also mark as accessed
      await apiClient.post(`/student-notes/shared/${note.id}/access`);
      await fetchSharedNotes(currentPage);
    } catch (error) {
      console.error('Error viewing note:', error);
      message.error('Error al ver el apunte');
    }
  };

  // Mark note as accessed (solo incrementar contador)
  const handleMarkAsAccessed = async (noteId: string) => {
    try {
      await apiClient.post(`/student-notes/shared/${noteId}/access`);
      await fetchSharedNotes(currentPage);
      message.success('Apunte marcado como visto');
    } catch (error) {
      console.error('Error marking as accessed:', error);
      message.error('Error al marcar como visto');
    }
  };

  // Open comment modal
  const handleOpenCommentModal = (note: SharedNote) => {
    if (!note.permissions.canComment) {
      message.warning('No tienes permisos para comentar este apunte');
      return;
    }
    setSelectedNote(note);
    setCommentText('');
    setCommentModalVisible(true);
  };

  // Send comment
  const handleSendComment = async () => {
    if (!selectedNote || !commentText.trim()) {
      message.warning('Por favor escribe un comentario');
      return;
    }

    try {
      setCommentLoading(true);
      // Usar el endpoint correcto de comentarios
      await apiClient.post(`/student-notes/shared/${selectedNote.id}/comments`, {
        content: commentText.trim()
      });
      
      message.success('Comentario enviado al estudiante');
      setCommentModalVisible(false);
      setCommentText('');
      setSelectedNote(null);
    } catch (error) {
      console.error('Error sending comment:', error);
      message.error('Error al enviar el comentario');
    } finally {
      setCommentLoading(false);
    }
  };

  // Get note type icon and color
  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'voice':
        return <SoundOutlined style={{ color: '#52c41a' }} />;
      case 'drawing':
        return <PictureOutlined style={{ color: '#1890ff' }} />;
      case 'presentation':
        return <VideoCameraOutlined style={{ color: '#fa8c16' }} />;
      case 'file':
        return <FileTextOutlined style={{ color: '#722ed1' }} />;
      default:
        return <FileTextOutlined style={{ color: '#666' }} />;
    }
  };

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'voice':
        return 'Audio';
      case 'drawing':
        return 'Dibujo';
      case 'presentation':
        return 'Presentación';
      case 'file':
        return 'Archivo';
      default:
        return 'Texto';
    }
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'voice':
        return 'green';
      case 'drawing':
        return 'blue';
      case 'presentation':
        return 'orange';
      case 'file':
        return 'purple';
      default:
        return 'default';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <FileTextOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Apuntes Compartidos Conmigo
          </Title>
          <Paragraph type="secondary">
            Visualiza y gestiona los apuntes que los estudiantes han compartido contigo
          </Paragraph>
        </div>

        {/* Filters */}
        <Card size="small" style={{ marginBottom: '24px', backgroundColor: '#fafafa' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Search
                placeholder="Buscar apuntes..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Tipo de apunte"
                value={filters.noteType}
                onChange={(value) => setFilters(prev => ({ ...prev, noteType: value }))}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="text">Texto</Option>
                <Option value="voice">Audio</Option>
                <Option value="drawing">Dibujo</Option>
                <Option value="presentation">Presentación</Option>
                <Option value="file">Archivo</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Estudiante"
                value={filters.studentId}
                onChange={(value) => setFilters(prev => ({ ...prev, studentId: value }))}
                style={{ width: '100%' }}
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {students.map((student) => (
                  <Option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Materia"
                value={filters.subjectId}
                onChange={(value) => setFilters(prev => ({ ...prev, subjectId: value }))}
                style={{ width: '100%' }}
                allowClear
              >
                {subjects.map((subject) => (
                  <Option key={subject.id} value={subject.id}>
                    {subject.name}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Notes List */}
        <Spin spinning={loading}>
          {sharedNotes.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No hay apuntes compartidos contigo"
            />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={sharedNotes}
              pagination={{
                current: currentPage,
                total: total,
                pageSize: 10,
                onChange: (page) => {
                  setCurrentPage(page);
                  fetchSharedNotes(page);
                },
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} de ${total} apuntes`,
              }}
              renderItem={(note) => (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewNote(note)}
                      title="Ver contenido del apunte"
                    />,
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(note.id, note.fileInfo?.fileName || 'archivo')}
                      disabled={!note.permissions.canDownload}
                      title="Descargar"
                    />,
                    <Button
                      type="text"
                      icon={<MessageOutlined />}
                      onClick={() => handleOpenCommentModal(note)}
                      disabled={!note.permissions.canComment}
                      title="Enviar comentario al estudiante"
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        src={note.student.profilePicture}
                        icon={<UserOutlined />}
                        size="large"
                      />
                    }
                    title={
                      <div>
                        <Space>
                          {getNoteTypeIcon(note.noteType)}
                          <Text strong>{note.noteTitle}</Text>
                          <Tag color={getNoteTypeColor(note.noteType)}>
                            {getNoteTypeLabel(note.noteType)}
                          </Tag>
                          {note.subject && (
                            <Tag color="blue" icon={<BookOutlined />}>
                              {note.subject.name}
                            </Tag>
                          )}
                        </Space>
                        <div style={{ marginTop: '4px' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            <UserOutlined style={{ marginRight: '4px' }} />
                            {note.student.firstName} {note.student.lastName}
                            <CalendarOutlined style={{ marginLeft: '12px', marginRight: '4px' }} />
                            {dayjs(note.sharedAt).fromNow()}
                            {note.accessCount > 0 && (
                              <span style={{ marginLeft: '12px' }}>
                                <EyeOutlined style={{ marginRight: '4px' }} />
                                Visto {note.accessCount} {note.accessCount === 1 ? 'vez' : 'veces'}
                              </span>
                            )}
                          </Text>
                        </div>
                      </div>
                    }
                    description={
                      <div>
                        <Paragraph
                          ellipsis={{ rows: 2, expandable: true, symbol: 'ver más' }}
                          style={{ marginBottom: '8px' }}
                        >
                          {note.message || 'Sin mensaje adicional'}
                        </Paragraph>
                        {note.fileInfo && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            📁 {note.fileInfo.fileName} • {formatFileSize(note.fileInfo.fileSize)}
                          </Text>
                        )}
                        {note.expiresAt && (
                          <div style={{ marginTop: '4px' }}>
                            <Text type="warning" style={{ fontSize: '12px' }}>
                              ⏰ Expira {dayjs(note.expiresAt).fromNow()}
                            </Text>
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>


      {/* Modal de Comentarios */}
      <Modal
        title={
          <Space>
            <CommentOutlined />
            <span>Enviar comentario</span>
          </Space>
        }
        open={commentModalVisible}
        onCancel={() => {
          setCommentModalVisible(false);
          setSelectedNote(null);
          setCommentText('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setCommentModalVisible(false);
              setSelectedNote(null);
              setCommentText('');
            }}
          >
            Cancelar
          </Button>,
          <Button
            key="send"
            type="primary"
            icon={<SendOutlined />}
            loading={commentLoading}
            onClick={handleSendComment}
            disabled={!commentText.trim()}
          >
            Enviar Comentario
          </Button>,
        ]}
      >
        {selectedNote && (
          <div>
            <Text>
              Enviando comentario sobre "<strong>{selectedNote.noteTitle}</strong>" a{' '}
              <strong>{selectedNote.student.firstName} {selectedNote.student.lastName}</strong>
            </Text>
            <Input.TextArea
              rows={4}
              placeholder="Escribe tu comentario aquí..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={{ marginTop: '16px' }}
              maxLength={500}
              showCount
            />
          </div>
        )}
      </Modal>

      {/* Modal de visualización de contenido - Componente reutilizable */}
      <SharedNoteViewModal
        visible={viewModalVisible}
        sharedNote={selectedNote ? {
          ...selectedNote,
          // La estructura de note ya está completa, no necesito recrearla
          permissions: {
            view: true,
            comment: selectedNote.permissions.canComment,
            download: selectedNote.permissions.canDownload
          },
          sharedBy: selectedNote.student,
        } : null}
        onClose={() => {
          setViewModalVisible(false);
          setSelectedNote(null);
        }}
        type="received"
      />
    </div>
  );
};

export default SharedNotesPage;