import React from 'react';
import { Modal, Typography, Tag, Space, Button, Divider, Card, Switch, message } from 'antd';
import {
  AudioOutlined,
  CalendarOutlined,
  TagsOutlined,
  HeartFilled,
  HeartOutlined,
  DownloadOutlined,
  EditOutlined,
  BookOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import { StudentNote } from '../../types/student-notes';
import VoicePlayer from './VoicePlayer';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Title, Text: AntText, Paragraph } = Typography;

interface VoiceNoteModalProps {
  note: StudentNote | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (note: StudentNote) => void;
  onToggleFavorite: (noteId: string) => void;
  onUpdateNote?: (note: StudentNote) => Promise<void>;
}

const VoiceNoteModal: React.FC<VoiceNoteModalProps> = ({
  note,
  isOpen,
  onClose,
  onEdit,
  onToggleFavorite,
  onUpdateNote,
}) => {
  if (!note) return null;

  const handleDownload = async () => {
    try {
      if (!note.webContentLink) {
        console.error('No hay URL de descarga disponible');
        return;
      }

      // Usar el endpoint de streaming del backend
      const audioUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/${note.id}/stream`;

      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = note.fileName || `nota-voz-${note.id}.mp3`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Descarga iniciada via streaming proxy:', note.id);
    } catch (error) {
      console.error('Error al descargar nota de voz:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      title={
        <div className="flex items-center justify-between" style={{ paddingRight: '40px' }}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <AudioOutlined className="text-green-600 text-lg" />
            </div>
            <div>
              <AntText className="text-lg font-semibold">Nota de Voz</AntText>
              <br />
              <AntText type="secondary" className="text-sm">
                {dayjs(note.createdAt).format('DD/MM/YYYY HH:mm')}
              </AntText>
            </div>
          </div>
          <Space>
            <AntText type="secondary" style={{ fontSize: '12px', marginRight: 8 }}>
              {note.isPrivate ? 'Privado' : 'Público'}
            </AntText>
            <Switch
              checked={!note.isPrivate}
              onChange={async (checked) => {
                if (onUpdateNote) {
                  try {
                    const updatedNote = {
                      ...note,
                      isPrivate: !checked
                    };
                    await onUpdateNote(updatedNote);
                    message.success(`Nota cambiada a ${checked ? 'pública' : 'privada'}`);
                  } catch (error) {
                    console.error('Error updating privacy:', error);
                    message.error('Error al cambiar privacidad');
                  }
                }
              }}
              checkedChildren="Público"
              unCheckedChildren="Privado"
              size="small"
            />
          </Space>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="edit" icon={<EditOutlined />} onClick={() => onEdit(note)}>
          Editar
        </Button>,
        <Button
          key="favorite"
          icon={note.isFavorite ? <HeartFilled /> : <HeartOutlined />}
          type={note.isFavorite ? 'primary' : 'default'}
          danger={note.isFavorite}
          onClick={() => onToggleFavorite(note.id)}
        >
          {note.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        </Button>,
        <Button 
          key="download" 
          icon={<DownloadOutlined />} 
          onClick={handleDownload}
          disabled={!note.webContentLink}
        >
          Descargar
        </Button>,
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>,
      ]}
      className="voice-note-modal"
    >
      <div className="space-y-6">
        {/* Título de la nota */}
        <div>
          <Title level={3} className="mb-2">
            {note.title}
          </Title>
          
          {/* Badges de estado */}
          <Space wrap>
            <Tag color="green" icon={<AudioOutlined />}>
              AUDIO
            </Tag>
            {note.isFavorite && (
              <Tag color="red" icon={<HeartFilled />}>
                FAVORITO
              </Tag>
            )}
            {note.isPrivate ? (
              <Tag color="orange">PRIVADO</Tag>
            ) : (
              <Tag color="blue">PÚBLICO</Tag>
            )}
          </Space>
        </div>

        {/* Reproductor de voz principal */}
        {note.webContentLink ? (
          <Card className="bg-gradient-to-r from-blue-50 to-green-50">
            {(() => {
              // Usar el endpoint de streaming del backend
              const audioUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/${note.id}/stream`;
              
              console.log('🎵 VoiceNoteModal: Renderizando VoicePlayer con streaming proxy:', {
                noteId: note.id,
                streamingUrl: audioUrl,
                originalGoogleDriveUrl: note.webContentLink
              });
              
              return (
                <VoicePlayer
                  audioUrl={audioUrl}
                  fileName={note.fileName}
                  duration={note.duration}
                  onDownload={handleDownload}
                  compact={false}
                />
              );
            })()}
          </Card>
        ) : (
          <Card className="bg-red-50 border-red-200">
            <div className="text-center py-4">
              <AntText type="danger">
                ⚠️ Archivo de audio no disponible o URL no válida
              </AntText>
              <br />
              <AntText type="secondary" className="text-sm">
                Es posible que el archivo haya sido eliminado o movido
              </AntText>
            </div>
          </Card>
        )}

        {/* Contenido y descripción */}
        <div>
          <Title level={5} className="mb-2">Descripción</Title>
          <Paragraph className="bg-gray-50 p-4 rounded-lg border">
            {note.content || 'Sin descripción adicional'}
          </Paragraph>
        </div>

        {/* Información del archivo */}
        <Card size="small" title="Información del archivo">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <AntText strong>Archivo:</AntText>
              <br />
              <AntText type="secondary">{note.fileName || 'Sin nombre'}</AntText>
            </div>
            <div>
              <AntText strong>Duración:</AntText>
              <br />
              <AntText type="secondary">
                {note.duration ? formatDuration(note.duration) : 'Desconocida'}
              </AntText>
            </div>
            <div>
              <AntText strong>Creado:</AntText>
              <br />
              <AntText type="secondary">
                {dayjs(note.createdAt).format('DD/MM/YYYY HH:mm')}
              </AntText>
            </div>
            <div>
              <AntText strong>Vistas:</AntText>
              <br />
              <AntText type="secondary">{note.viewCount} visualizaciones</AntText>
            </div>
          </div>
        </Card>

        {/* Metadata adicional */}
        <div className="space-y-3">
          {/* Asignatura */}
          {note.subject && (
            <div className="flex items-center space-x-2">
              <BookOutlined className="text-blue-500" />
              <AntText strong>Asignatura:</AntText>
              <Tag color="blue">{note.subject.name}</Tag>
            </div>
          )}

          {/* Etiquetas */}
          {note.tagsArray && note.tagsArray.length > 0 && (
            <div className="flex items-start space-x-2">
              <TagsOutlined className="text-gray-500 mt-1" />
              <div>
                <AntText strong className="block mb-1">Etiquetas:</AntText>
                <Space wrap>
                  {note.tagsArray.map((tag, index) => (
                    <Tag key={index} color="purple">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          )}

          {/* Fechas */}
          <div className="flex items-center space-x-2">
            <CalendarOutlined className="text-gray-500" />
            <AntText strong>Última actualización:</AntText>
            <AntText type="secondary">
              {dayjs(note.updatedAt).fromNow()}
            </AntText>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default VoiceNoteModal;