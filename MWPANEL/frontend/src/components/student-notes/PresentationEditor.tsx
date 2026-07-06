import React, { useState, useRef, useCallback, useEffect } from 'react';
import ExportPresentationModal from './ExportPresentationModal';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Divider,
  Tooltip,
  ColorPicker,
  Upload,
  Modal,
  Slider,
  Switch,
  Tabs,
  Badge,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  FullscreenOutlined,
  DownloadOutlined,
  PictureOutlined,
  FontColorsOutlined,
  FontSizeOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  LeftOutlined,
  RightOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import type { Color } from 'antd/es/color-picker';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Interfaces
interface Slide {
  id: string;
  title: string;
  content: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  alignment: 'left' | 'center' | 'right';
  backgroundImage?: string;
  elements: SlideElement[];
  transitions: SlideTransition;
  notes: string;
}

interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'list';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  styles: ElementStyles;
}

interface ElementStyles {
  color: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
}

interface SlideTransition {
  type: 'none' | 'fade' | 'slide' | 'zoom' | 'flip';
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

interface PresentationEditorProps {
  contenido?: string;
  onChange: (content: string) => void;
  titulo?: string;
  onTituloChange?: (title: string) => void;
}

// Función para extraer ID de video de YouTube
const extractYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const PresentationEditor: React.FC<PresentationEditorProps> = ({
  contenido,
  onChange,
  titulo = '',
  onTituloChange,
}) => {
  // Estados principales
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  
  // Estados de la interfaz
  const [activeTab, setActiveTab] = useState('design');
  const [showSlideNotes, setShowSlideNotes] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Estados para drag and drop
  const [draggedSlide, setDraggedSlide] = useState<number | null>(null);
  const [dragOverSlide, setDragOverSlide] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  // Refs
  const slideRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Inicializar con datos existentes o crear primera slide
  useEffect(() => {
    if (contenido) {
      try {
        const parsedData = JSON.parse(contenido);
        if (parsedData.slides && Array.isArray(parsedData.slides)) {
          setSlides(parsedData.slides);
        } else {
          createInitialSlide();
        }
      } catch {
        createInitialSlide();
      }
    } else {
      createInitialSlide();
    }
  }, [contenido]);

  // Crear slide inicial
  const createInitialSlide = () => {
    const initialSlide: Slide = {
      id: `slide-${Date.now()}`,
      title: titulo || 'Mi Presentación',
      content: 'Haz clic para editar el contenido de esta slide',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      alignment: 'center',
      elements: [],
      transitions: {
        type: 'fade',
        duration: 500,
      },
      notes: '',
    };
    setSlides([initialSlide]);
  };

  // Guardar cambios
  const saveChanges = useCallback(() => {
    const presentationData = {
      slides,
      metadata: {
        totalSlides: slides.length,
        createdAt: new Date().toISOString(),
        version: '1.0',
      },
    };
    onChange(JSON.stringify(presentationData, null, 2));
  }, [slides, onChange]);

  // Actualizar datos cuando cambien las slides
  useEffect(() => {
    if (slides.length > 0) {
      saveChanges();
    }
  }, [slides, saveChanges]);

  // Slide actual
  const currentSlide = slides[currentSlideIndex];

  // Funciones de gestión de slides
  const addSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      title: `Slide ${slides.length + 1}`,
      content: 'Contenido de la nueva slide',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      alignment: 'center',
      elements: [],
      transitions: {
        type: 'fade',
        duration: 500,
      },
      notes: '',
    };

