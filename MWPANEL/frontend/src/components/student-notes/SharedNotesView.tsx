import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Typography,
  Space,
  Tag,
  Button,
  Avatar,
  Tooltip,
  Empty,
  Spin,
  Alert,
  Input,
  Select,
  Row,
  Col,
  Divider,
  Modal,
  message,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  AudioOutlined,
  PictureOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import {
  SharedNote,
  SharedNotesQueryDto,
  SharedNoteType,
  SharedNoteStatus,
  NoteType,
} from '../../types/student-notes';
import studentNotesApi from '../../services/studentNotesApi';
import SharedNoteViewModal from './SharedNoteViewModal';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface SharedNotesViewProps {
  type: 'received' | 'sent';
}

// Iconos por tipo de nota
const typeIcons: Record<NoteType, React.ReactNode> = {
  [NoteType.TEXT]: <FileTextOutlined />,
  [NoteType.VOICE]: <AudioOutlined />,
  [NoteType.DRAWING]: <PictureOutlined />,
  [NoteType.PRESENTATION]: <FileImageOutlined />,
  [NoteType.MIXED]: <BookOutlined />,
};

// Colores por tipo de compartición
const shareTypeColors: Record<SharedNoteType, string> = {
  [SharedNoteType.STUDENT]: '#52c41a',
  [SharedNoteType.TEACHER]: '#1890ff',
};

