import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Select,
  message,
  Tooltip,
  Modal,
  Upload,
  Image
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
  EditOutlined,
  PictureOutlined,
  BoldOutlined,
  ItalicOutlined,
  FontSizeOutlined,
  BgColorsOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import type { UploadFile } from 'antd/es/upload';

const { Title, Text: AntText, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Slide {
  id: string;
  title: string;
  content: string;
  backgroundColor: string;
  textColor: string;
  fontSize: 'small' | 'medium' | 'large';
  alignment: 'left' | 'center' | 'right';
  imageUrl?: string;
  imagePosition: 'top' | 'bottom' | 'left' | 'right' | 'background';
}

interface PresentacionEditorProps {
  contenido?: string; // JSON string con las slides
  onChange: (contenido: string) => void;
  titulo?: string;
  onTituloChange?: (titulo: string) => void;
}

const defaultSlide: Slide = {
  id: Date.now().toString(),
  title: 'Nueva Slide',
  content: 'Contenido de la slide...',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  fontSize: 'medium',
  alignment: 'center',
  imagePosition: 'top'
};

const PresentacionEditor: React.FC<PresentacionEditorProps> = ({
  contenido,
  onChange,
  titulo = 'Mi Presentación',
  onTituloChange
}) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Inicializar slides desde el contenido
  useEffect(() => {
    try {
      if (contenido) {
        const parsedSlides = JSON.parse(contenido);
        if (Array.isArray(parsedSlides) && parsedSlides.length > 0) {
          setSlides(parsedSlides);
        } else {
          setSlides([{ ...defaultSlide }]);
        }
      } else {
        setSlides([{ ...defaultSlide }]);
      }
    } catch (error) {
      console.error('Error parsing presentation content:', error);
      setSlides([{ ...defaultSlide }]);
    }
  }, [contenido]);

  // Notificar cambios
  useEffect(() => {
    if (slides.length > 0) {
      onChange(JSON.stringify(slides));
    }
  }, [slides, onChange]);

  const currentSlide = slides[currentSlideIndex];

  const addSlide = () => {
    const newSlide: Slide = {
      ...defaultSlide,
      id: Date.now().toString(),
      title: `Slide ${slides.length + 1}`
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) {
      message.warning('Debe haber al menos una slide');
      return;
    }
    
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };

  const updateCurrentSlide = (updates: Partial<Slide>) => {
    const newSlides = slides.map((slide, index) => 
      index === currentSlideIndex 
        ? { ...slide, ...updates }
        : slide
    );
    setSlides(newSlides);
  };

  const startPreview = () => {
    setPreviewIndex(0);
    setIsPreviewMode(true);
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

  const nextPreviewSlide = () => {
    if (previewIndex < slides.length - 1) {
      setPreviewIndex(previewIndex + 1);
    }
  };

  const prevPreviewSlide = () => {
    if (previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  const handleImageUpload = (info: any) => {
    if (info.file && info.file.originFileObj) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        updateCurrentSlide({ imageUrl });
        setIsImageModalOpen(false);
        message.success('Imagen añadida a la slide');
      };
      reader.readAsDataURL(info.file.originFileObj);
    }
  };

  const backgroundColors = [
    '#ffffff', '#f5f5f5', '#e8f4fd', '#fff2e8', '#f6ffed',
    '#fff1f0', '#f9f0ff', '#e6fffb', '#feffe6', '#fef0e6'
  ];

  const textColors = [
    '#000000', '#1890ff', '#52c41a', '#fa8c16', '#f5222d',
    '#722ed1', '#13c2c2', '#eb2f96', '#fadb14', '#8c8c8c'
  ];

  if (isPreviewMode) {
    const previewSlide = slides[previewIndex];
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div 
          className="w-full h-full relative flex flex-col justify-center items-center p-8"
          style={{ 
            backgroundColor: previewSlide.backgroundColor,
            color: previewSlide.textColor 
          }}
        >
          {/* Imagen de fondo */}
          {previewSlide.imageUrl && previewSlide.imagePosition === 'background' && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url(${previewSlide.imageUrl})` }}
            />
          )}
          
          <div className="relative z-10 max-w-4xl w-full">
            {/* Título */}
            <Title 
              level={1} 
              className="mb-8"
              style={{ 
                color: previewSlide.textColor,
                textAlign: previewSlide.alignment,
                fontSize: previewSlide.fontSize === 'large' ? '3rem' : 
                          previewSlide.fontSize === 'medium' ? '2rem' : '1.5rem'
              }}
            >
              {previewSlide.title}
            </Title>

            {/* Imagen superior */}
            {previewSlide.imageUrl && previewSlide.imagePosition === 'top' && (
              <div className="text-center mb-6">
                <Image 
                  src={previewSlide.imageUrl} 
                  alt="Slide image"
                  style={{ maxHeight: '300px', maxWidth: '100%' }}
                />
              </div>
            )}

            {/* Contenido */}
            <div 
              className="text-lg leading-relaxed whitespace-pre-line"
              style={{ 
                textAlign: previewSlide.alignment,
                fontSize: previewSlide.fontSize === 'large' ? '1.5rem' : 
                          previewSlide.fontSize === 'medium' ? '1.2rem' : '1rem'
              }}
            >
              {previewSlide.content}
            </div>

            {/* Imagen inferior */}
            {previewSlide.imageUrl && previewSlide.imagePosition === 'bottom' && (
              <div className="text-center mt-6">
                <Image 
                  src={previewSlide.imageUrl} 
                  alt="Slide image"
                  style={{ maxHeight: '300px', maxWidth: '100%' }}
                />
              </div>
            )}
          </div>

          {/* Controles de navegación */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <Space size="large">
              <Button 
                size="large" 
                shape="circle" 
                icon={<ArrowLeftOutlined />}
                onClick={prevPreviewSlide}
                disabled={previewIndex === 0}
              />
              <span className="text-white bg-black bg-opacity-50 px-3 py-1 rounded">
                {previewIndex + 1} / {slides.length}
              </span>
              <Button 
                size="large" 
                shape="circle" 
                icon={<ArrowRightOutlined />}
                onClick={nextPreviewSlide}
                disabled={previewIndex === slides.length - 1}
              />
            </Space>
          </div>

          {/* Botón salir */}
          <Button 
            className="absolute top-4 right-4"
            size="large"
            onClick={() => setIsPreviewMode(false)}
            danger
          >
            Salir de Vista Previa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header con título */}
      <div className="bg-white p-4 border-b flex justify-between items-center">
        <Input
          value={titulo}
          onChange={(e) => onTituloChange?.(e.target.value)}
          style={{ fontSize: '18px', fontWeight: 'bold', border: 'none', width: '300px' }}
          placeholder="Título de la presentación"
        />
        
        <Space>
          <span className="text-gray-500">
            Slide {currentSlideIndex + 1} de {slides.length}
          </span>
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={startPreview}
          >
            Vista Previa
          </Button>
        </Space>
      </div>

      <div className="flex h-full">
        {/* Panel izquierdo - Slides thumbnails */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <Button 
              type="dashed" 
              icon={<PlusOutlined />} 
              onClick={addSlide}
              className="w-full mb-4"
            >
              Nueva Slide
            </Button>
            
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <motion.div
                  key={slide.id}
                  whileHover={{ scale: 1.02 }}
                  className={`border rounded cursor-pointer p-3 relative ${
                    index === currentSlideIndex ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setCurrentSlideIndex(index)}
                >
                  <div className="text-xs font-medium truncate mb-1">
                    {slide.title}
                  </div>
                  <div 
                    className="text-xs text-gray-500 h-8 overflow-hidden"
                    style={{ backgroundColor: slide.backgroundColor }}
                  >
                    {slide.content.substring(0, 50)}...
                  </div>
                  
                  {slides.length > 1 && (
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      className="absolute top-1 right-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSlide(index);
                      }}
                    />
                  )}
                  
                  <div className="absolute bottom-1 right-1 text-xs text-gray-400">
                    {index + 1}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel central - Editor de slide */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar de edición */}
          <div className="bg-white p-3 border-b">
            <Row gutter={16} align="middle">
              <Col>
                <Space>
                  <Button 
                    size="small"
                    icon={<ArrowLeftOutlined />}
                    onClick={prevSlide}
                    disabled={currentSlideIndex === 0}
                  />
                  <Button 
                    size="small"
                    icon={<ArrowRightOutlined />}
                    onClick={nextSlide}
                    disabled={currentSlideIndex === slides.length - 1}
                  />
                </Space>
              </Col>
              
              <Col>
                <Divider type="vertical" />
                <Space>
                  <Tooltip title="Tamaño de fuente">
                    <Select 
                      value={currentSlide?.fontSize} 
                      onChange={(value) => updateCurrentSlide({ fontSize: value })}
                      size="small"
                      style={{ width: 80 }}
                    >
                      <Option value="small">S</Option>
                      <Option value="medium">M</Option>
                      <Option value="large">L</Option>
                    </Select>
                  </Tooltip>
                  
                  <Tooltip title="Alineación">
                    <Select 
                      value={currentSlide?.alignment} 
                      onChange={(value) => updateCurrentSlide({ alignment: value })}
                      size="small"
                      style={{ width: 80 }}
                    >
                      <Option value="left"><AlignLeftOutlined /></Option>
                      <Option value="center"><AlignCenterOutlined /></Option>
                      <Option value="right"><AlignRightOutlined /></Option>
                    </Select>
                  </Tooltip>
                  
                  <Tooltip title="Añadir imagen">
                    <Button 
                      size="small"
                      icon={<PictureOutlined />}
                      onClick={() => setIsImageModalOpen(true)}
                    />
                  </Tooltip>
                </Space>
              </Col>
            </Row>
          </div>

          {/* Área de edición */}
          <div className="flex-1 p-6">
            <Card 
              className="h-full"
              bodyStyle={{ 
                height: '100%', 
                backgroundColor: currentSlide?.backgroundColor,
                color: currentSlide?.textColor,
                padding: '40px'
              }}
            >
              {/* Título de la slide */}
              <Input
                value={currentSlide?.title}
                onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                style={{
                  fontSize: currentSlide?.fontSize === 'large' ? '2rem' : 
                            currentSlide?.fontSize === 'medium' ? '1.5rem' : '1.2rem',
                  fontWeight: 'bold',
                  textAlign: currentSlide?.alignment,
                  backgroundColor: 'transparent',
                  border: '1px dashed rgba(0,0,0,0.2)',
                  color: currentSlide?.textColor,
                  marginBottom: '20px'
                }}
                placeholder="Título de la slide"
              />

              {/* Imagen si existe */}
              {currentSlide?.imageUrl && (
                <div 
                  className={`mb-4 ${currentSlide.alignment === 'center' ? 'text-center' : 
                                      currentSlide.alignment === 'right' ? 'text-right' : 'text-left'}`}
                >
                  <Image 
                    src={currentSlide.imageUrl}
                    alt="Slide image"
                    style={{ maxHeight: '200px', maxWidth: '100%' }}
                  />
                  <Button 
                    size="small" 
                    danger 
                    onClick={() => updateCurrentSlide({ imageUrl: undefined })}
                    className="ml-2"
                  >
                    Eliminar imagen
                  </Button>
                </div>
              )}

              {/* Contenido de la slide */}
              <TextArea
                value={currentSlide?.content}
                onChange={(e) => updateCurrentSlide({ content: e.target.value })}
                style={{
                  fontSize: currentSlide?.fontSize === 'large' ? '1.2rem' : 
                            currentSlide?.fontSize === 'medium' ? '1rem' : '0.9rem',
                  textAlign: currentSlide?.alignment,
                  backgroundColor: 'transparent',
                  border: '1px dashed rgba(0,0,0,0.2)',
                  color: currentSlide?.textColor,
                  minHeight: '200px'
                }}
                placeholder="Contenido de la slide..."
                autoSize={{ minRows: 6 }}
              />
            </Card>
          </div>
        </div>

        {/* Panel derecho - Propiedades */}
        <div className="w-80 bg-white border-l p-4 overflow-y-auto">
          <Title level={4}>Propiedades de la Slide</Title>
          
          {/* Color de fondo */}
          <div className="mb-4">
            <AntText strong>Color de fondo:</AntText>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {backgroundColors.map((color) => (
                <div
                  key={color}
                  className="w-8 h-8 rounded border-2 cursor-pointer"
                  style={{ 
                    backgroundColor: color,
                    borderColor: currentSlide?.backgroundColor === color ? '#1890ff' : '#d9d9d9'
                  }}
                  onClick={() => updateCurrentSlide({ backgroundColor: color })}
                />
              ))}
            </div>
          </div>

          {/* Color del texto */}
          <div className="mb-4">
            <AntText strong>Color del texto:</AntText>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {textColors.map((color) => (
                <div
                  key={color}
                  className="w-8 h-8 rounded border-2 cursor-pointer"
                  style={{ 
                    backgroundColor: color,
                    borderColor: currentSlide?.textColor === color ? '#1890ff' : '#d9d9d9'
                  }}
                  onClick={() => updateCurrentSlide({ textColor: color })}
                />
              ))}
            </div>
          </div>

          {/* Posición de imagen */}
          {currentSlide?.imageUrl && (
            <div className="mb-4">
              <AntText strong>Posición de imagen:</AntText>
              <Select 
                value={currentSlide.imagePosition} 
                onChange={(value) => updateCurrentSlide({ imagePosition: value })}
                className="w-full mt-2"
              >
                <Option value="top">Arriba</Option>
                <Option value="bottom">Abajo</Option>
                <Option value="background">Fondo</Option>
              </Select>
            </div>
          )}

          {/* Vista previa miniatura */}
          <div className="mt-6">
            <AntText strong>Vista previa:</AntText>
            <div 
              className="mt-2 border rounded p-4 h-32 overflow-hidden text-xs"
              style={{ 
                backgroundColor: currentSlide?.backgroundColor,
                color: currentSlide?.textColor 
              }}
            >
              <div className="font-bold mb-1">{currentSlide?.title}</div>
              <div>{currentSlide?.content}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para subir imagen */}
      <Modal
        title="Añadir Imagen a la Slide"
        open={isImageModalOpen}
        onCancel={() => setIsImageModalOpen(false)}
        footer={null}
        width={600}
      >
        <Upload.Dragger
          accept="image/*"
          customRequest={handleImageUpload}
          showUploadList={false}
          multiple={false}
        >
          <p className="ant-upload-drag-icon">
            <PictureOutlined />
          </p>
          <p className="ant-upload-text">
            Haz clic o arrastra una imagen aquí
          </p>
          <p className="ant-upload-hint">
            Formatos soportados: JPG, PNG, GIF
          </p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
};

export default PresentacionEditor;