    const newSlides = [...slides];
    newSlides.splice(currentSlideIndex + 1, 0, newSlide);
    setSlides(newSlides);
    setCurrentSlideIndex(currentSlideIndex + 1);
  };

  const duplicateSlide = () => {
    if (!currentSlide) return;

    const duplicatedSlide: Slide = {
      ...currentSlide,
      id: `slide-${Date.now()}`,
      title: `${currentSlide.title} (Copia)`,
    };

    const newSlides = [...slides];
    newSlides.splice(currentSlideIndex + 1, 0, duplicatedSlide);
    setSlides(newSlides);
    setCurrentSlideIndex(currentSlideIndex + 1);
  };

  const deleteSlide = () => {
    if (slides.length <= 1) return; // No eliminar la última slide

    const newSlides = slides.filter((_, index) => index !== currentSlideIndex);
    setSlides(newSlides);
    
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };

  // Actualizar slide actual
  const updateCurrentSlide = (updates: Partial<Slide>) => {
    if (!currentSlide) return;

    const newSlides = slides.map((slide, index) =>
      index === currentSlideIndex ? { ...slide, ...updates } : slide
    );
    setSlides(newSlides);
  };

  // Navegación
  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlideIndex(index);
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  // Funciones de drag and drop mejoradas
  const handleDragStart = (e: React.DragEvent, slideIndex: number) => {
    setDraggedSlide(slideIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, slideIndex: number) => {
    e.preventDefault();
    
    if (draggedSlide === null || draggedSlide === slideIndex) return;
    
    // Calcular si está en la parte superior o inferior del elemento
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY;
    const midpoint = rect.top + rect.height / 2;
    
    const position = y < midpoint ? 'above' : 'below';
    
    setDragOverSlide(slideIndex);
    setDropPosition(position);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Solo limpiar si realmente salimos del elemento
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverSlide(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedSlide === null) {
      setDraggedSlide(null);
      setDragOverSlide(null);
      setDropPosition(null);
      return;
    }

    // Calcular posición final basada en dropPosition
    let finalDropIndex = dropIndex;
    
    if (dropPosition === 'below') {
      finalDropIndex = dropIndex + 1;
    }
    
    // Si estamos moviendo hacia abajo, no ajustar el índice
    if (draggedSlide === finalDropIndex || draggedSlide + 1 === finalDropIndex) {
      setDraggedSlide(null);
      setDragOverSlide(null);
      setDropPosition(null);
      return;
    }

    const newSlides = [...slides];
    const draggedSlideData = newSlides[draggedSlide];
    
    // Remover slide arrastrada
    newSlides.splice(draggedSlide, 1);
    
    // Ajustar índice si estamos insertando después de la posición original
    const adjustedDropIndex = draggedSlide < finalDropIndex ? finalDropIndex - 1 : finalDropIndex;
    
    // Insertar en nueva posición
    newSlides.splice(adjustedDropIndex, 0, draggedSlideData);
    
    // Actualizar índice de slide actual
    let newCurrentIndex = currentSlideIndex;
    if (currentSlideIndex === draggedSlide) {
      newCurrentIndex = adjustedDropIndex;
    } else if (currentSlideIndex > draggedSlide && currentSlideIndex <= adjustedDropIndex) {
      newCurrentIndex = currentSlideIndex - 1;
    } else if (currentSlideIndex < draggedSlide && currentSlideIndex >= adjustedDropIndex) {
      newCurrentIndex = currentSlideIndex + 1;
    }

    setSlides(newSlides);
    setCurrentSlideIndex(newCurrentIndex);
    setDraggedSlide(null);
    setDragOverSlide(null);
    setDropPosition(null);
    
    // Actualizar componente padre
    onChange(JSON.stringify({ slides: newSlides }));
  };

  // Modo presentación
  const startPresentation = () => {
    setIsPreviewMode(true);
    setCurrentSlideIndex(0);
  };

  const stopPresentation = () => {
    setIsPreviewMode(false);
  };

  // Exportación
  const handleExport = () => {
    setShowExportModal(true);
  };

  // Panel lateral de slides
  const renderSlideThumbnails = () => (
    <div className="h-full overflow-y-auto bg-gray-50 p-2">
      <div className="mb-3">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={addSlide}
          block
          size="small"
        >
          Nueva Slide
        </Button>
      </div>
      
      {slides.map((slide, index) => (
        <div key={slide.id} className="relative">
          {/* Indicador de drop superior */}
          {dragOverSlide === index && dropPosition === 'above' && draggedSlide !== null && (
            <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-full z-10 shadow-lg">
              <div className="absolute left-2 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="absolute right-2 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          )}
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`mb-2 cursor-pointer border-2 rounded-lg overflow-hidden transition-all duration-200 ${
              index === currentSlideIndex
                ? 'border-blue-500 bg-blue-50'
                : dragOverSlide === index
                  ? 'border-green-400 bg-green-50'
                  : draggedSlide === index
                    ? 'border-gray-400 bg-gray-100 opacity-50 transform rotate-3'
                    : 'border-gray-200 bg-white'
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => goToSlide(index)}
          >
          <div className="p-2">
            <Badge
              count={index + 1}
              size="small"
              color={index === currentSlideIndex ? 'blue' : 'gray'}
            >
              <div
                className="w-full h-16 rounded border text-xs flex items-center justify-center text-center"
                style={{
                  backgroundColor: slide.backgroundColor,
                  color: slide.textColor,
                  fontSize: '10px',
                }}
              >
                <div>
                  <div className="font-semibold mb-1">{slide.title}</div>
                  <div className="opacity-75 line-clamp-2">
                    {slide.content.substring(0, 40)}...
                  </div>
                </div>
              </div>
            </Badge>
          </div>
          <div className="px-2 pb-1 text-xs text-gray-600 text-center">
            Slide {index + 1}
          </div>
          </motion.div>
          
          {/* Indicador de drop inferior */}
          {dragOverSlide === index && dropPosition === 'below' && draggedSlide !== null && (
            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-full z-10 shadow-lg">
              <div className="absolute left-2 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="absolute right-2 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Editor principal de slide
  const renderSlideEditor = () => {
    if (!currentSlide) return null;

    return (
      <div className="h-full flex flex-col">
        {/* Barra de herramientas */}
        <div className="border-b p-3 bg-white">
          <Space split={<Divider type="vertical" />}>
            {/* Navegación */}
            <Space>
              <Button
                size="small"
                icon={<LeftOutlined />}
                disabled={currentSlideIndex === 0}
                onClick={prevSlide}
              />
              <Text className="text-sm">
                {currentSlideIndex + 1} / {slides.length}
              </Text>
              <Button
                size="small"
                icon={<RightOutlined />}
                disabled={currentSlideIndex === slides.length - 1}
                onClick={nextSlide}
              />
            </Space>

            {/* Acciones de slide */}
            <Space>
              <Tooltip title="Duplicar slide">
                <Button size="small" icon={<CopyOutlined />} onClick={duplicateSlide} />
              </Tooltip>
              <Tooltip title="Eliminar slide">
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={deleteSlide}
                  disabled={slides.length <= 1}
                  danger
                />
              </Tooltip>
            </Space>

            {/* Herramientas de contenido */}
            <Space>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const imageUrl = e.target?.result as string;
                    // Insertar imagen en el contenido de la diapositiva
                    const imageHtml = `<br/><img src="${imageUrl}" alt="Imagen insertada" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" /><br/>`;
                    updateCurrentSlide({ 
                      content: currentSlide.content + imageHtml 
                    });
                  };
                  reader.readAsDataURL(file);
                  return false;
                }}
              >
                <Tooltip title="Insertar imagen">
                  <Button size="small" icon={<PictureOutlined />}>
                    Imagen
                  </Button>
                </Tooltip>
              </Upload>

              <Tooltip title="Insertar video de YouTube">
                <Button 
                  size="small" 
                  icon={<PlayCircleOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Insertar Video de YouTube',
                      content: (
                        <div className="space-y-4">
                          <div>
                            <Text>Pegue la URL del video de YouTube:</Text>
                            <Input
                              placeholder="https://www.youtube.com/watch?v=..."
                              id="youtube-url-input"
                              style={{ marginTop: 8 }}
                            />
                          </div>
                          <div className="text-sm text-gray-500">
                            Ejemplo: https://www.youtube.com/watch?v=dQw4w9WgXcQ
                          </div>
                        </div>
                      ),
                      onOk: () => {
                        const input = document.getElementById('youtube-url-input') as HTMLInputElement;
                        const url = input?.value;
                        if (url) {
                          // Extraer el ID del video de YouTube
                          const videoId = extractYouTubeVideoId(url);
                          if (videoId) {
                            const videoHtml = `<br/><div style="margin: 20px 0; text-align: center;"><iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="max-width: 100%; border-radius: 8px;"></iframe></div><br/>`;
                            updateCurrentSlide({ 
                              content: currentSlide.content + videoHtml 
                            });
                          } else {
                            Modal.error({
                              title: 'URL no válida',
                              content: 'Por favor, ingrese una URL válida de YouTube.'
                            });
                          }
                        }
                      },
                      okText: 'Insertar',
                      cancelText: 'Cancelar',
                    });
                  }}
                >
                  Video
                </Button>
              </Tooltip>
            </Space>

            {/* Previsualización y presentación */}
            <Space>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                {isPreviewMode ? 'Editar' : 'Previsualizar'}
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={startPresentation}
              >
                Presentar
              </Button>
            </Space>

            {/* Exportación */}
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Exportar
            </Button>
          </Space>
        </div>

        {/* Área de edición */}
        <div className="flex-1 overflow-hidden">
          {isPreviewMode ? renderSlidePreview() : renderSlideEditArea()}
        </div>
      </div>
    );
  };

  // Vista previa de la slide
  const renderSlidePreview = () => (
    <div className="h-full p-4 bg-gray-100 flex items-center justify-center">
      <div
        className="w-full max-w-4xl bg-white rounded-lg shadow-lg aspect-video p-8 overflow-auto"
        style={{
          backgroundColor: currentSlide?.backgroundColor,
          color: currentSlide?.textColor,
          fontFamily: currentSlide?.fontFamily,
          backgroundImage: currentSlide?.backgroundImage 
            ? `url(${currentSlide.backgroundImage})` 
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Título de la slide */}
        <h1
          className="mb-6 font-bold"
          style={{
            color: currentSlide?.textColor,
            textAlign: currentSlide?.alignment,
            fontSize: `${(currentSlide?.fontSize || 24) + 8}px`,
            margin: '0 0 1.5rem 0',
          }}
        >
          {currentSlide?.title}
        </h1>

        {/* Contenido de la slide con HTML */}
        <div
          className="prose prose-lg max-w-none flex-1 overflow-auto"
          style={{
            color: currentSlide?.textColor,
            textAlign: currentSlide?.alignment,
            fontSize: `${currentSlide?.fontSize}px`,
          }}
          dangerouslySetInnerHTML={{ __html: currentSlide?.content || '' }}
        />
      </div>
    </div>
  );

  // Área de edición de slide
  const renderSlideEditArea = () => (
    <div className="h-full flex">
      {/* Canvas de la slide */}
      <div className="flex-1 p-4 bg-gray-100 flex items-center justify-center">
        <div
          ref={slideRef}
          className="w-full max-w-4xl bg-white rounded-lg shadow-lg aspect-video p-8 overflow-hidden"
          style={{
            backgroundColor: currentSlide?.backgroundColor,
            color: currentSlide?.textColor,
            fontFamily: currentSlide?.fontFamily,
          }}
        >
          {/* Título de la slide */}
          <Input
            value={currentSlide?.title}
            onChange={(e) => updateCurrentSlide({ title: e.target.value })}
            className="mb-6 text-2xl font-bold border-0 bg-transparent p-0"
            style={{
              color: currentSlide?.textColor,
              textAlign: currentSlide?.alignment,
              fontSize: `${(currentSlide?.fontSize || 24) + 8}px`,
            }}
            placeholder="Título de la slide"
          />

          {/* Contenido de la slide - Editor mejorado */}
          <div className="flex-1 min-h-[200px]">
            {currentSlide?.content && (currentSlide.content.includes('<img') || currentSlide.content.includes('<iframe')) ? (
              // Vista previa con HTML
              <div
                className="relative w-full h-full p-4 prose prose-lg max-w-none overflow-auto cursor-pointer hover:bg-gray-50 transition-colors"
                style={{
                  color: currentSlide?.textColor,
                  textAlign: currentSlide?.alignment,
                  fontSize: `${currentSlide?.fontSize}px`,
                  minHeight: '200px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                }}
                onClick={() => {
                  // Permitir editar haciendo click
                  const newContent = prompt('Editar contenido:', currentSlide.content.replace(/<[^>]*>/g, ' ').trim());
                  if (newContent !== null) {
                    updateCurrentSlide({ content: newContent });
                  }
                }}
              >
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10 opacity-75 hover:opacity-100">
                  ✏️ Click para editar
                </div>
                <div
                  dangerouslySetInnerHTML={{ __html: currentSlide.content }}
                  className="pointer-events-none"
                />
              </div>
            ) : (
              // Editor de texto normal
              <TextArea
                value={currentSlide?.content}
                onChange={(e) => updateCurrentSlide({ content: e.target.value })}
                className="border-0 bg-transparent resize-none"
                style={{
                  color: currentSlide?.textColor,
                  textAlign: currentSlide?.alignment,
                  fontSize: `${currentSlide?.fontSize}px`,
                  minHeight: '200px',
                }}
                placeholder="Contenido de la slide"
              />
            )}
          </div>
        </div>
      </div>

      {/* Panel de propiedades */}
      <div className="w-80 border-l bg-white flex flex-col">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          size="small"
          className="flex-shrink-0"
        >
          <TabPane tab="Diseño" key="design">
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {renderDesignPanel()}
            </div>
          </TabPane>
          <TabPane tab="Transiciones" key="transitions">
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {renderTransitionsPanel()}
            </div>
          </TabPane>
          <TabPane tab="Notas" key="notes">
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {renderNotesPanel()}
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );

  // Panel de diseño
  const renderDesignPanel = () => (
    <div className="p-4 space-y-4">
      {/* Colores */}
      <div>
        <Text strong>Colores</Text>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Text className="text-sm">Fondo:</Text>
            <ColorPicker
              value={currentSlide?.backgroundColor}
              onChange={(color: Color) =>
                updateCurrentSlide({ backgroundColor: color.toHexString() })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Text className="text-sm">Texto:</Text>
            <ColorPicker
              value={currentSlide?.textColor}
              onChange={(color: Color) =>
                updateCurrentSlide({ textColor: color.toHexString() })
              }
            />
          </div>
        </div>
      </div>

      <Divider />

      {/* Tipografía */}
      <div>
        <Text strong>Tipografía</Text>
        <div className="mt-2 space-y-3">
          <div>
            <Text className="text-sm">Fuente:</Text>
            <Select
              value={currentSlide?.fontFamily}
              onChange={(value) => updateCurrentSlide({ fontFamily: value })}
              className="w-full mt-1"
              size="small"
            >
              <Select.Option value="Arial, sans-serif">Arial</Select.Option>
              <Select.Option value="Georgia, serif">Georgia</Select.Option>
              <Select.Option value="'Times New Roman', serif">Times New Roman</Select.Option>
              <Select.Option value="'Courier New', monospace">Courier New</Select.Option>
              <Select.Option value="Helvetica, sans-serif">Helvetica</Select.Option>
            </Select>
          </div>

          <div>
            <Text className="text-sm">Tamaño: {currentSlide?.fontSize}px</Text>
            <Slider
              min={12}
              max={72}
              value={currentSlide?.fontSize}
              onChange={(value) => updateCurrentSlide({ fontSize: value })}
              className="mt-1"
            />
          </div>

          <div>
            <Text className="text-sm">Alineación:</Text>
            <div className="flex mt-1">
              <Button.Group size="small">
                <Button
                  icon={<AlignLeftOutlined />}
                  type={currentSlide?.alignment === 'left' ? 'primary' : 'default'}
                  onClick={() => updateCurrentSlide({ alignment: 'left' })}
                />
                <Button
                  icon={<AlignCenterOutlined />}
                  type={currentSlide?.alignment === 'center' ? 'primary' : 'default'}
                  onClick={() => updateCurrentSlide({ alignment: 'center' })}
                />
                <Button
                  icon={<AlignRightOutlined />}
                  type={currentSlide?.alignment === 'right' ? 'primary' : 'default'}
                  onClick={() => updateCurrentSlide({ alignment: 'right' })}
                />
              </Button.Group>
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* Imagen de fondo */}
      <div>
        <Text strong>Imagen de fondo</Text>
        <div className="mt-2 space-y-2">
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const imageUrl = e.target?.result as string;
                updateCurrentSlide({ backgroundImage: imageUrl });
              };
              reader.readAsDataURL(file);
              return false; // Prevent upload
            }}
          >
            <Button icon={<PictureOutlined />} size="small" block>
              Seleccionar imagen
            </Button>
          </Upload>
          
          {currentSlide?.backgroundImage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Text className="text-xs text-gray-600">Vista previa:</Text>
                <Button
                  size="small"
                  type="text"
                  danger
                  onClick={() => updateCurrentSlide({ backgroundImage: undefined })}
                >
                  Quitar
                </Button>
              </div>
              <div className="w-full h-16 bg-cover bg-center rounded border"
                   style={{ backgroundImage: `url(${currentSlide.backgroundImage})` }}>
              </div>
            </div>
          )}
        </div>
      </div>

      <Divider />

      {/* Animaciones y efectos */}
      <div>
        <Text strong>Animaciones</Text>
        <div className="mt-2 space-y-3">
          <div>
            <Text className="text-sm">Entrada de texto:</Text>
            <Select
              defaultValue="none"
              className="w-full mt-1"
              size="small"
            >
              <Select.Option value="none">Sin animación</Select.Option>
              <Select.Option value="fadeIn">Aparecer gradualmente</Select.Option>
              <Select.Option value="slideUp">Deslizar desde abajo</Select.Option>
              <Select.Option value="typewriter">Efecto máquina de escribir</Select.Option>
            </Select>
          </div>
          
          <div>
            <Text className="text-sm">Velocidad de animación:</Text>
            <Slider
              min={100}
              max={3000}
              defaultValue={1000}
              className="mt-1"
              step={100}
            />
            <div className="text-xs text-gray-500 mt-1">
              100ms = Muy rápido, 3000ms = Muy lento
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* Configuraciones avanzadas */}
      <div>
        <Text strong>Configuraciones avanzadas</Text>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Text className="text-sm">Sangría del texto:</Text>
            <Slider
              min={0}
              max={50}
              defaultValue={0}
              className="w-24"
              size="small"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Text className="text-sm">Espaciado de líneas:</Text>
            <Select
              defaultValue="1.6"
              className="w-24"
              size="small"
            >
              <Select.Option value="1.2">Compacto</Select.Option>
              <Select.Option value="1.6">Normal</Select.Option>
              <Select.Option value="2.0">Amplio</Select.Option>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Text className="text-sm">Sombra de texto:</Text>
            <Switch size="small" />
          </div>
        </div>
      </div>

      <Divider />

      {/* Información de la slide */}
      <div>
        <Text strong>Información</Text>
        <div className="mt-2 text-xs text-gray-600 space-y-1">
          <div>Slide {currentSlideIndex + 1} de {slides.length}</div>
          <div>Caracteres: {(currentSlide?.content || '').length}</div>
          <div>Última modificación: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );

  // Panel de transiciones
  const renderTransitionsPanel = () => (
    <div className="p-4 space-y-4">
      <div>
        <Text strong>Transición</Text>
        <Select
          value={currentSlide?.transitions.type}
          onChange={(value) =>
            updateCurrentSlide({
              transitions: { ...currentSlide.transitions, type: value },
            })
          }
          className="w-full mt-2"
          size="small"
        >
          <Select.Option value="none">Sin transición</Select.Option>
          <Select.Option value="fade">Desvanecer</Select.Option>
          <Select.Option value="slide">Deslizar</Select.Option>
          <Select.Option value="zoom">Zoom</Select.Option>
          <Select.Option value="flip">Voltear</Select.Option>
        </Select>
      </div>

      <div>
        <Text strong>Duración: {currentSlide?.transitions.duration}ms</Text>
        <Slider
          min={100}
          max={2000}
          step={100}
          value={currentSlide?.transitions.duration}
          onChange={(value) =>
            updateCurrentSlide({
              transitions: { ...currentSlide.transitions, duration: value },
            })
          }
          className="mt-2"
        />
      </div>
    </div>
  );

  // Panel de notas
  const renderNotesPanel = () => (
    <div className="p-4">
      <Text strong>Notas del presentador</Text>
      <TextArea
        value={currentSlide?.notes}
        onChange={(e) => updateCurrentSlide({ notes: e.target.value })}
        placeholder="Añade notas para esta slide..."
        className="mt-2"
        rows={10}
      />
    </div>
  );


  // Modo presentación completo
  const renderPresentationMode = () => (
    <Modal
      open={isPreviewMode && isFullscreen}
      onCancel={stopPresentation}
      footer={null}
      width="100%"
      className="fullscreen-modal"
      centered
      bodyStyle={{ padding: 0, height: '100vh' }}
    >
      <div className="h-full bg-black flex items-center justify-center relative">
        {/* Controles de presentación */}
        <div className="absolute top-4 right-4 z-10">
          <Space>
            <Button
              type="text"
              icon={<LeftOutlined />}
              disabled={currentSlideIndex === 0}
              onClick={prevSlide}
              style={{ color: 'white' }}
            />
            <Text style={{ color: 'white' }}>
              {currentSlideIndex + 1} / {slides.length}
            </Text>
            <Button
              type="text"
              icon={<RightOutlined />}
              disabled={currentSlideIndex === slides.length - 1}
              onClick={nextSlide}
              style={{ color: 'white' }}
            />
            <Button
              type="text"
              icon={<PauseCircleOutlined />}
              onClick={stopPresentation}
              style={{ color: 'white' }}
            />
          </Space>
        </div>

        {/* Slide en pantalla completa */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide?.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: (currentSlide?.transitions.duration || 500) / 1000 }}
            className="w-full max-w-6xl h-full max-h-screen p-16 flex items-center justify-center"
            style={{
              backgroundColor: currentSlide?.backgroundColor,
              color: currentSlide?.textColor,
              fontFamily: currentSlide?.fontFamily,
            }}
          >
            <div
              className="w-full h-full flex flex-col"
              style={{ textAlign: currentSlide?.alignment }}
            >
              <h1
                className="mb-12 font-bold"
                style={{
                  fontSize: `${(currentSlide?.fontSize || 24) + 24}px`,
                  color: currentSlide?.textColor,
                }}
              >
                {currentSlide?.title}
              </h1>
              <div
                className="flex-1 whitespace-pre-wrap text-xl leading-relaxed"
                style={{
                  fontSize: `${(currentSlide?.fontSize || 24) + 8}px`,
                  color: currentSlide?.textColor,
                }}
              >
                {currentSlide?.content}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Indicador de progreso */}
        <div className="absolute bottom-4 left-4 right-4">
          <Progress
            percent={((currentSlideIndex + 1) / slides.length) * 100}
            showInfo={false}
            strokeColor="#1890ff"
            size="small"
          />
        </div>
      </div>
    </Modal>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header con título */}
      <div className="border-b p-4 bg-gray-50">
        <Input
          value={titulo}
          onChange={(e) => onTituloChange?.(e.target.value)}
          className="text-lg font-semibold border-0 bg-transparent p-0"
          placeholder="Título de la presentación"
        />
        <Text type="secondary" className="text-sm mt-1 block">
          {slides.length} slide{slides.length !== 1 ? 's' : ''} • Editor de presentaciones
        </Text>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel lateral de slides */}
        <div className="w-60 border-r">
          {renderSlideThumbnails()}
        </div>

        {/* Editor principal */}
        <div className="flex-1">
          {renderSlideEditor()}
        </div>
      </div>

      {/* Modal de presentación */}
      {renderPresentationMode()}

      {/* Modal de exportación */}
      <ExportPresentationModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        presentationData={{
          slides,
          metadata: {
            title: titulo,
            author: 'MW Panel User',
            totalSlides: slides.length,
            createdAt: new Date().toISOString(),
            version: '1.0',
          },
        }}
        presentationTitle={titulo}
      />
    </div>
  );
};

export default PresentationEditor;