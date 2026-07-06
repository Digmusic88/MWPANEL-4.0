import React, { useState, useRef, useEffect } from 'react';
import {
  Layout,
  Button,
  Input,
  Space,
  Typography,
  Spin,
  message,
  Modal,
  Select,
  Tag,
  Tooltip,
  Card,
  Row,
  Col,
  Divider,
  Switch
} from 'antd';
import {
  SaveOutlined,
  DownloadOutlined,
  CloseOutlined,
  FileTextOutlined,
  LoadingOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  SettingOutlined,
  FilePdfOutlined,
  PlayCircleOutlined,
  AudioOutlined
} from '@ant-design/icons';
// Importar ReactQuill como alternativa a TinyMCE
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/apiClient';
import { NoteType, StudentNote } from '../../types/student-notes';
import useSubjects from '../../hooks/useSubjects';
import VoiceRecorder from './VoiceRecorder';
import VoicePlayer from './VoicePlayer';
import PresentationEditor from './PresentationEditor';

const { Header, Content } = Layout;
const { Title, Text: AntText } = Typography;
const { Option } = Select;

interface EditorIntegradoProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: StudentNote) => void;
  editingNote?: StudentNote;
  initialContent?: string;
  tipo?: NoteType;
}

const EditorIntegrado: React.FC<EditorIntegradoProps> = ({
  isOpen,
  onClose,
  onSave,
  editingNote,
  initialContent = '',
  tipo = NoteType.TEXT
}) => {
  // Estados del editor
  const [titulo, setTitulo] = useState(editingNote?.title || '');
  const [contenido, setContenido] = useState(editingNote?.content || initialContent);
  const [subjectId, setSubjectId] = useState(editingNote?.subjectId || '');
  const [tags, setTags] = useState<string[]>(editingNote?.tagsArray || []);
  const [isPrivate, setIsPrivate] = useState(editingNote?.isPrivate ?? true);
  const [isGuardando, setIsGuardando] = useState(false);
  const [isDescargando, setIsDescargando] = useState(false);
  const [modoVistaPrevia, setModoVistaPrevia] = useState(false);
  const [palabras, setPalabras] = useState(0);
  const [caracteres, setCaracteres] = useState(0);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  // Variable eliminada: tinymceLoaded (ya no necesaria con ReactQuill)

  // Hooks
  const { subjects = [], loading: subjectsLoading } = useSubjects();
  const editorRef = useRef<any>(null);

  // Configuración eliminada: TinyMCE (reemplazado por ReactQuill)

  // Efectos
  useEffect(() => {
    if (editingNote) {
      setTitulo(editingNote.title);
      setContenido(editingNote.content);
      setSubjectId(editingNote.subjectId || '');
      setTags(editingNote.tagsArray || []);
      setIsPrivate(editingNote.isPrivate);
      
      // ReactQuill maneja el contenido automáticamente a través del prop value
      // No necesita setContent manual como TinyMCE
      
      // Los videos ya se redimensionan automáticamente por CSS
    }
  }, [editingNote]);

  // Efecto para CSS básico de dropdowns
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'editor-custom-styles';
    style.textContent = `
      /* Z-index para dropdowns de Ant Design */
      .ant-select-dropdown {
        z-index: 1000 !important;
      }
      
      .ant-dropdown {
        z-index: 1000 !important;
      }
      
      .ant-tooltip {
        z-index: 1000 !important;
      }
      
      .ant-modal-wrap {
        z-index: 1000 !important;
      }

      /* Estilos para ReactQuill */
      .ql-container {
        font-family: Helvetica, Arial, sans-serif;
      }
      
      .ql-editor {
        min-height: 300px;
        direction: ltr;
        text-align: left;
      }

      /* Estilos para imágenes redimensionables */
      .ql-editor img {
        cursor: pointer;
        transition: all 0.2s ease;
        max-width: 100%;
        height: auto;
        border: 2px solid transparent;
      }

      .ql-editor img:hover {
        border: 2px solid #1890ff;
        box-shadow: 0 0 8px rgba(24, 144, 255, 0.3);
      }

      .ql-editor img.selected {
        border: 2px solid #1890ff;
        box-shadow: 0 0 8px rgba(24, 144, 255, 0.5);
      }

      /* Estilos para videos de YouTube */
      .ql-editor .youtube-embed {
        position: relative;
        padding-bottom: 56.25%;
        height: 0;
        overflow: hidden;
        max-width: 100%;
        margin: 16px 0;
        border: 2px solid #f0f0f0;
        border-radius: 8px;
        transition: all 0.2s ease;
      }

      .ql-editor .youtube-embed:hover {
        border-color: #1890ff;
        box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
      }

      .ql-editor .youtube-embed iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 6px;
      }

      /* VIDEOS NATIVOS DE REACTQUILL - TAMAÑO GRANDE POR DEFECTO */
      .ql-editor iframe.ql-video {
        width: 800px !important;
        height: 450px !important;
        min-width: 800px !important;
        min-height: 450px !important;
        max-width: none !important;
        display: block !important;
        margin: 16px auto !important;
        border: 2px solid #f0f0f0 !important;
        border-radius: 8px !important;
        transition: all 0.2s ease !important;
        resize: both !important;
        overflow: hidden !important;
      }

      /* Hover effect para videos nativos */
      .ql-editor iframe.ql-video:hover {
        border-color: #1890ff !important;
        box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15) !important;
      }

      .ql-editor .resizable-video:hover {
        border-color: #1890ff;
        box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
      }

      .ql-editor .resizable-video:hover .resize-handles {
        opacity: 1;
      }

      .ql-editor .resizable-video iframe {
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 6px;
        pointer-events: auto;
      }

      /* Responsive para pantallas pequeñas */
      @media (max-width: 768px) {
        .ql-editor iframe.ql-video {
          width: 100% !important;
          height: 250px !important;
          min-width: 280px !important;
          min-height: 180px !important;
        }
      }

      /* Asegurar que resize funcione correctamente */
      .ql-editor iframe.ql-video {
        box-sizing: border-box !important;
      }

      /* Instrucciones para el usuario */
      .ql-editor iframe.ql-video::after {
        content: "Arrastra las esquinas para redimensionar";
        position: absolute;
        bottom: -25px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 12px;
        color: #666;
        background: rgba(255, 255, 255, 0.9);
        padding: 2px 8px;
        border-radius: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .ql-editor iframe.ql-video:hover::after {
        opacity: 1;
      }

    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('editor-custom-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Configurar tooltips en español para ReactQuill
  useEffect(() => {
    if (isOpen && editorRef.current) {
      // Esperar a que el editor se monte
      setTimeout(() => {
        const tooltips = {
          '.ql-bold': 'Negrita',
          '.ql-italic': 'Cursiva', 
          '.ql-underline': 'Subrayado',
          '.ql-strike': 'Tachado',
          '.ql-header[value="1"]': 'Título 1',
          '.ql-header[value="2"]': 'Título 2', 
          '.ql-header[value="3"]': 'Título 3',
          '.ql-list[value="ordered"]': 'Lista numerada',
          '.ql-list[value="bullet"]': 'Lista con viñetas',
          '.ql-indent[value="-1"]': 'Reducir sangría',
          '.ql-indent[value="+1"]': 'Aumentar sangría',
          '.ql-align': 'Alineación',
          '.ql-link': 'Insertar enlace',
          '.ql-image': 'Insertar imagen',
          '.ql-clean': 'Limpiar formato',
          '.ql-color': 'Color de texto',
          '.ql-background': 'Color de fondo'
        };

        Object.entries(tooltips).forEach(([selector, title]) => {
          const element = document.querySelector(selector);
          if (element) {
            element.setAttribute('title', title);
          }
        });
      }, 100);
    }
  }, [isOpen]);

  // Configurar manejo de imágenes para redimensionado - TEMPORALMENTE DESHABILITADO
  /*
  useEffect(() => {
    if (isOpen && editorRef.current) {
      const handleImageClick = (event: Event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'IMG') {
          event.preventDefault();
          
          // Mostrar modal para redimensionar imagen
          const img = target as HTMLImageElement;
          const currentWidth = img.style.width || img.getAttribute('width') || 'auto';
          const newWidth = prompt(
            `Cambiar ancho de la imagen (ejemplos: 300px, 50%, auto).\nAncho actual: ${currentWidth}`,
            currentWidth
          );
          
          if (newWidth !== null) {
            if (newWidth === 'auto' || newWidth === '') {
              img.style.width = 'auto';
              img.style.height = 'auto';
              img.removeAttribute('width');
              img.removeAttribute('height');
            } else {
              // Validar que el formato sea correcto
              if (/^\d+(%|px)$/.test(newWidth) || newWidth === 'auto') {
                img.style.width = newWidth;
                img.style.height = 'auto';
                message.success('Tamaño de imagen actualizado');
              } else {
                message.error('Formato no válido. Usa: 300px, 50%, o auto');
              }
            }
          }
        }
      };

      // Agregar event listener al contenedor del editor
      const editorContainer = document.querySelector('.ql-editor');
      if (editorContainer) {
        editorContainer.addEventListener('dblclick', handleImageClick);
        
        return () => {
          editorContainer.removeEventListener('dblclick', handleImageClick);
        };
      }
    }
  }, [isOpen]);
  */

  // Efecto simplificado - solo aplicar estilos CSS para videos grandes
  useEffect(() => {
    if (isOpen) {
      console.log('📝 Editor abierto - Los videos aparecerán en 800x450px por CSS');
    }
  }, [isOpen]);


  // Funciones auxiliares para YouTube
  const getYouTubeVideoId = (url: string): string | null => {
    // Múltiples patrones para diferentes formatos de URL de YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }
    
    return null;
  };

  const insertYouTubeVideo = () => {
    const url = prompt('Ingresa la URL del video de YouTube:');
    console.log('📹 URL ingresada:', url);
    
    if (url && url.trim()) {
      const videoId = getYouTubeVideoId(url.trim());
      console.log('🔍 Video ID extraído:', videoId);
      
      if (videoId) {
        try {
          console.log('💡 Insertando video usando método nativo de ReactQuill (sin modificaciones DOM)...');
          
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;
          const quill = editorRef.current?.getEditor();
          
          if (quill) {
            const selection = quill.getSelection(true);
            const index = selection ? selection.index : quill.getLength();
            
            console.log('📍 Insertando en posición:', index);
            quill.insertEmbed(index, 'video', embedUrl);
            quill.setSelection(index + 1);
            
            console.log('✅ Video insertado correctamente usando formato nativo ReactQuill');
            message.success('Video de YouTube insertado correctamente (800x450px por defecto)');
          }
        } catch (error) {
          console.error('Error insertando video:', error);
          message.error('Error al insertar el video. Inténtalo de nuevo.');
        }
      } else {
        message.error('URL de YouTube no válida. Asegúrate de usar una URL completa como: https://www.youtube.com/watch?v=...');
      }
    }
  };

  // Función para manejar la grabación de voz
  const handleVoiceRecording = async (audioBlob: Blob, duration: number) => {
    try {
      console.log('🎤 Guardando nota de voz...', { duration, size: audioBlob.size });
      
      // Crear FormData para el upload
      const formData = new FormData();
      
      // Generar nombre de archivo único
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `nota-voz-${timestamp}.webm`;
      
      formData.append('file', audioBlob, fileName);
      formData.append('title', titulo || `Nota de voz ${new Date().toLocaleString()}`);
      formData.append('content', `🎵 Nota de voz grabada el ${new Date().toLocaleString()}\n\nDuración: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`);
      formData.append('isPrivate', isPrivate.toString());
      
      if (subjectId) {
        formData.append('subjectId', subjectId);
      }
      
      if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }
      
      formData.append('metadata', JSON.stringify({
        type: 'voice_note',
        duration: duration,
        recordedAt: new Date().toISOString(),
        originalFileName: fileName,
        createdWith: 'Voice Recorder'
      }));

      // Upload usando el endpoint existente
      const response = await apiClient.post('/student-notes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Nota de voz guardada:', response.data);
      
      message.success('Nota de voz guardada exitosamente');
      onSave(response.data);
      setShowVoiceRecorder(false);
      onClose();
      
    } catch (error: any) {
      console.error('❌ Error guardando nota de voz:', error);
      message.error(`Error al guardar la nota de voz: ${error.response?.data?.message || error.message}`);
    }
  };


  // Funciones de manejo
  const handleGuardarEnDrive = async () => {
    if (!titulo.trim()) {
      message.error('El título es obligatorio');
      return;
    }

    if (!contenido.trim()) {
      message.error('El contenido no puede estar vacío');
      return;
    }

    setIsGuardando(true);
    try {
      const noteData = {
        title: titulo,
        content: contenido,
        type: tipo,
        subjectId: subjectId || undefined,
        tags: tags,
        isPrivate: isPrivate,
        metadata: {
          wordCount: palabras,
          characterCount: caracteres,
          createdWith: 'ReactQuill Editor',
          lastSaved: new Date().toISOString()
        }
      };

      let response;
      if (editingNote) {
        // Actualizar nota existente
        response = await apiClient.put(`/student-notes/${editingNote.id}`, noteData);
      } else {
        // Crear nueva nota
        response = await apiClient.post('/student-notes', noteData);
      }

      if (response.data) {
        message.success(`Documento ${editingNote ? 'actualizado' : 'guardado'} exitosamente en Google Drive Institucional`);
        onSave(response.data);
        onClose();
      }
    } catch (error: any) {
      console.error('Error guardando documento:', error);
      message.error(`Error al guardar: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsGuardando(false);
    }
  };

  const handleDescargarHTML = () => {
    setIsDescargando(true);
    try {
      // Crear contenido HTML completo
      const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 10px;
        }
        .metadata {
            color: #666;
            font-size: 12px;
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <h1>${titulo}</h1>
    <div class="metadata">
        <p><strong>Creado:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <p><strong>Palabras:</strong> ${palabras} | <strong>Caracteres:</strong> ${caracteres}</p>
        ${tags.length > 0 ? `<p><strong>Etiquetas:</strong> ${tags.join(', ')}</p>` : ''}
    </div>
    <div class="content">
        ${contenido}
    </div>
</body>
</html>`;

      // Crear blob y descargar
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('Documento HTML descargado exitosamente');
    } catch (error) {
      message.error('Error al descargar el documento HTML');
      console.error('Error descargando HTML:', error);
    } finally {
      setIsDescargando(false);
    }
  };

  const handleDescargarPDF = () => {
    setIsDescargando(true);
    try {
      // Crear contenido HTML optimizado para PDF
      const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
    <style>
        @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
        }
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 10px;
            page-break-after: avoid;
        }
        .metadata {
            color: #666;
            font-size: 12px;
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
            page-break-inside: avoid;
        }
        .content {
            page-break-inside: avoid;
        }
        .content p {
            margin-bottom: 12px;
        }
        .content h1, .content h2, .content h3 {
            page-break-after: avoid;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .content ul, .content ol {
            margin-bottom: 12px;
            padding-left: 20px;
        }
        .content li {
            margin-bottom: 4px;
        }
        .content img {
            max-width: 100%;
            height: auto;
            page-break-inside: avoid;
        }
        .content blockquote {
            border-left: 4px solid #ddd;
            margin: 16px 0;
            padding-left: 16px;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>${titulo}</h1>
    <div class="metadata">
        <p><strong>Creado:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <p><strong>Palabras:</strong> ${palabras} | <strong>Caracteres:</strong> ${caracteres}</p>
        ${tags.length > 0 ? `<p><strong>Etiquetas:</strong> ${tags.join(', ')}</p>` : ''}
        <p><strong>Generado con:</strong> MW Panel - Sistema de Gestión Escolar</p>
    </div>
    <div class="content">
        ${contenido}
    </div>
</body>
</html>`;

      // Crear nueva ventana para imprimir
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Esperar a que se cargue y luego imprimir
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            // Cerrar la ventana después de imprimir
            setTimeout(() => {
              printWindow.close();
            }, 1000);
          }, 500);
        };
        
        message.success('Abriendo ventana de impresión para guardar como PDF');
      } else {
        throw new Error('No se pudo abrir la ventana de impresión');
      }
    } catch (error) {
      message.error('Error al generar PDF. Asegúrate de que los pop-ups estén permitidos.');
      console.error('Error generando PDF:', error);
    } finally {
      setIsDescargando(false);
    }
  };

  const handleAddTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-white"
          style={{ zIndex: 100 }}
        >
          <Layout className="h-full">
            {/* Header del Editor */}
            <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <FileTextOutlined className="text-xl text-blue-600" />
                <Input
                  placeholder="Título del documento..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="text-lg font-semibold border-none shadow-none"
                  style={{ fontSize: '18px' }}
                  maxLength={100}
                />
              </div>

              <Space size="middle">
                {/* Contador de palabras */}
                <div className="text-sm text-gray-500">
                  {palabras} palabras | {caracteres} caracteres
                </div>

                {/* Botón Vista Previa */}
                <Tooltip title="Vista previa">
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => setModoVistaPrevia(!modoVistaPrevia)}
                    type={modoVistaPrevia ? 'primary' : 'default'}
                  />
                </Tooltip>

                {/* Botón Video YouTube */}
                <Tooltip title="Insertar video de YouTube">
                  <Button
                    icon={<PlayCircleOutlined />}
                    onClick={insertYouTubeVideo}
                    disabled={modoVistaPrevia}
                  />
                </Tooltip>

                {/* Botón Grabador de Voz */}
                <Tooltip title="Grabar nota de voz">
                  <Button
                    icon={<AudioOutlined />}
                    onClick={() => setShowVoiceRecorder(true)}
                    disabled={modoVistaPrevia}
                    type={showVoiceRecorder ? 'primary' : 'default'}
                  />
                </Tooltip>

                {/* Botones Descargar */}
                <Tooltip title="Descargar como HTML">
                  <Button
                    icon={isDescargando ? <LoadingOutlined /> : <DownloadOutlined />}
                    onClick={handleDescargarHTML}
                    loading={isDescargando}
                  />
                </Tooltip>

                <Tooltip title="Descargar como PDF">
                  <Button
                    icon={isDescargando ? <LoadingOutlined /> : <FilePdfOutlined />}
                    onClick={handleDescargarPDF}
                    loading={isDescargando}
                  />
                </Tooltip>

                {/* Botón Guardar */}
                <Tooltip title="Los documentos se guardan en el Google Drive institucional compartido, no en tu Drive personal">
                  <Button
                    type="primary"
                    icon={isGuardando ? <LoadingOutlined /> : <SaveOutlined />}
                    onClick={handleGuardarEnDrive}
                    loading={isGuardando}
                    size="large"
                  >
                    {editingNote ? 'Actualizar' : 'Guardar en Drive Institucional'}
                  </Button>
                </Tooltip>

                {/* Botón Cerrar */}
                <Button
                  icon={<CloseOutlined />}
                  onClick={onClose}
                  danger
                />
              </Space>
            </Header>

            {/* Configuración y metadatos */}
            <div className="bg-gray-50 px-6 py-3 border-b">
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Space wrap>
                    {/* Selector de asignatura */}
                    <Select
                      placeholder={subjectsLoading ? "Cargando asignaturas..." : "Seleccionar asignatura (opcional)"}
                      value={subjectId}
                      onChange={setSubjectId}
                      style={{ width: 200 }}
                      allowClear
                      loading={subjectsLoading}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                      getPopupContainer={(trigger) => trigger.parentElement || document.body}
                      dropdownStyle={{ zIndex: 10000 }}
                    >
                      {subjects?.length > 0 ? (
                        subjects.map((subject: any) => (
                          <Option key={subject.id} value={subject.id}>
                            {subject.name}
                          </Option>
                        ))
                      ) : (
                        <Option disabled value="no-subjects">
                          {subjectsLoading ? "Cargando..." : "No hay asignaturas disponibles"}
                        </Option>
                      )}
                    </Select>

                    {/* Tags */}
                    <Select
                      mode="tags"
                      placeholder="Añadir etiquetas"
                      value={tags}
                      onChange={setTags}
                      style={{ minWidth: 200 }}
                      tokenSeparators={[',']}
                      getPopupContainer={(trigger) => trigger.parentElement || document.body}
                      dropdownStyle={{ zIndex: 10000 }}
                    />

                    {/* Privacidad */}
                    <Space>
                      <SettingOutlined />
                      <span className="text-sm mr-2">Privacidad:</span>
                      <Switch
                        checked={isPrivate}
                        onChange={setIsPrivate}
                        checkedChildren="Privado"
                        unCheckedChildren="Público"
                        size="small"
                      />
                    </Space>
                  </Space>
                </Col>
              </Row>
            </div>

            {/* Contenido del Editor */}
            <Content className="overflow-hidden">
              {modoVistaPrevia ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="h-full overflow-auto p-6 bg-white"
                >
                  <Card>
                    <Title level={2}>{titulo || 'Documento sin título'}</Title>
                    <div className="text-sm text-gray-500 mb-4">
                      {palabras} palabras | {caracteres} caracteres
                      {tags.length > 0 && (
                        <div className="mt-2">
                          {tags.map(tag => (
                            <Tag key={tag} color="blue">{tag}</Tag>
                          ))}
                        </div>
                      )}
                    </div>
                    <Divider />
                    <div 
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: contenido }}
                    />
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full p-6"
                >
                  {/* Editor especial para notas de voz */}
                  {editingNote?.type === NoteType.VOICE ? (
                    <div className="border border-gray-300 rounded-lg bg-white p-6" style={{ minHeight: '500px' }}>
                      <div className="text-center mb-6">
                        <AudioOutlined className="text-4xl text-green-500 mb-3" />
                        <Title level={3}>Editando Nota de Voz</Title>
                        <AntText type="secondary">
                          Puedes editar el título, etiquetas y configuración de privacidad.
                          El archivo de audio no se puede modificar.
                        </AntText>
                      </div>

                      {/* Reproductor de la nota de voz */}
                      {editingNote.webContentLink && (
                        <div className="mb-6">
                          {(() => {
                            // Usar el endpoint de streaming del backend como en VoiceNoteModal
                            const audioUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/${editingNote.id}/stream`;
                            
                            console.log('🎵 EditorIntegrado: Renderizando VoicePlayer con streaming proxy:', {
                              noteId: editingNote.id,
                              streamingUrl: audioUrl,
                              originalGoogleDriveUrl: editingNote.webContentLink
                            });
                            
                            return (
                              <VoicePlayer
                                audioUrl={audioUrl}
                                fileName={editingNote.fileName}
                                duration={editingNote.duration}
                                compact={false}
                              />
                            );
                          })()}
                        </div>
                      )}

                      {/* Información de la nota original */}
                      <Card className="mb-6" size="small">
                        <div className="text-sm">
                          <p><strong>Contenido original:</strong></p>
                          <p className="text-gray-600 bg-gray-50 p-3 rounded border">
                            {editingNote.content}
                          </p>
                          {editingNote.fileName && (
                            <p className="mt-2">
                              <strong>Archivo:</strong> {editingNote.fileName}
                            </p>
                          )}
                          {editingNote.duration && (
                            <p>
                              <strong>Duración:</strong> {Math.floor(editingNote.duration / 60)}:{(editingNote.duration % 60).toString().padStart(2, '0')}
                            </p>
                          )}
                        </div>
                      </Card>

                      <div className="text-center text-gray-500">
                        <p>💡 Solo puedes modificar el título, etiquetas y configuración de privacidad</p>
                        <p>Para grabar una nueva nota de voz, crea una nota nueva</p>
                      </div>
                    </div>
                  ) : tipo === NoteType.PRESENTATION || editingNote?.type === NoteType.PRESENTATION ? (
                    <div className="h-full">
                      <PresentationEditor
                        contenido={contenido}
                        onChange={setContenido}
                        titulo={titulo}
                        onTituloChange={setTitulo}
                      />
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-lg overflow-visible bg-white" style={{ position: 'relative', zIndex: 200, backgroundColor: 'white', minHeight: '500px' }}>
                      {/* ReactQuill - Editor alternativo que funciona correctamente */}
                      <ReactQuill
                      ref={editorRef}
                      value={contenido}
                      onChange={(content, delta, source, editor) => {
                        // Solo actualizar si no estamos insertando video
                        if (source !== 'silent') {
                          setContenido(content);
                          
                          // Actualizar contadores
                          const text = editor.getText();
                          const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
                          setPalabras(wordCount);
                          setCaracteres(text.length);
                        }
                      }}
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'color': [] }, { 'background': [] }],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          [{ 'indent': '-1'}, { 'indent': '+1' }],
                          [{ 'align': [] }],
                          ['link', 'image'],
                          ['clean']
                        ],
                        clipboard: {
                          // Permitir más elementos HTML para videos
                          matchVisual: false
                        }
                      }}
                      formats={[
                        'header',
                        'bold', 'italic', 'underline', 'strike',
                        'color', 'background',
                        'list', 'bullet', 'indent',
                        'align',
                        'link', 'image',
                        'video', 'iframe', 'div' // Agregar formatos para videos
                      ]}
                      theme="snow"
                      style={{
                        height: '500px', // Aumentado de 400px a 500px para mayor comodidad
                        marginBottom: '42px' // Para el toolbar inferior
                      }}
                      placeholder="Escribe tu contenido aquí..."
                      preserveWhitespace={true}
                    />
                    </div>
                  )}
                </motion.div>
              )}
            </Content>
          </Layout>
        </motion.div>
      )}
      
      {/* Modal del Grabador de Voz */}
      <Modal
        title="🎤 Grabador de Notas de Voz"
        open={showVoiceRecorder}
        onCancel={() => setShowVoiceRecorder(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <VoiceRecorder
          onSave={handleVoiceRecording}
          onCancel={() => setShowVoiceRecorder(false)}
          maxDuration={600} // 10 minutos máximo
        />
      </Modal>
    </AnimatePresence>
  );
};

export default EditorIntegrado;