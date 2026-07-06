import React, { useState, useEffect } from 'react';
import { Button, Space, Typography, Card, Progress, Tooltip } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  EditOutlined,
  FileImageOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import PresentationEditor from './PresentationEditor';

const { Text, Title } = Typography;

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
  transitions: {
    type: 'none' | 'fade' | 'slide' | 'zoom' | 'flip';
    duration: number;
    direction?: 'left' | 'right' | 'up' | 'down';
  };
  notes: string;
}

interface PresentationViewerProps {
  content: string;
  title: string;
  onEdit?: () => void;
  readOnly?: boolean;
  onSave?: (content: string, title?: string) => void;
}

const PresentationViewer: React.FC<PresentationViewerProps> = ({
  content,
  title,
  onEdit,
  readOnly = false,
  onSave,
}) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState<NodeJS.Timeout | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  // Cargar datos de la presentación
  useEffect(() => {
    if (content) {
      try {
        const parsedData = JSON.parse(content);
        if (parsedData.slides && Array.isArray(parsedData.slides)) {
          setSlides(parsedData.slides);
        } else {
          // Fallback para contenido simple
          setSlides([{
            id: 'slide-1',
            title: title || 'Presentación',
            content: content,
            backgroundColor: '#ffffff',
            textColor: '#333333',
            fontSize: 24,
            fontFamily: 'Arial, sans-serif',
            alignment: 'center',
            transitions: {
              type: 'fade',
              duration: 500,
            },
            notes: '',
          }]);
        }
      } catch {
        // Si no es JSON válido, crear slide simple
        setSlides([{
          id: 'slide-1',
          title: title || 'Presentación',
          content: content || 'Sin contenido disponible',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          fontSize: 24,
          fontFamily: 'Arial, sans-serif',
          alignment: 'center',
          transitions: {
            type: 'fade',
            duration: 500,
          },
          notes: '',
        }]);
      }
    }
  }, [content, title]);

  // Limpiar interval al desmontar
  useEffect(() => {
    return () => {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
      }
    };
  }, [autoPlayInterval]);

  const currentSlide = slides[currentSlideIndex];

  // Navegación
  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlideIndex(index);
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else if (isPlaying) {
      // En modo auto-play, volver al inicio
      setCurrentSlideIndex(0);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  // Auto-play
  const startAutoPlay = () => {
    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentSlideIndex((current) => {
        if (current < slides.length - 1) {
          return current + 1;
        } else {
          return 0; // Reiniciar
        }
      });
    }, 3000); // Cambiar cada 3 segundos
    setAutoPlayInterval(interval);
  };

  const stopAutoPlay = () => {
    setIsPlaying(false);
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }
  };

  // Pantalla completa
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Cambiar entre modos
  const toggleEditMode = () => {
    if (readOnly) return;
    setIsEditMode(!isEditMode);
    if (isEditMode && onSave) {
      // Guardar cambios cuando salimos del modo edición
      onSave(JSON.stringify({ slides }), editTitle);
    }
  };

  // Manejar cambios en el editor
  const handleContentChange = (newContent: string) => {
    try {
      const parsedData = JSON.parse(newContent);
      if (parsedData.slides && Array.isArray(parsedData.slides)) {
        setSlides(parsedData.slides);
      }
    } catch (error) {
      console.error('Error parsing editor content:', error);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setEditTitle(newTitle);
  };

  // Controles de navegación
  const renderControls = () => (
    <div className="flex items-center justify-between w-full">
      <Space>
        <div className="flex items-center space-x-2">
          <FileImageOutlined style={{ color: '#eb2f96' }} />
          <Text strong className="text-gray-700">
            {editTitle}
          </Text>
        </div>
      </Space>

      <Space>
        {!isEditMode && (
          <>
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
            <Button
              size="small"
              type={isPlaying ? 'primary' : 'default'}
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={isPlaying ? stopAutoPlay : startAutoPlay}
            >
              {isPlaying ? 'Pausar' : 'Auto-play'}
            </Button>
            <Button
              size="small"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
            />
          </>
        )}

        {!readOnly && (
          <Button
            size="small"
            type={isEditMode ? 'primary' : 'default'}
            icon={isEditMode ? <EyeOutlined /> : <EditOutlined />}
            onClick={toggleEditMode}
          >
            {isEditMode ? 'Vista Previa' : 'Editar'}
          </Button>
        )}
      </Space>
    </div>
  );

  // Indicadores de slides
  const renderSlideIndicators = () => (
    <div className="flex justify-center space-x-2 mt-4">
      {slides.map((_, index) => (
        <button
          key={index}
          className={`w-3 h-3 rounded-full transition-all duration-200 ${
            index === currentSlideIndex
              ? 'bg-blue-500 scale-110'
              : 'bg-gray-300 hover:bg-gray-400'
          }`}
          onClick={() => goToSlide(index)}
        />
      ))}
    </div>
  );

  // Slide con transiciones
  const renderSlide = (slide: Slide, isFullscreenMode = false) => {
    const transitions = {
      none: {},
      fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      },
      slide: {
        initial: { x: 100, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: -100, opacity: 0 },
      },
      zoom: {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 1.2, opacity: 0 },
      },
      flip: {
        initial: { rotateY: 90, opacity: 0 },
        animate: { rotateY: 0, opacity: 1 },
        exit: { rotateY: -90, opacity: 0 },
      },
    };

    const transition = transitions[slide.transitions.type] || transitions.fade;
    const duration = (slide.transitions.duration || 500) / 1000;

    return (
      <motion.div
        key={slide.id}
        {...transition}
        transition={{ duration }}
        className={`w-full h-full flex items-center justify-center overflow-hidden ${
          isFullscreenMode ? 'p-16' : 'p-8'
        }`}
        style={{
          backgroundColor: slide.backgroundColor,
          color: slide.textColor,
          fontFamily: slide.fontFamily,
          backgroundImage: slide.backgroundImage 
            ? `url(${slide.backgroundImage})` 
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          className="w-full h-full flex flex-col max-w-4xl"
          style={{ textAlign: slide.alignment }}
        >
          {/* Título */}
          <Title
            level={isFullscreenMode ? 1 : 2}
            className="mb-8"
            style={{
              color: slide.textColor,
              fontSize: isFullscreenMode 
                ? `${(slide.fontSize || 24) + 24}px`
                : `${(slide.fontSize || 24) + 8}px`,
              textAlign: slide.alignment,
              margin: isFullscreenMode ? '0 0 3rem 0' : '0 0 1.5rem 0',
            }}
          >
            {slide.title}
          </Title>

          {/* Contenido */}
          <div
            className="flex-1 leading-relaxed prose prose-lg max-w-none"
            style={{
              color: slide.textColor,
              fontSize: isFullscreenMode 
                ? `${(slide.fontSize || 24) + 8}px`
                : `${slide.fontSize || 24}px`,
              lineHeight: '1.6',
            }}
            dangerouslySetInnerHTML={{ __html: slide.content || '' }}
          />
        </div>
      </motion.div>
    );
  };

  if (!slides.length) {
    return (
      <Card className="text-center p-8">
        <Text type="secondary">No hay slides para mostrar</Text>
      </Card>
    );
  }

  // Vista en pantalla completa
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Controles en pantalla completa */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="flex items-center justify-between">
            <div className="bg-black bg-opacity-50 rounded-lg p-2">
              <Space>
                <Button
                  type="text"
                  size="small"
                  icon={<LeftOutlined />}
                  disabled={currentSlideIndex === 0}
                  onClick={prevSlide}
                  style={{ color: 'white' }}
                />
                <Text style={{ color: 'white' }} className="text-sm">
                  {currentSlideIndex + 1} / {slides.length}
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={<RightOutlined />}
                  disabled={currentSlideIndex === slides.length - 1}
                  onClick={nextSlide}
                  style={{ color: 'white' }}
                />
              </Space>
            </div>

            <div className="bg-black bg-opacity-50 rounded-lg p-2">
              <Space>
                <Button
                  type="text"
                  size="small"
                  icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={isPlaying ? stopAutoPlay : startAutoPlay}
                  style={{ color: 'white' }}
                >
                  {isPlaying ? 'Pausar' : 'Play'}
                </Button>
                <Button
                  type="text"
                  size="small"
                  icon={<FullscreenExitOutlined />}
                  onClick={toggleFullscreen}
                  style={{ color: 'white' }}
                />
              </Space>
            </div>
          </div>
        </div>

        {/* Slide en pantalla completa */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {currentSlide && renderSlide(currentSlide, true)}
          </AnimatePresence>
        </div>

        {/* Barra de progreso */}
        <div className="absolute bottom-4 left-4 right-4">
          <Progress
            percent={((currentSlideIndex + 1) / slides.length) * 100}
            showInfo={false}
            strokeColor="#1890ff"
            size="small"
          />
        </div>
      </div>
    );
  }

  // Vista normal
  return (
    <div className="w-full">
      {/* Controles superiores */}
      <Card className="mb-4" size="small" bodyStyle={{ padding: '8px 16px' }}>
        {renderControls()}
      </Card>

      {/* Contenido principal */}
      {isEditMode ? (
        // Modo edición: Mostrar el editor completo
        <PresentationEditor
          contenido={JSON.stringify({ slides })}
          onChange={handleContentChange}
          titulo={editTitle}
          onTituloChange={handleTitleChange}
        />
      ) : (
        // Modo visualización: Mostrar la presentación
        <div className="space-y-4">
          {/* Área de la slide */}
          <Card bodyStyle={{ padding: 0 }}>
            <div className="relative bg-gray-100 aspect-video">
              <AnimatePresence mode="wait">
                {currentSlide && renderSlide(currentSlide)}
              </AnimatePresence>
            </div>
          </Card>

          {/* Indicadores de slides */}
          {slides.length > 1 && renderSlideIndicators()}

          {/* Información adicional */}
          {currentSlide?.notes && (
            <Card size="small">
              <Text strong>Notas de la diapositiva:</Text>
              <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                {currentSlide.notes}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PresentationViewer;