export const SharedNotesView: React.FC<SharedNotesViewProps> = ({ type }) => {
  const [loading, setLoading] = useState(false);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<SharedNotesQueryDto>({
    page: 1,
    limit: 10,
  });
  const [selectedNote, setSelectedNote] = useState<SharedNote | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadSharedNotes();
  }, [type, filters]);

  const loadSharedNotes = async () => {
    setLoading(true);
    try {
      const apiCall = type === 'received' 
        ? studentNotesApi.getSharedWithMe(filters)
        : studentNotesApi.getSharedByMe(filters);
        
      const result = await apiCall;
      setSharedNotes(result.sharedNotes);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Error loading shared notes:', error);
      message.error('Error al cargar los apuntes compartidos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      search: value || undefined, 
      page: 1 
    }));
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value || undefined, 
      page: 1 
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleViewNote = async (sharedNote: SharedNote) => {
    try {
      console.log('🔍 Intentando ver apunte compartido:', sharedNote);
      
      // Validar que la estructura de datos sea correcta
      if (!sharedNote || !sharedNote.note) {
        throw new Error('Estructura de apunte compartido inválida');
      }

      // 🔒 VALIDACIÓN FRONTEND: Prevenir acceso a apuntes expirados
      if (sharedNote.isExpired) {
        message.error('Este apunte compartido ha expirado y ya no está disponible');
        return;
      }

      // Registrar acceso si es un apunte recibido
      if (type === 'received') {
        console.log('📝 Registrando acceso para sharedNote.id:', sharedNote.id);
        try {
          await studentNotesApi.recordAccess(sharedNote.id);
          console.log('✅ Acceso registrado exitosamente');
        } catch (accessError) {
          console.error('❌ Error registrando acceso:', accessError);
          // Si el backend dice que está expirado, mostrar mensaje apropiado
          if (accessError.response?.status === 400) {
            message.error('Este apunte compartido ha expirado y ya no está disponible');
            loadSharedNotes(); // Recargar para reflejar estado actual
            return;
          }
          console.warn('⚠️ Error registrando acceso (continuando):', accessError);
        }
      }
      
      // Abrir el modal mejorado
      setSelectedNote(sharedNote);
      setModalVisible(true);
    } catch (error) {
      console.error('❌ Error al ver apunte compartido:', error);
      message.error(`Error al acceder al apunte: ${error.message}`);
    }
  };

  const handleDownloadSharedFile = async (sharedNote: SharedNote) => {
    try {
      console.log('⬇️ Downloading shared note:', sharedNote.id);
      
      // Check permissions
      if (!sharedNote.permissions.download) {
        message.error('No tienes permisos para descargar este archivo');
        return;
      }

      // Check if expired
      if (sharedNote.isExpired) {
        message.error('Este apunte ha expirado y ya no se puede descargar');
        return;
      }

      // Check if has file
      if (!sharedNote.note.fileName) {
        message.error('Este apunte no tiene archivo adjunto para descargar');
        return;
      }

      // Obtener token del localStorage (mismo método que otros componentes)
      let token = null;
      const authData = localStorage.getItem('mw-panel-auth');
      if (authData) {
        try {
          const { state } = JSON.parse(authData);
          token = state.accessToken;
        } catch (error) {
          console.warn('⬇️ Failed to parse auth data:', error);
        }
      }

      if (!token) {
        message.error('No estás autenticado');
        return;
      }

      // Create download URL - using stream endpoint
      const downloadUrl = `${process.env.REACT_APP_API_URL || 'https://plataforma.mundoworld.school/api'}/student-notes/shared/${sharedNote.id}/stream`;
      
      console.log('⬇️ Download URL:', downloadUrl);

      // Create temporary link for download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', sharedNote.note.fileName);
      
      // Add authorization header via fetch and blob
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      link.href = url;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Archivo descargado correctamente');
      console.log('✅ Download completed successfully');
      
    } catch (error) {
      console.error('❌ Download error:', error);
      message.error('Error al descargar el archivo: ' + error.message);
    }
  };

  const handleRevokeAccess = async (sharedNoteId: string) => {
    console.log('🚨 HANDLE REVOKE ACCESS CLICKED:', {
      sharedNoteId,
      timestamp: new Date().toISOString(),
      function: 'handleRevokeAccess'
    });
    
    Modal.confirm({
      title: '¿Estás seguro?',
      content: 'Se revocará el acceso a este apunte compartido. Esta acción no se puede deshacer.',
      icon: <ExclamationCircleOutlined />,
      okText: 'Sí, revocar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          console.log('🚨 CALLING API TO REVOKE:', sharedNoteId);
          const result = await studentNotesApi.revokeSharedNote(sharedNoteId);
          console.log('✅ REVOKE API SUCCESS:', result);
          message.success('Acceso revocado exitosamente');
          loadSharedNotes();
        } catch (error) {
          console.error('❌ REVOKE API ERROR:', error);
          console.error('❌ Error details:', error.response?.data);
          message.error('Error al revocar el acceso: ' + (error.response?.data?.message || error.message));
        }
      },
    });
  };

  const handleRemoveExpiredNote = async (sharedNoteId: string) => {
    const isRemovingReceived = type === 'received';
    
    Modal.confirm({
      title: isRemovingReceived ? '¿Eliminar apunte expirado?' : '¿Eliminar compartición expirada?',
      content: isRemovingReceived 
        ? 'Este apunte será eliminado de tu lista de apuntes compartidos. Esta acción no se puede deshacer.'
        : 'Esta compartición expirada será eliminada de tu lista. El apunte original permanecerá en "Mis Apuntes". Esta acción no se puede deshacer.',
      icon: <ExclamationCircleOutlined />,
      okText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await studentNotesApi.removeExpiredSharedNote(sharedNoteId);
          message.success(isRemovingReceived ? 'Apunte eliminado de tu lista' : 'Compartición eliminada de tu lista');
          loadSharedNotes();
        } catch (error) {
          console.error('Error removing expired note:', error);
          message.error('Error al eliminar');
        }
      },
    });
  };

  const renderSharedNoteItem = (sharedNote: SharedNote) => {
    const isExpired = sharedNote.isExpired;
    const isRevoked = sharedNote.status === SharedNoteStatus.REVOKED;
    const isReceived = type === 'received';
    
    // DEBUG: Log para verificar estado del botón eliminar
    console.log('🔍 DELETE BUTTON DEBUG:', {
      noteId: sharedNote.id,
      noteTitle: sharedNote.note?.title,
      isExpired,
      isReceived,
      showDeleteButton: isExpired, // CORREGIDO: cualquier apunte expirado puede eliminarse
      type,
      status: sharedNote.status
    });

    // 🚨 ADDITIONAL DEBUG: Verificar renderizado de acciones
    const deleteButtonShouldRender = isExpired; // Ahora cualquier apunte expirado (enviado o recibido)
    const revokeButtonShouldRender = !isReceived && !isExpired && !isRevoked; // Botón revocar para apuntes enviados activos
    
    console.log('🚨 BUTTON RENDER DEBUG:', {
      noteId: sharedNote.id,
      noteTitle: sharedNote.note?.title,
      isReceived,
      isExpired,
      isRevoked,
      type,
      deleteButtonShouldRender,
      revokeButtonShouldRender,
      noteExpiry: sharedNote.expiresAt,
      buttonCount: (revokeButtonShouldRender ? 1 : 0) + (deleteButtonShouldRender ? 1 : 0),
      expectedButtons: revokeButtonShouldRender ? 'SHOULD HAVE REVOKE BUTTON' : deleteButtonShouldRender ? 'SHOULD HAVE DELETE BUTTON' : 'NO ACTION BUTTONS'
    });

    return (
      <motion.div
        key={sharedNote.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        <List.Item
          style={{ 
            padding: '16px',
            opacity: isExpired || isRevoked ? 0.6 : 1,
          }}
          actions={[
            <Tooltip title={isExpired ? "Acceso expirado - No disponible" : "Ver apunte"}>
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewNote(sharedNote)}
                disabled={isExpired || (isRevoked && !isReceived)}
                style={{ 
                  opacity: isExpired ? 0.3 : 1,
                  color: isExpired ? '#ff4d4f' : undefined 
                }}
              />
            </Tooltip>,
            ...(sharedNote.permissions.download ? [
              <Tooltip title={isExpired ? "Descarga expirada - No disponible" : "Descargar"}>
                <Button
                  type="text"
                  icon={<DownloadOutlined />}
                  disabled={isExpired || isRevoked}
                  onClick={() => handleDownloadSharedFile(sharedNote)}
                  style={{ 
                    opacity: isExpired ? 0.3 : 1,
                    color: isExpired ? '#ff4d4f' : undefined 
                  }}
                />
              </Tooltip>
            ] : []),
            ...(!isReceived && !isExpired ? [
              <Tooltip title="Revocar acceso">
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => handleRevokeAccess(sharedNote.id)}
                  disabled={isRevoked}
                />
              </Tooltip>
            ] : []),
            ...(isExpired ? [
              <Tooltip title={isReceived ? "Eliminar de mi lista" : "Eliminar compartición expirada"}>
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => handleRemoveExpiredNote(sharedNote.id)}
                />
              </Tooltip>
            ] : []),
          ]}
        >
          <List.Item.Meta
            avatar={
              <Avatar 
                src={isReceived ? sharedNote.sharedBy.photoUrl : sharedNote.sharedWith.photoUrl}
                icon={<UserOutlined />} 
              />
            }
            title={
              <Space wrap>
                <Text strong style={{ color: isExpired || isRevoked ? '#999' : '#000' }}>
                  {sharedNote.note.title}
                </Text>
                <Tag 
                  icon={typeIcons[sharedNote.note.type as NoteType]}
                  color={isExpired || isRevoked ? 'default' : 'blue'}
                  style={{ fontSize: '11px' }}
                >
                  {sharedNote.note.type.toUpperCase()}
                </Tag>
                <Tag 
                  color={shareTypeColors[sharedNote.sharedWithType]}
                  style={{ fontSize: '11px' }}
                >
                  {sharedNote.sharedWithType === SharedNoteType.STUDENT ? (
                    <><TeamOutlined style={{ marginRight: 2 }} />COMPAÑERO</>
                  ) : (
                    <><UserOutlined style={{ marginRight: 2 }} />PROFESOR</>
                  )}
                </Tag>
                {isExpired && (
                  <Tag 
                    color="red" 
                    style={{ 
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: '#fff2f0',
                      borderColor: '#ffccc7',
                      color: '#ff4d4f'
                    }}
                    icon={<ClockCircleOutlined />}
                  >
                    ACCESO EXPIRADO
                  </Tag>
                )}
                {isRevoked && (
                  <Tag color="default" style={{ fontSize: '11px' }}>
                    REVOCADO
                  </Tag>
                )}
              </Space>
            }
            description={
              <div>
                <Text type="secondary">
                  {isReceived ? 'Compartido por' : 'Compartido con'}: {' '}
                  <Text strong>
                    {studentNotesApi.formatFullName(
                      isReceived ? sharedNote.sharedBy.firstName : sharedNote.sharedWith.firstName,
                      isReceived ? sharedNote.sharedBy.lastName : sharedNote.sharedWith.lastName
                    )}
                  </Text>
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {studentNotesApi.formatRelativeTime(sharedNote.sharedAt)}
                  {sharedNote.accessCount > 0 && isReceived && (
                    <span style={{ marginLeft: 8 }}>
                      • Visto {sharedNote.accessCount} {sharedNote.accessCount === 1 ? 'vez' : 'veces'}
                    </span>
                  )}
                </Text>
                {sharedNote.message && (
                  <div style={{ marginTop: 8 }}>
                    <Paragraph 
                      style={{ 
                        fontSize: '13px', 
                        fontStyle: 'italic',
                        margin: 0,
                        padding: '6px 10px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        borderLeft: '3px solid #1890ff'
                      }}
                      ellipsis={{ rows: 2, expandable: false }}
                    >
                      💬 {sharedNote.message}
                    </Paragraph>
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    Permisos: {sharedNote.permissions.view && 'Ver'} 
                    {sharedNote.permissions.comment && ' • Comentar'}
                    {sharedNote.permissions.download && ' • Descargar'}
                  </Text>
                  {sharedNote.expiresAt && (
                    <Text type="secondary" style={{ fontSize: '11px', marginLeft: 8 }}>
                      • Expira: {dayjs(sharedNote.expiresAt).format('DD/MM/YYYY')}
                    </Text>
                  )}
                </div>
              </div>
            }
          />
        </List.Item>
      </motion.div>
    );
  };

  return (
    <Card
      title={
        <Space>
          {type === 'received' ? (
            <>
              <BookOutlined style={{ color: '#52c41a' }} />
              <span>Apuntes Compartidos Conmigo</span>
            </>
          ) : (
            <>
              <TeamOutlined style={{ color: '#1890ff' }} />
              <span>Apuntes que he Compartido</span>
            </>
          )}
        </Space>
      }
      extra={
        <Text type="secondary">
          {pagination.total} apunte{pagination.total !== 1 ? 's' : ''}
        </Text>
      }
    >
      {/* Filtros */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="Buscar apuntes..."
            onSearch={handleSearch}
            allowClear
            enterButton
            size="middle"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Select
            placeholder="Filtrar por tipo de compartición"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => handleFilterChange('sharedWithType', value)}
          >
            <Option value={SharedNoteType.STUDENT}>
              <TeamOutlined /> Compañeros
            </Option>
            <Option value={SharedNoteType.TEACHER}>
              <UserOutlined /> Profesores
            </Option>
          </Select>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Select
            placeholder="Ordenar por"
            style={{ width: '100%' }}
            defaultValue="sharedAt"
            onChange={(value) => handleFilterChange('sortBy', value)}
          >
            <Option value="sharedAt">Fecha compartido</Option>
            <Option value="lastAccessedAt">Último acceso</Option>
            <Option value="accessCount">Número de accesos</Option>
          </Select>
        </Col>
      </Row>

      <Divider />

      {/* Lista de apuntes */}
      <Spin spinning={loading}>
        {sharedNotes.length === 0 && !loading ? (
          <Empty
            description={
              type === 'received' 
                ? 'No tienes apuntes compartidos contigo'
                : 'No has compartido ningún apunte'
            }
            style={{ padding: '40px 20px' }}
          />
        ) : (
          <List
            dataSource={sharedNotes}
            renderItem={renderSharedNoteItem}
            pagination={
              pagination.totalPages > 1 ? {
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} de ${total} apuntes`,
                onChange: handlePageChange,
              } : false
            }
          />
        )}
      </Spin>
      
      {/* Modal mejorado para visualización de apuntes compartidos */}
      <SharedNoteViewModal
        visible={modalVisible}
        sharedNote={selectedNote}
        onClose={() => {
          setModalVisible(false);
          setSelectedNote(null);
        }}
        type={type}
      />
    </Card>
  );
};

export default SharedNotesView;